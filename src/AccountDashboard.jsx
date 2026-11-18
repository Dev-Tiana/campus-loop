import React from 'react';
import {ArrowRight, ArrowUpRight, Bookmark, CalendarCheck, Inbox, CircleHelp, Plus, Search, Store, UserRound, MessageCircle, ListChecks, Sparkles} from 'lucide-react';
import {activityTime, requestStatus} from './RequestTracking.jsx';
import './account-dashboard.css';

export default function AccountDashboard({
 user,campus,requests,listings,businesses=[],unfinishedBusiness,savedCount,onRequest,onCreate,onManage,onRequests,onBrowse,onSaved,onSetup,onOpen,onEditProfile,onAppointments,onHelp,onMessages
}){
 const provider=user.accountRole==='provider';
 const ready=!!user.accountRole;
 const needsFirstService=provider&&(!!unfinishedBusiness||!listings.some(l=>l.category!=='Housing'));
 const firstName=user.name?.trim().split(/\s+/)[0];
 const recent=requests.filter(r=>!r.archivedAt&&r.category!=='Housing'&&(provider?r.owner!==user.id:r.owner===user.id))
  .sort((a,b)=>(b.updatedAt || b.created || 0)-(a.updatedAt || a.created || 0));
 const active=recent.filter(r=>provider?r.isNew||r.status==='Pending seller':r.status==='Open'||r.status==='Pending seller');
 const withOffers=recent.filter(r=>r.status==='Open'&&r.offers.length>0);
 const bookings=recent.filter(r=>r.status==='Booked'||r.status==='Completed');
 const liveListings=listings.filter(l=>l.available&&l.category!=='Housing');
 const stats=provider?[
  {label:'My businesses',value:businesses.length,Icon:Store,onClick:onManage},
  { label:'New requests',value:active.length,Icon:Inbox,onClick:onRequests },
  { label:'Active listings',value:liveListings.length,Icon:Store,onClick:onManage },
  { label:'Completed',value:bookings.length,Icon:CalendarCheck,onClick:onRequests }
 ]:[
  { label:'Open requests',value:active.length,Icon:Inbox,onClick:onRequests },
  { label:'With offers',value:withOffers.length,Icon:Store,onClick:onRequests },
  { label:'Bookings',value:bookings.length,Icon:CalendarCheck,onClick:onRequests },
  {label:'Saved listings',value:savedCount,Icon:Bookmark,onClick:onSaved}
 ];
 return <section className="campus-dashboard-v2">
 <div className="campus-v2-main">
  <section className="campus-v2-hero"><span>{campus} · {provider?'Business dashboard':'Student dashboard'}</span><h1>Welcome back, {firstName||'there'}!</h1><p>{provider?'Manage your campus business, listings, and service requests in one place.':'Find campus services and track your requests in one place.'}</p></section>
  {!ready?<button onClick={onSetup}>Set up your account <ArrowRight size={16}/></button>:<>
   <div className="campus-v2-metrics">{stats.map(({label,value,Icon,onClick})=><button key={label} onClick={onClick}><Icon size={23}/><strong>{value}</strong><span>{label}</span></button>)}</div>
   <section className="campus-v2-actions"><h2>Quick actions</h2><div className="campus-v2-action-grid">
    <button onClick={provider?onCreate:onRequest}><Plus size={25}/><span>{provider?'Create a listing':'Request service'}</span></button>
    <button onClick={provider?onManage:onBrowse}><Store size={25}/><span>{provider?'Manage listings':'Explore services'}</span></button>
    <button onClick={onRequests}><ListChecks size={25}/><span>View requests</span></button>
    <button onClick={onMessages}><MessageCircle size={25}/><span>Messages</span></button>
   </div></section>
   {provider&&<div className="campus-v2-lumi-mobile"><LumiPanel/></div>}
   <section className="campus-v2-recent"><header><h2>{provider?'Recent service requests':'Recent activity'}</h2><button onClick={onRequests}>View all <ArrowRight size={15}/></button></header>
    {recent.length?<ul>{recent.slice(0,4).map(r=><li key={r.id}><button onClick={()=>onOpen(r)}><span><strong>{r.serviceType||r.categoryName||r.category}</strong><small>{activityTime(r.updatedAt||r.created)}</small></span><span>{requestStatus(r,!provider)}</span><ArrowRight size={16}/></button></li>)}</ul>:<div className="campus-v2-empty"><Inbox size={23}/><div><strong>No requests yet</strong><p>{provider?'New service requests will appear here.':'Your service requests will appear here.'}</p></div></div>}
   </section>
  </>}
 </div>
 <aside className="campus-v2-aside">{provider&&<LumiPanel/>}<section className="campus-v2-account"><h2>My account</h2><button onClick={onEditProfile}><UserRound size={18}/> Edit profile</button><button onClick={onAppointments}><CalendarCheck size={18}/> Appointments</button><button onClick={onSaved}><Bookmark size={18}/> Saved listings</button><button onClick={onHelp}><CircleHelp size={18}/> Help and support</button></section></aside>
 </section>;
}

function LumiPanel(){return <section className="campus-v2-lumi"><Sparkles size={27}/><div><h2>Meet Lumi</h2><p>Your Campus Loop business assistant can help with listings and setup.</p></div><button onClick={()=>document.querySelector('.lumi-launcher')?.click()}>Chat with Lumi <ArrowRight size={16}/></button></section>;}
