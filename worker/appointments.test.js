import test from 'node:test';
import assert from 'node:assert/strict';
import {makePushKeys} from '../server/push.js';
import {appointmentReminders} from '../shared/appointment-reminders.js';
import {sendScheduledReminders} from './appointment-reminders.js';

test('appointment reminders obey each account’s settings and a scheduled send is deduplicated',async()=>{
 const now=Date.parse('2026-11-15T08:01:00+01:00');
 const customer={id:'c',appointmentReminders:['day']};
 const provider={id:'p',appointmentReminders:['hour','half-hour']};
 const booking={id:'request',owner:'c',confirmed:'offer',status:'Booked',booking:{provider:'p',scheduledAt:Date.parse('2026-11-15T09:30:00+01:00')}};
 const keys=await makePushKeys();
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:keys.publicKey,auth:Buffer.alloc(16).toString('base64url')}};
 let state={users:[customer,provider],requests:[booking],pushKeys:keys,notifications:[],
  sessions:[{user:'c',device:'customer-phone',expires:Date.now()+3600000},{user:'p',device:'provider-phone',expires:Date.now()+3600000}],
  pushSubscriptions:[{device:'customer-phone',subscription},{device:'provider-phone',subscription}]
 };
 let revision=0,delivered=0;
 const DB={prepare(sql){return {bind(...params){return {
  async first(){return {state:JSON.stringify(state),revision};},
  async run(){assert.match(sql,/UPDATE marketplace/);if(params[2]!==revision)return {meta:{changes:0}};state=JSON.parse(params[0]);revision++;return {meta:{changes:1}};}
 };}};}};
 const prev=globalThis.fetch;
 globalThis.fetch=async(url,request)=>{assert.equal(url,subscription.endpoint);assert.equal(request.headers['Content-Encoding'],'aes128gcm');delivered++;return new Response(null,{status:201});};
 try{
  assert.deepEqual(appointmentReminders(booking,customer,now).map(n=>n.title),['Appointment today']);
  assert.equal(appointmentReminders(booking,provider,now).length,0);
  assert.equal(appointmentReminders(booking,{...provider,appointmentReminders:[]},now).length,0);
  await sendScheduledReminders({DB},now);
  await sendScheduledReminders({DB},now+60000);
  assert.equal(delivered,1);
  assert.equal(state.notifications.length,1);
  await sendScheduledReminders({DB},Date.parse('2026-11-15T08:31:00+01:00'));
  assert.equal(delivered,2);
  await sendScheduledReminders({DB},Date.parse('2026-11-15T09:01:00+01:00'));
  assert.equal(delivered,3);
  assert.equal(state.notifications.filter(n=>n.recipient==='p').length,2);
  state.requests[0].status='Cancelled';
  assert.equal(appointmentReminders(state.requests[0],provider,now).length,0);
 }finally{globalThis.fetch=prev;}
});
