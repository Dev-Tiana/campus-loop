import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import worker from './index.js';
test('hosted persistent listings, two accounts, private chat, booking and agent viewing',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_marketplace.sql','utf8'));
 const DB={
  prepare(sql){
   return {bind(...args){
    return {
     async first(){return db.prepare(sql).get(...args);},
     async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:result.changes}};}
    };
   }};
  }
 };
 async function call(path,body,cookie){const req=new Request('https://campusloop.test/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const res=await worker.fetch(req,{DB});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};}
 async function ok(...args){const r=await call(...args);assert.equal(r.status,200,JSON.stringify(r.data));return r;}
 const sign=async name=>ok('account/signup',{accountRole:name==='Student'?'customer':'provider',name,email:name+'@example.com',password:'testonly123',campus:'delsu-abraka'});
 const p=await sign('Provider'),s=await sign('Student'),other=await sign('Other');
 assert.equal((await call('businesses',{name:'Blocked',description:'No',areas:['Abraka']},s.cookie)).status,403);
 assert.equal((await call('requests',{category:'Nails'},p.cookie)).status,403);
 const gelBody={category:'Nails',title:'Hosted gel',area:'Abraka',price:5000,modes:['Home visit'],serviceType:'Gel polish',inclusions:['Nail shaping','Cuticle care','One gel colour'],customInclusions:['Free gel removal']};
 const gel=(await ok('listings',gelBody,p.cookie)).data.id;
 assert.equal((await call('businesses',{})).status,401);
 const business=(await ok('businesses',{name:'Hosted business',description:'Services around campus',areas:['Abraka'],category:'Nails'},p.cookie)).data.id;
 assert.equal((await call('businesses',{id:business,name:'Stolen',description:'No',areas:['Abraka']},other.cookie)).status,404);
 await ok('listings',{...gelBody,id:gel,businessId:business,extras:[{id:'removal',name:'Gel removal',price:1000}]},p.cookie);
 assert.equal((await ok('state',null,s.cookie)).data.listings.find(l=>l.id===gel).businessId,business);
 assert.equal((await ok('state',null,s.cookie)).data.businesses[0].name,'Hosted business');
 assert.equal((await ok('businesses/'+business+'/photos',null,s.cookie)).data.items.length,0);

 let state=(await ok('state',null,s.cookie)).data;let l=state.listings.find(l=>l.id===gel);assert.deepEqual(l.customInclusions,['Free gel removal']);assert.equal(l.description,'');
 await ok('listings',{...gelBody,id:gel},p.cookie);
 const request=(await ok('requests',{category:'Nails',details:'Gel please',budget:4500,mode:'Home visit',time:'Saturday',target:gel},s.cookie)).data.id;
 await ok('requests/'+request+'/offer',{listing:gel,price:5000,time:'Saturday',details:'',inclusions:['Nail shaping','Cuticle care'],customInclusions:['Gel removal']},p.cookie);
 const offer=(await ok('state',null,s.cookie)).data.requests.find(r=>r.id===request).offers[0];assert.deepEqual(offer.terms.customInclusions,['Gel removal']);const path='requests/'+request+'/offers/'+offer.id;
 await ok(path+'/message',{message:'Removal included?'},s.cookie);await ok(path+'/message',{message:'Yes'},p.cookie);assert.equal((await call(path+'/message',{message:'Intruder'},other.cookie)).status,404);
 assert.equal((await call(path+'/confirm',{revision:1},p.cookie)).status,403);
 await ok(path+'/confirm',{revision:1},s.cookie);assert.equal((await ok('state',null,p.cookie)).data.requests.find(r=>r.id===request).status,'Booked');
 const room=(await ok('listings',{category:'Housing',title:'Hosted room',area:'Abraka',price:280000,fees:5000,agentFee:15000,role:'Agent',permission:true,propertyType:'Self contained room',amenities:['Running water','Prepaid meter','Fenced compound','Window protectors']},p.cookie)).data.id;
 l=(await ok('state',null,s.cookie)).data.listings.find(l=>l.id===room);assert.equal(l.price+l.fees,300000);assert.equal(l.amenities.length,4);
 const view=(await ok('requests',{category:'Housing',details:'Viewing please',mode:'Viewing',time:'Monday',target:room},s.cookie)).data.id;
 await ok('requests/'+view+'/offer',{listing:room,price:300000,time:'Monday',details:'Rent and all fees'},p.cookie);const vo=(await ok('state',null,s.cookie)).data.requests.find(r=>r.id===view).offers[0];await ok('requests/'+view+'/offers/'+vo.id+'/confirm',{revision:1},s.cookie);
 assert.equal((await ok('state',null,p.cookie)).data.requests.find(r=>r.id===view).status,'Viewing confirmed');
 const spot=(await ok('roommates',{kind:'spot',area:'Campus 2 area',roomType:'Single room',cost:150000,moveIn:'2027-01-10'},s.cookie)).data.id;
 const convo=(await ok('roommates/'+spot+'/respond',{message:'Interested in the spot'},p.cookie)).data.id;
 await ok('roommate-conversations/'+convo+'/message',{message:'Let us discuss privately'},s.cookie);
 assert.equal((await ok('state',null,other.cookie)).data.roommateConversations.length,0);
 assert.equal((await call('roommate-conversations/'+convo+'/message',{message:'Intruder'},other.cookie)).status,404);
 await ok('roommates/'+spot+'/close',{},s.cookie);
 assert.equal((await call('roommates/'+spot+'/respond',{message:'Late reply'},other.cookie)).status,404);
 await ok('account/logout',{},s.cookie);assert.equal((await call('listings',gelBody,s.cookie)).status,401);
 const login=await ok('account/login',{email:'student@example.com',password:'testonly123'});assert.equal((await ok('state',null,login.cookie)).data.user.name,'Student');
 db.close();
});

test('Google signup, repeat sign-in, explicit account linking and rejected account takeover',async()=>{
 const {generateKeyPairSync,sign}=await import('node:crypto');
 const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk={...publicKey.export({format:'jwk'}),kid:'hosted-google-key',alg:'RS256'};
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[jwk]});
 const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_marketplace.sql','utf8'));
 const DB={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}};}};}};}};
 const clientId='hosted.apps.googleusercontent.com';const env={DB,GOOGLE_CLIENT_ID:clientId};
 async function call(path,body,cookie,customEnv=env){const r=await worker.fetch(new Request('https://campusloop.test/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined}),customEnv);return {status:r.status,data:await r.json(),cookies:r.headers.getSetCookie()};}
 const cookie=result=>result.cookies.map(c=>c.split(';')[0]).join('; ');
 function signed(nonce,email='google@example.com',sub='google-user'){
 const now=Math.floor(Date.now()/1000);const h=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url');const p=Buffer.from(JSON.stringify({iss:'https://accounts.google.com',aud:clientId,sub,email,email_verified:true,name:'Google Student',nonce,iat:now,exp:now+3600})).toString('base64url');return h+'.'+p+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+p),privateKey).toString('base64url');
 }
 try{
  assert.equal((await call('auth/google',null,null,{DB})).data.enabled,false);
  let config=await call('auth/google');assert.equal(config.data.clientId,clientId);assert.match(config.cookies[0],/HttpOnly; Secure/);
  assert.equal((await call('account/google',{credential:'fake'},cookie(config))).status,401);
  let result=await call('account/google',{accountRole:'customer',credential:signed(config.data.nonce)},cookie(config));assert.equal(result.status,200);assert.equal(result.data.googleConnected,true);const id=result.data.id;
  assert.match(result.cookies.find(c=>c.startsWith('campus_session=')),/HttpOnly; Secure/);
  assert.equal((await call('account/login',{email:'google@example.com',password:'invalid-password'})).status,401);
  config=await call('auth/google');result=await call('account/google',{accountRole:'customer',credential:signed(config.data.nonce)},cookie(config));assert.equal(result.data.id,id);
  const signup=await call('account/signup',{accountRole:'customer',name:'Existing',email:'existing@example.com',password:'testonly123',campus:'delsu-abraka'});assert.equal(signup.status,200);
  config=await call('auth/google');const credential=signed(config.data.nonce,'existing@example.com','existing-google');
  assert.equal((await call('account/google',{credential},cookie(config))).status,409);
  result=await call('account/google',{credential,link:true},cookie(config)+'; '+cookie(signup));assert.equal(result.status,200);assert.equal(result.data.id,signup.data.id);assert.equal(result.data.googleConnected,true);
  config=await call('auth/google');result=await call('account/google',{credential:signed(config.data.nonce,'existing@example.com','existing-google')},cookie(config));assert.equal(result.data.id,signup.data.id);
  config=await call('auth/google');assert.equal((await call('account/google',{credential:signed(config.data.nonce),link:true},cookie(config)+'; '+cookie(signup))).status,400);
  const provider=await call('account/signup',{accountRole:'provider',name:'Google switch provider',email:'google-switch-provider@example.com',password:'testonly123',campus:'delsu-abraka'});assert.equal(provider.status,200);
  config=await call('auth/google');assert.equal((await call('account/link-google',{credential:'fake'},cookie(config)+'; '+cookie(provider))).status,401);
  config=await call('auth/google');const verified=await call('account/link-google',{credential:signed(config.data.nonce)},cookie(config)+'; '+cookie(provider));assert.equal(verified.status,200);assert.equal(verified.data.target.id,id);assert.equal(verified.data.linkedAccounts.length,2);
  assert.equal((await call('state',null,cookie(provider))).data.user.id,provider.data.id);
  const switched=await call('account/switch',{target:id},cookie(provider));assert.equal(switched.status,200);assert.equal((await call('state',null,cookie(switched))).data.user.id,id);assert.equal((await call('accounts',null,cookie(provider))).status,401);

 }finally{globalThis.fetch=originalFetch;db.close();}
});

test('server-only Maps routing binds measured road distance to coordinates and R2 stores gallery bytes',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_marketplace.sql','utf8'));
 const DB={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}};}};}};}};
 const blobs=new Map();const BUCKET={async put(id,bytes){blobs.set(id,new Uint8Array(bytes));},async get(id){const bytes=blobs.get(id);return bytes?{async arrayBuffer(){return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}}:null;}};
 const env={DB,BUCKET,GOOGLE_MAPS_BROWSER_KEY:'public-browser-test-key',GOOGLE_MAPS_SERVER_KEY:'private-server-test-key'};
 const originalFetch=globalThis.fetch;globalThis.fetch=async(url,options)=>{assert.equal(url,'https://routes.googleapis.com/directions/v2:computeRoutes');assert.equal(options.headers['X-Goog-Api-Key'],'private-server-test-key');return Response.json({routes:[{distanceMeters:3750,duration:'720s',polyline:{encodedPolyline:'test-route'}}]});};
 async function call(path,body,cookie){const r=await worker.fetch(new Request('https://campusloop.test/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
 let result=await call('account/signup',{accountRole:'customer',name:'Maps Student',email:'maps@example.com',password:'testonly123',campus:'delsu-abraka'});assert.equal(result.status,200);const cookie=result.cookie;
 const config=(await call('config')).data;assert.equal(config.mapsBrowserKey,'public-browser-test-key');assert.ok(!JSON.stringify(config).includes('private-server-test-key'));
 const pickup={lat:5.791,lng:6.104},destination={lat:5.82,lng:6.12};const route=(await call('transport/route',{pickup,destination},cookie)).data;assert.equal(route.distanceKm,3.75);assert.equal(route.durationMinutes,12);
 const body={category:'Transport',serviceType:'Keke',mode:'Ride',time:'Now',transport:{pickup:{...pickup,label:'DELSU Main Campus',area:'DELSU campus'},destination:{...destination,label:'Ubiaruko',area:'Ubiaruko'},scope:'Around Abraka',routeId:route.id}};
 result=await call('requests',body,cookie);assert.equal(result.status,200);let state=(await call('state',null,cookie)).data;let ride=state.requests.find(r=>r.id===result.data.id).transport;assert.equal(ride.distanceSource,'Google Maps road route');assert.equal(ride.distanceKm,3.75);
 result=await call('requests',{...body,transport:{...body.transport,pickup:{...body.transport.pickup,lat:5.792}}},cookie);assert.equal(result.status,200);state=(await call('state',null,cookie)).data;ride=state.requests.find(r=>r.id===result.data.id).transport;assert.equal(ride.distanceSource,'Unavailable');
 const manualRide=await call('requests',{...body,serviceType:'Bike (Okada)',transport:{scope:'Around Abraka',pickup:{label:'Nasco Hostel'},destination:{area:'Ekrejeta'}}},cookie);
 assert.equal(manualRide.status,200,JSON.stringify(manualRide.data));
 const manual=(await call('requests/'+manualRide.data.id,null,cookie)).data.request.transport;
 assert.deepEqual(manual.pickup,{label:'Nasco Hostel',area:'Other area'});
 assert.deepEqual(manual.destination,{label:'Ekrejeta',area:'Ekrejeta'});
 assert.equal(manual.distanceSource,'Unavailable');
 assert.equal((await call('requests',{...body,transport:{...body.transport,pickup:{area:'Other area'}}},cookie)).status,400);
 const provider=await call('account/signup',{accountRole:'provider',name:'Gallery Provider',email:'gallery@example.com',password:'testonly123',campus:'delsu-abraka'});assert.equal(provider.status,200);
 const image='data:image/png;base64,'+readFileSync('public/icons/icon-192.png').toString('base64');result=await call('photos',{image},provider.cookie);assert.equal(result.status,200);assert.equal(blobs.size,1);const photo=result.data;
 result=await call('listings',{category:'Nails',serviceType:'Pedicure',title:'R2 gallery',area:'Abraka',price:5000,modes:['Shop visit'],galleryIds:[photo.id],coverPhotoId:photo.id},provider.cookie);assert.equal(result.status,200);
 const video=Buffer.from('0000ftypisomtest');
 const upload=await worker.fetch(new Request('https://campusloop.test/api/gallery-video',{method:'POST',headers:{Cookie:provider.cookie,'Content-Type':'video/mp4'},body:video}),env);
 assert.equal(upload.status,200);const clip=await upload.json();
 const home=await call('listings',{category:'Housing',title:'Video walkthrough',area:'Abraka',description:'Studio room',price:50000,fees:0,role:'Landlord',galleryIds:[clip.id],coverPhotoId:clip.id},provider.cookie);
 assert.equal(home.status,200);
 const gallery=await call('listings/'+home.data.id+'/photos',null,cookie);
 assert.deepEqual(gallery.data.items,[{id:clip.id,url:clip.url,type:'video/mp4'}]);
 const view=await worker.fetch(new Request('https://campusloop.test'+clip.url,{headers:{Cookie:cookie,Range:'bytes=4-7'}}),env);
 assert.equal(view.status,206);assert.equal(view.headers.get('Content-Type'),'video/mp4');assert.equal(await view.text(),'ftyp');
 assert.equal((await worker.fetch(new Request('https://campusloop.test'+clip.url),env)).status,401);
 const webp=Buffer.from('RIFF0000WEBPtest').toString('base64');
 const avatarBody={image:'data:image/webp;base64,'+webp};
 const customerAvatar=await call('profile-photo',avatarBody,cookie);
 const providerAvatar=await call('profile-photo',avatarBody,provider.cookie);
 assert.equal(customerAvatar.status,200);assert.equal(providerAvatar.status,200);
 const fetchAvatar=(url,session)=>worker.fetch(new Request('https://campusloop.test'+url,{headers:session?{Cookie:session}:{}}),env);
 assert.equal((await fetchAvatar(customerAvatar.data.avatarUrl)).status,401);
 assert.equal((await fetchAvatar(customerAvatar.data.avatarUrl,provider.cookie)).status,404);
 assert.equal((await fetchAvatar(providerAvatar.data.avatarUrl,cookie)).status,200);
 const requested=await call('requests',{category:'Nails',mode:'Shop visit',details:'Pedicure',time:'Tomorrow',serviceType:'Pedicure'},cookie);
 assert.equal(requested.status,200);
 assert.equal((await fetchAvatar(customerAvatar.data.avatarUrl,provider.cookie)).status,404);
 const candidate=(await call('state',null,provider.cookie)).data.requests.find(r=>r.id===requested.data.id);
 await call('requests/'+requested.data.id+'/offer',{listing:candidate.options[0],price:5000,time:'Tomorrow',details:'Pedicure'},provider.cookie);
 assert.equal((await fetchAvatar(customerAvatar.data.avatarUrl,provider.cookie)).status,200);
 assert.equal((await call('profile-photo',{image:null},cookie)).status,200);
 assert.equal((await fetchAvatar(customerAvatar.data.avatarUrl,provider.cookie)).status,404);
 const taxi=await call('listings',{title:'Airport taxi',category:'Transport',serviceType:'Car ride',area:'Abraka',price:5000,modes:['Ride'],transport:{coverage:['Out of town'],availability:'Now and scheduled'}},provider.cookie);
 assert.equal(taxi.status,200,JSON.stringify(taxi.data));
 const airportBody={...body,serviceType:'Car ride',transport:{scope:'Out of town',airport:true,sharePlaceNames:true,pickup:{label:'Nasco Hostel',lat:5.79,lng:6.10},destination:{label:'Asaba Airport'},landmark:'Private pickup note'}};
 const airportRide=await call('requests',airportBody,cookie);assert.equal(airportRide.status,200,JSON.stringify(airportRide.data));
 const airportProvider=(await call('requests/'+airportRide.data.id,null,provider.cookie)).data.request;
 assert.match(airportProvider.details,/Airport taxi · Nasco Hostel → Asaba Airport/);
 assert.deepEqual(airportProvider.options,[taxi.data.id]);
 assert.equal(airportProvider.transport.pickup.lat,undefined);
 assert.equal(airportProvider.transport.landmark,undefined);
 assert.equal((await call('requests',{...airportBody,serviceType:'Keke'},cookie)).status,400);
 const rideId=manualRide.data.id;
 assert.match((await call('state',null,cookie)).data.requests.find(r=>r.id===rideId).details,/Nasco Hostel → Ekrejeta/);
 const driver=await call('listings',{title:'Bike service',category:'Transport',serviceType:'Bike (Okada)',area:'Abraka',price:500,modes:['Ride'],transport:{coverage:['Around Abraka'],availability:'Now and scheduled'}},provider.cookie);
 assert.equal(driver.status,200,JSON.stringify(driver.data));
 const unbooked=(await call('requests/'+rideId,null,provider.cookie)).data.request;
 assert.doesNotMatch(unbooked.details,/Nasco Hostel/);
 assert.equal(unbooked.transport.pickup.label,undefined);
 const rideOffer=await call('requests/'+rideId+'/offer',{listing:driver.data.id,price:500,time:'Now',details:'One bike ride'},provider.cookie);
 assert.equal(rideOffer.status,200);
 assert.equal((await call('requests/'+rideId+'/offers/'+rideOffer.data.id+'/confirm',{revision:1},cookie)).status,200);
 assert.match((await call('requests/'+rideId,null,provider.cookie)).data.request.details,/Nasco Hostel → Ekrejeta/);

 const response=await worker.fetch(new Request('https://campusloop.test'+photo.url,{headers:{Cookie:cookie}}),env);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.ok((await response.arrayBuffer()).byteLength>0);
 }finally{globalThis.fetch=originalFetch;db.close();}
});

test('hosted explicit legacy split preserves IDs, transfers provider history and hashes the new password',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_marketplace.sql','utf8'));const DB={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args);},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};}};}};
 async function call(path,body,cookie){const r=await worker.fetch(new Request('https://campusloop.test/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined}),{DB});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{await call('state');const row=db.prepare('SELECT state FROM marketplace WHERE id=?').get('state'),state=JSON.parse(row.state),token='a'.repeat(64);state.users.push({id:'legacy',name:'Legacy',email:'legacy@example.com',campus:'delsu-abraka'});state.sessions.push({user:'legacy',token,expires:Date.now()+86400000});state.listings.push({id:'original-listing',owner:'legacy',campus:'delsu-abraka',category:'Nails',title:'Gel polish',serviceType:'Gel polish',available:true,modes:['Home visit']});state.requests.push({id:'original-request',owner:'legacy',campus:'delsu-abraka',category:'Nails',status:'Open',offers:[]});db.prepare('UPDATE marketplace SET state=? WHERE id=?').run(JSON.stringify(state),'state');const cookie='campus_session='+token;
 let r=await call('state',null,cookie);assert.equal(r.data.user.roleStatus,'mixed');assert.equal((await call('businesses',{},cookie)).status,403);r=await call('account/split',{accountRole:'customer',name:'Provider',email:'split@example.com',password:'testonly123'},cookie);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.accountRole,'customer');const login=await call('account/login',{email:'split@example.com',password:'testonly123',accountRole:'provider'});assert.equal(login.status,200);r=await call('state',null,login.cookie);assert.equal(r.data.listings.find(l=>l.id==='original-listing').owner,login.data.id);assert.equal((await call('state',null,cookie)).data.requests[0].id,'original-request');
 }finally{db.close();}
});

test('hosted request tracking and notification flow persists private unread state and deduplicates retries',async()=>{
 const {exerciseNotifications}=await import('../server/notification-scenario.js');const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_marketplace.sql','utf8'));const DB={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args);},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};}};}};
 async function call(path,body,cookie){const r=await worker.fetch(new Request('https://campusloop.test/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined}),{DB});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{await exerciseNotifications(call,{ageRequest(id){
  const state=JSON.parse(db.prepare('SELECT state FROM marketplace WHERE id=?').get('state').state);
  state.requests.find(r=>r.id===id).created-=3*60*60*1000;
  db.prepare('UPDATE marketplace SET state=? WHERE id=?').run(JSON.stringify(state),'state');
 }});}finally{db.close();}
});

test('hosted welcome and protected app routes enforce sessions across reopen, signout and expired cookies',async()=>{
 const {exerciseWelcomeAccess}=await import('../server/welcome-access-scenario.js');const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_marketplace.sql','utf8'));const DB={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args);},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};}};}};
 const blobs=new Map(),BUCKET={async put(id,bytes){blobs.set(id,new Uint8Array(bytes));},async get(id){const b=blobs.get(id);return b?{async arrayBuffer(){return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}}:null;}};
 async function call(path,body,cookie){const r=await worker.fetch(new Request('https://campusloop.test'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined}),{DB,BUCKET});const text=await r.text();let data;try{data=JSON.parse(text);}catch{}return {status:r.status,headers:r.headers,text,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{await call('/api/state');const state=JSON.parse(db.prepare('SELECT state FROM marketplace WHERE id=?').get('state').state),token='e'.repeat(64);state.users.push({id:'expired',name:'Expired',campus:'delsu-abraka'});state.sessions.push({user:'expired',token,expires:Date.now()-1000});db.prepare('UPDATE marketplace SET state=? WHERE id=?').run(JSON.stringify(state),'state');await exerciseWelcomeAccess(call,'campus_session='+token);}finally{db.close();}
});

test('hosted account switcher verifies ownership and isolates histories, notifications and device signout',async()=>{
 const {exerciseAccountSwitch}=await import('../server/account-switch-scenario.js');const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_marketplace.sql','utf8'));const DB={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args);},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};}};}};
 async function call(path,body,cookie){const r=await worker.fetch(new Request('https://campusloop.test/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','cf-connecting-ip':'switch-scenario',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined}),{DB});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{await exerciseAccountSwitch(call);}finally{db.close();}
});

test('hosted Campus Guide, cooking quotes, food orders and separate delivery preserve scoped history',async()=>{
 const {guideFixture}=await import('../server/guide-fixture.js'),{exerciseGuideCommerce}=await import('../server/guide-commerce-scenario.js');const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_marketplace.sql','utf8'));db.prepare('INSERT INTO marketplace (id,revision,state) VALUES (?,0,?)').run('state',JSON.stringify(guideFixture()));const DB={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args);},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};}};}};
 async function call(path,body,cookie){const r=await worker.fetch(new Request('https://campusloop.test/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','cf-connecting-ip':'commerce-guide-test',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined}),{DB});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{await exerciseGuideCommerce(call);}finally{db.close();}
});
