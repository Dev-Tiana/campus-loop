import {reviewServiceListing,answerProviderQuestion} from './provider-assistant.js';
import React,{useEffect,useState} from 'react';
import {Sparkles,X} from 'lucide-react';

const parts=s=>String(s||'').split(/[,;\n]+|\s+and\s+/i).map(x=>x.trim()).filter(Boolean);
export default function ProviderSetupAssistant({user,businesses=[],listings=[],onCreateBusiness,onAddService,onManage}){
 const [open,setOpen]=useState(false),[step,setStep]=useState(0),[businessId,setBusinessId]=useState('');
 const [question,setQuestion]=useState('');
 const [reply,setReply]=useState('');
 const [asking,setAsking]=useState(false);
 const [aiStatus,setAiStatus]=useState('');
 async function ask(e){e.preventDefault();if(!question.trim()||asking)return;setAsking(true);setAiStatus('');try{const response=await fetch('/api/assistant',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:question.trim()})});const result=await response.json();if(!response.ok)throw new Error(result.error||'AI unavailable');setReply(result.answer);setAiStatus('AI response');}catch(err){setReply(answerProviderQuestion(question));setAiStatus((err.message||'AI unavailable')+' Showing basic guidance instead.');}finally{setAsking(false);}}

 useEffect(()=>{
  if(!user?.id||user.accountRole!=='provider')return;
  try{if(!localStorage.getItem('campus-loop-assistant-seen-'+user.id)){setOpen(true);setStep(0);}}catch{}
 },[user?.id,user?.accountRole]);
 if(!user||user.accountRole!=='provider')return null;
 const selected=businesses.find(b=>b.id===businessId)||businesses[0];
 const linked=listings.filter(l=>l.businessId===selected?.id);
 const combined=listings.map(l=>({listing:l,review:reviewServiceListing(l)})).filter(x=>x.review.needsReview);
 function close(){setOpen(false);try{localStorage.setItem('campus-loop-assistant-seen-'+user.id,'1');}catch{}}
 function next(){if(step===0){setStep(1);return;}if(step===1){if(!selected){close();onCreateBusiness();}else setStep(2);return;}if(step===2){close();onAddService(selected,!linked.length);return;}close();onManage();}
 return <><button type="button" className="secondary" onClick={()=>{setStep(0);setOpen(true);}}><Sparkles size={17}/> Business setup assistant</button>
 {open&&<div role="presentation" onClick={close} style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
 <section role="dialog" aria-modal="true" aria-label="Campus Loop business setup assistant" onClick={e=>e.stopPropagation()} style={{background:'#fff',color:'#25251e',borderRadius:20,width:'100%',maxWidth:470,maxHeight:'85vh',overflowY:'auto',padding:24,boxShadow:'0 18px 65px #0004'}}>
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><strong style={{display:'flex',alignItems:'center',gap:8}}><Sparkles size={20}/> Campus Loop Setup Assistant</strong><button type="button" className="secondary" aria-label="Close assistant" onClick={close}><X size={18}/></button></div>
 <p style={{fontSize:13,opacity:.7}}>Step {step+1} of 4</p>
 {step===0&&<><h3>Welcome! Let's organize your services.</h3><p>Create one business page, then give each service its own listing, price and photos. This makes it easier for customers to choose what they need.</p><p>For example, Hair Revamping and Hair Ventilation should be separate listings.</p></>}
 {step===1&&<><h3>Choose your business</h3><p>{businesses.length?'Select the business you want to work on.':'Start by creating your business page.'}</p>{businesses.length>0&&<label>Business<select value={selected?.id||''} onChange={e=>setBusinessId(e.target.value)}>{businesses.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label>}</>}
 {step===2&&<><h3>Add one service at a time</h3><p>Enter one service name, its price, description and photos. Save it, then add the next service.</p><p><strong>Important:</strong> Optional extras are additions to one service, not a place to combine unrelated services.</p><p>{selected?.name}: {linked.length} existing {linked.length===1?'listing':'listings'}.</p></>}
 {step===3&&<><h3>Review your listings</h3><p>Each service should have its own price, description and photos. Open Manage businesses to edit existing listings and link any unassigned services.</p>{combined.length>0&&<><strong>{combined.length} listings may need review:</strong><ul>{combined.slice(0,5).map(({listing,review},i)=><li key={listing.id||i}>{listing.title||listing.serviceType||'Untitled listing'}: {review.issues.join(' ')}</li>)}</ul><p>Keep your original listings until you have checked the changes.</p></>}</>}
 <div style={{borderTop:'1px solid #ddd',paddingTop:14,marginTop:18}}><strong>Ask the assistant</strong><p style={{fontSize:13}}>Ask about adding services, prices, photos or fixing a listing. You can also use Nigerian Pidgin.</p><form onSubmit={ask} style={{display:'flex',gap:8,flexWrap:'wrap'}}><input aria-label="Question for setup assistant" placeholder="How do I change my price?" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={300} style={{flex:'1 1 180px',minWidth:0}}/><button type="submit" className="secondary" disabled={!question.trim()||asking}>{asking?'Thinking…':'Ask AI'}</button></form>{aiStatus&&<p role="status" style={{fontSize:12}}>{aiStatus}</p>}{reply&&<p role="status" style={{background:'#fff4dc',padding:12,borderRadius:10}}>{reply}</p>}</div>
 <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:22}}>{step>0&&<button type="button" className="secondary" onClick={()=>setStep(v=>v-1)}>Back</button>}<button type="button" className="dark" onClick={next}>{step===0?'Get started':step===1?(selected?'Continue':'Create business'):step===2?'Add service':'Manage businesses'}</button>{step===2&&<button type="button" className="secondary" onClick={()=>setStep(3)}>Review existing listings</button>}<button type="button" className="secondary" onClick={close}>Not now</button></div>
 </section></div>}</>;
}
