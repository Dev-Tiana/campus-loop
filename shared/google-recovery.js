// Call only after verifyGoogleCredential has checked Google's signature, audience, expiry, nonce and verified email.
// Recovery is explicitly approved per existing account; Gmail is authoritative for its own addresses.
export function recoverVerifiedGoogleAccount(state,identity,now=Date.now()){
 if(typeof identity?.subject!=="string"||!identity.subject||typeof identity.email!=="string")return null;
 const email=identity.email.trim().toLowerCase();
 if(!/^[^@\s]+@gmail\.com$/.test(email))return null;
 const matches=(state.users||[]).filter(u=>u.email?.trim().toLowerCase()===email);
 if(matches.length!==1)return null;
 const user=matches[0];
 if(user.googleSub||user.status==="suspended"||(state.users||[]).some(u=>u.googleSub===identity.subject))return null;
 const grant=(state.googleLinkRecoveries||[]).find(g=>g.type==="verified-google-link"&&g.accountId===user.id&&g.email===email&&!g.usedAt&&Number.isFinite(g.expiresAt)&&g.expiresAt>now);
 if(!grant)return null;
 user.googleSub=identity.subject;
 grant.usedAt=now;
 state.sessions=(state.sessions||[]).filter(s=>s.user!==user.id);
 return user;
}
