import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {seed} from '../server/seed.js';
import worker from './index.js';

test('customers and providers can review the app and support replies and app installs are scoped correctly', async ()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync('drizzle/0000_marketplace.sql','utf8'));
 const state=seed();
 const campus='delsu-abraka';
 const expires=Date.now()+60000;
 const adminToken='a'.repeat(64);
 for(const [id,accountRole,token] of [['sender','customer','b1'],['other','customer','b2'],['provider','provider','b3']]){
  state.users.push({id,accountRole,name:id,email:id+'@example.test',campus});
  state.sessions.push({token,user:id,expires});
 }
 state.adminUsers=[{id:'admin',campus,name:'Admin',email:'admin@example.test'}];
 state.adminSessions=[{token:adminToken,admin:'admin',expires}];
 db.prepare('INSERT INTO marketplace (id,revision,state) VALUES (?,0,?)').run('state',JSON.stringify(state));
 const DB={prepare(sql){return {bind(...args){return {
  async first(){return db.prepare(sql).get(...args);},
  async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}
 };}};}};
 async function call(path,cookie,body){
  const response=await worker.fetch(new Request('https://campusloop.test/api/'+path,{
   headers:{cookie,'Content-Type':'application/json'},
   ...(body&&{method:'POST',body:JSON.stringify(body)})
  }),{DB});
  return {status:response.status,data:await response.json()};
 }
 const sender='campus_session=b1',other='campus_session=b2',provider='campus_session=b3',admin='campus_admin='+adminToken;
 const review={kind:'review',rating:5,message:'Easy to use.'};
 assert.equal((await call('help-submissions',provider,review)).status,200);
 assert.equal((await call('help-submissions',sender,review)).status,200);
 const body={kind:'support',subject:'Booking question',message:'Where is my booking?'};
 const ticket=await call('help-submissions',sender,body);
 assert.equal(ticket.status,200);
 assert.equal((await call('help-submissions',sender,body)).data.id,ticket.data.id);
 assert.equal((await call('admin/data',other)).status,401);
 assert.equal((await call('admin/data',admin)).data.helpSubmissions.filter(row=>row.kind==='review').length,2);
 const endpoint='admin/support-tickets/'+ticket.data.id+'/reply';
 assert.equal((await call(endpoint,other,{reply:'Open Appointments.'})).status,401);
 assert.equal((await call(endpoint,admin,{reply:'Open Appointments.'})).status,200);
 assert.deepEqual((await call('support-tickets',other)).data.tickets,[]);
 assert.equal((await call('support-tickets',sender)).data.tickets[0].reply,'Open Appointments.');
 const install={installId:'223e4567-e89b-42d3-a456-426614174000',role:'provider'};
 assert.equal((await call('app-installs',sender,install)).status,200);
 assert.equal((await call('app-installs',other,install)).status,200);
 assert.deepEqual((await call('admin/data',admin)).data.appInstalls,{customer:1,provider:0});
 assert.equal((await call('app-installs',provider,install)).status,200);
 assert.deepEqual((await call('admin/data',admin)).data.appInstalls,{customer:1,provider:1});
 db.close();
});
