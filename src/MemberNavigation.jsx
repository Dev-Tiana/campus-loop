import React from 'react';
import {House, Search, Store, ClipboardList, CircleUserRound, CalendarDays, Heart, Bell, Building2} from 'lucide-react';
const primary = [
  ['Home','Dashboard',House],['Explore','Explore',Search],['My Business','My listings',Store],
  ['Requests','Requests',ClipboardList],['Account','account-menu',CircleUserRound]
];
const extra = [['Appointments','Appointments',CalendarDays],['Saved services','Saved',Heart],['Notifications','Notifications',Bell],['Housing','Housing',Building2]];
export default function MemberNavigation({mobile=false,page,onSelect}) {
  return <nav className={mobile?'loop-bottom':'loop-side-nav'} aria-label={mobile?'Mobile navigation':'Workspace navigation'}>
    {(mobile?primary:[...primary,...extra]).map(([label,key,Icon])=>
      <button key={key} type="button" aria-current={page===key?'page':undefined} onClick={()=>onSelect(key)}>
        <Icon size={19} aria-hidden="true"/><span>{label}</span>
      </button>)}
  </nav>;
}
