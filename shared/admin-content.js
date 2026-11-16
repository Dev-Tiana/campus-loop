import {welcomeCopy} from './welcome-copy.js';
export const defaultWelcome={headline:welcomeCopy.headline,intro:welcomeCopy.intro,provider:welcomeCopy.provider,photoId:null,photoUrl:'/images/welcome-nigerian-campus.webp',photoAlt:'Illustration of students walking through a Nigerian university campus',photoCredit:'',photoCreditUrl:''};
export function publishedWelcome(state){
 const published=state.welcomeContent?.published;
 return {...defaultWelcome,...published,
  photoUrl:published?.photoId?'/api/public/media/'+published.photoId:defaultWelcome.photoUrl,
  photoAlt:published?.photoId?published.photoAlt || defaultWelcome.photoAlt:defaultWelcome.photoAlt};
}
export function publicationStatus(record,now=Date.now()){if(record.status==='draft')return 'Draft';if(record.status==='ended'||Date.parse(record.endsAt)<=now)return 'Ended';if(record.status==='paused')return 'Paused';if(Date.parse(record.startsAt)>now)return 'Scheduled';return record.status==='published'?'Live':'Draft';}
export const liveContent=(records,campus,now=Date.now())=>(records || []).filter(r=>r.campus===campus&&publicationStatus(r,now)==='Live');
export function marketplaceMetrics(state,{from=0,to=Date.now(),category=''}={}){
 const requests=state.requests.filter(r=>r.created>=from&&r.created<=to&&(!category||r.categoryId===category||r.category===category));
 function summary(rows){const times=rows.map(r=>{const first=r.offers.map(o=>o.created || (r.kind==='food-order'?r.orderUpdatedAt:0)).filter(at=>at>=r.created).sort((a,b)=>a-b)[0];return first?first-r.created:null;}).filter(x=>x!=null).sort((a,b)=>a-b);const n=times.length;return {requests:rows.length,withOffers:rows.filter(r=>r.offers.length).length,timingSamples:n,medianFirstReplyMs:n?(n%2?times[(n-1)/2]:(times[n/2-1]+times[n/2])/2):null};}
 return {...summary(requests),from,to,byCategory:[...new Set(requests.map(r=>r.categoryId || r.category))].map(id=>({id,name:requests.find(r=>(r.categoryId || r.category)===id).category,...summary(requests.filter(r=>(r.categoryId || r.category)===id))}))};
}
