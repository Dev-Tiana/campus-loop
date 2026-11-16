import React from 'react';
export default function MessageThread({messages,userId,busy,onSend,canSend=true}){
 return <><div className="messages" aria-live="polite">{messages.length?messages.map(m=><p className={m.sender===userId?'own':''} key={m.id}>{m.text}</p>):<p className="muted">Ask about timing, location or what is included.</p>}</div>{canSend&&<form className="compose" onSubmit={e=>{e.preventDefault();const f=e.currentTarget;onSend(new FormData(f).get('message'),()=>f.reset());}}><input name="message" aria-label="Message" placeholder="Write a message" maxLength={1500} required/><button className="dark" disabled={busy}>Send <span aria-hidden="true">→</span></button></form>}</>;
}
