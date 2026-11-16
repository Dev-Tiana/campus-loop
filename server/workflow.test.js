import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';

test('campus requests, private conversations, quote revisions and housing availability',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'campusloop-'));
  const port=String(20000+Math.floor(Math.random()*20000));
  const server=spawn(process.execPath,['server/index.js'],{
    env:{...process.env,PORT:port,MONGODB_URI:'',NODE_ENV:'test',LOCAL_DATA_FILE:join(dir,'data.json')}
  });
  const base='http://127.0.0.1:'+port+'/api/';
  async function call(path,body,cookie){
    const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  async function ok(path,body,cookie){
    const result=await call(path,body,cookie);
    assert.equal(result.status,200,JSON.stringify(result.data));
    return result;
  }
  try{
    for(let i=0;i<40;i++){
      try{await ok('state');break;}catch(error){if(i===39)throw error;await pause(50);}
    }
    async function account(name){return ok('account/signup',{accountRole:name==='Student'?'customer':'provider',name,email:name+'@example.com',password:'testonly123',campus:'delsu-abraka'});}
    const student=await account('Student'), first=await account('First'), second=await account('Second'), outsider=await account('Outsider');
    const business={category:'Nails',area:'Abraka',description:'Gel and shaping',package:'Gel manicure',price:5500,modes:['Home visit']};
    const a=(await ok('listings',{...business,title:'First nails'},first.cookie)).data.id;
    const b=(await ok('listings',{...business,title:'Second nails'},second.cookie)).data.id;
    const request=(await ok('requests',{category:'Nails',details:'Gel manicure',budget:5000,mode:'Home visit',time:'Saturday at 4 pm'},student.cookie)).data.id;
    assert.deepEqual((await ok('state',null,first.cookie)).data.requests[0].options,[a]);
    assert.equal((await ok('state',null,outsider.cookie)).data.requests.length,0);
    const quote={price:5000,time:'Saturday at 4 pm',details:'Gel and shaping'};
    await ok('requests/'+request+'/offer',{...quote,listing:a},first.cookie);
    await ok('requests/'+request+'/offer',{...quote,listing:b},second.cookie);
    const [one,two]=(await ok('state',null,student.cookie)).data.requests[0].offers;
    const path='requests/'+request+'/offers/'+one.id;
    await ok(path+'/message',{message:'Can you come to my hostel?'},student.cookie);
    assert.equal((await call(path+'/message',{message:'Can I see this?'},second.cookie)).status,404);
    assert.deepEqual((await ok('state',null,second.cookie)).data.requests[0].offers.map(o=>o.id),[two.id]);
    await ok('requests/'+request+'/offer',{...quote,listing:a,price:5200},first.cookie);
    assert.equal((await call(path+'/confirm',{revision:1},student.cookie)).status,409);
    const confirmation=await Promise.all([call(path+'/confirm',{revision:2},student.cookie),call('requests/'+request+'/offers/'+two.id+'/confirm',{revision:1},student.cookie)]);
    assert.deepEqual(confirmation.map(r=>r.status).sort(),[200,409]);
    assert.equal((await ok('state',null,student.cookie)).data.requests[0].status,'Booked');
    const room=(await ok('listings',{category:'Housing',title:'Studio',area:'Abraka',description:'Private bathroom',price:280000,fees:5000,agentFee:15000,role:'Agent',permission:true},first.cookie)).data.id;
    const viewing=(await ok('requests',{category:'Housing',details:'Can I see this studio?',mode:'Viewing',time:'Monday at noon',target:room},student.cookie)).data.id;
    await ok('requests/'+viewing+'/offer',{listing:room,price:300000,details:'Studio with private bathroom',time:'Monday at noon'},first.cookie);
    const viewOffer=(await ok('state',null,student.cookie)).data.requests.find(r=>r.id===viewing).offers[0];
    await ok('requests/'+viewing+'/offers/'+viewOffer.id+'/confirm',{revision:1},student.cookie);
    assert.equal((await ok('state',null,student.cookie)).data.requests.find(r=>r.id===viewing).status,'Viewing confirmed');
    const gelBody={category:'Nails',title:'Preset gel',area:'Abraka',price:5000,modes:['Home visit'],serviceType:'Gel polish',inclusions:['Nail shaping','Cuticle care','Top coat'],customInclusions:['Free gel removal']};
    const gel=(await ok('listings',gelBody,first.cookie)).data.id;
    let saved=(await ok('state',null,student.cookie)).data.listings.find(l=>l.id===gel);
    assert.equal(saved.package,'Gel polish');
    assert.equal(saved.description,'');
    assert.deepEqual(saved.inclusions,gelBody.inclusions);
    assert.deepEqual(saved.customInclusions,['Free gel removal']);
    await ok('listings',{...gelBody,id:gel,category:'Laundry',serviceType:'Wash and fold',inclusions:['Washing','Nail shaping'],customInclusions:[]},first.cookie);
    saved=(await ok('state',null,first.cookie)).data.listings.find(l=>l.id===gel);
    assert.deepEqual(saved.inclusions,['Washing']);
    assert.deepEqual(saved.customInclusions,[]);
    assert.equal((await call('listings',{...gelBody,category:'Hair'},first.cookie)).status,400);
    const structuredRoom=(await ok('listings',{category:'Housing',title:'Preset room',area:'Abraka',price:280000,fees:5000,agentFee:15000,role:'Agent',permission:true,propertyType:'Self contained room',amenities:['Running water','Prepaid meter','Fenced compound','Window protectors'],customAmenities:['Quiet compound']},first.cookie)).data.id;
    saved=(await ok('state',null,student.cookie)).data.listings.find(l=>l.id===structuredRoom);
    assert.equal(saved.price+saved.fees,300000);
    assert.equal(saved.agentFee,15000);
    assert.equal(saved.propertyType,'Self contained room');
    assert.deepEqual(saved.amenities,['Running water','Prepaid meter','Fenced compound','Window protectors']);
    assert.deepEqual(saved.customAmenities,['Quiet compound']);
    const {description:legacyDescription,...legacyBody}=business;
    await ok('listings',{...legacyBody,id:a,title:'Legacy updated'},first.cookie);
    saved=(await ok('state',null,first.cookie)).data.listings.find(l=>l.id===a);
    assert.equal(saved.description,'Gel and shaping');
    await ok('listings/'+room+'/availability',{available:false},first.cookie);
    assert.equal((await call('requests',{category:'Housing',details:'View this',mode:'Viewing',time:'Tomorrow',target:room},student.cookie)).status,400);
  }finally{
    if (server.exitCode===null && server.signalCode===null) {
      server.kill();
      await new Promise(resolve=>server.once('exit',resolve));
    }
    await rm(dir,{recursive:true,force:true});
  }
});
