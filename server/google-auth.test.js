import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,sign} from 'node:crypto';import {verifyGoogleCredential} from './google-auth.js';
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'test-google-key',alg:'RS256'};
const seconds=Math.floor(Date.now()/1000),clientId='campusloop.apps.googleusercontent.com',nonce='a'.repeat(64);
const claims={iss:'https://accounts.google.com',aud:clientId,sub:'google-subject',email:'student@example.com',email_verified:true,name:'Student',nonce,iat:seconds,exp:seconds+3600};
export function token(overrides={}){const h=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url'),p=Buffer.from(JSON.stringify({...claims,...overrides})).toString('base64url');return h+'.'+p+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+p),privateKey).toString('base64url');}
test('Google credentials require a valid signature, audience, issuer, expiry, verified email and nonce',async()=>{
 const options={fetchKeys:async()=>Response.json({keys:[jwk]})};
 assert.deepEqual(await verifyGoogleCredential(token(),clientId,nonce,options),{subject:'google-subject',email:'student@example.com',name:'Student'});
 for(const changes of [{aud:'other'},{iss:'https://attacker.test'},{exp:seconds-1},{iat:seconds+120},{email_verified:false},{nonce:'wrong'},{sub:''}])await assert.rejects(verifyGoogleCredential(token(changes),clientId,nonce,options),{status:401});
 const parts=token().split('.');parts[1]=Buffer.from(JSON.stringify({...claims,email:'attacker@example.com'})).toString('base64url');await assert.rejects(verifyGoogleCredential(parts.join('.'),clientId,nonce,options),{status:401});
 await assert.rejects(verifyGoogleCredential(token(),clientId,'',options),{status:401});
});
