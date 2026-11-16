import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createECDH,hkdfSync,createDecipheriv} from 'node:crypto';
import {encodePush,makePushKeys,pushJobs,validSubscription} from './push.js';

test('web push can decrypt on the recipient device and excludes signed-out devices',async()=>{
 const receiver=createECDH('prime256v1');
 const publicKey=receiver.generateKeys(),secret=randomBytes(16);
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/example',keys:{p256dh:publicKey.toString('base64url'),auth:secret.toString('base64url')}};
 assert.equal(validSubscription(subscription),true);
 assert.equal(validSubscription({...subscription,endpoint:'https://fcm.googleapis.com.example.com/'}),false);
 const pushKeys=await makePushKeys(),notice={recipient:'provider',type:'message',requestId:'r',offerId:'o'};
 const state={pushKeys,users:[{id:'provider'}],pushSubscriptions:[{device:'phone',subscription}],sessions:[{device:'phone',user:'provider',expires:Date.now()+60000}]};
 const [job]=pushJobs(state,[notice],()=>true);
 assert.equal(job.path,'/app/requests/r/offers/o/chat');
 const {body,headers}=await encodePush(subscription,JSON.stringify({path:job.path}),pushKeys);
 assert.equal(headers['Content-Encoding'],'aes128gcm');
 assert.match(headers.Authorization,/^vapid t=/);
 const salt=body.subarray(0,16),sender=body.subarray(21,21+body[20]),encrypted=body.subarray(21+body[20]);
 const ikm=hkdfSync('sha256',receiver.computeSecret(sender),secret,Buffer.concat([Buffer.from('WebPush: info\0'),publicKey,sender]),32);
 const key=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16);
 const iv=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12);
 const decipher=createDecipheriv('aes-128-gcm',Buffer.from(key),Buffer.from(iv));
 decipher.setAuthTag(encrypted.subarray(-16));
 const clear=Buffer.concat([decipher.update(encrypted.subarray(0,-16)),decipher.final()]);
 assert.equal(clear.at(-1),2);
 assert.equal(JSON.parse(clear.subarray(0,-1)).path,job.path);
 assert.equal(pushJobs({...state,sessions:[]},[notice],()=>true).length,0);
});
