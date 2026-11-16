import React,{useEffect,useRef,useState} from 'react';
let googleScript;
function loadGoogle(){
 if(window.google?.accounts?.id)return Promise.resolve();
 if(!googleScript)googleScript=new Promise((resolve,reject)=>{
 const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=resolve;script.onerror=()=>{googleScript=null;script.remove();reject(Error('Google sign-in could not load. Please try again.'));};document.head.append(script);
 });return googleScript;
}
export default function GoogleSignIn({onCredential,onError,link=false}){
 const container=useRef(null),callbacks=useRef({onCredential,onError});callbacks.current={onCredential,onError};
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{let cancelled=false;
 (async()=>{try{
 const response=await fetch('/api/auth/google');if(!response.ok)return;
 const config=await response.json();if(!config.enabled||cancelled)return;setEnabled(true);await loadGoogle();if(cancelled)return;
 window.google.accounts.id.initialize({client_id:config.clientId,nonce:config.nonce,auto_select:false,callback:result=>{if(!cancelled)callbacks.current.onCredential(result.credential);}});
 window.google.accounts.id.renderButton(container.current,{type:'standard',theme:'outline',size:'large',text:link?'continue_with':'signin_with',width:Math.min(360,Math.max(200,container.current.clientWidth)),shape:'rectangular'});
 }catch(error){if(!cancelled)callbacks.current.onError(error.message);}})();return()=>{cancelled=true;};
 },[link]);
 return <div className="google-signin" style={{display:enabled?'block':'none'}}>{link&&<p className="muted">Connect your Google account to sign in more easily.</p>}<div ref={container}/>{!link&&<p className="signin-divider">or use your email</p>}</div>;
}
