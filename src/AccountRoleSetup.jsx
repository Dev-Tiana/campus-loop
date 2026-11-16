import React,{useState} from 'react';import {RoleChoices} from './AccountForm.jsx';
export default function AccountRoleSetup({user,requiredRole,busy,onSend,onSuccess}){
 const [role,setRole]=useState(user.accountRole||requiredRole||'customer'),[review,setReview]=useState(false);const mixed=user.roleStatus==='mixed',other=role==='customer'?'provider':'customer';
 return <><h2>{mixed?'Separate your two roles':'Choose your account role'}</h2><p>This account {mixed?'has both customer and provider activity. Each role now needs its own account.':'keeps its existing housing, roommate posts and conversations.'}</p>
 {mixed&&<div className="notice"><strong>Nothing moves until you submit this form.</strong><p>Keep one role on this account. We’ll create a separate account for the other role and move that side’s service activity to it. Listings, requests, offers, chats and bookings keep their IDs and history. Housing and Roommates stay on this original account.</p></div>}
 <RoleChoices value={role} onChange={v=>{setRole(v);setReview(false);}}/>
 {user.accountRole&&<p className="muted">Your existing activity identifies this as a {user.accountRole} account.</p>}
 <form onSubmit={e=>{e.preventDefault();onSend('account/'+(mixed?'split':'role'),{...Object.fromEntries(new FormData(e.currentTarget)),accountRole:role},onSuccess);}}>
 {mixed&&<><h3>New {other} account</h3><label>Name<input name="name" defaultValue={user.name} required/></label><label>Different email<input name="email" type="email" autoComplete="off" required/></label><label>New account password<input name="password" type="password" autoComplete="new-password" minLength={8} required/></label><label className="check"><input type="checkbox" checked={review} onChange={e=>setReview(e.target.checked)} required/> Keep this account as {role}; create a separate {other} account and move its service activity.</label></>}
 <button className="dark" disabled={busy||(mixed&&!review)||(!mixed&&user.accountRole&&role!==user.accountRole)}>{busy?'Saving…':mixed?'Create separate account and keep history':'Save account role'}</button></form></>;
}
