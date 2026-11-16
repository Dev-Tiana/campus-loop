import {ReportButton} from './CommunityContent.jsx';
import React,{useState,useEffect} from 'react';
import {roommateAreas,roommatePreferences,roommateIntents} from '../shared/marketplace.js';
import {propertyTypes} from '../shared/listing-options.js';
import {money} from '../server/seed.js';
import {Choices} from './ListingForm.jsx';
import MessageThread from './MessageThread.jsx';
const title=p=>p.kind==='spot'?p.roomType+' · '+p.area:p.intent+' · '+p.area;
const date=value=>new Date(value+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
export default function Roommates({data,busy,send,error,setError,onSignIn}){
 const [filter,setFilter]=useState('All'),[modal,setModal]=useState(null);
 const [pending,setPending]=useState(null);
 const {user}=data;
 useEffect(()=>{if(user&&pending){setModal(pending);setPending(null);}},[user?.id,pending]);const posts=data.roommatePosts || [],conversations=data.roommateConversations || [];
 const active=conversations.find(c=>c.id===modal?.conversation);
 const post=posts.find(p=>p.id===modal?.post);
 function open(next){if(!user){setPending(next);onSignIn();return;}setError('');setModal(next);}
 function close(){setModal(null);setError('');}
 return <section className="roommates-section" id="roommates"><div className="section-head"><div><span className="eyebrow">DELSU ABRAKA</span><h2>Roommates</h2><p>Have a spare spot, need a place, or want to search together?</p></div></div>
 <div className="roommate-actions"><button className="dark" onClick={()=>open({type:'create',kind:'spot'})}>List a spot</button><button className="secondary" onClick={()=>open({type:'create',kind:'request'})}>Post a roommate request</button></div>
 <p className="muted privacy-copy">Public posts show the area only. Share exact addresses and contact details privately in chat.</p>
 <div className="tabs roommate-filters">{['All','Spots','Requests','My posts'].map(v=><button key={v} className={v===filter?'selected':''} onClick={()=>setFilter(v)}>{v}</button>)}</div>
 <div className="roommate-grid">{posts.filter(p=>filter==='My posts'?p.owner===user?.id:p.status==='Open'&&(filter==='All'||(filter==='Spots'?p.kind==='spot':p.kind==='request'))).map(p=><article className="request-card roommate-card" key={p.id}>{p.image&&<img src={p.image} alt="Available roommate spot"/>}<div className="request-top"><span className="eyebrow">{p.kind==='spot'?'Spot available':'Roommate request'}</span><span className="status">{p.status}</span></div><h3>{title(p)}</h3><p>{p.kind==='spot'?'Cost per person':'Budget per person'} <strong>₦{money(p.kind==='spot'?p.cost:p.budget)} / year</strong></p><p>Move in {date(p.moveIn)}</p>{p.preferences?.length>0&&<ul className="preference-list">{p.preferences.map(v=><li key={v}>{v}</li>)}</ul>}
 {p.owner===user?.id?<div className="row-actions">{p.status==='Open'&&<button className="secondary" disabled={busy} onClick={()=>send('roommates/'+p.id+'/close',{},()=>{})}>Close post</button>}<span className="muted">Your post</span></div>:p.status==='Open'&&<button className="dark" onClick={()=>open({type:'respond',post:p.id})}>Respond privately</button>}<ReportButton targetType="roommate" targetId={p.id} label="Report this post"/></article>)}</div>
 {!posts.some(p=>filter==='My posts'?p.owner===user?.id:p.status==='Open'&&(filter==='All'||(filter==='Spots'?p.kind==='spot':p.kind==='request')))&&<div className="empty"><h3>No roommate posts yet</h3><p>List a spot or tell other students what you are looking for.</p></div>}
 {user&&<section className="roommate-chats"><h3>Your roommate chats</h3>{conversations.length?conversations.map(c=><button className="roommate-chat secondary" key={c.id} onClick={()=>open({type:'chat',conversation:c.id})}><span>{title(c.post)}<small>{c.post.status==='Closed'?'Post closed · ':''}{c.messages.length} messages</small></span><span>Open chat →</span></button>):<p className="muted">Private replies to your posts will appear here.</p>}</section>}
 {modal&&<div className="overlay" onClick={e=>{if(e.target===e.currentTarget)close();}}><div className="dialog" role="dialog" aria-modal="true" aria-label="Roommates"><button className="icon-btn close" aria-label="Close roommate dialog" onClick={close}>×</button>{error&&<p role="alert" className="error">{error}</p>}
 {modal.type==='create'&&<RoommateForm kind={modal.kind} busy={busy} setError={setError} onSend={b=>send('roommates',b,()=>{setFilter('My posts');close();})}/>}
 {modal.type==='respond'&&post&&<><h2>Respond privately</h2><p>{title(post)}</p><p className="muted">Only you and the author will see this conversation.</p><form onSubmit={e=>{e.preventDefault();send('roommates/'+post.id+'/respond',{message:new FormData(e.currentTarget).get('message')},r=>setModal({type:'chat',conversation:r.id}));}}><label>Your message<textarea name="message" required maxLength={1500}/></label><button className="dark" disabled={busy}>Start private chat</button></form></>}
 {modal.type==='chat'&&active&&<><h2>Roommate chat</h2><p>{title(active.post)}</p><p className="muted">Private conversation · {active.post.status==='Closed'?'Post closed':'Post open'}</p><ReportButton targetType="roommate-conversation" targetId={active.id} label="Report this conversation"/><MessageThread messages={active.messages} userId={user.id} busy={busy} onSend={(message,after)=>send('roommate-conversations/'+active.id+'/message',{message},after)}/></>}
 </div></div>}
 </section>;
}
function RoommateForm({kind,busy,setError,onSend}){
 const [preferences,setPreferences]=useState([]),[roomType,setRoomType]=useState(propertyTypes[0]),[intent,setIntent]=useState(roommateIntents[0]),[photo,setPhoto]=useState('');
 async function load(file){if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12000000){setError('Choose a JPG, PNG or WebP photo under 12 MB.');return;}try{const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,900/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();setPhoto(canvas.toDataURL('image/webp',.8));setError('');}catch{setError('That photo could not be opened.');}}
 return <><h2>{kind==='spot'?'List a spot':'Post a roommate request'}</h2><p className="muted">Keep your exact room address and personal contact details out of this public post.</p><form onSubmit={e=>{e.preventDefault();onSend({...Object.fromEntries(new FormData(e.currentTarget)),kind,roomType,intent,preferences,image:photo});}}>
 <label>{kind==='spot'?'Area':'Preferred area'}<select name="area" aria-label={kind==='spot'?'Area':'Preferred area'}>{roommateAreas.filter(a=>kind==='request'||a!==roommateAreas[0]).map(a=><option key={a}>{a}</option>)}</select></label>
 {kind==='spot'?<Choices legend="Room type" options={propertyTypes} value={roomType} onChange={setRoomType}/>:<Choices legend="Looking to" options={roommateIntents} value={intent} onChange={setIntent}/>}
 <label>{kind==='spot'?'Annual cost per person (₦)':'Annual budget per person (₦)'}<input name={kind==='spot'?'cost':'budget'} type="number" min="0" max="100000000" required/></label>
 <label>Move in date<input name="moveIn" type="date" required/></label>
 <Choices legend="Preferences (optional)" options={roommatePreferences} value={preferences} onChange={setPreferences} multiple/>
 {kind==='spot'&&<><label>Photo (optional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>load(e.target.files[0])}/></label><p className="muted">Use a room photo without contact details or an exact address.</p>{photo&&<img className="photo-thumb" src={photo} alt="Spot preview"/>}</>}
 <button className="dark" disabled={busy}>{busy?'Publishing…':'Publish post'}</button></form></>;
}
