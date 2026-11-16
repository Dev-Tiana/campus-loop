import {readFile,writeFile,readdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
const files=['/favicon.svg','/brand/loop.svg','/photo-credits.html','/','/index.html','/manifest.webmanifest','/icons/loop-v3-192.png','/icons/loop-v3-512.png','/icons/loop-v3-maskable-512.png','/icons/loop-v3-apple-180.png','/icons/loop-v3.svg','/icons/loop-v3-favicon-32.png'];
for(const file of await readdir('dist/assets'))if(/\.(js|css)$/.test(file))files.push('/assets/'+file);
for(const file of await readdir('dist/images'))files.push('/images/'+file);
const categoryFiles=(await readdir('dist/categories')).filter(f=>f.endsWith('.webp')).map(f=>'/categories/'+f);
const hash=createHash('sha256');for(const f of [...files,...categoryFiles])hash.update(await readFile('dist'+(f==='/'?'/index.html':f)));const version=hash.digest('hex').slice(0,16);
const script=`const CACHE='campusloop-public-${version}';const PUBLIC=${JSON.stringify(files)};const PHOTOS=new Set(${JSON.stringify(categoryFiles)});const ALLOWED=new Set(PUBLIC);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PUBLIC))));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('campusloop-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('push',e=>{if(!e.data)return;const data=e.data.json();e.waitUntil(self.registration.showNotification('Campus Loop · '+data.title,{body:data.body || 'Open Campus Loop to see the details.',icon:'/icons/loop-v3-192.png',data}));});
self.addEventListener('notificationclick',e=>{e.notification.close();const data=e.notification.data;e.waitUntil((async()=>{let path=data.path || '/app/notifications';try{const response=await fetch('/api/session',{cache:'no-store'});const session=await response.json();if(session.user&&session.user.id!==data.account)path='/app/notifications';}catch{}const url=new URL(path,self.location.origin);if(url.origin!==self.location.origin)return;const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});if(clients.length){await clients[0].navigate(url.href);return clients[0].focus();}return self.clients.openWindow(url.href);})());});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;
if(e.request.mode==='navigate'&&(u.pathname==='/'||u.pathname==='/welcome'||u.pathname==='/signin'||u.pathname==='/signup/customer'||u.pathname==='/signup/provider'||u.pathname==='/app'||u.pathname.startsWith('/app/'))){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match('/index.html'))));return;}
if(u.pathname==='/manifest.webmanifest'){e.respondWith(fetch(e.request,{cache:'no-cache'}).then(async r=>{if(r.ok){const c=await caches.open(CACHE);await c.put('/manifest.webmanifest',r.clone());}return r;}).catch(()=>caches.open(CACHE).then(c=>c.match('/manifest.webmanifest'))));return;}
if(u.search)return;
if(PHOTOS.has(u.pathname)){e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(u.pathname);if(hit)return hit;const r=await fetch(e.request);if(r.ok)await c.put(u.pathname,r.clone());return r;}));return;}
if(!ALLOWED.has(u.pathname))return;e.respondWith(caches.open(CACHE).then(async c=>(await c.match(u.pathname))||fetch(e.request)));});
`;
await writeFile('dist/sw.js',script);await writeFile('dist/app-version.json',JSON.stringify({version}));
