import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
export async function exerciseWelcomeAccess(call,expiredCookie){
 const ok=async(...args)=>{const r=await call(...args);assert.equal(r.status,200,JSON.stringify(r.data));return r;};
 const c=await ok('/api/account/signup',{accountRole:'customer',name:'Welcome Customer',email:'welcomecustomer@example.com',password:'testonly123',campus:'delsu-abraka'}),p=await ok('/api/account/signup',{accountRole:'provider',name:'Welcome Provider',email:'welcomeprovider@example.com',password:'testonly123',campus:'delsu-abraka'});
 const business=(await ok('/api/businesses',{name:'Welcome business',description:'Nail services',category:'Nails',areas:['Abraka']},p.cookie)).data.id;
 const image='data:image/png;base64,'+readFileSync('public/icons/icon-192.png').toString('base64'),photo=(await ok('/api/photos',{image},p.cookie)).data.id;
 const listing=(await ok('/api/listings',{category:'Nails',title:'Private app listing',businessId:business,area:'Abraka',price:5000,serviceType:'Gel polish',modes:['Home visit'],inclusions:['Nail shaping'],galleryIds:[photo],coverPhotoId:photo},p.cookie)).data.id;
 const request=(await ok('/api/requests',{category:'Nails',details:'Private service request',time:'Saturday',mode:'Home visit',target:listing},c.cookie)).data.id;
 await ok('/api/roommates',{kind:'request',intent:'Find a place together',area:'Oria',budget:100000,moveIn:'2027-01-10'},c.cookie);
 for(const cookie of [undefined,expiredCookie]){const state=(await ok('/api/state',null,cookie)).data;assert.equal(state.user,null);assert.equal(state.sessionExpiresAt,null);for(const key of ['listings','businesses','requests','roommatePosts','roommateConversations','notifications'])assert.deepEqual(state[key],[]);assert.equal(state.unreadCount,0);
  for(const path of ['/api/session','/api/notifications','/api/requests/'+request,'/api/listings/'+listing+'/photos','/api/businesses/'+business+'/photos','/api/photos/'+photo]){const r=await call(path,null,cookie);assert.equal(r.status,401,path);assert.match(r.headers.get('cache-control'),/no-store/);}
  for(const path of ['/app','/app/marketplace','/app/requests','/app/requests/'+request,'/app/request-service?listing='+listing]){const r=await call(path,null,cookie);assert.equal(r.status,302,path);assert.ok(r.headers.get('location').startsWith('/?next='));assert.match(r.headers.get('cache-control'),/no-store/);assert.ok(!r.text.includes('Private service request'));}
 }
 for(const path of ['/','/signin','/signup/customer','/signup/provider']){const r=await ok(path);assert.match(r.headers.get('content-type'),/text\/html/);assert.ok(r.text.includes('id="root"'));}
 for(const who of [c,p]){
  assert.equal((await ok('/api/session',null,who.cookie)).data.user.accountRole,who.data.accountRole);assert.ok((await ok('/api/state',null,who.cookie)).data.sessionExpiresAt>Date.now());assert.ok((await ok('/api/state',null,who.cookie)).data.listings.some(l=>l.id===listing));
  const app=await ok('/app/marketplace',null,who.cookie);assert.match(app.headers.get('cache-control'),/no-store/);await ok('/api/listings/'+listing+'/photos',null,who.cookie);
  const bytes=await ok('/api/photos/'+photo,null,who.cookie);assert.match(bytes.headers.get('cache-control'),/no-store/);
  const logout=await ok('/api/account/logout',{},who.cookie);assert.match(logout.headers.get('set-cookie'),/(Max-Age=0|Expires=Thu, 01 Jan 1970)/i);
  assert.equal((await call('/api/session',null,who.cookie)).status,401);assert.deepEqual((await ok('/api/state',null,who.cookie)).data.listings,[]);assert.equal((await call('/app/requests',null,who.cookie)).status,302);
  const login=await ok('/api/account/login',{email:who===c?'welcomecustomer@example.com':'welcomeprovider@example.com',password:'testonly123'});assert.equal(login.data.accountRole,who.data.accountRole);assert.equal((await call('/app',null,login.cookie)).status,200);
 }
}
