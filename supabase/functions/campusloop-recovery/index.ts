import {randomBytes,randomUUID} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {verifyGoogleCredential} from '../../../server/google-auth.js';
import {prepareGoogleRecovery,completeGoogleRecovery} from '../../../shared/self-service-google-recovery.js';
const base=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const clientId=Deno.env.get('GOOGLE_CLIENT_ID')||'678659685763-5qhk2n9r18d9d1r46120ktdkd3glp26k.apps.googleusercontent.com';
const origins=new Set(['https://www.campusloopnaija.name.ng','https://campus-loop-staging.vercel.app',Deno.env.get('CAMPUSLOOP_PUBLIC_ORIGIN')].filter(Boolean));
const common={'Cache-Control':'no-store','Vary':'Origin, Cookie','Referrer-Policy':'no-referrer'};
const auth={apikey:key,Authorization:'Bearer '+key};
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const cookie=(name,value,seconds)=>name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+seconds;
const readCookie=(request,name)=>{const value=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);return /^[a-f0-9]{64}$/.test(value||'')?value:undefined;};
function roleInfo(state,u){
 if(['customer','provider'].includes(u.accountRole))return {accountRole:u.accountRole,roleStatus:'set'};
 const provider=state.listings.some(l=>l.owner===u.id&&l.category!=='Housing'&&!l.demo)||(state.businesses||[]).some(b=>b.owner===u.id)||state.requests.some(r=>r.category!=='Housing'&&r.offers.some(o=>o.provider===u.id));
 const customer=state.requests.some(r=>r.owner===u.id&&r.category!=='Housing');
 return {accountRole:provider&&!customer?'provider':customer&&!provider?'customer':null,roleStatus:provider&&customer?'mixed':provider||customer?'inferred':'choose'};
}
const profile=(state,u)=>({id:u.id,name:u.name,campus:u.campus,googleConnected:!!u.googleSub,...roleInfo(state,u)});
function requiredRole(state,u,role){if(role&&roleInfo(state,u).accountRole&&roleInfo(state,u).accountRole!==role)fail('Use a '+role+' account for this action. Each account has one role.',403);}
async function update(action){
 if(!base||!key)fail('Account recovery is temporarily unavailable.',503);
 for(let i=0;i<8;i++){
  const response=await fetch(base+'/rest/v1/campusloop_state?id=eq.state&select=state,revision',{headers:auth,cache:'no-store'});if(!response.ok)fail('Account recovery is temporarily unavailable.',503);
  const [row]=await response.json();if(!row?.state)fail('Account recovery is temporarily unavailable.',503);
  const result=action(row.state);
  const write=await fetch(base+'/rest/v1/campusloop_state?id=eq.state&revision=eq.'+row.revision,{method:'PATCH',headers:{...auth,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({state:row.state,revision:row.revision+1})});
  if(!write.ok)fail('Account recovery is temporarily unavailable.',503);
  if((await write.json()).length===1)return result;
 }
 fail('Please retry account recovery.',409);
}
Deno.serve(async request=>{
 const url=new URL(request.url),index=url.pathname.indexOf('/api/recovery/'),path=index<0?'':url.pathname.slice(index);
 const headers=new Headers(common),reply=(data,status=200)=>Response.json(data,{status,headers});
 try{
  if(request.method==='GET'&&path==='/api/recovery/google'){
   const nonce=randomBytes(32).toString('hex');headers.append('Set-Cookie',cookie('campus_recovery_nonce',nonce,300));
   return reply({enabled:true,clientId,nonce});
  }
  if(request.method!=='POST'||!['/api/recovery/verify','/api/recovery/confirm'].includes(path))return reply({error:'Endpoint unavailable.'},404);
  if(!origins.has(request.headers.get('origin'))||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Request origin unavailable.'},403);
  const raw=await request.text();if(raw.length>16000)return reply({error:'Request is too large.'},413);
  let body;try{body=JSON.parse(raw||'{}');}catch{return reply({error:'Invalid request.'},400);}
  if(path==='/api/recovery/verify'){
   const nonce=readCookie(request,'campus_recovery_nonce');if(!nonce)fail('Choose your Google account again to start recovery.',401);
   const identity=await verifyGoogleCredential(body.credential,clientId,nonce);
   // These claims are read only after the token signature, audience, issuer, nonce and verified email passed.
   const claims=JSON.parse(Buffer.from(body.credential.split('.')[1],'base64url').toString('utf8'));
   identity.emailVerified=true;identity.emailAuthority=/@gmail\.com$/i.test(identity.email)?'gmail':typeof claims.hd==='string'&&claims.hd.trim()?'workspace':null;
   const prepared=await update(state=>{const result=prepareGoogleRecovery(state,identity,Date.now(),body.accountRole||null);requiredRole(state,result.user,body.accountRole);return {token:result.token,user:profile(state,result.user)};});
   headers.append('Set-Cookie',cookie('campus_recovery_nonce','',0));headers.append('Set-Cookie',cookie('campus_google_recovery',prepared.token,600));
   return reply({recovery:{name:prepared.user.name,email:identity.email,accountRole:prepared.user.accountRole}});
  }
  const token=randomBytes(32).toString('hex'),now=Date.now(),proof=readCookie(request,'campus_google_recovery');
  const user=await update(state=>{
   const recovered=completeGoogleRecovery(state,proof,now);if(!recovered)fail('Recovery expired or could not be verified. Choose your Google account again.',401);
   const u=recovered.user;requiredRole(state,u,recovered.requiredRole);
   const pair=(state.accountLinks||[]).find(p=>p.customer===u.id||p.provider===u.id);
   const accounts=[...new Set([u.id,...(pair?[pair.customer,pair.provider]:[])])].filter(id=>state.users.some(x=>x.id===id&&x.campus===u.campus&&x.status!=='suspended'));
   state.sessions=state.sessions.filter(s=>s.expires>now);state.sessions.push({token,user:u.id,accounts,device:randomUUID(),expires:now+7*86400000});
   return profile(state,u);
  });
  headers.append('Set-Cookie',cookie('campus_google_recovery','',0));headers.append('Set-Cookie',cookie('campus_session',token,7*86400));return reply(user);
 }catch(error){if(!error.status)console.error('Account recovery error:',error.message);return reply({error:error.status?error.message:'Account recovery is temporarily unavailable.'},error.status||503);}
});
