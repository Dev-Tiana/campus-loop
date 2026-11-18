import React from 'react';
import {ArrowRight,Bookmark,CalendarCheck,Inbox,Plus,Search,Store,MessageCircle,ListChecks,Sparkles,UserRound,HelpCircle} from 'lucide-react';
import {activityTime,requestStatus} from './RequestTracking.jsx';
import './account-dashboard.css';

export default function AccountDashboard({user,campus,requests=[],listings=[],businesses=[],unfinishedBusiness,savedCount=0,onRequest,onCreate,onManage,onRequests,onBrowse,onSaved,onSetup,onOpen,onEditProfile,onAppointments,onHelp,onMessages}){
 const provider=user.accountRole==='provider';
 const ready=!!user.accountRole;
 const firstName=user.name?.trim().split(/\s+/)[0]||'there';
 const recent=requests.filter(r=>!r.archivedAt&&r.category!=='Housing'&&(provider?r.owner!==user.id:r.owner===user.id)).sort((a,b)=>(b.updatedAt||b.created||0)-(a.updatedAt||a.created||0));
 const active=recent.filter(r=>provider?r.isNew||r.status==='Pending seller':r.status==='Open'||r.status==='Pending seller');
 const live=listings.filter(l=>l.available&&l.category!=='Housing');
 const completed=recent.filter(r=>r.status==='Completed');
 const stats=provider?[
  ['My Business',businesses.length,Store,onManage],
  ['Active Listings',live.length,ListChecks,onManage],
  ['New Requests',active.length,Inbox,onRequests],
  ['Completed Orders',completed.length,CalendarCheck,onRequests]
 ]:[
  ['Open Requests',active.length,Inbox,onRequests],
  ['With Offers',recent.filter(r=>r.status==='Open'&&(r.offers?.length||0)>0).length,MessageCircle,onRequests],
  ['Bookings',recent.filter(r=>['Booked','Completed'].includes(r.status)).length,CalendarCheck,onAppointments],
  ['Saved Listings',savedCount,Bookmark,onSaved]
 ];
 const actions=provider?[
  ['Create a Listing',Plus,onCreate],['Manage Listings',Store,onManage],['View Requests',ListChecks,onRequests],['Check Messages',MessageCircle,onMessages]
 ]:[
  ['Request Service',Plus,onRequest],['Explore Services',Search,onBrowse],['My Requests',ListChecks,onRequests],['Check Messages',MessageCircle,onMessages]
 ];
 return <div className="cl-dashboard">
  <div className="cl-dashboard-main">
   <section className="cl-welcome" aria-label="Welcome to Campus Loop">
    <span className="cl-welcome-kicker">{campus||'Campus Loop'} · {provider?'Business dashboard':'Student dashboard'}</span>
    <h1>Welcome back, {firstName}! <span aria-hidden="true">👋</span></h1>
    <p>{provider?'Manage your business, connect with students and keep track of requests.':'Discover campus services and manage your requests in one place.'}</p>
   </section>
   {!ready&&<button className="cl-setup" onClick={onSetup}>Choose your account role <ArrowRight size={17}/></button>}
   <section className="cl-overview" aria-label="Dashboard overview">
    <h2>Dashboard Overview</h2>
    <div className="cl-metrics">{stats.map(([label,value,Icon,action])=><button key={label} onClick={action} className="cl-metric"><Icon size={24}/><strong>{value}</strong><span>{label}</span></button>)}</div>
   </section>
   <section className="cl-actions" aria-label="Quick actions">
    <h2>Quick Actions</h2>
    <div className="cl-action-grid">{actions.map(([label,Icon,action])=><button key={label} onClick={action} className="cl-action"><Icon size={27}/><span>{label}</span></button>)}</div>
   </section>
   <section className="cl-lumi cl-lumi-mobile" aria-label="Lumi assistant">
    <div className="cl-lumi-top"><span className="cl-lumi-symbol"><Sparkles size={24}/></span><div><h2>Meet Lumi <Sparkles size={15}/></h2><p>Your Campus Loop assistant is here to help you get started.</p></div></div>
    <button onClick={()=>document.querySelector('.lumi-launcher')?.click()}>Chat with Lumi <ArrowRight size={16}/></button>
   </section>
   <section className="cl-recent" aria-label="Recent service requests">
    <div className="cl-section-head"><h2>{provider?'Recent Service Requests':'Recent Activity'}</h2><button onClick={onRequests}>View All <ArrowRight size={15}/></button></div>
    {recent.length?<ul>{recent.slice(0,4).map(r=><li key={r.id}><button onClick={()=>onOpen(r)}><span><strong>{r.serviceType||r.categoryName||r.category}</strong><small>{activityTime(r.updatedAt||r.created)}</small></span><span className="cl-request-status">{requestStatus(r,!provider)}</span><ArrowRight size={15}/></button></li>)}</ul>:<div className="cl-empty"><Inbox size={25}/><div><strong>No requests yet</strong><p>{provider?'New service requests will appear here.':'Your activity will appear here when you make a request.'}</p></div></div>}
   </section>
   <section className="cl-extra"><h2>More options</h2><button onClick={onAppointments}><CalendarCheck size={18}/> Appointments</button><button onClick={onEditProfile}><UserRound size={18}/> Edit Profile</button><button onClick={onHelp}><HelpCircle size={18}/> Help and Support</button><button onClick={onSaved}><Bookmark size={18}/> Saved Listings</button></section>
  </div>
  <aside className="cl-dashboard-aside"><section className="cl-lumi"><div className="cl-lumi-top"><span className="cl-lumi-symbol"><Sparkles size={24}/></span><div><h2>Meet Lumi</h2><p>Your Campus Loop assistant can help with listings and requests.</p></div></div><button onClick={()=>document.querySelector('.lumi-launcher')?.click()}>Chat with Lumi <ArrowRight size={16}/></button></section><section className="cl-aside-tip"><h2>Campus Tip</h2><p>Keep your listings up to date so students know what you offer.</p><button onClick={provider?onManage:onBrowse}>{provider?'Manage listings':'Explore services'} <ArrowRight size={15}/></button></section></aside>
 </div>;
}
