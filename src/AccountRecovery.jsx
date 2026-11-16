import React,{useState} from 'react';
import Logo from './Logo.jsx';
import GoogleSignIn from './GoogleSignIn.jsx';
import {authPath,safeAppPath} from '../shared/app-routes.js';
import './account-recovery.css';
export default function AccountRecovery({requiredRole,next,busy,onSend,onError,onSuccess}){
 const [proof,setProof]=useState(null),[checking,setChecking]=useState(false),[confirming,setConfirming]=useState(false),[error,setError]=useState('');
 async function verify(credential){
  if(checking||busy)return;setChecking(true);setError('');onError?.('');
  try{
   const response=await fetch('/api/recovery/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential,accountRole:requiredRole||undefined})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Google verification failed.');
   if(!data.recovery)throw Error('Please verify your Google account again.');
   setProof(data.recovery);
  }catch(e){setError(e.message);}finally{setChecking(false);}
 }
 async function confirm(){
  if(confirming||busy)return;setConfirming(true);setError('');onError?.('');
  try{
   const response=await fetch('/api/recovery/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   const data=await response.json();
   if(!response.ok){if(response.status===401)setProof(null);throw Error(data.error||'Recovery could not be completed.');}
   window.location.assign(safeAppPath(next)||'/app');
  }catch(e){setError(e.message);}finally{setConfirming(false);}
 }
 return <section className="account-recovery"><div className="account-logo"><Logo/></div><span className="eyebrow">EXISTING ACCOUNT</span><h2>{proof?'Confirm your account':'Recover your account'}</h2>
 {proof?<RecoveryConfirmation proof={proof} busy={busy||confirming} onConfirm={confirm} onChoose={()=>{setProof(null);setError('');onError?.('');}}/>:<><p>Use the same Google email as your existing Campus Loop account. We’ll verify it before reconnecting you.</p><p className="muted">Your account and history stay together. You won’t need to create another Customer or Provider account.</p><GoogleSignIn configPath="/api/recovery/google" onCredential={verify} onError={e=>setError(e)}/>{checking&&<p role="status">Verifying your Google account…</p>}<p className="recovery-help">Unlinked accounts can recover with a verified Gmail or Google Workspace address. For other email providers, use your original sign-in method or contact Campus Loop.</p></>}
 {error&&<p className="error" role="alert">{error}</p>}<a className="text-btn recovery-back" href={authPath({role:requiredRole,next})}>Back to sign in</a></section>;
}

export function RecoveryConfirmation({proof,busy,onConfirm,onChoose}){return <><p>Google verified <strong>{proof.email}</strong>.</p><article className="recovery-account"><span>Your existing Campus Loop profile</span><h3>{proof.name}</h3><p>{proof.accountRole?proof.accountRole+' account':'Your existing account and role setup'}</p><small>Your listings, requests, chats and booking history stay with this account.</small></article><p className="muted">Confirm to connect Google and sign in. This confirmation expires after 10 minutes.</p><button type="button" className="dark recovery-confirm" disabled={busy} onClick={onConfirm}>{busy?'Signing in…':'Confirm and sign in'}</button><button type="button" className="text-btn" disabled={busy} onClick={onChoose}>Choose a different Google account</button></>;}
