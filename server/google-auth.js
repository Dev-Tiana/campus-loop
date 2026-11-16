import {webcrypto} from 'node:crypto';
import {Buffer} from 'node:buffer';
let cachedKeys,expiresAt=0;
const unavailable=message=>Object.assign(new Error(message),{status:401});
function decode(part){try{return JSON.parse(Buffer.from(part,'base64url').toString('utf8'));}catch{throw unavailable('Google sign-in could not be verified. Please try again.');}}
export async function verifyGoogleCredential(token,clientId,nonce,{fetchKeys=()=>fetch('https://www.googleapis.com/oauth2/v3/certs'),now=Date.now()}={}){
 if(typeof token!=='string'||token.length>12000)throw unavailable('Google sign-in could not be verified.');
 const parts=token.split('.');if(parts.length!==3)throw unavailable('Google sign-in could not be verified.');
 const header=decode(parts[0]),claims=decode(parts[1]);
 if(header.alg!=='RS256'||typeof header.kid!=='string')throw unavailable('Google sign-in could not be verified.');
 if(!cachedKeys||expiresAt<=now||!cachedKeys.some(k=>k.kid===header.kid)){
  const response=await fetchKeys();if(!response.ok)throw Object.assign(new Error('Google sign-in is temporarily unavailable. Please try again.'),{status:503});
  const data=await response.json();if(!Array.isArray(data.keys))throw unavailable('Google sign-in could not be verified.');
  cachedKeys=data.keys;expiresAt=now+300000;
 }
 const jwk=cachedKeys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)throw unavailable('Google sign-in could not be verified.');
 const key=await webcrypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const valid=await webcrypto.subtle.verify('RSASSA-PKCS1-v1_5',key,Buffer.from(parts[2],'base64url'),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 const seconds=Math.floor(now/1000);
 if(!valid||claims.aud!==clientId||!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||!Number.isFinite(claims.exp)||claims.exp<=seconds||!Number.isFinite(claims.iat)||claims.iat>seconds+60||claims.email_verified!==true||typeof claims.email!=='string'||!claims.email.includes('@')||typeof claims.sub!=='string'||!claims.sub||!nonce||claims.nonce!==nonce)throw unavailable('Google sign-in expired or could not be verified. Please try again.');
 return {subject:claims.sub,email:claims.email.trim().toLowerCase(),name:typeof claims.name==='string'?claims.name.trim().slice(0,80):''};
}
