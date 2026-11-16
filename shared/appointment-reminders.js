import {availableBooking,formatBookingTime} from './booking-options.js';
export const reminderOptions=[
 {id:'day',label:'On the day'},
 {id:'hour',label:'1 hour before'},
 {id:'half-hour',label:'30 minutes before'},
];
export const defaultReminders=reminderOptions.map(option=>option.id);
export const nigeriaDay=at=>new Date(at+3600000).toISOString().slice(0,10);
export const appointmentFor=(r,user)=>availableBooking(r)&&(r.owner===user.id||r.booking.provider===user.id);

export function appointmentReminders(r,user,now=Date.now()){
 if(!appointmentFor(r,user))return [];
 const at=r.booking.scheduledAt;
 if(!(at>now))return [];
 const day=Date.parse(nigeriaDay(at)+'T00:00:00+01:00');
 const times={day:Math.max(day,Math.min(day+8*3600000,at-90*60000)),hour:at-3600000,'half-hour':at-1800000};
 return reminderOptions.filter(({id})=>(user.appointmentReminders ?? defaultReminders).includes(id)&&times[id]<=now).map(({id,label})=>{
  const eventKey='reminder:'+r.id+':'+at+':'+id;
  return {id:eventKey,recipient:user.id,type:'reminder',requestId:r.id,offerId:r.confirmed,eventKey,
   title:id==='day'?'Appointment today':'Upcoming appointment',summary:formatBookingTime(at)+' · '+label,created:times[id],readAt:null};
 });
}

export function visibleAppointmentReminder(r,user,notice){
 if(!appointmentFor(r,user))return false;
 const prefix='reminder:'+r.id+':'+r.booking.scheduledAt;
 if(notice.eventKey===prefix)return (user.appointmentReminders ?? defaultReminders).includes('hour');
 return notice.eventKey.startsWith(prefix+':')&&(user.appointmentReminders ?? defaultReminders).includes(notice.eventKey.slice(prefix.length+1));
}
