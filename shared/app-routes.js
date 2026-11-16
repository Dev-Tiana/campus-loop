const pages={Explore:'/app/marketplace',Dashboard:'/app',Housing:'/app/housing',Requests:'/app/requests',Notifications:'/app/notifications',Saved:'/app/saved',Appointments:'/app/appointments','My listings':'/app/listings'};
const names=Object.fromEntries(Object.entries(pages).map(([k,v])=>[v,k]));const id='[A-Za-z0-9_-]+';
export const appPath=(page,business)=>page==='Business'?'/app/business/'+encodeURIComponent(business):pages[page] || '/app';
export function safeAppPath(value){
 if(typeof value!=='string'||!value.startsWith('/app')||value.startsWith('//')||value.includes('\\'))return null;
 const u=new URL(value,'https://campusloop.local');if(u.origin!=='https://campusloop.local')return null;
 const p=u.pathname.replace(/\/$/,'');
 if(names[p]||new RegExp('^/app/(?:business|guide)/'+id+'$').test(p)||new RegExp('^/app/requests/'+id+'(?:/offers/'+id+'(?:/chat)?)?$').test(p))return p;
 if(p==='/app/request-service'){const q=new URLSearchParams();for(const key of ['listing','category','order'])if(u.searchParams.get(key))q.set(key,u.searchParams.get(key).slice(0,120));return p+(q.size?'?'+q:'');}
 if(p==='/app/offer-service')return p;
 return null;
}
export const welcomePath=next=>safeAppPath(next)?'/?next='+encodeURIComponent(safeAppPath(next)):'/';
export function authPath({signup=false,role,next}={}){const p=signup&&['customer','provider'].includes(role)?'/signup/'+role:'/signin';const q=new URLSearchParams();if(!signup&&['customer','provider'].includes(role))q.set('role',role);if(safeAppPath(next))q.set('next',safeAppPath(next));return p+(q.size?'?'+q:'');}
export function parseAppRoute(value){
 const u=new URL(value,'https://campusloop.local'),p=u.pathname.replace(/\/$/,'') || '/',next=safeAppPath(u.searchParams.get('next'));
 if(p==='/signin')return {kind:'signin',requiredRole:['customer','provider'].includes(u.searchParams.get('role'))?u.searchParams.get('role'):null,next};
 if(/^\/signup\/(customer|provider)$/.test(p))return {kind:'signup',requiredRole:p.split('/')[2],next};
 if(p==='/app'||p.startsWith('/app/')){
  const path=safeAppPath(p+u.search)||'/app',route={kind:'protected',path,page:names[p] || 'Dashboard'};
  const guide=new RegExp('^/app/guide/('+id+')$').exec(p);if(guide)return {...route,page:'Guide',guideId:guide[1]};
  const business=new RegExp('^/app/business/('+id+')$').exec(p);if(business)return {...route,page:'Business',businessId:business[1]};
  const request=new RegExp('^/app/requests/('+id+')(?:/offers/('+id+')(?:/chat)?)?$').exec(p);if(request)return {...route,page:'Requests',requestId:request[1],offerId:request[2],chat:p.endsWith('/chat')};
  if(p==='/app/request-service')return {...route,page:'Explore',action:'request',listingId:u.searchParams.get('listing'),category:u.searchParams.get('category'),orderId:u.searchParams.get('order')};
  if(p==='/app/offer-service')return {...route,page:'Explore',action:'business-edit'};
  return route;
 }
 return {kind:'welcome',next};
}
export function resolveSessionRoute(route,user){if(!user)return route.kind==='protected'?welcomePath(route.path):null;return route.kind!=='protected'?(route.next || '/app'):null;}
