import React,{useEffect,useRef,useState} from 'react';

const preferenceKey='campusloop-phone-alerts';
function optedOut(){
 try{return localStorage.getItem(preferenceKey)==='off';}catch{return false;}
}
function savePreference(off){
 try{if(off)localStorage.setItem(preferenceKey,'off');else localStorage.removeItem(preferenceKey);}catch{}
}
async function post(path,body){
 const r=await fetch('/api/push/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await r.json();if(!r.ok)throw Error(result.error);return result;
}
async function connect(registration){
 let subscription=await registration.pushManager.getSubscription();
 if(!subscription){
  const {publicKey}=await post('key',{});
  subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKey});
 }
 await post('subscription',{subscription:subscription.toJSON()});
}
export default function PhoneAlerts({settings=false}){
 const supported='PushManager' in window&&'Notification' in window&&'serviceWorker' in navigator;
 const [off,setOff]=useState(optedOut),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [permission,setPermission]=useState(()=>supported?Notification.permission:null);
 const pending=useRef(false);

 useEffect(()=>{
  if(!supported)return;
  let disposed=false;
  async function sync(){
   if(pending.current)return;
   setPermission(Notification.permission);
   if(off||optedOut()||Notification.permission!=='granted')return;
   pending.current=true;
   try{
    const registration=await navigator.serviceWorker.getRegistration();
    if(!registration?.active)return;
    const [response,subscription]=await Promise.all([fetch('/api/push/status'),registration.pushManager.getSubscription()]);
    if(!response.ok||disposed||optedOut())return;
    const {enabled:registered}=await response.json();
    if(!registered||!subscription)await connect(registration);
    if(!disposed)setEnabled(true);
   }catch{}finally{pending.current=false;}
  }
  sync();
  navigator.serviceWorker.ready.then(()=>{if(!disposed)sync();}).catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',sync);
  window.addEventListener('focus',sync);
  return ()=>{disposed=true;window.removeEventListener('focus',sync);navigator.serviceWorker.removeEventListener('controllerchange',sync);};
 },[supported,off]);

 function chooseOff(){
  savePreference(true);setOff(true);setEnabled(false);
 }
 async function toggle(){
  if(pending.current)return;
  pending.current=true;setBusy(true);setMessage('');
  try{
   if(enabled){
    await post('subscription',{subscription:null});chooseOff();return;
   }
   const result=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
   setPermission(result);
   if(result!=='granted')throw Error('Allow notifications in your browser settings to receive phone alerts.');
   const registration=await navigator.serviceWorker.getRegistration();
   if(!registration?.active)throw Error('Reload Campus Loop and try again once the app is ready.');
   await connect(registration);
   savePreference(false);setOff(false);setEnabled(true);setMessage('Phone alerts enabled.');
  }catch(error){setMessage(error.message);}finally{pending.current=false;setBusy(false);}
 }

 if(!settings&&(enabled||((!supported||off||permission==='granted'||permission==='denied')&&!message)))return null;
 return <section className={'phone-alerts'+(settings?'':' notice')}>
  <h2>{settings?'Phone alerts':'Get request and message alerts'}</h2>
  <p>Campus Loop can notify you even when the app is closed.</p>
  {supported?<div className="row-actions">
   <button className="secondary" disabled={busy} onClick={toggle}>{enabled?'Turn off phone alerts':'Allow phone alerts'}</button>
   {!settings&&!enabled&&<button className="text-btn" disabled={busy} onClick={chooseOff}>Keep off</button>}
  </div>:<p className="muted">Your in-app alerts are still available here.</p>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
