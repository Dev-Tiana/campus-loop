import {AccountWalkthrough} from './Walkthrough.jsx';
import {Avatar} from './ProfilePhoto.jsx';
import React from 'react';
import {ArrowRight, ArrowUpRight, Bookmark, CalendarCheck, Inbox, MapPin, CircleHelp, Plus, Search, Store, UserRound, MessageCircle, ListChecks, Star, Sparkles} from 'lucide-react';
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
 return <section className="account-dashboard">
  <div className="account-dashboard-hero">
   <div className="account-dashboard-context"><MapPin size={14}/>{campus}<span>·</span>{provider?'Provider account':ready?'Customer account':'Account setup'}</div>
   <div className="account-avatar-row account-dashboard-greeting"><Avatar name={user.name} src={user.avatarUrl}/><h1>{ready?(firstName?'Welcome back, '+firstName+'!':'Welcome back!'):'Choose your role'}</h1></div>
   <p>{provider?(unfinishedBusiness?'Your business page is ready. Add your first service so students can request it.':needsFirstService?'Set up your business and publish a service so students can find you.':'Manage your services and see which requests need a reply.'):ready?'Request a service or pick up where you left off.':'Choose how you want to use Campus Loop.'}</p>
   <button className="account-dashboard-primary" onClick={!ready?onSetup:provider?onCreate:onRequest}>
    <Plus size={19}/>{!ready?'Set up account roles':provider?(needsFirstService?'Add your first service':'Add a service'):'Request a service'}<ArrowRight size={17}/>
   </button>
  </div>
  {ready&&<>
   <AccountWalkthrough key={user.id+':'+user.accountRole} role={provider?'provider':'customer'} accountId={user.id}/>
   <div className="account-dashboard-stats" aria-label="Account overview">
    {stats.map(({label,value,Icon,onClick})=><button key={label} className="account-dashboard-stat" onClick={onClick}>
     <Icon size={17}/><strong>{value}</strong><span>{label}</span>
    </button>)}
   </div>
   <section className="campus-quick-actions" aria-label="Quick actions"><h2>Quick actions</h2><div className="campus-quick-grid"><Shortcut Icon={Plus} onClick={!ready?onSetup:provider?onCreate:onRequest}>{provider?'Create a listing':'Request a service'}</Shortcut><Shortcut Icon={Store} onClick={provider?onManage:onBrowse}>{provider?'Manage listings':'Explore services'}</Shortcut><Shortcut Icon={ListChecks} onClick={onRequests}>{provider?'View requests':'My requests'}</Shortcut><Shortcut Icon={MessageCircle} onClick={onMessages}>Messages</Shortcut></div></section>
   {provider&&<section className="dashboard-lumi" aria-label="Lumi business assistant"><span className="dashboard-lumi-icon"><Sparkles size={25}/></span><div><h2>Lumi <Sparkles size={17}/></h2><p>Your Campus Loop business assistant can help you improve your listings and answer setup questions.</p></div><button onClick={()=>document.querySelector('.lumi-launcher')?.click()}>Chat with Lumi <ArrowRight size={16}/></button></section>}
   <div className="account-dashboard-grid">
    <section className="account-dashboard-activity" aria-labelledby="dashboard-recent">
     <div className="account-dashboard-section-head"><h2 id="dashboard-recent">{provider?'Recent incoming requests':'Recent activity'}</h2>{recent.length>0&&<button className="account-dashboard-link" onClick={onRequests}>View all <ArrowRight size={14}/></button>}</div>
     {recent.length?<ul>{recent.slice(0,4).map(r=><li key={r.id}><button onClick={()=>onOpen(r)}>
      <span><strong>{r.serviceType || r.categoryName || r.category}</strong><small>{activityTime(r.updatedAt || r.created)}</small></span>
      <span className="account-dashboard-state">{requestStatus(r,!provider)}</span><ArrowRight size={15}/>
     </button></li>)}</ul>:<div className="account-dashboard-empty"><Inbox size={21}/><div><strong>{provider?'No requests yet':'No activity yet'}</strong><p>{provider?'Matching requests will appear here when students ask for your services.':'Your requests and bookings will appear here.'}</p></div></div>}
    </section>
    <div className="account-dashboard-shortcuts">
     <Shortcut Icon={CalendarCheck} onClick={onAppointments}>Appointments</Shortcut>
     <Shortcut Icon={CircleHelp} onClick={onHelp}>Help and feedback</Shortcut>
     <Shortcut Icon={UserRound} onClick={onEditProfile}>Edit profile</Shortcut>
     {provider&&<Shortcut Icon={Store} onClick={onManage}>Manage businesses</Shortcut>}
     <Shortcut Icon={Search} onClick={onBrowse}>Browse marketplace</Shortcut>
     <Shortcut Icon={Bookmark} onClick={onSaved}>Saved listings{savedCount>0?' · '+savedCount:''}</Shortcut>
    </div>
   </div>
  </>}
 </section>;
}

function Shortcut({Icon,onClick,children}){
 return <button className="account-dashboard-shortcut" onClick={onClick}><Icon size={18}/><span>{children}</span><ArrowUpRight size={16}/></button>;
}
