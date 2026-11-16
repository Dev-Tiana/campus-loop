import React, {useRef, useState} from 'react';
import {Play, X} from 'lucide-react';
import './walkthrough.css';

const guides = {
 customer: {title:'How to book a service', duration:'35 sec', url:'/walkthroughs/customer-music.mp4'},
 provider: {title:'How to offer a service', duration:'40 sec', url:'/walkthroughs/provider-music.mp4'}
};

function Walkthrough({role, label}) {
 const guide = guides[role];
 const dialog = useRef(null);
 const trigger = useRef(null);
 const [open, setOpen] = useState(false);
 const [failed, setFailed] = useState(false);

 return <>
  <button ref={trigger} type="button" className="walkthrough-button" onClick={()=>{
   setFailed(false);
   setOpen(true);
   dialog.current.showModal();
  }}>
   <span className="walkthrough-thumbnail">
    <img src={'/walkthroughs/'+role+'.webp'} alt="" width="640" height="360" loading="lazy" decoding="async"/>
    <span className="walkthrough-play"><Play size={20} fill="currentColor" aria-hidden="true"/></span>
   </span>
   <span className="walkthrough-caption"><strong>{label || guide.title}</strong><small>{guide.duration}</small></span>
  </button>
  <dialog ref={dialog} className="walkthrough-dialog" aria-label={guide.title} onClose={()=>{
   setOpen(false);
   trigger.current?.focus();
  }}>
   <div className="walkthrough-dialog-header">
    <h2>{guide.title}</h2>
    <button type="button" autoFocus aria-label="Close walkthrough" onClick={()=>dialog.current.close()}><X size={22}/></button>
   </div>
   {open && (failed?
    <p role="status">The video couldn’t load. Check your connection, then <button type="button" onClick={()=>setFailed(false)}>try again</button>.</p>:
    <video src={guide.url} aria-label={guide.title} width="720" height="1280" controls playsInline preload="metadata" onError={()=>setFailed(true)}/>)}
  </dialog>
 </>;
}

export function WelcomeWalkthroughs() {
 return <section className="welcome-walkthroughs" aria-labelledby="welcome-walkthrough-title">
  <h2 id="welcome-walkthrough-title">See how Campus Loop works</h2>
  <div className="welcome-walkthrough-grid">
   <Walkthrough role="customer"/>
   <Walkthrough role="provider"/>
  </div>
 </section>;
}

export function AccountWalkthrough({role, accountId}) {
 const storageKey = 'campusloop-walkthrough-dismissed:' + accountId + ':' + role;
 const [dismissed, setDismissed] = useState(()=>{
  try {return localStorage.getItem(storageKey)==='1';} catch {return false;}
 });

 if (dismissed) return <details className="walkthrough-help">
  <summary>Help</summary>
  <Walkthrough role={role} label="Watch walkthrough"/>
 </details>;

 return <div className="account-walkthrough">
  <Walkthrough role={role}/>
  <button type="button" className="walkthrough-dismiss" aria-label="Dismiss walkthrough card" onClick={()=>{
   setDismissed(true);
   try {localStorage.setItem(storageKey,'1');} catch {}
  }}><X size={18}/></button>
 </div>;
}
