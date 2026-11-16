import {safeAppPath} from './app-routes.js';
export function validateCampaign(form,{ads=true,publish=false}={}){
 const errors={},filled=k=>typeof form[k]==='string'&&form[k].trim();
 for(const [key,label] of [['title','Add a title.'],['body','Add the short copy.']])if(!filled(key))errors[key]=label;
 if(publish){
  if(!Number.isFinite(Date.parse(form.startsAt)))errors.startsAt='Choose a start date and time.';
  if(!Number.isFinite(Date.parse(form.endsAt)))errors.endsAt='Choose an end date and time.';
  else if(Date.parse(form.endsAt)<=Date.parse(form.startsAt))errors.endsAt='End time must be after the start time.';
  if(ads){
   for(const [key,message] of [['advertiser','Add the advertiser name.'],['buttonLabel','Add a button label.'],['imageId','Upload an ad photo.']])if(!filled(key))errors[key]=message;
   let valid=!!safeAppPath(form.destination);try{valid ||= new URL(form.destination).protocol==='https:';}catch{}
   if(!valid)errors.destination='Use a valid HTTPS link or an app page.';
   if(!['main','guide'].includes(form.placement))errors.placement='Choose a placement.';
  }
 }
 return errors;
}
