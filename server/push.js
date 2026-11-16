import {Buffer} from 'node:buffer';

const curve={name:'ECDH',namedCurve:'P-256'};
const bytes=value=>Buffer.from(value,'base64url');
const b64=value=>Buffer.from(value).toString('base64url');

export function validSubscription(input) {
 try {
  const url=new URL(input.endpoint);
  const allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'];
  return url.protocol==='https:'&&!url.port&&!url.username&&!url.password&&input.endpoint.length<=2048&&
   (allowed.includes(url.hostname)||url.hostname.endsWith('.push.apple.com')||url.hostname.endsWith('.notify.windows.com'))&&
   /^[A-Za-z0-9_-]{87}={0,2}$/.test(input.keys?.p256dh)&&/^[A-Za-z0-9_-]{22}={0,2}$/.test(input.keys?.auth);
 } catch { return false; }
}
export async function makePushKeys(){
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 return {publicKey:b64(await crypto.subtle.exportKey('raw',pair.publicKey)),privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey)};
}

async function hkdf(secret,salt,info,length){
 const key=await crypto.subtle.importKey('raw',secret,'HKDF',false,['deriveBits']);
 return Buffer.from(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8));
}

export async function encodePush(subscription,payload,keys){
 const client=bytes(subscription.keys.p256dh),auth=bytes(subscription.keys.auth);
 const pair=await crypto.subtle.generateKey(curve,true,['deriveBits']);
 const sender=Buffer.from(await crypto.subtle.exportKey('raw',pair.publicKey));
 const peer=await crypto.subtle.importKey('raw',client,curve,false,[]);
 const shared=await crypto.subtle.deriveBits({name:'ECDH',public:peer},pair.privateKey,256);
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const ikm=await hkdf(shared,auth,Buffer.concat([Buffer.from('WebPush: info\0'),client,sender]),32);
 const cek=await hkdf(ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16);
 const iv=await hkdf(ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12);
 const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
 const record=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,Buffer.concat([Buffer.from(payload),Buffer.from([2])]));
 const header=Buffer.alloc(5);header.writeUInt32BE(4096);header[4]=sender.length;
 const body=Buffer.concat([salt,header,sender,Buffer.from(record)]);
 const aud=new URL(subscription.endpoint).origin;
 const jwt=b64(JSON.stringify({typ:'JWT',alg:'ES256'}))+'.'+b64(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+3600,sub:'https://campusloop-workflow-test.sedateartichoke32.chatgpt.site'}));
 const signingKey=await crypto.subtle.importKey('jwk',keys.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const signed=b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},signingKey,Buffer.from(jwt)));
 return {body,headers:{TTL:'300',Urgency:'high','Content-Type':'application/octet-stream','Content-Encoding':'aes128gcm',Authorization:'vapid t='+jwt+'.'+signed+', k='+keys.publicKey}};
}

export function pushJobs(state,notifications,visible) {
 if(!state.pushKeys)return [];
 const jobs=[];
 for(const n of notifications){
  const user=state.users.find(u=>u.id===n.recipient&&u.status!=='suspended');
  if(!user||!visible(state,user,n))continue;
  const path='/app/requests/'+n.requestId+(n.offerId&&['offer','message'].includes(n.type)?'/offers/'+n.offerId+(n.type==='message'?'/chat':''):'');
  for(const sub of state.pushSubscriptions || []){
   if(!state.sessions.some(s=>s.device===sub.device&&s.expires>Date.now()&&(s.user===user.id||s.accounts?.includes(user.id))))continue;
   jobs.push({subscription:sub.subscription,path,keys:state.pushKeys,account:user.id,type:n.type,eventKey:n.eventKey,title:n.type==='reminder'?n.title:null,summary:n.type==='reminder'?n.summary:null});
  }
 }
 return jobs;
}

export async function deliverPush(jobs){
 await Promise.allSettled(jobs.map(async job=>{
  const title=job.title||({request:'New service request',offer:'New or updated offer',message:'New message',booking:'Booking confirmed',cancelled:'Request cancelled',order:'Food order update'})[job.type] || 'New activity';
  const {headers,body}=await encodePush(job.subscription,JSON.stringify({title,path:job.path,account:job.account,body:job.summary}),job.keys);
  await fetch(job.subscription.endpoint,{method:'POST',headers,body,signal:AbortSignal.timeout(4000),redirect:'error'});
 }));
}
