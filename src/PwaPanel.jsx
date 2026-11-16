import React,{useEffect,useState} from 'react';
import './install-app.css';
const installKey='campusloop-install-id';

function installedId(){
 try{
  let id=localStorage.getItem(installKey);
  if(!id){
   id=crypto.randomUUID();
   localStorage.setItem(installKey,id);
  }
  return id;
 }catch{return null;}
}

export default function PwaPanel({user}){
 const [prompt,setPrompt]=useState(null),[waiting,setWaiting]=useState(null),[instructions,setInstructions]=useState(false);
 const [online,setOnline]=useState(navigator.onLine),[installed,setInstalled]=useState(matchMedia('(display-mode: standalone)').matches||navigator.standalone===true);
 const [installId,setInstallId]=useState(()=>{
  if(installed)return installedId();
  try{return localStorage.getItem(installKey);}catch{return null;}
 });
 const accountId=user?.id,role=user?.accountRole;
 useEffect(()=>{
  if(!installId||!accountId||!online||!['customer','provider'].includes(role))return;
  const receiptKey=installKey+':'+accountId+':'+role;
  const controller=new AbortController();
  async function record(){
   try{
    if(localStorage.getItem(receiptKey)===installId)return;
    const response=await fetch('/api/app-installs',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({installId}),signal:controller.signal
    });
    if(response.ok&&!controller.signal.aborted)localStorage.setItem(receiptKey,installId);
   }catch{}
  }
  record();
  const onVisible=()=>{if(document.visibilityState==='visible')record();};
  document.addEventListener('visibilitychange',onVisible);
  return ()=>{controller.abort();document.removeEventListener('visibilitychange',onVisible);};
 },[installId,accountId,role,online]);
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 useEffect(()=>{
 const before=e=>{e.preventDefault();setPrompt(e);},done=()=>{setPrompt(null);setInstalled(true);setInstallId(installedId());},connect=()=>setOnline(navigator.onLine);
 const display=matchMedia('(display-mode: standalone)');const displayChanged=()=>{const active=display.matches||navigator.standalone===true;setInstalled(active);if(active)setInstallId(installedId());};display.addEventListener?.('change',displayChanged);
 addEventListener('beforeinstallprompt',before);addEventListener('appinstalled',done);addEventListener('online',connect);addEventListener('offline',connect);
 let registration,disposed=false,reloading=false;const hadController=!!navigator.serviceWorker?.controller;
 const control=()=>{if(hadController&&!reloading){reloading=true;location.reload();}};
 navigator.serviceWorker?.addEventListener('controllerchange',control);
 if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(r=>{if(disposed)return;registration=r;if(r.waiting)setWaiting(r.waiting);r.addEventListener('updatefound',()=>{const worker=r.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)setWaiting(worker);});});}).catch(()=>{});
 const visible=()=>{if(document.visibilityState==='visible')registration?.update().catch(()=>{});};document.addEventListener('visibilitychange',visible);
 return()=>{disposed=true;display.removeEventListener?.('change',displayChanged);removeEventListener('beforeinstallprompt',before);removeEventListener('appinstalled',done);removeEventListener('online',connect);removeEventListener('offline',connect);document.removeEventListener('visibilitychange',visible);navigator.serviceWorker?.removeEventListener('controllerchange',control);};
 },[]);
 return <div className="pwa-panel">{!online&&<p className="notice" role="status">You are offline. Browsing the app shell is available; sign-in, live listings, uploads, requests and chats need internet.</p>}
 {waiting&&<div className="notice" role="status">A new Campus Loop version is ready. <button className="text-btn" onClick={()=>waiting.postMessage({type:'SKIP_WAITING'})}>Update now</button></div>}
 {!installed&&<section className="install-callout" aria-label="Install Campus Loop"><img src="/icons/loop-v3-192.png" width="52" height="52" alt=""/><div className="install-callout-copy"><strong>Take Campus Loop with you</strong><span>Install the app for quick access from your home screen.</span></div><button className="install-app-button" aria-expanded={instructions} aria-controls="campus-install-help" onClick={async()=>{if(prompt){try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome!=='accepted')setInstructions(true);}catch{setInstructions(true);}finally{setPrompt(null);}}else setInstructions(!instructions);}}>Install Campus Loop</button></section>}
 {!installed&&instructions&&<section id="campus-install-help" className="install-help" aria-label="Installation instructions">{ios?<><strong>Install on iPhone or iPad</strong><ol><li>Open <a href="https://www.campusloopnaija.name.ng/">campusloopnaija.name.ng</a> in Safari.</li><li>Tap Share, then Add to Home Screen.</li><li>If shown, leave Open as Web App switched on, then tap Add.</li></ol></>:<><strong>Install on Android</strong><ol><li>Open <a href="https://www.campusloopnaija.name.ng/">campusloopnaija.name.ng</a> directly in Chrome, outside WhatsApp, Instagram or another app.</li><li>Tap Chrome’s three dot menu, then Install app. Some versions show Add to Home screen, then Install.</li><li>Open Campus Loop using its icon on your home screen.</li></ol><p>On a computer, use the install icon in Chrome or Edge’s address bar.</p></>}<p>If your current icon opens a tab with an address bar, it may be a shortcut. Install the app from your browser’s menu. If it only offers a shortcut, use the website for now and check that Chrome is up to date.</p><p>Already installed? Close this browser tab and open the Campus Loop icon. Signed in users return to their account. Signed out users see the welcome page and can sign in.</p></section>}</div>;
}
