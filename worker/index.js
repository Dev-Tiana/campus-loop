import {sendScheduledReminders} from './appointment-reminders.js';
import {handleApi} from './api.js';
import assets from './assets.js';
import {welcomePath} from '../shared/app-routes.js';
function walkthroughResponse(request,item){
 const bytes=Uint8Array.from(atob(item.body),c=>c.charCodeAt(0));
 const size=bytes.length;
 const headers=new Headers({
  'Content-Type':item.type,
  'Accept-Ranges':'bytes',
  'Cache-Control':'public, max-age=3600',
  'X-Content-Type-Options':'nosniff'
 });
 const range=request.headers.get('Range');
 if(request.method==='GET'&&range){
  const [,first,last]=/^bytes=(\d*)-(\d*)$/.exec(range)||[];
  if(first||last){
   const start=first?Number(first):Math.max(0,size-Number(last));
   const end=first&&last?Math.min(size-1,Number(last)):size-1;
   if(start>end||start>=size){
    headers.set('Content-Range','bytes */'+size);
    return new Response(null,{status:416,headers});
   }
   headers.set('Content-Range',`bytes ${start}-${end}/${size}`);
   headers.set('Content-Length',String(end-start+1));
   return new Response(bytes.subarray(start,end+1),{status:206,headers});
  }
 }
 headers.set('Content-Length',String(size));
 return new Response(request.method==='HEAD'?null:bytes,{headers});
}

export default {scheduled(controller,env,context){context.waitUntil(sendScheduledReminders(env,controller.scheduledTime));},async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/'))return handleApi(request,env);
 const adminPage=url.pathname==='/admin'||url.pathname.startsWith('/admin/');
 if(adminPage&&!['/admin/login','/admin/setup'].includes(url.pathname)){const response=await handleApi(new Request(url.origin+'/api/admin/session',{headers:request.headers}),env);const session=await response.json();if(!session.admin)return new Response(null,{status:302,headers:{Location:'/admin/login','Cache-Control':'no-store','Vary':'Cookie'}});}
 const protectedPage=url.pathname==='/app'||url.pathname.startsWith('/app/');
 if(protectedPage){const session=await handleApi(new Request(url.origin+'/api/session',{headers:request.headers}),env);if(!session.ok)return new Response(null,{status:302,headers:{Location:welcomePath(url.pathname+url.search),'Cache-Control':'no-store','Vary':'Cookie'}});}
 const appShell=adminPage||protectedPage||['/','/welcome','/signin','/signup/customer','/signup/provider'].includes(url.pathname);
 const item=assets[appShell?'/index.html':url.pathname];
 if(!item)return new Response('Not found',{status:404});
 if(item.type==='video/mp4')return walkthroughResponse(request,item);
 return new Response(Uint8Array.from(atob(item.body),c=>c.charCodeAt(0)),{headers:{'Content-Type':item.type,'Cache-Control':appShell?'no-store':(url.pathname.startsWith('/assets/')||url.pathname.startsWith('/icons/loop-v3'))?'public,max-age=31536000,immutable':'no-cache, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff'}});
}};
