import {randomBytes as recoveryBytes,createHash as recoveryHash} from 'node:crypto';
// Identity must come only from verifyGoogleCredential, never request JSON.
const hashToken=value=>recoveryHash('sha256').update(value).digest('hex');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const authoritative=identity=>identity.emailVerified===true&&['gmail','workspace'].includes(identity.emailAuthority);
function existingAccount(state,identity){
 if(!identity?.subject||typeof identity.email!=='string'||identity.emailVerified!==true)return null;
 const linked=(state.users||[]).filter(u=>u.googleSub===identity.subject);
 if(linked.length===1)return linked[0].status==='suspended'?null:linked[0];
 if(linked.length||!authoritative(identity))return null;
 const matches=(state.users||[]).filter(u=>u.email?.trim().toLowerCase()===identity.email.trim().toLowerCase());
 return matches.length===1&&!matches[0].googleSub&&matches[0].status!=='suspended'?matches[0]:null;
}
export function prepareGoogleRecovery(state,identity,now=Date.now(),requiredRole=null){
 const user=existingAccount(state,identity);
 if(!user)fail('We could not recover an existing account with this Google account. Use your original sign-in method or contact Campus Loop.',404);
 if(requiredRole&&!['customer','provider'].includes(requiredRole))fail('Choose a Customer or Provider account.');
 state.googleRecoveryChallenges=(state.googleRecoveryChallenges||[]).filter(c=>c.expiresAt>now);
 if(state.googleRecoveryChallenges.filter(c=>c.accountId===user.id&&c.createdAt>now-600000).length>=5)fail('Please wait a few minutes before verifying Google again.',429);
 const token=recoveryBytes(32).toString('hex');
 state.googleRecoveryChallenges.push({tokenHash:hashToken(token),accountId:user.id,email:user.email,subject:identity.subject,createdAt:now,expiresAt:now+600000,requiredRole,usedAt:null});
 return {user,token};
}
export function completeGoogleRecovery(state,token,now=Date.now()){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;
 const challenge=(state.googleRecoveryChallenges||[]).find(c=>c.tokenHash===hashToken(token)&&!c.usedAt&&c.expiresAt>now);
 if(!challenge)return null;
 const matches=(state.users||[]).filter(u=>u.id===challenge.accountId&&u.email===challenge.email);
 if(matches.length!==1)return null;
 const user=matches[0];
 if(user.status==='suspended'||user.googleSub&&user.googleSub!==challenge.subject||(state.users||[]).some(u=>u.id!==user.id&&u.googleSub===challenge.subject))return null;
 user.googleSub=challenge.subject;
 for(const c of state.googleRecoveryChallenges)if(c.accountId===user.id)c.usedAt=now;
 state.sessions=(state.sessions||[]).filter(s=>s.user!==user.id);
 (state.accountRecoveryEvents||=[]).push({accountId:user.id,method:'verified-google',at:now});
 return {user,requiredRole:challenge.requiredRole};
}
