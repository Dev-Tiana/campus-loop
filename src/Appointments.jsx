import React,{useState} from 'react';
import {CalendarDays,Clock3,ArrowRight} from 'lucide-react';
import {formatBookingTime} from '../shared/booking-options.js';
import {appointmentFor,defaultReminders,nigeriaDay,reminderOptions} from '../shared/appointment-reminders.js';
import './appointments.css';

export default function Appointments({requests,user,onOpen,onSave,busy}){
 const preferences=user.appointmentReminders ?? defaultReminders;
 const [tab,setTab]=useState('Today');
 const today=nigeriaDay(Date.now());
 const appointments=requests.filter(r=>appointmentFor(r,user)).sort((a,b)=>(a.booking.scheduledAt || Infinity)-(b.booking.scheduledAt || Infinity));
 const onDay=appointments.filter(r=>r.booking.scheduledAt&&nigeriaDay(r.booking.scheduledAt)===today);
 const upcoming=appointments.filter(r=>r.booking.scheduledAt&&nigeriaDay(r.booking.scheduledAt)>today);
 const other=appointments.filter(r=>!r.booking.scheduledAt);
 const rows=tab==='Today'?onDay:tab==='Upcoming'?upcoming:other;
 return <section className="workspace appointments-page">
  <div className="section-head"><div><h1>Appointments</h1><p>See your confirmed appointments in Nigeria time.</p></div></div>
  <nav className="tabs" aria-label="Appointment views">
   {['Today','Upcoming','Time to confirm'].map(label=><button key={label} aria-pressed={tab===label} className={tab===label?'selected':''} onClick={()=>setTab(label)}>{label}</button>)}
  </nav>
  {rows.length?<div className="appointment-rows">{rows.map(r=><button className="appointment-row" key={r.id} onClick={()=>onOpen(r)}>
   <span className="appointment-symbol"><CalendarDays size={21}/></span>
   <span><strong>{r.booking.listingTitle || r.serviceType || r.category}</strong>
    <small>{r.booking.scheduledAt?formatBookingTime(r.booking.scheduledAt):r.booking.time}</small>
    <small>{r.owner===user.id?r.booking.providerName:r.student}{r.mode?' · '+r.mode:''}</small></span>
   <ArrowRight size={17}/>
  </button>)}</div>:<div className="empty"><CalendarDays size={23}/><h3>{tab==='Today'?'No appointments today':tab==='Upcoming'?'No upcoming appointments':'No appointments awaiting an exact time'}</h3></div>}
  {tab==='Time to confirm'&&rows.length>0&&<p className="muted">Open a booking and propose an exact time to get reminders.</p>}
  <section className="appointment-preferences">
   <h2><Clock3 size={18}/> Reminder settings</h2>
   <p>Choose when Campus Loop should remind you about confirmed appointments.</p>
   <form key={preferences.join(',')} onSubmit={e=>{e.preventDefault();onSave(new FormData(e.currentTarget).getAll('reminder'));}}>
    <div className="appointment-options">{reminderOptions.map(({id,label})=><label key={id}><input defaultChecked={preferences.includes(id)} type="checkbox" name="reminder" value={id}/>{label}</label>)}</div>
    <button className="secondary" disabled={busy}>Save reminders</button>
   </form>
  </section>
 </section>;
}
