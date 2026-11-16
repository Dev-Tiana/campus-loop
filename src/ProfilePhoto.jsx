import React,{useState} from 'react';
import {compressPhoto} from './photos.js';
import './profile-photo.css';

export function Avatar({name,src,large=false}){
 const [failed,setFailed]=useState(null);
 const initials=(name || '?').trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('').toUpperCase() || '?';
 return <span className={'account-avatar'+(large?' account-avatar-large':'')} aria-hidden="true">
  {src&&failed!==src?<img src={src} alt="" onError={()=>setFailed(src)}/>:initials}
 </span>;
}

export default function ProfilePhoto({user,busy,onSave,onError}){
 const [processing,setProcessing]=useState(false),[image,setImage]=useState(null);
 async function select(file){
  if(!file)return;
  setProcessing(true);onError('');
  try{setImage(await compressPhoto(file,{maxDimension:512}));}
  catch(error){onError(error.message);}
  finally{setProcessing(false);}
 }
 const disabled=busy||processing;
 return <>
  <h2>Edit profile</h2>
  <div className="account-avatar-row"><Avatar name={user.name} src={image || user.avatarUrl} large/><strong>{user.name}</strong></div>
  <p className="muted">{user.accountRole==='provider'?'Use a photo or business logo for your provider profile.':'Your photo appears in your private service conversations and confirmed bookings.'}</p>
  <form onSubmit={e=>{e.preventDefault();if(image)onSave(image);}}>
   <label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={e=>{select(e.target.files[0]);e.target.value='';}}/></label>
   <div className="row-actions"><button className="dark" disabled={disabled||!image}>{processing?'Preparing image…':'Save photo'}</button>
    {user.avatarUrl&&<button type="button" className="secondary" disabled={disabled} onClick={()=>onSave(null)}>Remove photo</button>}
   </div>
  </form>
 </>;
}
