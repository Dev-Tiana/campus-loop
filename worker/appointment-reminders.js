import {appointmentReminders,visibleAppointmentReminder} from '../shared/appointment-reminders.js';
import {deliverPush,pushJobs} from '../server/push.js';

export async function sendScheduledReminders(env,now=Date.now()){
 for(let attempt=0;attempt<5;attempt++){
  const row=await env.DB.prepare('SELECT state,revision FROM marketplace WHERE id=?').bind('state').first();
  if(!row)return;
  const state=JSON.parse(row.state);
  if(!state.pushKeys||!state.pushSubscriptions?.length)return;
  const users=new Map(state.users.filter(u=>u.status!=='suspended').map(u=>[u.id,u]));
  const booked=new Map(state.requests.map(r=>[r.id,r]));
  const stored=new Map((state.notifications || []).filter(n=>n.type==='reminder').map(n=>[n.recipient+':'+n.eventKey,n]));
  const due=[];
  for(const request of state.requests){
   for(const id of new Set([request.owner,request.booking?.provider])){
    const user=users.get(id);
    if(!user)continue;
    const eligible=appointmentReminders(request,user,now).filter(n=>{
     const existing=stored.get(id+':'+n.eventKey);
     return n.created>now-6*60000&&!existing?.pushedAt&&!existing?.readAt;
    });
    if(eligible.length)due.push(eligible.sort((a,b)=>b.created-a.created)[0]);
   }
  }
  const jobs=pushJobs(state,due,(_state,user,n)=>visibleAppointmentReminder(booked.get(n.requestId),user,n));
  if(!jobs.length)return;
  const deliverable=new Set(jobs.map(job=>job.eventKey+'|'+job.account));
  const notifications=(state.notifications ||= []);
  for(const n of due){
   if(!deliverable.has(n.eventKey+'|'+n.recipient))continue;
   const existing=stored.get(n.recipient+':'+n.eventKey);
   if(existing)existing.pushedAt=now;
   else notifications.push({...n,pushedAt:now});
  }
  const result=await env.DB.prepare('UPDATE marketplace SET state=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(state),'state',row.revision).run();
  if(result.meta.changes){await deliverPush(jobs);return;}
 }
}
