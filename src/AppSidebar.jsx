import React from 'react';
import {House,Search,Store,Plus,BookOpen,Bell,CalendarDays,Heart,UserRound,MessageCircle} from 'lucide-react';
import {Avatar} from './ProfilePhoto.jsx';
import './design-system.css';

export const SHELL_PAGES=['Dashboard','Explore','Requests','My listings','Appointments','Notifications','Saved'];
export default function AppSidebar({page,user,onGo,onCreate,onProfile,onHelp}){
 const groups=[
  {heading:'DISCOVER',items:[['Dashboard',House,'Dashboard'],['Explore',Search,'Explore Services']]},
  {heading:'YOUR ACTIVITY',items:[['My listings',Store,'My Listings'],['Requests',BookOpen,'Requests & Orders'],['Appointments',CalendarDays,'Appointments'],['Saved',Heart,'Saved Listings'],['Notifications',Bell,'Notifications']]},
 ];
 return <aside className="cl-shell-sidebar cl-design-system" aria-label="Application navigation">
  <div className="cl-shell-sidebar-title">CAMPUS LOOP</div>
  {groups.map(group=><React.Fragment key={group.heading}><div className="cl-shell-group">{group.heading}</div>{group.items.map(([route,Icon,label])=><button key={route} className={page===route?'cl-shell-active':''} aria-current={page===route?'page':undefined} onClick={()=>onGo(route)}><Icon size={19}/>{label}</button>)}</React.Fragment>)}
  <button onClick={onCreate}><Plus size={19}/>Create Listing</button>
  <div className="cl-shell-group">ACCOUNT</div>
  <button onClick={onProfile}>{user?<Avatar name={user.name} src={user.avatarUrl}/>:<UserRound size={19}/>}My Profile</button>
  <button onClick={onHelp}><MessageCircle size={19}/>Help & Support</button>
 </aside>;
}
