import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {setTimeout as pause} from 'node:timers/promises';import {seed} from './seed.js';
test('matched requests, immutable offer inclusions, private roommates and closing posts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'campusloop-updates-'));const file=join(dir,'data.json');const state=seed();state.campuses.push({id:'other-campus',name:'Other Campus'});await writeFile(file,JSON.stringify(state));const port=String(22000+Math.floor(Math.random()*10000));const server=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:port,LOCAL_DATA_FILE:file,MONGODB_URI:'',NODE_ENV:'test'}});
 async function call(path,body,cookie){const r=await fetch('http://127.0.0.1:'+port+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 async function ok(...args){const r=await call(...args);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
 try{
 for(let i=0;i<50;i++){try{await ok('state');break;}catch(e){if(i===49)throw e;await pause(40);}}
 async function account(name,campus='delsu-abraka'){return (await call('account/signup',{accountRole:name==='student'?'customer':'provider',name,email:name+'@example.com',password:'testonly123',campus})).cookie;}
 const student=await account('student'),gel=await account('gel'),polish=await account('polish'),laundry=await account('laundry'),otherGel=await account('othergel'),shop=await account('shop'),outsider=await account('outsider','other-campus');
 const base={category:'Nails',title:'Gel tech',area:'Abraka',price:5000,serviceType:'Gel polish',inclusions:['Nail shaping','Cuticle care','One gel colour'],customInclusions:['Hand cream'],modes:['Home visit']};
 const gelId=(await ok('listings',base,gel)).id;const secondId=(await ok('listings',{...base,title:'Other gel'},otherGel)).id;
 const wrongId=(await ok('listings',{...base,title:'Polish tech',serviceType:'Regular polish',inclusions:['Nail shaping']},polish)).id;
 const laundryId=(await ok('listings',{...base,title:'Laundry',category:'Laundry',serviceType:'Wash and fold',inclusions:['Washing']},laundry)).id;
 const shopId=(await ok('listings',{...base,title:'Shop gel',modes:['Shop visit']},shop)).id;
 const outsiderId=(await ok('listings',{...base,title:'Other campus gel'},outsider)).id;
 const r=(await ok('requests',{category:'Nails',serviceType:'Gel polish',details:'Gel home request',mode:'Home visit',time:'Saturday',budget:4500},student)).id;
 for(const c of [gel,otherGel]){const d=await ok('state',null,c);assert.equal(d.incomingCount,1);assert.ok(d.requests.some(x=>x.id===r));}
 for(const [c,l] of [[polish,wrongId],[laundry,laundryId],[shop,shopId],[outsider,outsiderId]]){const d=await ok('state',null,c);assert.equal(d.incomingCount,0);assert.equal(d.unreadCount,0);assert.equal(d.requests.length,0);assert.equal((await call('requests/'+r+'/offer',{listing:l,price:5000,time:'Saturday',inclusions:['Nail shaping']},c)).status,409);}
 let quote={listing:gelId,price:5000,time:'Saturday',inclusions:['Nail shaping','Cuticle care'],customInclusions:['Removal of existing polish'],details:''};await ok('requests/'+r+'/offer',quote,gel);
 let offer=(await ok('state',null,student)).requests.find(x=>x.id===r).offers[0];const chat='requests/'+r+'/offers/'+offer.id;
 await ok(chat+'/message',{message:'Is removal included?'},student);await ok(chat+'/message',{message:'Yes, included'},gel);assert.equal((await call(chat+'/message',{message:'Intruder'},laundry)).status,404);
 quote={...quote,inclusions:['Nail shaping','One gel colour']};await ok('requests/'+r+'/offer',quote,gel);offer=(await ok('state',null,student)).requests.find(x=>x.id===r).offers[0];assert.equal(offer.revision,2);assert.deepEqual(offer.terms.inclusions,quote.inclusions);assert.deepEqual(offer.terms.customInclusions,quote.customInclusions);assert.equal(offer.messages.length,2);
 await ok('listings',{...base,id:gelId,inclusions:['Top coat'],customInclusions:[]},gel);
 const snapshot=(await ok('state',null,student)).requests.find(x=>x.id===r).offers[0];assert.deepEqual(snapshot.terms.inclusions,quote.inclusions);assert.deepEqual(snapshot.terms.customInclusions,quote.customInclusions);
 assert.equal((await call(chat+'/confirm',{revision:1},student)).status,409);await ok(chat+'/confirm',{revision:2},student);await ok(chat+'/message',{message:'See you then'},student);assert.equal((await ok('state',null,gel)).requests.find(x=>x.id===r).status,'Booked');
 const direct=(await ok('requests',{category:'Nails',serviceType:'Gel polish',details:'Direct gel',mode:'Home visit',time:'Sunday',target:secondId},student)).id;assert.ok((await ok('state',null,otherGel)).requests.some(x=>x.id===direct));assert.ok(!(await ok('state',null,gel)).requests.some(x=>x.id===direct));assert.equal((await call('requests/'+direct+'/offer',{...quote,listing:gelId},gel)).status,409);
 const any=(await ok('requests',{category:'Nails',details:'Any nails',time:'Monday'},student)).id;assert.ok((await ok('state',null,shop)).requests.some(x=>x.id===any));assert.ok((await ok('state',null,polish)).requests.some(x=>x.id===any));
 const spot=(await ok('roommates',{kind:'spot',area:'Campus 2 area',roomType:'Single room',cost:150000,moveIn:'2027-01-10',preferences:['Tidy'],exactAddress:'SECRET ADDRESS',phone:'08012345678'},student)).id;
 const need=(await ok('roommates',{kind:'request',area:'Oria',budget:120000,moveIn:'2027-01-10',intent:'Find a place together'},gel)).id;
 let d=await ok('state',null,laundry);assert.equal(d.roommatePosts.length,2);assert.equal(d.roommateConversations.length,0);assert.ok(!d.requests.some(x=>x.id===spot||x.id===need));assert.ok(!JSON.stringify(d.roommatePosts).includes('SECRET ADDRESS'));assert.ok(!JSON.stringify(d.roommatePosts).includes('08012345678'));assert.equal((await ok('state',null,outsider)).roommatePosts.length,0);
 const conversation=(await ok('roommates/'+spot+'/respond',{message:'Can I join your room?'},gel)).id;
 const otherConversation=(await ok('roommates/'+spot+'/respond',{message:'I am interested too'},polish)).id;assert.notEqual(conversation,otherConversation);
 await ok('roommate-conversations/'+conversation+'/message',{message:'Yes, let us discuss privately'},student);
 assert.equal((await ok('state',null,gel)).roommateConversations.length,1);assert.equal((await ok('state',null,polish)).roommateConversations[0].messages.length,1);assert.equal((await call('roommate-conversations/'+conversation+'/message',{message:'Intruder'},laundry)).status,404);
 assert.equal((await call('roommates/'+spot+'/close',{},gel)).status,404);await ok('roommates/'+spot+'/close',{},student);assert.equal((await call('roommates/'+spot+'/respond',{message:'Late'},laundry)).status,404);assert.ok(!(await ok('state',null,laundry)).roommatePosts.some(x=>x.id===spot));assert.equal((await ok('state',null,student)).roommatePosts.find(x=>x.id===spot).status,'Closed');assert.equal((await ok('state',null,gel)).roommateConversations[0].post.status,'Closed');
 await ok('roommates/'+need+'/respond',{message:'Let us search together'},student);await ok('roommates/'+need+'/close',{},gel);
 }finally{server.kill();await new Promise(r=>server.once('exit',r));await rm(dir,{recursive:true,force:true});}
});
