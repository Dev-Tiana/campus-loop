from pathlib import Path
s=Path('server/index.js').read_text()
start=s.index('const requireValue')
end=s.index("app.use('/api', (_req,res)")
s=s[start:end]
s=s.replace("const attempts = new Map();",'')
s=s.replace("const user = await update(state => {","const user = await update(async state => {")
s=s.replace("scryptSync(password,salt,64).toString('hex')","await passwordHash(password,salt)")
s=s.replace("const hash = scryptSync(password,u?.salt || 'campusloop-login',64);","const hash = Buffer.from(await passwordHash(password,u?.salt || 'campusloop-login'),'hex');")
s=s.replace("app.post('/api/gallery-video',express.raw({type:galleryVideoTypes,limit:maxVideoBytes}));", '')
head="""import {appointmentReminders,defaultReminders,visibleAppointmentReminder} from '../shared/appointment-reminders.js';
import {serviceAreas,allowsServiceLocation} from '../shared/service-location.js';
import {cleaningPropertyTypes,cleaningAreas,matchesProperty,availableBooking,bookingTime,formatBookingTime,quoteTotal} from '../shared/booking-options.js';
import {canClearRequest,isOpenServiceRequest,requestRetryAt} from '../shared/request-lifecycle.js';
import {deliverPush,makePushKeys,pushJobs,validSubscription} from '../server/push.js';
import {galleryVideoTypes,maxVideoBytes,validGalleryVideo,sendGalleryVideo} from '../shared/gallery-media.js';
import {registerAdminRoutes} from '../server/admin.js';
import {adminFrom} from '../server/admin-auth.js';
import {publishedWelcome,liveContent} from '../shared/admin-content.js';
import {randomUUID,randomBytes,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {categories,seed} from '../server/seed.js';
import {normalizeSelections,propertyTypes} from '../shared/listing-options.js';
import {appointmentTypes,serviceName,sameService,cleanEntries,roommateAreas,roommatePreferences,roommateIntents} from '../shared/marketplace.js';
import {rideLocationLabel,vehicles,tripScopes,driverAvailability,tripAreas,coordinate,publicRide,transportMatches} from '../shared/transport.js';
import {verifyGoogleCredential} from '../server/google-auth.js';
import {categoryRecords,findCategory,categoryKey,campusGuide} from '../shared/catalog.js';
import {foodCategory,deliveryAreas,ingredientOptions,requestOpen,deliveryMatches} from '../shared/commerce.js';
const attempts=new Map();
async function passwordHash(password,salt){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,512);
 return Buffer.from(bits).toString('hex');
}
export async function handleApi(request,env){
 const production=true;
 const process={env:{ADMIN_BOOTSTRAP_HASH:env.ADMIN_BOOTSTRAP_HASH,ALLOW_AGENTS:env.ALLOW_AGENTS,GOOGLE_CLIENT_ID:env.GOOGLE_CLIENT_ID,GOOGLE_MAPS_BROWSER_KEY:env.GOOGLE_MAPS_BROWSER_KEY,GOOGLE_MAPS_SERVER_KEY:env.GOOGLE_MAPS_SERVER_KEY}};
 const store=env.marketplaceStore || {
  initialize:state=>env.DB.prepare('INSERT OR IGNORE INTO marketplace (id,revision,state) VALUES (?,0,?)').bind('state',JSON.stringify(state)).run(),
  read:()=>env.DB.prepare('SELECT state,revision FROM marketplace WHERE id=?').bind('state').first(),
  async write(state,revision){
    const result=await env.DB.prepare('UPDATE marketplace SET state=?,revision=revision+1 WHERE id=? AND revision=?').bind(state,'state',revision).run();
    return Boolean(result.meta.changes);
  }
 };
 if(!await store.read())await store.initialize(seed());
 const read=async()=>JSON.parse((await store.read()).state);
 async function update(action){
  for(let i=0;i<12;i++){
   const doc=await store.read();
   const state=JSON.parse(doc.state);const result=await action(state);
   if(await store.write(JSON.stringify(state),doc.revision))return result;
  }
  throw Object.assign(Error('Please retry that change.'),{status:409});
 }
 const photoStorage={async remove(id){await env.BUCKET?.delete?.(id);},async put(id,bytes,type){if(!env.BUCKET)throw Object.assign(Error('Photo storage is not configured.'),{status:503});await env.BUCKET.put(id,bytes,{httpMetadata:{contentType:type}});},async get(id){const obj=await env.BUCKET?.get(id);return obj?new Uint8Array(await obj.arrayBuffer()):null;}};
 const routes=[];
 const app={use(){},get(path,handler){routes.push({method:'GET',path,handler});},post(path,handler){routes.push({method:'POST',path,handler});}};
 const express={json(){}};
"""
tail="""
 const url=new URL(request.url);
 if(request.method==='POST'){
  if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==(env.PUBLIC_ORIGIN || url.origin)))return Response.json({error:'Request origin unavailable.'},{status:403});
  if(Number(request.headers.get('content-length'))>(url.pathname==='/api/gallery-video'?maxVideoBytes:5000000))return Response.json({error:'Photo is too large.'},{status:413});
 }
 for(const route of routes){
  const keys=[];
  const pattern=route.path.split('/').map(part=>part.startsWith(':')?(keys.push(part.slice(1)),'([^/]+)'):part).join('/');
  const match=new RegExp('^'+pattern+'$').exec(url.pathname);
  if(route.method!==request.method||!match)continue;
  let body={};
  if(request.method==='POST'&&url.pathname==='/api/gallery-video')body=Buffer.from(await request.arrayBuffer());
  else if(request.method==='POST'){const raw=await request.text();if(raw.length>5000000)return Response.json({error:'Photo is too large.'},{status:413});try{body=JSON.parse(raw||'{}');}catch{return Response.json({error:'Invalid request.'},{status:400});}}
  const req={originalUrl:url.pathname+url.search,body,params:Object.fromEntries(keys.map((key,i)=>[key,decodeURIComponent(match[i+1])])),headers:Object.fromEntries(request.headers),ip:request.headers.get('cf-connecting-ip')||'visitor',get:key=>request.headers.get(key)};
  const headers=new Headers({'Cache-Control':'no-store'});let status=200;let response;
  const res={set(k,v){headers.set(k,v);return this;},status(n){status=n;return this;},cookie(name,value,options){headers.append('Set-Cookie',name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+Math.floor(options.maxAge/1000));return this;},clearCookie(name){headers.append('Set-Cookie',name+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');return this;},send(value){response=new Response(value,{status,headers});return response;},json(value){response=Response.json(value,{status,headers});return response;}};
  try{await route.handler(req,res);return response||Response.json({},{headers});}catch(error){if(!error.status)console.error(error);return Response.json({error:error.status?error.message:'Something went wrong. Please try again.'},{status:error.status||500,headers});}
 }
 return Response.json({error:'Endpoint unavailable.'},{status:404});
}
"""
Path('worker/api.js').write_text(head+s+tail)
