import {recoverVerifiedGoogleAccount} from '../shared/google-recovery.js';
import {appointmentReminders,defaultReminders,visibleAppointmentReminder} from '../shared/appointment-reminders.js';
import {serviceAreas,allowsServiceLocation} from '../shared/service-location.js';
import {cleaningPropertyTypes,cleaningAreas,matchesProperty,availableBooking,bookingTime,formatBookingTime,quoteTotal} from '../shared/booking-options.js';
import {canClearRequest,isOpenServiceRequest,requestRetryAt} from '../shared/request-lifecycle.js';
import {deliverPush,makePushKeys,pushJobs,validSubscription} from './push.js';
import {galleryVideoTypes,maxVideoBytes,validGalleryVideo,sendGalleryVideo} from '../shared/gallery-media.js';
import {registerAdminRoutes} from './admin.js';
import {adminFrom} from './admin-auth.js';
import {publishedWelcome,liveContent} from '../shared/admin-content.js';
import express from 'express';
import {categoryRecords,findCategory,categoryKey,campusGuide} from '../shared/catalog.js';
import {foodCategory,deliveryAreas,ingredientOptions,requestOpen,deliveryMatches} from '../shared/commerce.js';
import {createPhotoStorage} from './photo-storage.js';
import {rideLocationLabel,vehicles,tripScopes,driverAvailability,tripAreas,coordinate,publicRide,transportMatches} from '../shared/transport.js';
import {verifyGoogleCredential} from './google-auth.js';
import { MongoClient } from 'mongodb';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import {welcomePath} from '../shared/app-routes.js';
import { categories, seed } from './seed.js';
import {appointmentTypes,serviceName,sameService,cleanEntries,roommateAreas,roommatePreferences,roommateIntents} from '../shared/marketplace.js';
import {propertyTypes} from '../shared/listing-options.js';
import {normalizeSelections} from '../shared/listing-options.js';

const app = express();
const production = process.env.NODE_ENV === 'production';
const filename = resolve(process.env.LOCAL_DATA_FILE || '.campusloop-data.json');
if (production && !process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in production.');
const mongo = process.env.MONGODB_URI && await MongoClient.connect(process.env.MONGODB_URI);
const collection = mongo && mongo.db(process.env.MONGODB_DATABASE || 'campusloop').collection('marketplace');
const empty = () => {
  const state = seed();
  if (production || process.env.DEMO === '0') state.listings = [];
  return state;
};
let local;
if (collection) {
  await collection.updateOne({_id:'state'}, {$setOnInsert:{revision:0, state:empty()}}, {upsert:true});
} else {
  try { local = JSON.parse(await readFile(filename, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; local = empty(); }
}
const read = async () => collection ? (await collection.findOne({_id:'state'})).state : local;
let pending = Promise.resolve();
function update(action) {
  if (collection) return (async () => {
    for (let i = 0; i < 12; i++) {
      const doc = await collection.findOne({_id:'state'});
      const result = await action(doc.state);
      const write = await collection.updateOne({_id:'state',revision:doc.revision}, {$set:{state:doc.state},$inc:{revision:1}});
      if (write.modifiedCount) return result;
    }
    throw Object.assign(new Error('Please retry that change.'), {status:409});
  })();
  const next = pending.then(async () => {
    const copy = structuredClone(local);
    const result = await action(copy);
    await writeFile(filename+'.tmp', JSON.stringify(copy), {mode:0o600});
    await rename(filename+'.tmp', filename);
    local = copy;
    return result;
  });
  pending = next.catch(() => {});
  return next;
}
const photoStorage=createPhotoStorage(filename+'.photos');
const requireValue = (ok, message, status=400) => { if (!ok) throw Object.assign(new Error(message), {status}); };
const clean = (value, max=160) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const amount = (value, optional=false) => {
  if (optional && (value === '' || value == null)) return null;
  const n = Number(value);
  requireValue(value !== '' && value != null && Number.isSafeInteger(n) && n >= 0 && n <= 100000000, 'Enter a valid amount in naira.');
  return n;
};
// Legacy roles are inferred without writing to stored accounts. Mixed activity needs an explicit split.
function roleInfo(state,u){
 if(['customer','provider'].includes(u.accountRole))return {accountRole:u.accountRole,roleStatus:'set'};
 const provider=state.listings.some(l=>l.owner===u.id&&l.category!=='Housing'&&!l.demo)||(state.businesses || []).some(b=>b.owner===u.id)||state.requests.some(r=>r.category!=='Housing'&&r.offers.some(o=>o.provider===u.id));
 const customer=state.requests.some(r=>r.owner===u.id&&r.category!=='Housing');
 return {accountRole:provider&&!customer?'provider':customer&&!provider?'customer':null,roleStatus:provider&&customer?'mixed':provider||customer?'inferred':'choose'};
}
const avatarUrl = user => user?.avatar ? '/api/profile-photo/'+user.avatar.id : null;
function privateAvatarMatch(state,viewer,owner){
 return state.requests.some(r=>r.owner===owner.id&&r.campus===viewer.campus&&r.offers.some(o=>o.provider===viewer.id&&(r.status==='Open'||r.confirmed===o.id)));
}
function providerAvatar(state,owner){
 return owner?.status!=='suspended'&&owner&&roleInfo(state,owner).accountRole==='provider'?avatarUrl(owner):null;
}
const safeUser = (u,state) => ({id:u.id,name:u.name,campus:u.campus,avatarUrl:avatarUrl(u),appointmentReminders:u.appointmentReminders ?? defaultReminders,googleConnected:!!u.googleSub,...roleInfo(state,u)});
const requireRole=(state,user,role)=>requireValue(roleInfo(state,user).accountRole===role,'Use a '+role+' account for this action. Each account has one role.',403);
const photoOwned=(p,user)=>p&&(p.owner===user.id||p.coOwners?.includes(user.id));
const tokenFrom = req => /(?:^|;\s*)campus_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
const userFrom = (state, req) => {
  const session = state.sessions.find(s => s.token === tokenFrom(req) && s.expires > Date.now());
  return session && state.users.find(u => u.id === session.user && u.status!=='suspended');
};
const auth = (state, req) => {
  const user = userFrom(state, req);
  requireValue(user, 'Sign in to continue.',401);
  return user;
};
const sessionFrom=(state,req)=>state.sessions.find(s=>s.token===tokenFrom(req)&&s.expires>Date.now());
function accountPair(state,user){return (state.accountLinks || []).find(p=>p.customer===user.id||p.provider===user.id);}
function pairUsers(state,user){const pair=accountPair(state,user);return pair?[pair.customer,pair.provider].map(id=>state.users.find(u=>u.id===id)).filter(Boolean):[user];}
function switchAccounts(state,user,req){const session=sessionFrom(state,req);return pairUsers(state,user).filter(u=>u.id===user.id||session?.accounts?.includes(u.id)).map(u=>({...safeUser(u,state),email:u.email,active:u.id===user.id}));}
function linkAccounts(state,current,target,req){
 requireValue(target.status!=='suspended','This account is suspended.',403);
 const role=roleInfo(state,current).accountRole,otherRole=roleInfo(state,target).accountRole;
 requireValue(role&&otherRole&&role!==otherRole&&current.id!==target.id,'Link one Customer account and one Provider account. Set up account roles first.');
 requireValue(current.campus===target.campus,'Both accounts must use the same campus.');
 const existing=accountPair(state,current),other=accountPair(state,target);
 requireValue(!existing||[existing.customer,existing.provider].includes(target.id),'This account already has a linked account for the other role.',409);
 requireValue(!other||[other.customer,other.provider].includes(current.id),'That account is already linked to another account.',409);
 if(!existing)(state.accountLinks ||= []).push({id:randomUUID(),customer:role==='customer'?current.id:target.id,provider:role==='provider'?current.id:target.id,created:Date.now()});
 const session=sessionFrom(state,req);session.accounts=[current.id,target.id];
 return {target:{...safeUser(target,state),email:target.email},linkedAccounts:switchAccounts(state,current,req)};
}
app.use('/api', (req,res,next) => {
  res.set('Cache-Control','no-store');
  if (req.method === 'POST' && req.get('sec-fetch-site') === 'cross-site') return res.sendStatus(403);
  next();
});
app.post('/api/gallery-video',express.raw({type:galleryVideoTypes,limit:maxVideoBytes}));
app.use(express.json({limit:'5mb'}));
const attempts = new Map();
app.get('/api/auth/google',(_req,res)=>{
 const clientId=process.env.GOOGLE_CLIENT_ID;
 if(!clientId)return res.json({enabled:false});
 const nonce=randomBytes(32).toString('hex');
 res.cookie('campus_google_nonce',nonce,{httpOnly:true,sameSite:'lax',secure:production,maxAge:600000,path:'/'}).json({enabled:true,clientId,nonce});
});
app.post('/api/account/:action', async (req,res) => {
  const {action} = req.params;
  if (action === 'logout') {
    await update(state => {const session=sessionFrom(state,req);state.sessions=state.sessions.filter(s=>s.token!==tokenFrom(req)&&(!session?.device||s.device!==session.device));if(session?.device)state.pushSubscriptions=(state.pushSubscriptions || []).filter(row=>row.device!==session.device);});
    return res.clearCookie('campus_session',{path:'/'}).json({});
  }
  if(['link','create-linked','link-google','switch'].includes(action)){
    const attemptKey='link:'+req.ip,now=Date.now(),attempt=attempts.get(attemptKey);const entry=attempt&&attempt.expires>now?attempt:{count:0,expires:now+60000};attempts.set(attemptKey,entry);if(action!=='switch')requireValue(++entry.count<=20,'Wait a minute and try again.',429);
    let identity;
    if(action==='link-google'){
      auth(await read(),req);requireValue(process.env.GOOGLE_CLIENT_ID,'Google sign-in is not configured yet.',503);
      const nonce=/(?:^|;\s*)campus_google_nonce=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];requireValue(nonce,'Please reopen Google verification and try again.',401);
      identity=await verifyGoogleCredential(req.body.credential,process.env.GOOGLE_CLIENT_ID,nonce);
    }
    let switchedToken,switchedExpiry;
    const result=await update(async state=>{
      const current=auth(state,req),session=sessionFrom(state,req),role=roleInfo(state,current).accountRole;
      requireValue(role,'Set up your Customer or Provider role before linking accounts.',409);
      if(action==='switch'){
        const target=state.users.find(u=>u.id===req.body.target),pair=accountPair(state,current);
        requireValue(target?.status!=='suspended','This account is suspended.',403);
        requireValue(target&&pair&&[pair.customer,pair.provider].includes(target.id)&&session.accounts?.includes(target.id),'Verify and link this account before switching.',403);
        requireValue(target.campus===current.campus&&roleInfo(state,target).accountRole!==role,'Choose the linked account with the other role.');
        switchedToken=randomBytes(32).toString('hex');switchedExpiry=session.expires;
        state.sessions=state.sessions.filter(s=>s.token!==session.token);state.sessions.push({token:switchedToken,user:target.id,accounts:[pair.customer,pair.provider],device:session.device || randomUUID(),expires:switchedExpiry});
        return safeUser(target,state);
      }
      let target;
      if(action==='link'){
        const email=clean(req.body.email).toLowerCase(),password=clean(req.body.password,128);const u=state.users.find(u=>u.email===email);
        const hash = scryptSync(password,u?.salt || 'campusloop-login',64);
        requireValue(u?.password&&timingSafeEqual(hash,Buffer.from(u.password,'hex')),'Email or password is incorrect.',401);target=u;
      }else if(action==='create-linked'){
        requireValue(!accountPair(state,current),'The other role is already linked.',409);
        const email=clean(req.body.email).toLowerCase(),password=clean(req.body.password,128),name=clean(req.body.name,80),salt=randomBytes(16).toString('hex');
        requireValue(name&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&password.length>=8&&!state.users.some(u=>u.email===email),'Use a different available email, your name and a password with at least 8 characters.');
        target={id:randomUUID(),name,email,campus:current.campus,accountRole:role==='customer'?'provider':'customer',salt,password:scryptSync(password,salt,64).toString('hex')};state.users.push(target);
      }else{
        target=state.users.find(u=>u.googleSub===identity.subject);
        if(!target&&req.body.create===true){requireValue(!state.users.some(u=>u.email===identity.email),'Sign in to that existing account with its password to verify it.',409);target={id:randomUUID(),name:identity.name || identity.email.split('@')[0],email:identity.email,campus:current.campus,accountRole:role==='customer'?'provider':'customer',googleSub:identity.subject};state.users.push(target);}
        requireValue(target,'No Campus Loop account is connected to this Google account. Choose create the other account first.',404);
      }
      return linkAccounts(state,current,target,req);
    });
    if(action==='switch')return res.cookie('campus_session',switchedToken,{httpOnly:true,sameSite:'lax',secure:production,maxAge:Math.max(0,switchedExpiry-Date.now()),path:'/'}).json(result);
    if(action==='link-google')res.clearCookie('campus_google_nonce',{path:'/'});
    return res.json(result);
  }
  if(action==='role'||action==='split'){
    const result=await update(async state=>{
      const current=auth(state,req),info=roleInfo(state,current),role=req.body.accountRole;
      requireValue(['customer','provider'].includes(role),'Choose Customer or Provider.');
      requireValue(!current.accountRole,'This account already has a role. Create a separate account for the other role.',409);
      if(action==='role'){
        requireValue(info.roleStatus!=='mixed'&&(!info.accountRole||info.accountRole===role),'Keep the role matching your activity, or split your mixed account.',409);
        current.accountRole=role;return safeUser(current,state);
      }
      requireValue(info.roleStatus==='mixed','This account does not need splitting.',409);
      const email=clean(req.body.email).toLowerCase(),password=clean(req.body.password,128),name=clean(req.body.name,80)||current.name;
      requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&password.length>=8&&!state.users.some(u=>u.email===email),'Use a different available email and a password with at least 8 characters.');
      const salt=randomBytes(16).toString('hex'),otherRole=role==='customer'?'provider':'customer';
      const other={id:randomUUID(),name,email,campus:current.campus,accountRole:otherRole,salt,password:scryptSync(password,salt,64).toString('hex')};
      state.users.push(other);current.accountRole=role;
      // Keep record IDs, terms, messages and confirmed booking revisions. Transfer only the selected service side.
      if(otherRole==='provider'){
        for(const b of state.businesses || [])if(b.owner===current.id)b.owner=other.id;
        for(const l of state.listings)if(l.owner===current.id&&l.category!=='Housing')l.owner=other.id;
        for(const a of state.photoAssets || [])if(a.owner===current.id){a.coOwners=[...new Set([...(a.coOwners || []),current.id])];a.owner=other.id;}
      }
      for(const r of state.requests){if(r.category==='Housing')continue;
        const moveCustomer=otherRole==='customer'&&r.owner===current.id;
        if(moveCustomer)r.owner=other.id;
        for(const o of r.offers){const moveProvider=otherRole==='provider'&&o.provider===current.id;
          if(moveProvider)o.provider=other.id;
          if(moveCustomer||moveProvider)for(const m of o.messages)if(m.sender===current.id)m.sender=other.id;
        }
        if(otherRole==='provider'){
          if(r.booking?.driver===current.id)r.booking.driver=other.id;
          if(r.seenBy?.[current.id]){r.seenBy[other.id]=r.seenBy[current.id];delete r.seenBy[current.id];}
          if(r.dismissed)r.dismissed=r.dismissed.map(id=>id===current.id?other.id:id);
        }
      }
      if(otherRole==='customer')for(const e of state.routeEstimates || [])if(e.owner===current.id)e.owner=other.id;
      for(const n of state.notifications || []){const r=state.requests.find(r=>r.id===n.requestId);if(n.recipient===current.id&&r?.category!=='Housing'&&n.audience===otherRole)n.recipient=other.id;}
      for(const r of state.requests)if(r.category!=='Housing'&&otherRole==='provider'&&r.booking?.provider===current.id)r.booking.provider=other.id;
      // Revoke other sessions so they cannot retain a view of the previous mixed identity.
      state.sessions=state.sessions.filter(s=>s.user!==current.id||s.token===tokenFrom(req));
      linkAccounts(state,current,other,req);
      return {...safeUser(current,state),separateAccount:{email,accountRole:otherRole}};
    });return res.json(result);
  }
  if(action==='google'){
    requireValue(process.env.GOOGLE_CLIENT_ID,'Google sign-in is not configured yet.',503);
    const nonce=/(?:^|;\s*)campus_google_nonce=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    requireValue(nonce,'Please reopen Google sign-in and try again.',401);
    const identity=await verifyGoogleCredential(req.body.credential,process.env.GOOGLE_CLIENT_ID,nonce);
    const now=Date.now(),token=randomBytes(32).toString('hex');
    const user=await update(state=>{
      let u=state.users.find(u=>u.googleSub===identity.subject);
      if(req.body.link!==true&&!u)u=recoverVerifiedGoogleAccount(state,identity,now);
      if(req.body.link===true){
        const current=auth(state,req);
        requireValue(current.email===identity.email,'Use the Google account with the same email as your Campus Loop account.');
        requireValue(!u||u.id===current.id,'This Google account is already connected to another account.',409);
        requireValue(!current.googleSub||current.googleSub===identity.subject,'This Campus Loop account is already connected to Google.',409);
        current.googleSub=identity.subject;u=current;
      }else if(!u){
        requireValue(!state.users.some(u=>u.email===identity.email),'This email already has a Campus Loop account. Sign in with your password, then connect Google from My listings.',409);
        const campus=state.campuses.find(c=>c.id===req.body.campus)||state.campuses[0];
        requireValue(['customer','provider'].includes(req.body.accountRole),'Choose Customer or Provider before creating an account.');
        u={accountRole:req.body.accountRole,id:randomUUID(),email:identity.email,name:identity.name||identity.email.split('@')[0],campus:campus.id,googleSub:identity.subject};state.users.push(u);
      }
      requireValue(u.status!=='suspended','This account is suspended. Contact Campus Loop for help.',403);
      if(req.body.link!==true&&req.body.accountRole&&roleInfo(state,u).accountRole)requireRole(state,u,req.body.accountRole);
      state.sessions=state.sessions.filter(s=>s.expires>now);state.sessions.push({token,user:u.id,accounts:pairUsers(state,u).map(x=>x.id),device:randomUUID(),expires:now+7*86400000});return safeUser(u,state);
    });
    return res.clearCookie('campus_google_nonce',{path:'/'}).cookie('campus_session',token,{httpOnly:true,sameSite:'lax',secure:production,maxAge:7*86400000,path:'/'}).json(user);
  }
  requireValue(['signup','login'].includes(action),'Unknown account action.',404);
  const now = Date.now();
  for (const [ip,entry] of attempts) if (entry.expires <= now) attempts.delete(ip);
  const attempt = attempts.get(req.ip) || {count:0,expires:now+60000};
  attempts.set(req.ip,attempt);
  requireValue(++attempt.count <= 20, 'Wait a minute and try again.',429);
  const email = clean(req.body.email).toLowerCase();
  const password = clean(req.body.password,128);
  requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length>=8, 'Enter an email and a password with at least 8 characters.');
  const token = randomBytes(32).toString('hex');
  const user = await update(state => {
    let u = state.users.find(entry => entry.email === email);
    if (action === 'signup') {
      const name = clean(req.body.name,80);
      requireValue(name && !u, 'Enter your name and an email that is available.');
      requireValue(state.campuses.some(c=>c.id===req.body.campus),'Choose a campus.');
      const salt = randomBytes(16).toString('hex');
      requireValue(['customer','provider'].includes(req.body.accountRole),'Choose Customer or Provider.');
      u = {accountRole:req.body.accountRole,id:randomUUID(),email,name,campus:req.body.campus,salt,password:scryptSync(password,salt,64).toString('hex')};
      state.users.push(u);
    } else {
      const hash = scryptSync(password,u?.salt || 'campusloop-login',64);
      requireValue(u?.password && timingSafeEqual(hash,Buffer.from(u.password,'hex')), 'Email or password is incorrect.',401);
    }
    requireValue(u.status!=='suspended','This account is suspended. Contact Campus Loop for help.',403);
    if(action==='login'&&req.body.accountRole&&roleInfo(state,u).accountRole)requireRole(state,u,req.body.accountRole);
    state.sessions = state.sessions.filter(s=>s.expires>now);
    state.sessions.push({token,user:u.id,accounts:pairUsers(state,u).map(x=>x.id),device:randomUUID(),expires:now+7*86400000});
    return safeUser(u,state);
  });
  res.cookie('campus_session',token,{httpOnly:true,sameSite:'lax',secure:production,maxAge:7*86400000,path:'/'}).json(user);
});
const eligible = (state,r,l) => l && l.available && !l.moderation?.hidden && !state.users.some(u=>u.id===l.owner&&u.status==='suspended') && !l.demo && l.campus===r.campus &&
  categoryKey(state,l)===categoryKey(state,r) && matchesProperty(r,l) && deliveryMatches(r,l) && (l.category==='Housing'||roleInfo(state,state.users.find(u=>u.id===l.owner)||{}).accountRole==='provider') && l.owner!==r.owner && (!r.target || l.id===r.target) &&
  (r.category!=='Transport'||transportMatches(r,l)) && (!r.mode || l.modes.includes(r.mode)) && (!r.serviceType || sameService(serviceName(l),r.serviceType)) && (r.category!=='Housing' || l.role!=='Agent' || process.env.ALLOW_AGENTS!=='0');
function requestView(state,user,r){
 if(!r||!user)return null;
 const own=r.owner===user.id,offers=own?r.offers:r.offers.filter(o=>o.provider===user.id);
 const options=own?undefined:r.kind==='food-order'&&r.foodOrder.seller===user.id?(r.status==='Pending seller'?[r.target]:[]):state.listings.filter(l=>l.owner===user.id&&r.status==='Open'&&!r.dismissed?.includes(user.id)&&eligible(state,r,l)).map(l=>l.id);
 if(!own&&!offers.length&&!options.length&&!(r.kind==='food-order'&&r.foodOrder.seller===user.id))return null;
 const selected=r.offers.find(o=>o.id===r.confirmed)?.provider===user.id;
 const hasEligibleProviders=own&&isOpenServiceRequest(r)?state.listings.some(l=>!r.dismissed?.includes(l.owner)&&eligible(state,r,l)):undefined;
 const statusLabel=r.status!=='Open'?r.status:own?(offers.length?offers.length+' '+(offers.length===1?'offer':'offers')+' received':hasEligibleProviders===false?'No matching providers':'Waiting for replies'):offers.length?(offers[0].revision>1?'Offer revised':'Offer sent'):!r.seenBy?.[user.id]?'New request':'Awaiting your quote';
 const activity=[{at:r.created || 0,label:'Request sent'}];
 for(const o of offers){if(o.updatedAt)activity.push({at:o.updatedAt,label:own?(o.revision>1?'Offer revised':'Offer received'):(o.revision>1?'You revised your offer':'You sent an offer')});for(const m of o.messages)if(m.at)activity.push({at:m.at,label:m.sender===user.id?'You sent a message':'New chat message'});}
 if(r.closedAt)activity.push({at:r.closedAt,label:r.status==='Resent'?'Request sent again':'Request cancelled'});
 if(r.editedAt)activity.push({at:r.editedAt,label:'Request updated'});
 if(r.booking?.changedAt)activity.push({at:r.booking.changedAt,label:'Booking updated'});
 if(r.completedAt)activity.push({at:r.completedAt,label:'Service completed'});
 if(r.orderUpdatedAt)activity.push({at:r.orderUpdatedAt,label:'Order '+r.status.toLowerCase()});
 if(r.bookedAt)activity.push({at:r.bookedAt,label:r.category==='Housing'?'Viewing confirmed':'Booking confirmed'});
 activity.reverse().sort((a,b)=>b.at-a.at);const latest=activity[0];
 const ride=r.transport?(own||selected?r.transport:publicRide(r.transport)):undefined;
 const details=ride?(ride.airport?'Airport taxi':r.serviceType+' ride')+' · '+(rideLocationLabel(ride.pickup)||'Pickup area not listed')+' → '+(rideLocationLabel(ride.destination)||'Destination area not listed'):r.details;
 return {...r,details,serviceLocation:own||selected?r.serviceLocation:r.serviceLocation?{area:r.serviceLocation.area}:undefined,archivedAt:own?r.archivedAt:r.providerArchivedAt?.[user.id],providerArchivedAt:undefined,customerAvatarUrl:!own&&offers.some(o=>r.status==='Open'||r.confirmed===o.id)?avatarUrl(state.users.find(u=>u.id===r.owner)):null,categoryName:findCategory(state,categoryKey(state,r))?.name || r.category,seenBy:undefined,dismissed:undefined,transport:ride,booking:own||selected?r.booking:undefined,hasEligibleProviders,review:own||selected?r.review:undefined,offers,options,statusLabel,isNew:!own&&!offers.length&&requestOpen(r)&&!!options.length&&!r.seenBy?.[user.id],latestActivity:latest.label,updatedAt:latest.at};
}
function notificationVisible(state,user,n){
 if(n.recipient!==user.id)return false;
 const r=state.requests.find(r=>r.id===n.requestId);if(!r)return false;
 if(n.type==='order')return r.owner===user.id||r.foodOrder?.seller===user.id;
 if(n.type==='reminder')return visibleAppointmentReminder(r,user,n);
 if(n.type==='request')return r.status==='Open'&&!r.dismissed?.includes(user.id)&&state.listings.some(l=>l.owner===user.id&&eligible(state,r,l));
 const o=r.offers.find(o=>o.id===n.offerId);return !!o&&(r.owner===user.id||o.provider===user.id);
}
function notificationState(state,user){
 if(!user)return {notifications:[],unreadCount:0};
 const stored=(state.notifications || []).filter(n=>n.recipient===user.id);
 const notified=new Set(stored.filter(n=>n.type==='request').map(n=>n.requestId));
 const notifications=stored.filter(n=>notificationVisible(state,user,n));
 for(const r of state.requests){
   if(notified.has(r.id)||r.owner===user.id||r.status!=='Open')continue;
   const arrival={id:'incoming-'+r.id,recipient:user.id,type:'request',requestId:r.id,offerId:null,eventKey:'request:'+r.id,title:'New matching request',summary:(r.serviceType || r.category)+' · '+r.time,created:r.created,readAt:r.seenBy?.[user.id] || null,audience:'provider'};
   if(notificationVisible(state,user,arrival))notifications.push(arrival);
 }
 const remindersByKey=new Set(stored.filter(n=>n.type==='reminder').map(n=>n.eventKey));
 for(const r of state.requests)for(const n of appointmentReminders(r,user)){
  const legacy=n.eventKey.endsWith(':hour')&&remindersByKey.has(n.eventKey.slice(0,-5));
  if(!legacy&&!remindersByKey.has(n.eventKey))notifications.push(n);
 }
 notifications.sort((a,b)=>b.created-a.created||(b.sequence || 0)-(a.sequence || 0));
 return {notifications,unreadCount:notifications.filter(n=>!n.readAt).length};
}
function markNotificationRead(state,n){
 n.readAt ||= Date.now();
 state.notifications ||= [];
 if(!state.notifications.some(row=>row.recipient===n.recipient&&row.id===n.id))state.notifications.push(n);
}
function notify(state,recipient,type,r,o,eventKey,title,summary,audience){
 state.notifications ||= [];
 if(state.notifications.some(n=>n.recipient===recipient&&n.eventKey===eventKey))return;
 state.notifications.push({id:randomUUID(),recipient,type,requestId:r.id,offerId:o?.id || null,eventKey,title,summary,created:Date.now(),readAt:null,audience,sequence:state.notifications.length+1});
}
function destination(n){return {screen:n.type==='message'?'chat':n.type==='offer'?'offer':'request',request:n.requestId,offer:n.offerId};}
app.get('/api/state',async(req,res)=>{
 const state=await read(),user=userFrom(state,req),campus=user?.campus || state.campuses[0].id;
 if(!user)return res.json({welcome:publishedWelcome(state),campuses:state.campuses,user:null,linkedAccounts:[],sessionExpiresAt:null,categoryRecords:[],guide:{menuItems:[],entries:[]},listings:[],businesses:[],requests:[],roommatePosts:[],roommateConversations:[],notifications:[],unreadCount:0,incomingCount:0});
 const requests=user?state.requests.map(r=>requestView(state,user,r)).filter(Boolean):[];
 const roommatePosts=(state.roommatePosts || []).filter(p=>p.campus===campus&&((p.status==='Open'&&!p.moderation?.hidden&&!state.users.some(u=>u.id===p.owner&&u.status==='suspended'))||p.owner===user?.id));
 const roommateConversations=user?(state.roommateConversations || []).filter(c=>c.campus===campus&&(c.author===user.id||c.responder===user.id)).map(c=>({...c,post:(state.roommatePosts || []).find(p=>p.id===c.postId)})):[];
 const incomingCount=requests.filter(r=>r.owner!==user?.id&&requestOpen(r)&&r.options?.length&&!r.offers.length).length;
 res.json({welcome:publishedWelcome(state),announcements:liveContent(state.announcements,campus).map(({draft,...r})=>r),ads:liveContent(state.advertisements,campus).map(({draft,...r})=>r),campuses:state.campuses,user:user&&safeUser(user,state),linkedAccounts:switchAccounts(state,user,req),categoryRecords:categoryRecords(state),guide:campusGuide(state,campus),sessionExpiresAt:state.sessions.find(s=>s.token===tokenFrom(req))?.expires || null,listings:state.listings.filter(l=>l.campus===campus).map(l=>({...l,storedAvailable:l.owner===user.id?l.available:undefined,moderation:l.owner===user.id?l.moderation:undefined,available:l.available&&!l.moderation?.hidden&&!state.users.some(u=>u.id===l.owner&&u.status==='suspended'),providerAvatarUrl:l.available&&!l.moderation?.hidden&&!l.demo?providerAvatar(state,state.users.find(u=>u.id===l.owner)):null,hasVideo:l.galleryIds?.some(id=>galleryType(state,id).startsWith('video/')) || false,categoryName:findCategory(state,categoryKey(state,l))?.name || l.category})),savedListingIds:user.savedListingIds || [],requests,incomingCount,roommatePosts,roommateConversations,businesses:(state.businesses || []).filter(b=>b.campus===campus).map(b=>({...b,providerAvatarUrl:providerAvatar(state,state.users.find(u=>u.id===b.owner))})),...notificationState(state,user)});
});
const mutate=(path,action)=>app.post('/api/'+path,async(req,res)=>{
 const result=await update(async state=>{
   if(path==='ads/:id/event')requireValue(!adminFrom(state,req),'Admin previews are excluded.',403);
   const user=auth(state,req),key=clean(req.body.clientMutationId,100),tracked=path==='requests'||(/\/(offer|message|confirm|order-response|cancel|resend|revise|reschedule|reschedule-response|cancel-booking|meeting-address)$/.test(path)&&path.startsWith('requests/'));
   const fingerprint=JSON.stringify({...req.body,clientMutationId:undefined});
   if(tracked&&key){
     requireValue(/^[A-Za-z0-9_-]{8,100}$/.test(key),'Invalid retry identifier.');
     const previous=(state.mutationReceipts || []).find(x=>x.user===user.id&&x.path===req.originalUrl&&x.key===key&&x.role===roleInfo(state,user).accountRole);
     if(previous){requireValue(previous.fingerprint===fingerprint,'This retry identifier was used for different details.',409);return {result:previous.result,jobs:[]};}
   }
   const offset=state.notifications?.length || 0;
   const result=(await action(state,user,req.body,req.params)) || {};
   if(tracked&&key)(state.mutationReceipts ||= []).push({user:user.id,role:roleInfo(state,user).accountRole,path:req.originalUrl,key,fingerprint,result});
   if(path==='listings'||path==='listings/:id/availability'){
     for(const n of notificationState(state,user).notifications){
       if(n.type==='request'&&n.id.startsWith('incoming-')&&!n.readAt&&!(state.notifications || []).some(saved=>saved.id===n.id&&saved.recipient===user.id))(state.notifications ||= []).push(n);
     }
   }
   const newNotices=(state.notifications || []).slice(offset).filter(n=>!n.readAt);
   return {result,jobs:pushJobs(state,newNotices,notificationVisible)};
 });await deliverPush(result.jobs);res.json(result.result || {});
});
mutate('app-installs',(state,user,body)=>{
 const installId=clean(body.installId,40),role=roleInfo(state,user).accountRole;
 requireValue(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(installId),'Invalid install ID.');
 requireValue(['customer','provider'].includes(role),'Choose an account type first.');
 const rows=state.appInstalls ||= [];
 if(!rows.some(row=>row.id===installId&&row.campus===user.campus&&row.role===role)){
  rows.push({id:installId,campus:user.campus,role,created:Date.now()});
 }
 return {recorded:true};
});
app.get('/api/support-tickets',async(req,res)=>{
 const state=await read(),user=auth(state,req);
 const tickets=(state.helpSubmissions || []).filter(row=>row.user===user.id&&row.kind==='support')
  .sort((a,b)=>b.created-a.created).map(({id,subject,message,reply,created})=>({id,subject,message,reply,created}));
 res.json({tickets});
});
mutate('help-submissions',(state,user,b)=>{
 const kind=b.kind,message=clean(b.message,2000),subject=clean(b.subject,120),rating=Number(b.rating);
 requireValue(kind==='support'||kind==='review','Choose support or app review.');
 requireValue(message,'Enter your message.');
 if(kind==='support')requireValue(subject,'Enter a subject.');
 else requireValue(Number.isInteger(rating)&&rating>=1&&rating<=5,'Choose a rating between 1 and 5.');
 const rows=state.helpSubmissions ||= [],created=Date.now();
 const recent=rows.filter(row=>row.user===user.id&&row.kind===kind&&created-row.created<3600000);
 const previous=recent.find(row=>row.message===message&&(kind==='support'?row.subject===subject:row.rating===rating));
 if(previous)return {id:previous.id};
 requireValue(recent.length<5,'Please wait before sending another message.',429);
 const record={id:randomUUID(),campus:user.campus,user:user.id,name:user.name,kind,message,created,
  ...(kind==='support'?{subject}:{rating})};
 rows.push(record);
 return {id:record.id};
});
app.get('/api/guide',async(req,res)=>{const state=await read(),user=auth(state,req);res.json(campusGuide(state,user.campus));});
app.get('/api/accounts',async(req,res)=>{const state=await read(),user=auth(state,req);res.json({accounts:switchAccounts(state,user,req)});});
app.get('/api/session',async(req,res)=>{const state=await read();res.json({user:safeUser(auth(state,req),state)});});
app.get('/api/push/status',async(req,res)=>{
 const state=await read();auth(state,req);
 const device=sessionFrom(state,req)?.device;
 res.json({enabled:!!device&&(state.pushSubscriptions || []).some(row=>row.device===device)});
});
app.post('/api/push/key',async(req,res)=>{
 const publicKey=await update(async state=>{
  auth(state,req);
  state.pushKeys ||= await makePushKeys();
  return state.pushKeys.publicKey;
 });
 res.json({publicKey});
});
app.post('/api/push/subscription',async(req,res)=>{
 await update(state=>{
   auth(state,req);
   const session=sessionFrom(state,req);
   requireValue(session?.device,'Sign in again before enabling phone alerts.',409);
   const rows=(state.pushSubscriptions || []).filter(row=>row.device!==session.device&&row.subscription.endpoint!==req.body.subscription?.endpoint);
   if(req.body.subscription){
     requireValue(validSubscription(req.body.subscription),'This browser notification subscription is unsupported.');
     rows.push({device:session.device,subscription:req.body.subscription});
   }
   state.pushSubscriptions=rows.filter(row=>state.sessions.some(s=>s.device===row.device&&s.expires>Date.now()));
 });
 res.json({});
});
app.get('/api/notifications',async(req,res)=>{const state=await read();res.json(notificationState(state,auth(state,req)));});
app.get('/api/requests/:id',async(req,res)=>{const state=await read(),user=auth(state,req),request=requestView(state,user,state.requests.find(r=>r.id===req.params.id));requireValue(request,'Request unavailable.',404);res.json({request});});
mutate('appointment-reminders',(state,user,b)=>{
 requireValue(Array.isArray(b.reminders)&&b.reminders.every(id=>defaultReminders.includes(id)),'Choose valid reminder times.');
 user.appointmentReminders=[...new Set(b.reminders)];
});
mutate('notifications/read-all',(state,user)=>{
 for(const n of notificationState(state,user).notifications)if(!n.readAt)markNotificationRead(state,n);
});
mutate('notifications/:id/read',(state,user,b,p)=>{
 const n=notificationState(state,user).notifications.find(n=>n.id===p.id);requireValue(n,'Notification unavailable.',404);markNotificationRead(state,n);
 if(['request','order'].includes(n.type)&&b.open===true){const r=state.requests.find(r=>r.id===n.requestId);(r.seenBy ||= {})[user.id]=Date.now();}
 return {notification:n,destination:destination(n),request:requestView(state,user,state.requests.find(r=>r.id===n.requestId))};
});
mutate('requests/:id/seen',(state,user,b,p)=>{
 const r=state.requests.find(r=>r.id===p.id);requireValue(requestView(state,user,r),'Request unavailable.',404);
 (r.seenBy ||= {})[user.id]=Date.now();for(const n of state.notifications || [])if(n.recipient===user.id&&n.requestId===r.id&&['request','order'].includes(n.type)&&!n.readAt)n.readAt=Date.now();
 return {request:requestView(state,user,r)};
});
mutate('listings',(state,user,b)=>{
  const old = state.listings.find(l=>l.id===b.id && l.owner===user.id);
  requireValue(!b.id || old, 'Listing unavailable.',404);
  const record=findCategory(state,b.categoryId || b.category);requireValue(record&&(record.visible!==false||old&&categoryKey(state,old)===record.id),'Choose an available category.');
  const category=record.value;
  const housing = category==='Housing';
  if(!housing||old&&old.category!=='Housing')requireRole(state,user,'provider');
  const title = clean(b.title,80), area = clean(b.area,80), description = clean(b.description === undefined ? old?.description : b.description,1500);
  const businessId=b.businessId===undefined?old?.businessId || null:b.businessId || null;
  requireValue(!businessId||(state.businesses || []).some(x=>x.id===businessId&&x.owner===user.id&&x.campus===user.campus),'Business page unavailable.',404);
  const menuFood=category===foodCategory&&b.serviceType!=='Cook a meal';
  const modes = housing ? ['Viewing'] : category==='Transport'?['Ride']:category==='Delivery'?['Delivery']:menuFood?['Pickup','Seller delivery'].filter(m=>b.food?.fulfilment?.includes(m)): appointmentTypes.filter(m=>Array.isArray(b.modes) && b.modes.includes(m));
  requireValue(record && title && area && modes.length,'Complete the listing details.');
  const role = housing ? b.role : null;
  let selections;
  try { selections=normalizeSelections(b,category); } catch(error) { requireValue(false,error.message); }
  const packageName = housing ? '' : (selections.serviceType==='Custom'?selections.customServiceType:selections.serviceType) || clean(b.package,80);
  requireValue(housing || packageName, 'Enter a package name.');
  requireValue(!housing || ['Landlord','Agent'].includes(role),'Choose landlord or agent.');
  requireValue(role!=='Agent' || (b.permission===true && (process.env.ALLOW_AGENTS!=='0' || old?.role==='Agent')), 'Agent listings require permission and must be enabled.');
  const agentFee = role==='Agent' ? amount(b.agentFee) : 0;
  const fees = housing ? amount(b.fees) : 0;
  const image = clean(b.image,900000);
  requireValue(!image || /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(image),'Use a JPG, PNG or WebP photo.');
  let food=null,delivery=null;
  if(category===foodCategory){
    if(menuFood){requireValue(b.pricingMode!=='quote','Food menu items need a fixed price.');food={kind:'menu',fulfilment:modes,deliveryFee:modes.includes('Seller delivery')?amount(b.food?.deliveryFee):0,pickupPoint:clean(b.food?.pickupPoint,300)||area,pickupArea:deliveryAreas.includes(b.food?.pickupArea)&&b.food.pickupArea!=='Around Abraka'?b.food.pickupArea:null};}
    else food={kind:'cook',ingredients:ingredientOptions.includes(b.food?.ingredients)?b.food.ingredients:''};
  }
  if(category==='Delivery'){const coverage=cleanEntries(b.delivery?.coverage);requireValue(coverage.length&&coverage.every(x=>deliveryAreas.includes(x)),'Choose delivery coverage areas.');delivery={coverage,availability:clean(b.delivery?.availability,160)};}
  let transport=null;
  if(category==='Transport'){
    requireValue(vehicles.includes(selections.serviceType),'Choose a vehicle type.');
    const coverage=cleanEntries(b.transport?.coverage).filter(v=>tripScopes.includes(v));
    requireValue(coverage.length&&driverAvailability.includes(b.transport?.availability),'Choose trip coverage and availability.');
    transport={coverage,availability:b.transport.availability,ratePerKm:amount(b.transport?.ratePerKm,true)};
  }
  const suppliedGallery=Array.isArray(b.galleryIds);
  const galleryIds=suppliedGallery?[...new Set(b.galleryIds)]:old?.galleryIds || [];
  const legacyImage=old?.legacyImage ?? (old?.image&&!old.image.startsWith('/api/photos/')?old.image:image);
  requireValue(galleryIds.every(id=>id==='legacy'?!!legacyImage:(state.photoAssets || []).some(a=>a.id===id&&photoOwned(a,user))),'A gallery photo is unavailable.');
  const coverIds=galleryIds.filter(id=>id==='legacy'||!galleryType(state,id).startsWith('video/'));
  const coverPhotoId=coverIds.includes(b.coverPhotoId)?b.coverPhotoId:coverIds.includes(old?.coverPhotoId)?old.coverPhotoId:coverIds[0] || null;
  const cover=coverPhotoId==='legacy'?legacyImage:coverPhotoId?'/api/photos/'+coverPhotoId:suppliedGallery?'':image || old?.image || '';
  const pricingMode=b.pricingMode===undefined?old?.pricingMode || 'fixed':b.pricingMode;
  requireValue(['fixed','quote'].includes(pricingMode)&&(!(housing||category==='Transport')||pricingMode==='fixed'),'Choose fixed pricing or request a quote.');
  const extras=menuFood?[]:Array.isArray(b.extras)?b.extras.slice(0,30).map(e=>({id:clean(e.id,80)||randomUUID(),name:clean(e.name,100),price:amount(e.price)})).filter(e=>e.name):old?.extras || [];
  const flyerPhotoId=b.flyerPhotoId===undefined?old?.flyerPhotoId || null:b.flyerPhotoId || null;
  requireValue(!flyerPhotoId||(state.photoAssets || []).some(p=>p.id===flyerPhotoId&&photoOwned(p,user)&&p.type.startsWith('image/')),'Flyer unavailable.');
  const covered=category==='Cleaning'?cleanEntries(b.cleaningPropertyTypes ?? old?.cleaningPropertyTypes):[];
  requireValue(covered.every(type=>cleaningPropertyTypes.includes(type)),'Choose valid cleaning property types.');
  const listing = {...old,...selections,cleaningPropertyTypes:covered,categoryId:record.id,food,delivery,businessId,pricingMode,extras,flyerPhotoId,transport,galleryIds,coverPhotoId,legacyImage,id:old?.id || randomUUID(),owner:user.id,campus:user.campus,title,category,area,description,modes,role,package:packageName,price:pricingMode==='quote'&&category!=='Housing'&&category!=='Transport'?0:amount(b.price),fees:fees+agentFee,agentFee,image:cover,availabilityLabel:['Available today','By appointment'].includes(b.availabilityLabel)?b.availabilityLabel:old?.availabilityLabel || 'By appointment',availabilityConfirmedAt:b.available!==false?Date.now():old?.availabilityConfirmedAt,available:b.available!==false,negotiable:b.negotiable===true};
  if (old) Object.assign(old,listing); else state.listings.push(listing);
  return {id:listing.id};
});
mutate('listings/:id/availability',(state,user,b,p)=>{
  const listing = state.listings.find(l=>l.id===p.id && l.owner===user.id);
  requireValue(listing && typeof b.available==='boolean','Listing unavailable.',404);
  if(listing.category!=='Housing')requireRole(state,user,'provider');
  listing.available=b.available;
  if(b.available)listing.availabilityConfirmedAt=Date.now();
});
mutate('listings/:id/saved',(state,user,b,p)=>{
 const ids=new Set(user.savedListingIds || []);
 requireValue(typeof b.saved==='boolean','Choose whether to save the listing.');
 if(b.saved){
   requireValue(state.listings.some(l=>l.id===p.id&&l.campus===user.campus&&l.available&&!l.moderation?.hidden),'Listing unavailable.',404);
   ids.add(p.id);
 }else ids.delete(p.id);
 user.savedListingIds=[...ids];
});
app.get('/api/listings/:id/reviews',async(req,res)=>{
 const state=await read(),user=auth(state,req);
 requireValue(state.listings.some(l=>l.id===req.params.id&&l.campus===user.campus&&!l.moderation?.hidden),'Listing unavailable.',404);
 const reviews=state.requests.filter(r=>r.status==='Completed'&&r.review&&r.booking?.listing===req.params.id).map(r=>({rating:r.review.rating,comment:r.review.comment,created:r.review.created}));
 res.json({reviews:reviews.sort((a,b)=>b.created-a.created)});
});
mutate('requests/:id/complete',(state,user,_b,p)=>{
 const r=requestBy(state,p.id);
 requireValue(r.owner===user.id,'Request unavailable.',404);
 requireValue(r.booking&&(r.status==='Booked'||r.kind==='food-order'&&r.status==='Accepted'),'Only booked services and accepted orders can be marked complete.',409);
 r.status='Completed';r.completedAt=Date.now();
});
function providerHistory(r,user){
 return r.owner!==user.id&&(r.offers.some(o=>o.provider===user.id)||r.kind==='food-order'&&r.foodOrder.seller===user.id);
}
function setRequestArchived(r,user,archived,now=Date.now()){
 if(r.owner===user.id){
  if(archived)r.archivedAt ||= now;
  else delete r.archivedAt;
 }else if(archived){
  (r.providerArchivedAt ||= {})[user.id] ||= now;
 }else if(r.providerArchivedAt)delete r.providerArchivedAt[user.id];
}
mutate('request-history/clear',(state,user,b)=>{
 let count=0;
 const now=Date.now(),incoming=b.tab==='Incoming';
 for(const r of state.requests){
  if(!canClearRequest(r))continue;
  if(incoming?!providerHistory(r,user)||r.providerArchivedAt?.[user.id]:r.owner!==user.id||r.archivedAt)continue;
  setRequestArchived(r,user,true,now);count++;
 }
 return {count};
});
mutate('requests/:id/archive',(state,user,b,p)=>{
 const r=requestBy(state,p.id);
 requireValue(r.owner===user.id||providerHistory(r,user),'Request unavailable.',404);
 requireValue(canClearRequest(r)&&typeof b.archived==='boolean','Only ended requests can be cleared from history.',409);
 setRequestArchived(r,user,b.archived);
});
mutate('requests/:id/review',(state,user,b,p)=>{
 const r=requestBy(state,p.id),rating=Number(b.rating);
 requireValue(r.owner===user.id,'Request unavailable.',404);
 requireValue(r.kind!=='food-order'&&r.status==='Completed'&&r.booking&&!r.review,'A completed booking can be reviewed once.',409);
 requireValue(Number.isInteger(rating)&&rating>=1&&rating<=5,'Choose a rating from 1 to 5.');
 r.review={rating,comment:clean(b.comment,700),created:Date.now()};
});
function serviceLocationFor(category,mode,value){
 if(!allowsServiceLocation(category,mode)||!value?.area)return undefined;
 requireValue(serviceAreas.includes(value.area),'Choose an area from the list.');
 return {area:value.area,label:clean(value.label,160),...(coordinate(value)||{})};
}
function requestSchedule(b){
 if(!b.appointment)return {time:clean(b.time,100),appointmentAt:null};
 const appointmentAt=bookingTime(b.appointment);
 requireValue(appointmentAt&&appointmentAt>Date.now(),'Choose a future date and time in Nigeria time.');
 return {time:formatBookingTime(appointmentAt),appointmentAt};
}
mutate('requests',(state,user,b)=>{
  const record=findCategory(state,b.categoryId || b.category);requireValue(record&&record.visible!==false,'Choose an available category.');b={...b,category:record.value,categoryId:record.id};
  if(b.category!=='Housing')requireRole(state,user,'customer');
  if(b.foodOrder)return createFoodOrder(state,user,b);
  const target = state.listings.find(l=>l.id===b.target);
  const r = {id:randomUUID(),campus:user.campus,owner:user.id,student:user.name,category:b.category,categoryId:record.id,details:clean(b.details,1000),budget:amount(b.budget,true),mode:b.category==='Delivery'?'Delivery':b.mode || '',serviceType:clean(b.serviceType,120),...requestSchedule(b),target:b.target || null,status:'Open',offers:[],created:Date.now()};
  const modes = r.category==='Housing'?['Viewing']:r.category==='Transport'?['Ride']:r.category==='Delivery'?['Delivery']:appointmentTypes;
  requireValue(record && (r.details||r.category==='Transport') && r.time && (!r.mode || modes.includes(r.mode)) && (r.category!=='Housing'||r.mode==='Viewing'),'Complete the request details.');
  if(r.category==='Transport'){
    requireValue(vehicles.includes(r.serviceType)&&tripScopes.includes(b.transport?.scope),'Choose a vehicle and trip coverage.');
    const airport=b.transport.airport===true;
    requireValue(!airport||r.serviceType==='Car ride'&&b.transport.scope==='Out of town','Airport trips require a taxi and out of town coverage.');
    const location=v=>{
      const area=clean(v?.area,120) || 'Other area';
      const label=rideLocationLabel({area,label:clean(v?.label,160)});
      requireValue(v&&label&&tripAreas.includes(area),'Choose an area or type an exact pickup point and destination.');
      return {label,area,...(coordinate(v)||{})};
    };
    const pickup=location(b.transport.pickup),destination=location(b.transport.destination);
    const estimate=(state.routeEstimates || []).find(e=>e.id===b.transport.routeId&&e.owner===user.id&&e.expires>Date.now()&&JSON.stringify(e.pickup)===JSON.stringify(coordinate(pickup))&&JSON.stringify(e.destination)===JSON.stringify(coordinate(destination)));
    const known=b.transport.distanceKm==null||b.transport.distanceKm===''?null:Number(b.transport.distanceKm);requireValue(known==null||(Number.isFinite(known)&&known>=0&&known<=10000),'Enter a distance below 10,000 km.');
    r.transport={pickup,destination,airport,sharePlaceNames:b.transport.sharePlaceNames===true,landmark:clean(b.transport.landmark,500),scope:b.transport.scope,distanceKm:estimate?estimate.distanceKm:known,distanceSource:estimate?'Google Maps road route':known!=null?'Student entered':'Unavailable',durationMinutes:estimate?estimate.durationMinutes:null};
    r.details=r.serviceType+' ride · '+pickup.area+' → '+destination.area;
  }
  if(r.category===foodCategory){requireValue(r.serviceType==='Cook a meal'&&clean(b.cooking?.dishes,1000),'Enter the dishes you want.');const portions=Number(b.cooking?.portions);requireValue(Number.isSafeInteger(portions)&&portions>=1&&portions<=500,'Enter 1–500 portions.');r.cooking={dishes:clean(b.cooking.dishes,1000),portions};}
  if(r.category==='Delivery'){
    requireValue(clean(b.delivery?.item,500)&&clean(b.delivery?.pickupPoint,500)&&clean(b.delivery?.dropOffPoint,500)&&deliveryAreas.includes(b.delivery?.pickupArea)&&deliveryAreas.includes(b.delivery?.dropOffArea),'Enter the item, pickup, drop off and coverage areas.');
    r.delivery={item:clean(b.delivery.item,500),pickupPoint:clean(b.delivery.pickupPoint,500),dropOffPoint:clean(b.delivery.dropOffPoint,500),pickupArea:b.delivery.pickupArea,dropOffArea:b.delivery.dropOffArea};
    if(b.delivery.foodOrderId){const order=state.requests.find(x=>x.id===b.delivery.foodOrderId&&x.owner===user.id&&x.kind==='food-order'&&x.status==='Accepted'&&x.foodOrder.fulfilment==='Pickup');requireValue(order,'Use an accepted pickup order.',409);requireValue(!state.requests.some(x=>x.delivery?.foodOrderId===order.id&&x.owner===user.id&&!['Cancelled','Resent'].includes(x.status)),'A delivery request already exists for this order.',409);if(deliveryAreas.includes(order.foodOrder.pickupArea))r.delivery.pickupArea=order.foodOrder.pickupArea;Object.assign(r.delivery,{foodOrderId:order.id,foodPurchaseTotal:order.foodOrder.total,foodSeller:order.foodOrder.sellerName,pickupPoint:order.foodOrder.pickupPoint});}
  }
  if(r.category==='Housing'){
    r.propertyTypes=cleanEntries(b.propertyTypes);
    requireValue(r.propertyTypes.every(type=>propertyTypes.includes(type)),'Choose a valid room type.');
  }
  if(r.category==='Cleaning')r.cleaning=cleaningDetails(b.cleaning);
  r.serviceLocation=serviceLocationFor(r.category,r.mode,b.serviceLocation);
  requireValue(!r.target || eligible(state,r,target),'This provider is unavailable for that request.');
  return publishRequest(state,r);
});
function cleaningDetails(value){
 if(!value?.propertyType)return null;
 const {propertyType}=value,areas=cleanEntries(value.areas),workAreas=amount(value.workAreas,true);
 requireValue(cleaningPropertyTypes.includes(propertyType)&&areas.every(area=>cleaningAreas.includes(area)),'Choose a valid property type and cleaning areas.');
 requireValue(workAreas===null||workAreas>=1&&workAreas<=500,'Enter a valid number of rooms or work areas.');
 return {propertyType,areas,workAreas};
}
function publishRequest(state,r){
 state.requests.unshift(r);
 for(const recipient of new Set(state.listings.filter(l=>eligible(state,r,l)).map(l=>l.owner))){
  notify(state,recipient,'request',r,null,'request:'+r.id,'New matching request',(r.serviceType || r.category)+' · '+r.time,'provider');
 }
 return {id:r.id};
}
function createFoodOrder(state,user,b){
 requireRole(state,user,'customer');requireValue(b.category===foodCategory&&findCategory(state,foodCategory)?.visible!==false,'Choose Food & Cooking to order food.');
 const l=state.listings.find(x=>x.id===b.target&&x.campus===user.campus&&x.available&&!x.moderation?.hidden&&!state.users.some(u=>u.id===x.owner&&u.status==='suspended')&&x.food?.kind==='menu');requireValue(l&&l.owner!==user.id,'This food item is unavailable.',409);
 const quantity=Number(b.foodOrder.quantity),fulfilment=b.foodOrder.fulfilment;requireValue(Number.isSafeInteger(quantity)&&quantity>=1&&quantity<=100&&l.food.fulfilment.includes(fulfilment),'Choose 1–100 items and an available fulfilment option.');
 const subtotal=amount(l.price*quantity),deliveryFee=fulfilment==='Seller delivery'?l.food.deliveryFee:0,total=amount(subtotal+deliveryFee);requireValue(amount(b.expectedTotal)===total,'The menu price changed. Review the current total.',409);
 const dropOffPoint=clean(b.foodOrder.dropOffPoint,500);requireValue(fulfilment!=='Seller delivery'||dropOffPoint,'Enter the delivery drop off point.');const schedule=requestSchedule(b);requireValue(schedule.time,'Choose when you need the food.');
 const r={id:randomUUID(),kind:'food-order',owner:user.id,student:user.name,campus:user.campus,category:foodCategory,categoryId:findCategory(state,foodCategory).id,serviceType:serviceName(l),target:l.id,mode:fulfilment,...schedule,details:quantity+' × '+l.title,status:'Pending seller',offers:[],created:Date.now(),foodOrder:{item:l.title,unitPrice:l.price,quantity,fulfilment,subtotal,deliveryFee,total,seller:l.owner,sellerName:(state.businesses || []).find(x=>x.id===l.businessId&&x.owner===l.owner)?.name || state.users.find(u=>u.id===l.owner)?.name || l.title,pickupPoint:l.food.pickupPoint || l.area,pickupArea:l.food.pickupArea || l.area,dropOffPoint,inclusions:structuredClone(l.inclusions || []),customInclusions:structuredClone(l.customInclusions || [])}};
 state.requests.unshift(r);notify(state,l.owner,'order',r,null,'order:'+r.id,'New food order',r.details+' · ₦'+total.toLocaleString('en-NG'),'provider');return {id:r.id};
}
mutate('requests/:id/order-response',(state,user,b,p)=>{
 requireRole(state,user,'provider');const r=requestBy(state,p.id);requireValue(r.kind==='food-order'&&r.foodOrder.seller===user.id&&r.campus===user.campus,'Order unavailable.',404);requireValue(r.status==='Pending seller'&&['accept','decline'].includes(b.decision),'This order has already been handled.',409);
 r.status=b.decision==='accept'?'Accepted':'Declined';r.orderUpdatedAt=Date.now();(r.seenBy ||= {})[user.id]=r.orderUpdatedAt;for(const n of state.notifications || [])if(n.recipient===user.id&&n.requestId===r.id&&n.type==='order'&&!n.readAt)n.readAt=r.orderUpdatedAt;r.sellerNote=clean(b.note,500);
 if(b.decision==='accept'){const f=r.foodOrder,o={id:randomUUID(),listing:r.target,provider:user.id,revision:1,messages:[],updatedAt:r.orderUpdatedAt,terms:{price:f.total,time:r.time,serviceType:r.serviceType,inclusions:f.inclusions,customInclusions:f.customInclusions,details:f.quantity+' × '+f.item+' · '+f.fulfilment+' · seller delivery fee ₦'+f.deliveryFee}};r.offers.push(o);r.confirmed=o.id;r.booking={provider:user.id,providerName:f.sellerName,listing:r.target,listingTitle:f.item,agreedPrice:f.total,time:r.time,terms:structuredClone(o.terms),offerRevision:1,confirmedAt:r.orderUpdatedAt};}
 notify(state,r.owner,'order',r,null,'order:'+r.id+':'+r.status,'Food order '+r.status.toLowerCase(),r.details,'customer');
});
function requestBy(state,id) {
  const r=state.requests.find(r=>r.id===id);
  requireValue(r,'Request unavailable.',404);
  return r;
}
function ownOpenRequest(state,user,id){
 const r=requestBy(state,id);
 requireValue(r.owner===user.id,'Request unavailable.',404);
 requireValue(isOpenServiceRequest(r),'This request is no longer open.',409);
 return r;
}
mutate('requests/:id/cancel',(state,user,_b,p)=>{
 const r=ownOpenRequest(state,user,p.id);
 r.status='Cancelled';r.closedAt=Date.now();
 for(const o of r.offers)notify(state,o.provider,'cancelled',r,o,'cancelled:'+r.id,'Request cancelled',r.serviceType||r.category,'provider');
});
mutate('requests/:id/resend',(state,user,b,p)=>{
 const original=ownOpenRequest(state,user,p.id),now=Date.now();
 const retryAt=requestRetryAt(original);
 requireValue(retryAt!==null&&now>=retryAt,'You can send an unanswered request again after two hours.',409);
 const record=findCategory(state,categoryKey(state,original));
 requireValue(record&&record.visible!==false,'This category is no longer available.',409);
 const schedule=requestSchedule(b);requireValue(schedule.time,'Enter your preferred day and time.');
 const {dismissed,seenBy,...details}=original;
 const r={...details,id:randomUUID(),created:now,...schedule,offers:[],resentFrom:original.id};
 requireValue(!r.target||eligible(state,r,state.listings.find(l=>l.id===r.target)),'This provider is unavailable. Start a new request to reach other providers.',409);
 original.status='Resent';original.closedAt=now;original.resentTo=r.id;
 return publishRequest(state,r);
});
mutate('requests/:id/revise',(state,user,b,p)=>{
 const r=ownOpenRequest(state,user,p.id);
 requireValue(!r.offers.length,'You already received an offer. Review it or start a new request.',409);
 const before=new Set(state.listings.filter(l=>eligible(state,r,l)).map(l=>l.owner));
 const next={...r,...requestSchedule(b),budget:amount(b.budget,true)};
 if(!['Housing','Transport','Delivery'].includes(r.category)){
  requireValue(!b.mode||appointmentTypes.includes(b.mode),'Choose a valid appointment type.');
  next.mode=b.mode || '';
  next.serviceLocation=serviceLocationFor(r.category,next.mode,b.serviceLocation===undefined?r.serviceLocation:b.serviceLocation);
 }
 requireValue(next.time,'Enter your preferred day and time.');
 requireValue(!next.target||eligible(state,next,state.listings.find(l=>l.id===next.target)),'This provider is unavailable for the selected appointment type.',409);
 if(next.time===r.time&&next.appointmentAt===r.appointmentAt&&next.budget===r.budget&&next.mode===r.mode&&JSON.stringify(next.serviceLocation)===JSON.stringify(r.serviceLocation))return;
 const editedAt=Date.now();Object.assign(r,next,{editedAt});
 const recipients=new Set(state.listings.filter(l=>eligible(state,r,l)&&!before.has(l.owner)).map(l=>l.owner));
 for(const recipient of recipients)notify(state,recipient,'request',r,null,'request:'+r.id+':'+editedAt,'New matching request',r.serviceType||r.category,'provider');
});
function bookingFor(state,user,id){
 const r=requestBy(state,id),o=r.offers.find(offer=>offer.id===r.confirmed);
 requireValue(o&&(r.owner===user.id||o.provider===user.id),'Booking unavailable.',404);
 requireValue(availableBooking(r),'This booking is closed.',409);
 return {r,o};
}
function bookingNotice(state,r,o,user,type,title){
 const customer=user.id===r.owner;
 notify(state,customer?o.provider:r.owner,'booking',r,o,type+':'+r.id+':'+randomUUID(),title,r.serviceType||r.category,customer?'provider':'customer');
}
mutate('requests/:id/reschedule',(state,user,b,p)=>{
 const {r,o}=bookingFor(state,user,p.id),at=bookingTime(b.appointment);
 requireValue(at&&at>Date.now()&&at!==r.booking.scheduledAt,'Choose a different future appointment in Nigeria time.');
 requireValue(!r.booking.proposedTime||r.booking.proposedTime.at<=Date.now(),'Resolve the current time proposal first.',409);
 r.booking.proposedTime={id:randomUUID(),by:user.id,at};r.booking.changedAt=Date.now();
 bookingNotice(state,r,o,user,'reschedule','New appointment time proposed');
});
mutate('requests/:id/reschedule-response',(state,user,b,p)=>{
 const {r,o}=bookingFor(state,user,p.id),proposal=r.booking.proposedTime;
 requireValue(proposal&&proposal.id===b.proposal&&proposal.by!==user.id&&['accept','decline'].includes(b.decision),'This proposal is unavailable.',409);
 if(b.decision==='accept'){
  requireValue(proposal.at>Date.now(),'This proposed time has passed.',409);
  r.booking.scheduledAt=proposal.at;r.booking.time=formatBookingTime(proposal.at);
 }
 r.booking.proposedTime=null;r.booking.changedAt=Date.now();
 bookingNotice(state,r,o,user,'reschedule-response',b.decision==='accept'?'New appointment time accepted':'New appointment time declined');
});
mutate('requests/:id/cancel-booking',(state,user,b,p)=>{
 const {r,o}=bookingFor(state,user,p.id),reason=clean(b.reason,400);
 requireValue(reason,'Enter a cancellation reason.');
 r.status='Cancelled';r.closedAt=Date.now();r.booking.proposedTime=null;r.booking.cancellation={reason,by:user.id};
 bookingNotice(state,r,o,user,'booking-cancelled','Booking cancelled');
});
mutate('requests/:id/meeting-address',(state,user,b,p)=>{
 const {r,o}=bookingFor(state,user,p.id);
 requireValue(r.owner===user.id&&['Home visit','Office visit'].includes(r.booking.terms.mode),'This address cannot be edited from this account.',403);
 const address=clean(b.address,400);if(address===(r.booking.meetingAddress || ''))return;
 r.booking.meetingAddress=address;r.booking.changedAt=Date.now();
 bookingNotice(state,r,o,user,'address','Private appointment address updated');
});
mutate('requests/:id/dismiss',(state,user,b,p)=>{
  const r=requestBy(state,p.id);
  if(r.category!=='Housing')requireRole(state,user,'provider');
  requireValue(r.status==='Open' && state.listings.some(l=>l.owner===user.id && eligible(state,r,l)), 'Request unavailable.',404);
  requireValue(!r.offers.some(o=>o.provider===user.id),'You already responded to this request.');
  r.dismissed=[...new Set([...(r.dismissed || []),user.id])];
});
mutate('requests/:id/offer',(state,user,b,p)=>{
  const r=requestBy(state,p.id);
  if(r.category!=='Housing')requireRole(state,user,'provider');
  const listing=state.listings.find(l=>l.id===b.listing && l.owner===user.id);
  requireValue(r.status==='Open' && eligible(state,r,listing),'This request is no longer available.',409);
  let terms;
  if(b.acceptBudget===true){
    requireValue(r.budget!=null&&b.expectedBudget===r.budget&&(b.expectedEditAt || 0)===(r.editedAt || 0),'The customer’s request changed. Review it before accepting.',409);
    requireValue(!r.appointmentAt||r.appointmentAt>Date.now(),'The requested appointment has passed. Send a quote with a new time.',409);
    terms={price:r.budget,time:r.time,...(r.appointmentAt?{appointmentAt:r.appointmentAt}:{}),mode:r.mode,serviceType:serviceName(listing),
     acceptedBudget:true,details:'Agreed to the customer’s requested service and budget.',inclusions:cleanEntries(listing.inclusions),customInclusions:cleanEntries(listing.customInclusions),
     extras:[],...(r.cooking?{ingredients:b.ingredients}:{} )};
    if(r.cooking&&terms.ingredients!=='Included')terms.inclusions=terms.inclusions.filter(item=>item!=='Ingredients');
  }else{
    const appointmentAt=b.appointment?bookingTime(b.appointment):null;
    requireValue(!b.appointment||appointmentAt&&appointmentAt>Date.now(),'Choose a future appointment in Nigeria time.');
    const lineItems=Array.isArray(b.lineItems)?b.lineItems.slice(0,12).map(item=>({name:clean(item.name,100),price:amount(item.price)})):[];
    requireValue(lineItems.every(item=>item.name)&&quoteTotal(lineItems)<=100000000,'Enter a name and valid total for the quote items.');
    terms={...(lineItems.length?{lineItems}:{}),...(appointmentAt?{appointmentAt}:{}),price:lineItems.length?quoteTotal(lineItems):amount(b.price),time:appointmentAt?formatBookingTime(appointmentAt):clean(b.time,100),details:clean(b.details,1000),mode:r.mode,serviceType:serviceName(listing),...(r.cooking?{ingredients:b.ingredients}:{}),inclusions:cleanEntries(b.inclusions),customInclusions:cleanEntries(b.customInclusions),extras:Array.isArray(b.extras)?b.extras.slice(0,30).map(e=>({name:clean(e.name,100),price:amount(e.price)})).filter(e=>e.name):[]};
  }
  if(r.cooking){requireValue(ingredientOptions.includes(terms.ingredients),'Clarify whether ingredients are included.');requireValue(terms.ingredients==='Included'||!terms.inclusions.includes('Ingredients'),'Remove Ingredients from inclusions when they are not included.');}
  requireValue(terms.time && (terms.details||terms.inclusions.length||terms.customInclusions.length),'Enter a time and select what is included or add a note.');
  const existing=r.offers.find(o=>o.provider===user.id);
  if(existing&&existing.listing===listing.id&&JSON.stringify(existing.terms)===JSON.stringify(terms))return {id:existing.id,revision:existing.revision};
  const now=Date.now();(r.seenBy ||= {})[user.id]=now;
  for(const n of state.notifications || [])if(n.recipient===user.id&&n.requestId===r.id&&['request','order'].includes(n.type)&&!n.readAt)n.readAt=now;
  if(existing)Object.assign(existing,{listing:listing.id,terms,revision:existing.revision+1,updatedAt:now});
  else r.offers.push({id:randomUUID(),listing:listing.id,provider:user.id,terms,revision:1,messages:[],created:now,updatedAt:now});
  const offer=existing || r.offers[r.offers.length-1];
  notify(state,r.owner,'offer',r,offer,'offer:'+offer.id+':'+offer.revision,terms.acceptedBudget?'Provider accepted your budget':existing?'Offer revised':'New offer received',listing.title+' · ₦'+terms.price.toLocaleString('en-NG'),'customer');
  return {id:offer.id,revision:offer.revision};
});
function offerBy(r,id,user) {
  const o=r.offers.find(o=>o.id===id && (r.owner===user.id || o.provider===user.id));
  requireValue(o,'Conversation unavailable.',404);
  return o;
}
mutate('requests/:id/offers/:offer/message',(state,user,b,p)=>{
  const r=requestBy(state,p.id), o=offerBy(r,p.offer,user);
  requireValue(r.status==='Open' || r.confirmed===o.id,'This conversation has closed.',409);
  const message=clean(b.message,1500);
  requireValue(message,'Write a message first.');
  const m={id:randomUUID(),sender:user.id,text:message,at:Date.now()};o.messages.push(m);
  const fromCustomer=r.owner===user.id;
  notify(state,fromCustomer?o.provider:r.owner,'message',r,o,'message:'+m.id,'New message from '+user.name,(r.serviceType || r.category)+' · '+message.slice(0,120),fromCustomer?'provider':'customer');
  return {id:m.id};
});
mutate('requests/:id/offers/:offer/confirm',(state,user,b,p)=>{
  const r=requestBy(state,p.id);
  if(r.category!=='Housing')requireRole(state,user,'customer');
  requireValue(r.owner===user.id,'Request unavailable.',404);
  const o=offerBy(r,p.offer,user);
  const listing=state.listings.find(l=>l.id===o.listing);
  requireValue(r.status==='Open' && b.revision===o.revision && eligible(state,r,listing),'The offer has changed or is unavailable. Refresh to review it.',409);
  r.status=r.category==='Housing'?'Viewing confirmed':'Booked';
  r.confirmed=o.id;
  r.bookedAt=Date.now();
  r.booking={provider:o.provider,providerName:state.users.find(u=>u.id===o.provider)?.name || listing.title,listing:o.listing,listingTitle:listing.title,terms:structuredClone(o.terms),agreedPrice:o.terms.price,time:o.terms.time,scheduledAt:o.terms.appointmentAt || null,offerRevision:o.revision,confirmedAt:r.bookedAt,...(r.category==='Transport'?{agreedFare:o.terms.price,driver:o.provider,transport:structuredClone(r.transport)}:{})};
  notify(state,o.provider,'booking',r,o,'booking:'+r.id+':'+o.id,'Your offer was confirmed',(r.serviceType || r.category)+' · ₦'+o.terms.price.toLocaleString('en-NG')+' · '+o.terms.time,'provider');
});


app.get('/api/config',(_req,res)=>res.json({mapsBrowserKey:process.env.GOOGLE_MAPS_BROWSER_KEY || '',routingConfigured:!!process.env.GOOGLE_MAPS_SERVER_KEY}));
app.post('/api/transport/route',async(req,res)=>{
  const user=auth(await read(),req);
  requireValue(process.env.GOOGLE_MAPS_SERVER_KEY,'Route estimates are unavailable. Continue with manual locations.',503);
  const pickup=coordinate(req.body.pickup),destination=coordinate(req.body.destination);
  requireValue(pickup&&destination,'Set both map locations first.');
  const now=Date.now(),attemptKey='maps:'+user.id;const routeAttempt=attempts.get(attemptKey);const current=routeAttempt&&routeAttempt.expires>now?routeAttempt:{count:0,expires:now+60000};attempts.set(attemptKey,current);requireValue(++current.count<=10,'Please wait a minute before recalculating another route.',429);
  const response=await fetch('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json','X-Goog-Api-Key':process.env.GOOGLE_MAPS_SERVER_KEY,'X-Goog-FieldMask':'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline'},body:JSON.stringify({origin:{location:{latLng:{latitude:pickup.lat,longitude:pickup.lng}}},destination:{location:{latLng:{latitude:destination.lat,longitude:destination.lng}}},travelMode:'DRIVE',routingPreference:'TRAFFIC_UNAWARE'})});
  const result=await response.json();const route=result.routes?.[0];
  requireValue(response.ok&&route&&Number.isFinite(route.distanceMeters)&&Number.isFinite(parseFloat(route.duration)),'No road route found. Continue with manual locations and an optional known distance.',503);
  const estimate={id:randomUUID(),owner:user.id,pickup,destination,distanceKm:Math.round(route.distanceMeters/10)/100,durationMinutes:Math.ceil(parseFloat(route.duration)/60),expires:Date.now()+30*60000};
  await update(state=>{state.routeEstimates=[...(state.routeEstimates || []).filter(e=>e.expires>Date.now()),estimate];});
  res.json({...estimate,owner:undefined,polyline:route.polyline?.encodedPolyline || ''});
});

mutate('businesses',(state,user,b)=>{
  requireRole(state,user,'provider');
  const old=(state.businesses || []).find(x=>x.id===b.id&&x.owner===user.id&&x.campus===user.campus);
  requireValue(!b.id||old,'Business page unavailable.',404);
  const name=clean(b.name,100),description=clean(b.description,2000),areas=cleanEntries(b.areas);
  requireValue(name&&description&&areas.length,'Add your business name, description and areas served.');
  const galleryIds=Array.isArray(b.galleryIds)?[...new Set(b.galleryIds)]:old?.galleryIds || [];
  const flyerPhotoId=b.flyerPhotoId===undefined?old?.flyerPhotoId || null:b.flyerPhotoId || null;
  requireValue([...galleryIds,...(flyerPhotoId?[flyerPhotoId]:[])].every(id=>(state.photoAssets || []).some(a=>a.id===id&&photoOwned(a,user))),'A business photo is unavailable.');
  requireValue(!flyerPhotoId||galleryType(state,flyerPhotoId).startsWith('image/'),'Choose a photo for the flyer.');
  const coverIds=galleryIds.filter(id=>!galleryType(state,id).startsWith('video/'));
  const coverPhotoId=coverIds.includes(b.coverPhotoId)?b.coverPhotoId:coverIds[0] || null;
  const category=findCategory(state,b.category)?.value || old?.category || null;
  const business={id:old?.id || randomUUID(),owner:user.id,campus:user.campus,name,description,areas,category,galleryIds,coverPhotoId,flyerPhotoId,image:coverPhotoId?'/api/photos/'+coverPhotoId:'',created:old?.created || Date.now()};
  if(old)Object.assign(old,business);else(state.businesses ||= []).push(business);return {id:business.id};
});
function galleryType(state,id){return (state.photoAssets || []).find(asset=>asset.id===id)?.type || 'image/jpeg';}
app.post('/api/gallery-video',async(req,res)=>{
 const type=req.get('content-type'),bytes=req.body;
 requireValue(galleryVideoTypes.includes(type)&&Buffer.isBuffer(bytes)&&validGalleryVideo(bytes,type),'Choose an MP4 or WebM video up to 25 MB.');
 const asset=await update(async state=>{
   const user=auth(state,req);
   const entry={id:randomUUID(),owner:user.id,type,created:Date.now()};
   await photoStorage.put(entry.id,bytes,type);
   (state.photoAssets ||= []).push(entry);
   return entry;
 });
 res.json({id:asset.id,url:'/api/photos/'+asset.id,type});
});
app.get('/api/businesses/:id/photos',async(req,res)=>{
  const state=await read(),user=auth(state,req),b=(state.businesses || []).find(b=>b.id===req.params.id&&b.campus===user.campus);requireValue(b,'Business unavailable.',404);
  const query=new URL(req.originalUrl,'http://local').searchParams;const offset=Math.max(0,Number(query.get('offset'))||0),limit=Math.max(1,Math.min(20,Number(query.get('limit'))||6));
  res.json({items:b.galleryIds.slice(offset,offset+limit).map(id=>({id,url:'/api/photos/'+id,type:galleryType(state,id)})),next:offset+limit<b.galleryIds.length?offset+limit:null,total:b.galleryIds.length});
});
mutate('photos',async(state,user,b)=>{
  const match=/^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/]+=*)$/.exec(b.image || '');
  requireValue(match,'Choose a JPG, PNG or WebP photo.');
  const bytes=Buffer.from(match[2],'base64');requireValue(bytes.length>12&&bytes.length<=(b.kind==='flyer'?2500000:800000),b.kind==='flyer'?'Compress the flyer below 2.5 MB.':'Compress the photo below 800 KB.');
  const valid=match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216:match[1]==='png'?bytes.subarray(1,4).toString()==='PNG':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  requireValue(valid,'The photo format could not be read.');
  const asset={id:randomUUID(),owner:user.id,type:'image/'+match[1],created:Date.now()};await photoStorage.put(asset.id,bytes,asset.type);(state.photoAssets ||= []).push(asset);return {id:asset.id,url:'/api/photos/'+asset.id};
});
app.post('/api/profile-photo',async(req,res)=>{
 const current=auth(await read(),req);
 let avatar=null,bytes;
 if(req.body.image!==null){
  const data=/^data:image\/webp;base64,([A-Za-z0-9+/]+=*)$/.exec(req.body.image || '');
  requireValue(data,'Choose a profile photo.');
  bytes=Buffer.from(data[1],'base64');
  requireValue(bytes.length>12&&bytes.length<=800000&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP','Choose a valid profile photo under 800 KB.');
  avatar={id:randomUUID()};
 }
 let saved;
 try{
  if(avatar)await photoStorage.put(avatar.id,bytes,'image/webp');
  saved=await update(state=>{
   const user=auth(state,req);requireValue(user.id===current.id,'Your account changed. Try again.',409);
   const old=user.avatar;user.avatar=avatar;return {old,avatarUrl:avatarUrl(user)};
  });
 }catch(error){
  if(avatar)await photoStorage.remove(avatar.id).catch(()=>{});
  throw error;
 }
 if(saved.old)await photoStorage.remove(saved.old.id).catch(()=>{});
 res.json({avatarUrl:saved.avatarUrl});
});
app.get('/api/profile-photo/:id',async(req,res)=>{
 const state=await read(),viewer=auth(state,req);
 const owner=state.users.find(u=>u.avatar?.id===req.params.id&&u.status!=='suspended');
 const published=owner&&providerAvatar(state,owner)&&(state.listings.some(l=>l.owner===owner.id&&l.campus===viewer.campus&&l.available&&!l.moderation?.hidden&&!l.demo)||(state.businesses || []).some(b=>b.owner===owner.id&&b.campus===viewer.campus));
 requireValue(owner&&(viewer.id===owner.id||(owner.campus===viewer.campus&&(published||privateAvatarMatch(state,viewer,owner)))),'Profile photo unavailable.',404);
 const bytes=await photoStorage.get(owner.avatar.id);
 requireValue(bytes,'Profile photo unavailable.',404);
 res.set('Content-Type','image/webp').set('X-Content-Type-Options','nosniff').set('Cache-Control','private, no-store').send(Buffer.from(bytes));
});
app.get('/api/photos/:id',async(req,res)=>{
  const state=await read(),user=userFrom(state,req)||adminFrom(state,req);requireValue(user,'Sign in to continue.',401);const asset=(state.photoAssets || []).find(a=>a.id===req.params.id);
  requireValue(asset&&((user&&photoOwned(asset,user))||state.listings.some(l=>l.campus===user.campus&&(l.galleryIds?.includes(asset.id)||l.flyerPhotoId===asset.id))||(state.businesses || []).some(b=>b.campus===user.campus&&(b.galleryIds?.includes(asset.id)||b.flyerPhotoId===asset.id))),'Photo unavailable.',404);
  const bytes=await photoStorage.get(asset.id);requireValue(bytes,'Photo unavailable.',404);res.set('Content-Type',asset.type).set('Cache-Control','no-store');
  if(asset.type.startsWith('video/'))return sendGalleryVideo(req,res,Buffer.from(bytes));
  res.send(Buffer.from(bytes));
});
app.get('/api/listings/:id/photos',async(req,res)=>{
  const state=await read(),user=userFrom(state,req)||adminFrom(state,req);requireValue(user,'Sign in to continue.',401);const l=state.listings.find(l=>l.id===req.params.id&&l.campus===user.campus);requireValue(l,'Listing unavailable.',404);
  const ids=l.galleryIds?.length?l.galleryIds:l.image?['legacy']:[];const query=new URL(req.originalUrl,'http://local').searchParams;
  const offset=Math.max(0,Number(query.get('offset'))||0),limit=Math.max(1,Math.min(20,Number(query.get('limit'))||6));
  res.json({items:ids.slice(offset,offset+limit).map(id=>({id,url:id==='legacy'?l.legacyImage || l.image:'/api/photos/'+id,type:galleryType(state,id)})),next:offset+limit<ids.length?offset+limit:null,total:ids.length});
});
mutate('roommates',(state,user,b)=>{
  requireValue(['spot','request'].includes(b.kind),'Choose a roommate post type.');
  requireValue(roommateAreas.includes(b.area),'Choose an area around Abraka.');
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(b.moveIn || '')&&!Number.isNaN(Date.parse(b.moveIn))&&new Date(b.moveIn).toISOString().slice(0,10)===b.moveIn,'Choose a move in date.');
  requireValue(b.kind!=='spot'||propertyTypes.includes(b.roomType),'Choose a room type.');
  requireValue(b.kind!=='request'||roommateIntents.includes(b.intent),'Choose how you want to find a roommate.');
  const image=clean(b.image,900000);
  requireValue(!image||/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(image),'Use a JPG, PNG or WebP photo.');
  const post={id:randomUUID(),campus:user.campus,owner:user.id,kind:b.kind,area:b.area,roomType:b.kind==='spot'?b.roomType:'',intent:b.kind==='request'?b.intent:'',cost:b.kind==='spot'?amount(b.cost):null,budget:b.kind==='request'?amount(b.budget):null,moveIn:b.moveIn,image:b.kind==='spot'?image:'',preferences:cleanEntries(b.preferences).filter(x=>roommatePreferences.includes(x)),status:'Open',created:Date.now()};
  (state.roommatePosts ||= []).unshift(post);return {id:post.id};
});
mutate('roommates/:id/close',(state,user,b,p)=>{
  const post=(state.roommatePosts || []).find(post=>post.id===p.id&&post.owner===user.id&&post.campus===user.campus);
  requireValue(post,'Roommate post unavailable.',404);post.status='Closed';
});
mutate('roommates/:id/respond',(state,user,b,p)=>{
  const post=(state.roommatePosts || []).find(post=>post.id===p.id&&post.campus===user.campus);
  requireValue(post&&post.status==='Open'&&!post.moderation?.hidden&&!state.users.some(u=>u.id===post.owner&&u.status==='suspended')&&post.owner!==user.id,'Roommate post unavailable.',404);
  const message=clean(b.message,1500);requireValue(message,'Write a private message.');
  let conversation=(state.roommateConversations || []).find(c=>c.postId===post.id&&c.responder===user.id);
  if(!conversation){conversation={id:randomUUID(),postId:post.id,campus:user.campus,author:post.owner,responder:user.id,messages:[]};(state.roommateConversations ||= []).push(conversation);}
  conversation.messages.push({id:randomUUID(),sender:user.id,text:message,at:Date.now()});return {id:conversation.id};
});
mutate('roommate-conversations/:id/message',(state,user,b,p)=>{
  const c=(state.roommateConversations || []).find(c=>c.id===p.id&&c.campus===user.campus&&(c.author===user.id||c.responder===user.id));
  requireValue(c,'Conversation unavailable.',404);const message=clean(b.message,1500);requireValue(message,'Write a message first.');
  c.messages.push({id:randomUUID(),sender:user.id,text:message,at:Date.now()});
});

mutate('reports',(state,user,b)=>{
 const type=clean(b.targetType,40),id=clean(b.targetId,100);let item,reportedUser;
 if(type==='listing')item=state.listings.find(x=>x.id===id&&x.campus===user.campus);
 if(type==='roommate')item=(state.roommatePosts || []).find(x=>x.id===id&&x.campus===user.campus);
 if(type==='guide-entry')item=campusGuide(state,user.campus).entries.find(x=>x.id===id);
 if(type==='roommate-conversation'){const c=(state.roommateConversations || []).find(c=>c.id===id&&c.campus===user.campus&&(c.author===user.id||c.responder===user.id));if(c){item={title:'Roommate conversation'};reportedUser=c.author===user.id?c.responder:c.author;}}
 if(type==='conversation'){const r=state.requests.find(x=>x.id===b.requestId&&x.campus===user.campus);const o=r?.offers.find(o=>o.id===id&&(r.owner===user.id||o.provider===user.id));if(o){item={title:r.details};reportedUser=r.owner===user.id?o.provider:r.owner;}}
 requireValue(item,'Report item unavailable.',404);const reason=clean(b.reason,1500);requireValue(reason,'Describe the problem.');
 const existing=(state.reports || []).find(r=>r.reporter===user.id&&r.targetType===type&&r.targetId===id&&r.status==='open');if(existing)return {id:existing.id};
 const report={id:randomUUID(),campus:user.campus,reporter:user.id,reporterName:user.name,targetType:type,targetId:id,targetLabel:item.title || item.name || item.area,reportedUser:reportedUser || item.owner || null,requestId:type==='conversation'?b.requestId:null,reason,category:clean(b.category,100),status:'open',created:Date.now()};(state.reports ||= []).push(report);return {id:report.id};
});
mutate('ads/:id/event',(state,user,b,p)=>{

 const ad=liveContent(state.advertisements,user.campus).find(a=>a.id===p.id);requireValue(ad&&ad.placement===b.placement,'Ad unavailable.',404);requireValue(['impression','click'].includes(b.type)&&/^[a-zA-Z0-9_-]{8,100}$/.test(b.viewId),'Invalid ad event.');
 const events=state.adEvents ||= [];if(!events.some(e=>e.ad===ad.id&&e.user===user.id&&e.viewId===b.viewId&&e.type===b.type))events.push({ad:ad.id,user:user.id,viewId:b.viewId,type:b.type,at:Date.now()});
});
registerAdminRoutes(app,{read,update,hashPassword:async(password,salt)=>scryptSync(password,salt,64).toString('hex'),photoStorage,bootstrapHash:process.env.ADMIN_BOOTSTRAP_HASH,production,roleInfo});
app.use('/api', (_req,res)=>res.status(404).json({error:'Endpoint unavailable.'}));
app.get(/^\/admin(?:\/.*)?$/,async(req,res)=>{res.set('Cache-Control','no-store').set('Vary','Cookie');if(!['/admin/login','/admin/setup'].includes(req.path)&&!adminFrom(await read(),req))return res.redirect(302,'/admin/login');res.sendFile(resolve('dist/index.html'));});
app.get(/^\/app(?:\/.*)?$/,async(req,res)=>{
 res.set('Cache-Control','no-store').set('Vary','Cookie');
 if(!userFrom(await read(),req))return res.redirect(302,welcomePath(req.originalUrl));
 res.sendFile(resolve('dist/index.html'));
});
app.get(['/signin','/signup/customer','/signup/provider','/welcome'],(_req,res)=>res.set('Cache-Control','no-store').sendFile(resolve('dist/index.html')));
app.use(express.static(resolve('dist'),{setHeaders(res,path){if(path.endsWith('index.html'))res.setHeader('Cache-Control','no-store');else if(path.endsWith('manifest.webmanifest')||path.endsWith('/sw.js'))res.setHeader('Cache-Control','no-cache, max-age=0, must-revalidate');else if(/\/icons\/loop-v3/.test(path))res.setHeader('Cache-Control','public, max-age=31536000, immutable');}}));
app.get('/',(_req,res)=>res.sendFile(resolve('dist/index.html')));
app.use((error,_req,res,_next)=>{
  if (!error.status) console.error(error);
  res.status(error.status || 500).json({error:error.status ? error.message : 'Something went wrong. Please try again.'});
});
app.listen(Number(process.env.PORT || 3001),process.env.HOST || '127.0.0.1');
