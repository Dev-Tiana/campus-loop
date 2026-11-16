import ServiceLocation from './ServiceLocation.jsx';
import {allowsServiceLocation} from '../shared/service-location.js';
import AppointmentPicker from './AppointmentPicker.jsx';
import React,{useState} from 'react';
import {appointmentTypes} from '../shared/marketplace.js';
import {availableBooking,formatBookingTime} from '../shared/booking-options.js';

export default function BookingActions({request:r,user,busy,onAction}){
 const [action,setAction]=useState('');
 const customer=user.id===r.owner,proposal=r.booking?.proposedTime;
 if(!availableBooking(r))return r.booking?.cancellation?<p className="notice">Booking cancelled · {r.booking.cancellation.reason}</p>:null;
 const respond=decision=>onAction('reschedule-response',{decision,proposal:proposal.id});
 const submit=(name,field)=>event=>{
  event.preventDefault();
  const value=new FormData(event.currentTarget).get(field);
  onAction(name,{[field]:value},()=>setAction(''));
 };
 return <section className="terms">
  <h3>Manage appointment</h3>
  {proposal&&<div><p>Proposed new time · {formatBookingTime(proposal.at)}</p>
   {proposal.by===user.id?<p>Waiting for the other person to respond.</p>:<div className="row-actions"><button className="dark" disabled={busy||proposal.at<=Date.now()} onClick={()=>respond('accept')}>Accept new time</button><button className="secondary" disabled={busy} onClick={()=>respond('decline')}>Keep current time</button></div>}
  </div>}
  {action==='time'?<form onSubmit={submit('reschedule','appointment')}><label>New date and time (Nigeria time)<input type="datetime-local" name="appointment" required/></label><button className="dark" disabled={busy}>Send proposal</button></form>
   :action==='cancel'?<form onSubmit={submit('cancel-booking','reason')}><label>Why are you cancelling?<textarea maxLength={400} name="reason" required/></label><button className="dark" disabled={busy}>Confirm cancellation</button></form>
   :action==='address'?<form onSubmit={submit('meeting-address','address')}><p className="muted">Only your booked provider can see this address.</p><label>Exact address<textarea name="address" defaultValue={r.booking.meetingAddress || ''} maxLength={400}/></label><button className="dark" disabled={busy}>Save address</button></form>
   :<div className="booking-actions-grid">
    {(!proposal||proposal.at<=Date.now())&&<button className="secondary" onClick={()=>setAction('time')}>Reschedule</button>}
    <button className="secondary" onClick={()=>setAction('cancel')}>Cancel booking</button>
    {customer&&['Home visit','Office visit'].includes(r.booking.terms.mode)&&<button className="secondary booking-address-action" onClick={()=>setAction('address')}>{r.booking.meetingAddress?'Edit address':'Share address'}</button>}
   </div>}
  {action&&<button className="text-btn" type="button" onClick={()=>setAction('')}>Back</button>}
 </section>;
}

export function ReviseRequest({request,busy,onAction,onBrowse}){
 const [editing,setEditing]=useState(false),[mode,setMode]=useState(request.mode || ''),[location,setLocation]=useState(request.serviceLocation || null);
 return <section className="terms">
  {request.hasEligibleProviders===false&&<p className="notice">No available providers currently match this request. Try another visit type, or browse providers to contact one directly.</p>}
  {editing?<form onSubmit={event=>{event.preventDefault();onAction('revise',{...Object.fromEntries(new FormData(event.currentTarget)),serviceLocation:allowsServiceLocation(request.category,mode)?location:null},()=>setEditing(false));}}>
   <AppointmentPicker initialAt={request.appointmentAt}/>
   <label>Budget (₦, optional)<input name="budget" type="number" min="0" defaultValue={request.budget ?? ''}/></label>
   {!['Housing','Transport','Delivery'].includes(request.category)&&<label>Appointment type<select name="mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="">Any visit type</option>{appointmentTypes.map(type=><option key={type}>{type}</option>)}</select></label>}
   {allowsServiceLocation(request.category,mode)&&<ServiceLocation value={location} onChange={setLocation}/>}
   <div className="row-actions"><button className="dark" disabled={busy}>Save changes</button><button className="secondary" type="button" onClick={()=>setEditing(false)}>Back</button></div>
  </form>:<div className="row-actions"><button className="secondary" onClick={()=>setEditing(true)}>Edit request</button>{request.hasEligibleProviders===false&&<button className="secondary" onClick={onBrowse}>Browse listings</button>}</div>}
 </section>;
}
