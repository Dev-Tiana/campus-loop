import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import vm from 'node:vm';import worker from '../worker/index.js';
const manifest=JSON.parse(await readFile('public/manifest.webmanifest','utf8'));
test('PWA identity is stable and each purpose uses a new logo URL with matching PNG dimensions',async()=>{
 assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.name,'Campus Loop — DELSU Abraka');assert.equal(manifest.short_name,'Campus Loop');assert.equal(manifest.display,'standalone');
 const html=await readFile('index.html','utf8');assert.ok(html.includes('href="/manifest.webmanifest"'));assert.ok(!html.includes('loop-v2'));
 assert.equal(await readFile('public/icons/loop-v3.svg','utf8'),await readFile('public/brand/loop.svg','utf8'));
 for(const icon of manifest.icons){assert.match(icon.src,/^\/icons\/loop-v3-/);const bytes=await readFile('public'+icon.src);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(icon.sizes,bytes.readUInt32BE(16)+'x'+bytes.readUInt32BE(20));}
 assert.equal(manifest.icons.filter(i=>i.purpose==='maskable').length,1);assert.ok(manifest.icons.some(i=>i.purpose==='any'&&i.sizes==='192x192'));assert.ok(manifest.icons.some(i=>i.purpose==='any'&&i.sizes==='512x512'));
});
test('hosted manifest revalidates and versioned icons match source bytes at stable origin paths',async()=>{
 const r=await worker.fetch(new Request('https://campusloop.test/manifest.webmanifest'),{});assert.equal(r.status,200);assert.match(r.headers.get('Cache-Control'),/no-cache/);assert.deepEqual(await r.json(),manifest);
 for(const icon of manifest.icons){const r=await worker.fetch(new Request('https://campusloop.test'+icon.src),{});assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/png');assert.match(r.headers.get('Cache-Control'),/immutable/);const digest=b=>createHash('sha256').update(b).digest('hex');assert.equal(digest(new Uint8Array(await r.arrayBuffer())),digest(await readFile('public'+icon.src)));}
 const sw=await worker.fetch(new Request('https://campusloop.test/sw.js'),{});assert.match(sw.headers.get('Cache-Control'),/no-cache/);
});
test('service worker refreshes stale manifest online, falls back offline and ignores private routes',async()=>{
 const handlers={},store=new Map([['/manifest.webmanifest',new Response('{"old":"C"}')]]),cache={async put(k,r){store.set(k,r);},async match(k){return store.get(k)?.clone();}},calls=[];let offline=false;
 const source=await readFile('dist/sw.js','utf8');const scope={self:{location:{origin:'https://campusloop.test'},addEventListener(name,fn){handlers[name]=fn;}},caches:{async open(){return cache;}},URL,fetch:async(req,options)=>{calls.push(options);if(offline)throw Error('Offline');return Response.json(manifest);}};vm.runInNewContext(source,scope);
 function request(path){let response;handlers.fetch({request:{url:'https://campusloop.test'+path,method:'GET',mode:'cors'},respondWith(p){response=p;}});return response;}
 const r=await request('/manifest.webmanifest');assert.deepEqual(await r.json(),manifest);assert.equal(calls[0].cache,'no-cache');assert.deepEqual(await (await cache.match('/manifest.webmanifest')).json(),manifest);
 offline=true;assert.deepEqual(await (await request('/manifest.webmanifest')).json(),manifest);
 assert.equal(request('/api/admin/data'),undefined);assert.equal(request('/admin'),undefined);assert.equal(request('/admin/advertisements'),undefined);
 for(const icon of manifest.icons)assert.ok(source.includes(icon.src));assert.ok(!source.includes('/icons/icon-192.png'));assert.ok(!source.includes('/icons/loop-v2-'));
});
