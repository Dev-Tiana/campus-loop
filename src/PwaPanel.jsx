import React,{useEffect,useState} from 'react';
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
 addEventListener('beforeinstallprompt',before);addEventListener('appinstalled',done);addEventListener('online',connect);addEventListener('offline',connect);
 let registration,disposed=false,reloading=false;const hadController=!!navigator.serviceWorker?.controller;
 const control=()=>{if(hadController&&!reloading){reloading=true;location.reload();}};
 navigator.serviceWorker?.addEventListener('controllerchange',control);
 if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(r=>{if(disposed)return;registration=r;if(r.waiting)setWaiting(r.waiting);r.addEventListener('updatefound',()=>{const worker=r.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)setWaiting(worker);});});}).catch(()=>{});
 const visible=()=>{if(document.visibilityState==='visible')registration?.update().catch(()=>{});};document.addEventListener('visibilitychange',visible);
 return()=>{disposed=true;removeEventListener('beforeinstallprompt',before);removeEventListener('appinstalled',done);removeEventListener('online',connect);removeEventListener('offline',connect);document.removeEventListener('visibilitychange',visible);navigator.serviceWorker?.removeEventListener('controllerchange',control);};
 },[]);
 return <div className="pwa-panel">{!online&&<p className="notice" role="status">You are offline. Browsing the app shell is available; sign-in, live listings, uploads, requests and chats need internet.</p>}
 {waiting&&<div className="notice" role="status">A new Campus Loop version is ready. <button className="text-btn" onClick={()=>waiting.postMessage({type:'SKIP_WAITING'})}>Update now</button></div>}
 {!installed&&(prompt||ios)&&<div className="install-strip"><span>Keep campus life one tap away.</span><button className="secondary" onClick={async()=>{if(prompt){await prompt.prompt();await prompt.userChoice;setPrompt(null);}else setInstructions(!instructions);}}>{prompt?'Install Campus Loop':'Add to Home Screen'}</button></div>}
 {instructions&&<p className="notice">On iPhone, open this page in Safari, tap Share, then Add to Home Screen and Add. Sign in with your existing Campus Loop account if Safari asks.</p>}</div>;
}
