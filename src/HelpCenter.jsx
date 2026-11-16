import React,{useEffect,useState} from 'react';
import {CircleHelp, Headphones, Star} from 'lucide-react';
import './help-center.css';

const questions=[
 ['How do I book a service?','Tap Request a service, choose what you need, and add your preferred time, area, and budget. Review the offers you receive and confirm the one you want.'],
 ['How do I pay?','Agree on payment with your provider and pay them directly. Campus Loop does not collect payments.'],
 ['Where do I see my appointments?','Open Account, then Appointments. You can see confirmed bookings and choose when to receive reminders.'],
 ['Can I cancel or reschedule?','Open the request or booking. Use Cancel request for an open request, or look under Manage appointment to cancel or propose a new time for a confirmed booking.'],
 ['How do I offer a service?','Switch to your provider account, then tap Offer a service. Create a business page and publish a listing with your services and prices.'],
 ['Can I switch account types?','Yes. Open your account menu and tap Switch account to switch between your linked customer and provider accounts.']
];

const helpSections=[
 ['faq','FAQ',CircleHelp],
 ['support','Customer support',Headphones],
 ['review','Review the app',Star]
];

export function ExploreHelp({onOpen}){
 return <section className="explore-help" aria-labelledby="explore-help-title">
  <h2 id="explore-help-title">Help and feedback</h2>
  <div className="help-options">
   {helpSections.map(([id,label,Icon])=><button key={id} type="button" className="secondary" onClick={()=>onOpen(id)}>
    <Icon size={17} aria-hidden="true"/>{label}
   </button>)}
  </div>
 </section>;
}

export default function HelpCenter({initialTab='faq',busy,onSend}){
 const [tab,setTab]=useState(initialTab);
 const [tickets,setTickets]=useState(null);
 const [loadError,setLoadError]=useState('');
 const [notice,setNotice]=useState('');
 const [revision,setRevision]=useState(0);

 useEffect(()=>{
  if(tab!=='support')return;
  const controller=new AbortController();
  setLoadError('');
  fetch('/api/support-tickets',{cache:'no-store',signal:controller.signal})
   .then(response=>{if(!response.ok)throw Error('Couldn’t load your support messages.');return response.json();})
   .then(data=>setTickets(data.tickets))
   .catch(error=>{if(!controller.signal.aborted)setLoadError(error.message);});
  return ()=>controller.abort();
 },[tab,revision]);

 function submit(event){
  event.preventDefault();
  const form=event.currentTarget;
  const fields=Object.fromEntries(new FormData(form));
  setNotice('');
  onSend('help-submissions',{...fields,kind:tab},result=>{
   form.reset();
   setNotice(tab==='support'?'Message sent. Check here for a reply. Reference '+result.id+'.':'Thanks for reviewing Campus Loop.');
   if(tab==='support')setRevision(value=>value+1);
  });
 }

 return <div className="help-center">
  <h2>Help and feedback</h2>
  <nav className="help-options" aria-label="Help sections">
   {helpSections.map(([id,label])=>
    <button key={id} className={tab===id?'dark':'secondary'} type="button" aria-pressed={tab===id} onClick={()=>{setTab(id);setNotice('');}}>{label}</button>)}
  </nav>
  {tab==='faq'?<div className="help-questions">{questions.map(([question,answer])=>
   <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>:
   <form key={tab} className="help-form" onSubmit={submit}>
    {tab==='review'?<><p>Your review goes privately to the Campus Loop team.</p>
     <label>Rating<select name="rating" defaultValue="" required><option value="" disabled>Choose a rating</option>{[5,4,3,2,1].map(score=><option key={score} value={score}>{score} out of 5</option>)}</select></label></>:
     <label>Subject<input name="subject" required maxLength={120} placeholder="What do you need help with?"/></label>}
    <label>{tab==='review'?'Your review':'Message'}<textarea name="message" rows={4} required maxLength={2000}/></label>
    <button className="dark" disabled={busy}>{tab==='review'?'Send review':'Send message'}</button>
   </form>}
  {notice&&<p role="status">{notice}</p>}
  {tab==='support'&&<section className="help-tickets">
   <h3>Your support messages</h3>
   {loadError?<p role="alert">{loadError} <button className="text-btn" onClick={()=>setRevision(value=>value+1)}>Try again</button></p>:
   !tickets?<p role="status">Loading messages…</p>:!tickets.length?<p>You haven’t sent a support message yet.</p>:
   tickets.map(ticket=><details key={ticket.id}>
    <summary>{ticket.subject} · {ticket.reply?'Replied':'Awaiting reply'}</summary>
    <p>{ticket.message}</p>
    {ticket.reply&&<p><strong>Campus Loop support</strong><br/>{ticket.reply}</p>}
    <small>Reference {ticket.id}</small>
   </details>)}
  </section>}
 </div>;
}
