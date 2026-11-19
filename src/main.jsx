import Appointments from './Appointments.jsx';
import ServiceLocation from './ServiceLocation.jsx';
import {allowsServiceLocation} from '../shared/service-location.js';
import AppointmentPicker from './AppointmentPicker.jsx';
import {Choices} from './ListingForm.jsx';
import {cleaningPropertyTypes,cleaningAreas,propertyKeysMatch} from '../shared/booking-options.js';
import {coverPhotoUrl} from './cover-photo.js';
import ProfilePhoto,{Avatar} from './ProfilePhoto.jsx';
import HelpCenter,{ExploreHelp} from './HelpCenter.jsx';
import AccountDashboard from './AccountDashboard.jsx';
import ProviderSetupAssistant from './ProviderSetupAssistant.jsx';
import PhoneAlerts from './PhoneAlerts.jsx';
import ListingReviews from './ListingReviews.jsx';
import {ReportButton,ContentPlacements,Announcements} from './CommunityContent.jsx';
import React,{useEffect,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {CarFront,Hand,ArrowDown,ArrowRight,ArrowUpRight,Bell,BookOpen,Check,ChevronDown,House,MapPin,Menu,MessageCircle,Plus,Scissors,Search,Shirt,Sparkles,Star,Store,WandSparkles,WashingMachine,X} from 'lucide-react';
import {campus,categories as baseCategories,money} from '../server/seed.js';
import './style.css';
import Logo from './Logo.jsx';
import CampusGuide,{GuideMenu,GuideSidebar,guideHref} from './CampusGuide.jsx';
import {CookingRequest,FoodOrderForm,DeliveryRequest,FoodOrderSummary,DeliverySummary} from './Commerce.jsx';
import {defaultCategories} from '../shared/category-defaults.js';
import Welcome from './Welcome.jsx';
import MarketplaceHero from './MarketplaceHero.jsx';
import ExploreRedesign from './ExploreRedesign.jsx';
import {appPath,authPath,welcomePath,parseAppRoute,resolveSessionRoute} from '../shared/app-routes.js';
import {flushSync} from 'react-dom';
import AccountForm from './AccountForm.jsx';
import AccountRoleSetup from './AccountRoleSetup.jsx';
import AccountSwitcher from './AccountSwitcher.jsx';
import Notifications from './Notifications.jsx';
import {RequestList,RequestDetail,BookingSummary} from './RequestTracking.jsx';
import CompactCategories from './CompactCategories.jsx';
import MediaViewer from './MediaViewer.jsx';
import {BusinessForm,BusinessPage,LinkListingForm} from './Businesses.jsx';
import Gallery from './Gallery.jsx';
import TransportRequest,{RideDetails} from './Transport.jsx';
import PwaPanel from './PwaPanel.jsx';
import OfferForm,{OfferTerms} from './OfferForm.jsx';
import Roommates from './Roommates.jsx';
import MessageThread from './MessageThread.jsx';
import {servicePresets,propertyTypes} from '../shared/listing-options.js';
import {appointmentTypes,serviceName} from '../shared/marketplace.js';
import GoogleSignIn from './GoogleSignIn.jsx';
import EditForm,{ListingDetails} from './ListingForm.jsx';

const icons=[Sparkles,Scissors,WandSparkles,Shirt,WashingMachine,Star,BookOpen,House,Hand,CarFront];
const categoryColors=['#fce4e3','#ece7ff','#f9e7ff','#f9ebdb','#e0ebff','#dff0df','#ffeacf','#ffebda'];
const naira=value=>'₦'+money(value);
const formData=e=>Object.fromEntries(new FormData(e.currentTarget));
const initial={campuses:[campus],listings:[],requests:[],user:null,sessionExpiresAt:null};

const AdminApp=React.lazy(()=>import('./Admin.jsx'));
function App(){
 const [data,setData]=useState(initial);
 const [guideOpen,setGuideOpen]=useState(false),[guideId,setGuideId]=useState('events');
 useEffect(()=>{const desktop=window.matchMedia('(min-width: 1024px)');const update=()=>{if(desktop.matches)setGuideOpen(false);};desktop.addEventListener('change',update);return()=>desktop.removeEventListener('change',update);},[]);
 const [foodPath,setFoodPath]=useState('all');
 const savedRecords=data.categoryRecords || [],savedIds=new Set(savedRecords.map(c=>c.id)),records=[...savedRecords,...defaultCategories.filter(c=>!savedIds.has(c.id))].sort((a,b)=>a.displayOrder-b.displayOrder),categories=records.filter(c=>c.visible!==false).map(c=>c.value),guide=data.guide || {menuItems:[],entries:[]};
 const [sessionStatus,setSessionStatus]=useState('checking');
 const [route,setRoute]=useState(()=>parseAppRoute(location.href));
 const routeRef=useRef(route),readyRef=useRef(false),dataRef=useRef(initial),authSubmittingRef=useRef(false);
 routeRef.current=route;dataRef.current=data;
 const [page,setPage]=useState('Explore');
 const [category,setCategory]=useState('');
 const [query,setQuery]=useState('');
 const [modal,setModal]=useState(null);
 const [error,setError]=useState('');
 const [offline,setOffline]=useState(false);
 const [busy,setBusy]=useState(false);
 const [toast,setToast]=useState('');
 const [housingType,setHousingType]=useState('');
 const [housingBudget,setHousingBudget]=useState('');
 const [requestTab,setRequestTab]=useState('Mine');
 const [photo,setPhoto]=useState('');
 const [gallery,setGallery]=useState(null);
 const [authPrompt,setAuthPrompt]=useState(false);
 const [media,setMedia]=useState(null);
 const [businessPage,setBusinessPage]=useState(null);
 const {user,requests}=data;
 const userRef=useRef(null);const refreshSeq=useRef(0);const pendingMutations=useRef(new Map());const modalRef=useRef(null);modalRef.current=modal;
 const requiredFor=(type,extra={})=>type==='request'?(extra.category==='Housing'||extra.target?.category==='Housing'?null:'customer'):type==='quote'?(requests.find(r=>r.id===extra.request)?.category==='Housing'?null:'provider'):['business-edit','link-listing'].includes(type)?'provider':['food-order','delivery-request'].includes(type)?'customer':type==='edit'?(extra.initialCategory==='Housing'||listings.find(l=>l.id===extra.listing)?.category==='Housing'?null:'provider'):null;
 const listings=data.listings;
 const businesses=data.businesses || [];
 const ownBusinesses=businesses.filter(b=>user&&b.owner===user.id);
 const selectedBusiness=businesses.find(b=>b.id===businessPage);
 const mine=listings.filter(l=>user && l.owner===user.id);
 const ownHousing=mine.filter(l=>l.category==='Housing');
 const ownServices=mine.filter(l=>l.category!=='Housing');
 const unfinishedBusiness=ownBusinesses.find(b=>!ownServices.some(l=>l.businessId===b.id));
 function offerServiceStep(snapshot){
   const owned=(snapshot.businesses || []).filter(b=>b.owner===snapshot.user?.id);
   const services=snapshot.listings.filter(l=>l.owner===snapshot.user?.id&&l.category!=='Housing');
   const unfinished=owned.find(b=>!services.some(l=>l.businessId===b.id));
   const business=unfinished || owned[0];
   return business?{type:'edit',business:business.id,initialCategory:business.category,firstService:!!unfinished}:{type:'business-edit'};
 }
 function addBusinessService(business,firstService=false){
   setPhoto('');
   open('edit',{business:business.id,initialCategory:business.category,firstService});
 }
 const incoming=data.incomingCount || 0;
 const unread=data.unreadCount || 0;
 const campusName=data.campuses.find(c=>c.id===user?.campus)?.name || campus.name;
 function applyAppRoute(r,nextData=dataRef.current){
   setPage(r.page || 'Dashboard');setCategory('');setQuery('');setHousingBudget('');setHousingType('');setModal(null);setError('');
   if(r.guideId)setGuideId(r.guideId);
   if(r.businessId){setBusinessPage(r.businessId);if(!nextData.businesses?.some(b=>b.id===r.businessId)){setPage('Dashboard');setError('Business unavailable.');}}
   if(r.requestId){const request=nextData.requests.find(x=>x.id===r.requestId);if(!request){setError('Request unavailable.');return;}setRequestTab(request.owner===nextData.user.id?'Mine':'Incoming');setModal(r.chat?{type:'chat',request:r.requestId,offer:r.offerId}:{type:'request-detail',request:r.requestId,focusOffer:r.offerId});}
   if(r.action){const target=r.listingId?nextData.listings.find(l=>l.id===r.listingId):null;
     if(r.listingId&&!target){setError('That listing is unavailable.');return;}
     const next=r.action!=='request'?(nextData.user.accountRole==='provider'?offerServiceStep(nextData):{type:'business-edit',setup:true}):target?.food?.kind==='menu'?{type:'food-order',listing:target.id}:target?.category==='Delivery'||r.category==='Delivery'||r.orderId?{type:'delivery-request',listing:target?.id,order:r.orderId}:{type:'request',target,category:target?.category || (categories.includes(r.category)?r.category:'')};
     const requiredRole=r.action==='business-edit'?'provider':next.category==='Housing'?null:'customer';
     setModal(requiredRole&&!nextData.user.accountRole?{type:'role-setup',requiredRole,next}:requiredRole&&nextData.user.accountRole!==requiredRole?{type:'switch-account',requiredRole,next}:next);
   }
 }
 function navigate(path,replace=false,nextData=dataRef.current){
   let r=parseAppRoute(path);if(r.kind==='protected'&&!nextData.user){path=welcomePath(r.path);r=parseAppRoute(path);}
   history[replace?'replaceState':'pushState'](null,'',path);routeRef.current=r;setRoute(r);
   if(r.kind==='protected'&&nextData.user)applyAppRoute(r,nextData);
   window.scrollTo(0,0);
 }
 function clearPrivate(message=''){
   ++refreshSeq.current;readyRef.current=true;userRef.current=null;pendingMutations.current.clear();
   const clean={...initial,campuses:dataRef.current.campuses || initial.campuses,notifications:[],unreadCount:0,linkedAccounts:[],roommateConversations:[],roommatePosts:[],businesses:[]};dataRef.current=clean;setData(clean);setGuideOpen(false);setSessionStatus('anonymous');setPage('Explore');setModal(null);setAuthPrompt(false);setGallery(null);setMedia(null);setBusinessPage(null);setPhoto('');setToast('');setHousingBudget('');setHousingType('');setRequestTab('Mine');setCategory('');setQuery('');setError(message);
 }
 async function refresh(){
   if(document.visibilityState==='hidden')return;
   const seq=++refreshSeq.current;
   try{const response=await fetch('/api/state',{cache:'no-store'});if(!response.ok)throw Error();const next=await response.json();if(seq!==refreshSeq.current)return;
     const first=!readyRef.current,previous=userRef.current;readyRef.current=true;userRef.current=next.user?.id || null;dataRef.current=next;setData(next);setOffline(false);setSessionStatus(next.user?'authenticated':'anonymous');
     if(!next.user){if(previous){clearPrivate('Your session has ended. Sign in to continue.');navigate('/',true,dataRef.current);}else if(routeRef.current.kind==='protected')navigate(welcomePath(routeRef.current.path),true,next);return next;}
     if(previous&&next.user.id!==previous){pendingMutations.current.clear();setGuideOpen(false);setModal(null);setMedia(null);setGallery(null);setBusinessPage(null);setPhoto('');setToast('');navigate('/app',true,next);}
     if(next.user.id!==previous)setRequestTab(next.user.accountRole==='provider'?'Incoming':'Mine');
     if(!authSubmittingRef.current&&(first||!previous)){const redirect=resolveSessionRoute(routeRef.current,next.user);if(redirect)navigate(redirect,true,next);else applyAppRoute(routeRef.current,next);}
     return next;
   }catch{if(seq===refreshSeq.current){setOffline(true);if(!readyRef.current){clearPrivate('Connect to the internet to check your session and sign in.');navigate('/',true,dataRef.current);}}}
 }
 useEffect(()=>{const expired=()=>{clearPrivate('Your session has ended. Sign in to continue.');navigate('/',true,dataRef.current);};addEventListener('campusloop-auth-required',expired);return()=>removeEventListener('campusloop-auth-required',expired);},[]);
 useEffect(()=>{
   refresh();const id=setInterval(refresh,3000);
   const resume=()=>{readyRef.current=false;if(userRef.current)setSessionStatus('checking');refresh();};
   const back=()=>{const r=parseAppRoute(location.href);routeRef.current=r;setRoute(r);resume();};
   const hide=()=>{++refreshSeq.current;readyRef.current=false;if(userRef.current)flushSync(()=>{setSessionStatus('checking');setModal(null);setGallery(null);setMedia(null);});};
   const visible=()=>document.visibilityState==='hidden'?hide():resume();const focus=()=>refresh();
   addEventListener('pageshow',resume);addEventListener('popstate',back);addEventListener('pagehide',hide);addEventListener('focus',focus);document.addEventListener('visibilitychange',visible);
   return()=>{clearInterval(id);removeEventListener('pageshow',resume);removeEventListener('popstate',back);removeEventListener('pagehide',hide);removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visible);};
 },[]);
 useEffect(()=>{
   if(!modal) return;
   const key=e=>{if(e.key==='Escape') close();};
   document.addEventListener('keydown',key);
   return()=>document.removeEventListener('keydown',key);
 },[modal]);
 useEffect(()=>{if(toast){const id=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(id);}},[toast]);
 useEffect(()=>{if(!user||!data.sessionExpiresAt)return;const expire=()=>{clearPrivate('Your session has ended. Sign in to continue.');navigate('/',true,dataRef.current);};const remaining=data.sessionExpiresAt-Date.now();if(remaining<=0){expire();return;}const timer=setTimeout(expire,Math.min(remaining,2147483647));return()=>clearTimeout(timer);},[user?.id,data.sessionExpiresAt]);
 function go(next){if(!userRef.current){navigate('/');return;}navigate(appPath(next,businessPage));}
 function close(){setModal(null);setError('');}
 function open(type,extra={}){if(type==='account'){navigate(authPath({signup:extra.signup,role:extra.requiredRole || extra.accountRole,next:extra.next?.page?appPath(extra.next.page):undefined}));return;}setError('');if(type==='business-edit'&&extra.setup){setPhoto('');setModal(offerServiceStep(dataRef.current));}else setModal({type,...extra});}
 function actionPath(next){if(['food-order','delivery-request'].includes(next?.type)){const q=new URLSearchParams();if(next.listing)q.set('listing',next.listing);if(next.order)q.set('order',next.order);if(next.type==='delivery-request')q.set('category','Delivery');return '/app/request-service?'+q;}if(next?.type==='business-edit')return '/app/offer-service';if(next?.type==='request'){const q=new URLSearchParams();if(next.target?.id)q.set('listing',next.target.id);if(next.category)q.set('category',next.category);return '/app/request-service'+(q.size?'?'+q:'');}return '/app';}
 function gated(type,extra={}){
   const requiredRole=requiredFor(type,extra),next={type,...extra};
   if(!user){navigate(authPath({signup:true,role:requiredRole,next:actionPath(next)}));return;}
   if(requiredRole&&!user.accountRole){open('role-setup',{requiredRole,next});return;}
   if(requiredRole&&user.accountRole!==requiredRole){open('switch-account',{requiredRole,next});return;}
   open(type,extra);
 }
 async function switchTo(target){
   if(busy)return;const next=modal?.next;++refreshSeq.current;setSessionStatus('checking');
   const result=await send('account/switch',{target},()=>{pendingMutations.current.clear();setGuideOpen(false);setModal(null);setMedia(null);setGallery(null);setBusinessPage(null);setPhoto('');navigate(next?actionPath(next):'/app',true,dataRef.current);});
   if(!result){readyRef.current=false;await refresh();setError('The account could not be switched. Please try again or sign in.');}
 }
 async function signOut(next){
   await send('account/logout',{},()=>{clearPrivate();navigate(next?authPath({role:next.requiredRole,next:actionPath(next.next)}):'/',true,dataRef.current);});
 }

 async function send(path,body,after){
   if(busy) return;
   if(!navigator.onLine){setError('Connect to the internet to sign in, send requests, upload photos or chat.');return;}
   setBusy(true);setError('');authSubmittingRef.current=['account/login','account/signup','account/google'].includes(path)&&!userRef.current;
   const mutationKey=JSON.stringify([userRef.current,path,body]);
   if(path==='requests'||path.startsWith('requests/')){if(!pendingMutations.current.has(mutationKey))pendingMutations.current.set(mutationKey,crypto.randomUUID());body={...body,clientMutationId:pendingMutations.current.get(mutationKey)};}
   try{
     const response=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
     const result=await response.json();
     if(response.status===401&&userRef.current){clearPrivate('Your session has ended. Sign in to continue.');navigate('/',true,dataRef.current);return;}
     if(!response.ok){if(response.status<500)pendingMutations.current.delete(mutationKey);throw Error(result.error);}
     pendingMutations.current.delete(mutationKey);await refresh();if(path!=='account/logout'&&!dataRef.current.user){readyRef.current=false;setError('Connect to the internet to verify your session and continue.');return;}after?.(result);return result;
   }catch(e){setError(offline?'Connect to the app server to continue.':e.message || 'Please try again.');}
   finally{authSubmittingRef.current=false;setBusy(false);}
 }
 function archiveRequest(r,archived){send('requests/'+r.id+'/archive',{archived},()=>{if(routeRef.current.requestId===r.id){navigate('/app/requests',true);setRequestTab(r.owner===user.id?'Mine':'Incoming');}else if(modalRef.current?.request===r.id)close();setToast(archived?'Cleared from My Requests':'Restored to request history');});}
 function viewRequest(r){send('requests/'+r.id+'/seen',{},()=>{navigate('/app/requests');setRequestTab(r.owner===user.id?'Mine':'Incoming');open('request-detail',{request:r.id});});}
 function openNotification(n){send('notifications/'+n.id+'/read',{open:true},result=>{
   const r=result.request,d=result.destination;setData(prev=>({...prev,requests:[...prev.requests.filter(x=>x.id!==r.id),r]}));
   navigate('/app/requests');setRequestTab(r.owner===user.id?'Mine':'Incoming');
   if(d.screen==='chat')open('chat',{request:d.request,offer:d.offer});
   else {open('request-detail',{request:d.request,focusOffer:d.screen==='offer'?d.offer:undefined});}
 });}
 function request(target){if(target?.food?.kind==='menu'){gated('food-order',{listing:target.id});return;}if(target?.category==='Delivery'){gated('delivery-request',{listing:target.id});return;}gated('request',{target,category:target?.category || (page==='Housing'?'Housing':category)});}
 function choose(cat){
   if(cat==='Housing'){go('Housing');return;}
   navigate('/app/marketplace');setFoodPath('all');setCategory(cat);setQuery('');
   requestAnimationFrame(()=>document.getElementById('results')?.scrollIntoView({behavior:'smooth',block:'start'}));
 }
 const visible=listings.filter(l=>l.available && (page==='Housing'?l.category==='Housing'&&(!housingType||propertyKeysMatch(housingType,l.propertyType)):l.category!=='Housing') &&
   records.some(c=>c.visible!==false&&(c.id===l.categoryId||c.value===l.category)) && (!category || l.categoryId===records.find(c=>c.value===category)?.id || l.category===category) && (category!=='Food & Cooking'||foodPath!=='menu'||l.food?.kind==='menu') && (!housingBudget || l.price+l.fees<=Number(housingBudget)) &&
   (!query || [l.title,l.category,l.package,l.area,businesses.find(b=>b.id===l.businessId)?.name].some(v=>v?.toLowerCase().includes(query.toLowerCase()))));
 const activeRequest=requests.find(r=>r.id===modal?.request);
 const activeOffer=activeRequest?.offers.find(o=>o.id===modal?.offer);
 const viewing=activeRequest?.category==='Housing';
 const accepted=activeRequest?.confirmed===activeOffer?.id;
 const isStudent=activeRequest?.owner===user?.id;
 function profile(l){open('profile',{listing:l.id});}
 function viewBusiness(id){close();navigate(appPath('Business',id));}
 function finishAuth(result){
   setError('');const current=routeRef.current,next=modal?.next,resume=modal?.resumePath;
   if(result.separateAccount)setToast('Separate '+result.separateAccount.accountRole+' account created. Sign in using '+result.separateAccount.email+'.');
   if(current.kind==='signin'||current.kind==='signup'){
     const path=current.next || '/app';navigate(result.accountRole?path:'/app',true,dataRef.current);
     if(!result.accountRole)setModal({type:'role-setup',resumePath:path,requiredRole:current.requiredRole || (parseAppRoute(path).action==='business-edit'?'provider':parseAppRoute(path).action==='request'?'customer':null)});return;
   }
   close();if(resume){navigate(resume,true,dataRef.current);return;}
   if(next){const role=requiredFor(next.type,next);if(role&&role!==result.accountRole)open('switch-account',{requiredRole:role,next});else open(next.type,next);}else navigate('/app',true,dataRef.current);
 }

 function manageListing(l){return <article className="request-card manage" key={l.id}><div><span className="eyebrow">{l.category}</span><h3>{l.title}</h3><p>{l.available?'Available':l.category==='Housing'?'Rented':'Unavailable'}</p></div><div className="row-actions"><button className="secondary" onClick={()=>{setPhoto(l.image);gated('edit',{listing:l.id});}}>Edit</button><button className="secondary" onClick={()=>send('listings/'+l.id+'/availability',{available:!l.available})}>{l.available?(l.category==='Housing'?'Mark rented':'Pause listing'):'Make available'}</button></div></article>;}
 function cards(items){return items.length?<div className="cards">{items.map(l=><article className="listing" key={l.id}><button className="listing-card-link" onClick={()=>profile(l)}>
   <div className={'listing-photo '+(!coverPhotoUrl(l)?'no-photo':'')}>{coverPhotoUrl(l)?<img src={coverPhotoUrl(l)} alt=""/>:<Store size={42}/>}{!l.flyerPhotoId&&<><span className="pill">{l.role || l.categoryName || l.category}</span><span className="image-arrow"><ArrowUpRight size={16}/></span></>}</div>
   <div className="listing-info"><div className="meta">{l.flyerPhotoId&&<>{l.role || l.categoryName || l.category}<span>·</span></>}<MapPin size={13}/>{l.area}<span>·</span>{l.demo?'Sample listing':l.modes.join(' / ')}</div><h3>{l.title}</h3>{!l.demo&&<p className="muted">{l.category==='Housing'?(l.availabilityConfirmedAt?'Availability confirmed '+new Date(l.availabilityConfirmedAt).toLocaleDateString('en-NG'):'Availability date unconfirmed'):l.available?(l.availabilityLabel==='Available today'&&new Date(l.availabilityConfirmedAt).toLocaleDateString('en-NG',{timeZone:'Africa/Lagos'})===new Date().toLocaleDateString('en-NG',{timeZone:'Africa/Lagos'})?'Available today':'By appointment'):'Unavailable'}</p>}{l.category==='Housing'&&l.propertyType&&<p className="muted">{l.propertyType}</p>}{l.businessId&&<p className="service-business-name">{businesses.find(b=>b.id===l.businessId)?.name}</p>}<div className="card-foot"><span>{l.category==='Housing'?'Total move in':'From'}</span><strong>{l.pricingMode==='quote'?'Request a quote':naira(l.price+(l.fees || 0))}</strong></div></div>
 </button>{l.category==='Housing'&&l.hasVideo&&<button className="secondary listing-video-button" onClick={()=>setGallery({...l,videoFirst:true})}>Watch video</button>}</article>)}</div>:<div className="empty"><Search size={24}/><h3>No listings found</h3><p>Try another search or send a request to available providers.</p><button className="secondary" onClick={()=>request()}>Send a request <ArrowRight size={16}/></button></div>;}
 const listing=listings.find(l=>l.id===modal?.listing);
 const listingCover=listing&&coverPhotoUrl(listing,businesses.find(b=>b.id===listing.businessId));
 if(sessionStatus==='checking')return <div className="session-check" role="status"><Logo/><p>Opening Campus Loop…</p></div>;
 if(!user||route.kind!=='protected')return <div className="public-entry"><div className="public-install"><PwaPanel user={user}/></div>{error&&<p className="error public-error" role="alert">{error}</p>}{route.kind==='signin'||route.kind==='signup'?<main className="auth-screen"><a className="auth-back" href="/" onClick={e=>{e.preventDefault();setError('');navigate(welcomePath(route.next));}}>← Back to welcome</a><div className="auth-card"><AccountForm key={route.kind+(route.requiredRole || '')} signup={route.kind==='signup'} accountRole={route.requiredRole} requiredRole={route.requiredRole} campuses={data.campuses} busy={busy} onSend={send} onError={setError} onSuccess={finishAuth} onModeChange={(signup,role)=>{setError('');navigate(signup&&!role?'/':authPath({signup,role,next:route.next}));}}/></div></main>:<Welcome content={data.welcome} next={route.next} onNavigate={navigate}/>}</div>;
 return <>
 {guideOpen&&<GuideMenu activeId={page==='Guide'?guideId:null} items={guide.menuItems} onClose={()=>setGuideOpen(false)} onChoose={id=>{setGuideOpen(false);navigate(guideHref(id));}}/>}
 <header className={user&&['Dashboard','Explore','Requests','My listings','Appointments','Notifications','Saved'].includes(page)?'cl-app-header':undefined}><div className="header-inner"><button className="icon-btn guide-menu-toggle" aria-label="Open Campus Guide" aria-controls="campus-guide-menu" aria-expanded={guideOpen} onClick={()=>setGuideOpen(!guideOpen)}><Menu size={22}/></button>
   <button className="brand" aria-label="Campus Loop home" onClick={()=>go('Explore')}><Logo/>{user&&['Dashboard','Explore','Requests','My listings','Appointments','Notifications','Saved'].includes(page)&&<span className="cl-header-tagline">Campus Services Made Easy</span>}</button>
   <button className="campus" aria-label={'Campus: '+campusName} onClick={()=>open('campus')}><MapPin size={14}/><span className="campus-full">{campusName}</span><span className="campus-short">DELSU</span><ChevronDown size={12}/></button>
   <nav aria-label="Main navigation">{['Explore','Housing','Requests','Appointments'].map(p=><button key={p} className={page===p?'current':''} onClick={()=>go(p)}>{p}{p==='Requests' && incoming>0 && <b>{incoming}</b>}</button>)}</nav>
   <div className="header-actions"><button className="icon-btn cl-header-notifications" title="Notifications" aria-label={'Notifications'+(unread?' · '+unread+' unread':'')} onClick={()=>go('Notifications')}><Bell size={19}/>{unread>0&&<b className="notification-count">{unread}</b>}</button>
   <button className="dark account" aria-label={user?'Edit profile photo':'Sign in'} onClick={()=>user?open('edit-profile'):open('account')}>{user?<Avatar name={user.name} src={user.avatarUrl}/>: 'Sign in'}</button></div>
 </div></header>
 <div className={page==='Dashboard'?'marketplace-layout cl-dashboard-shell':user&&['Explore','Requests','My listings','Appointments','Notifications','Saved'].includes(page)?'marketplace-layout cl-unified-shell':'marketplace-layout'}>
 {page==='Dashboard'&&user&&<aside className="cl-shell-sidebar" aria-label="Dashboard navigation">
  <div className="cl-shell-sidebar-title">CAMPUS LOOP</div>
  <button className="cl-shell-active" onClick={()=>go('Dashboard')}><House size={19}/> Dashboard</button>
  <button onClick={()=>go('Explore')}><Search size={19}/> Explore Services</button>
  <div className="cl-shell-group">MY BUSINESS</div>
  <button onClick={()=>go('My listings')}><Store size={19}/> My Listings</button>
  <button onClick={()=>gated('business-edit',{setup:true})}><Plus size={19}/> Create Listing</button>
  <button onClick={()=>go('Requests')}><BookOpen size={19}/> Requests &amp; Orders</button>
  <button onClick={()=>go('Notifications')}><Bell size={19}/> Notifications</button>
  <div className="cl-shell-group">ACCOUNT</div>
  <button onClick={()=>open('edit-profile')}><Avatar name={user.name} src={user.avatarUrl}/> My Profile</button>
  <button onClick={()=>open('help-center')}><MessageCircle size={19}/> Help &amp; Support</button>
 </aside>}
 {page!=='Dashboard'&&<GuideSidebar items={guide.menuItems} activeId={page==='Guide'?guideId:null} onChoose={id=>navigate(guideHref(id))}/>}
 <main className={page==='Dashboard'?'marketplace-content cl-dashboard-content':page==='Explore'?'marketplace-content cl-unified-content cl-explore-content':'marketplace-content'}>
 {page!=='Dashboard'&&page!=='Explore'&&<PwaPanel user={user}/>}
 {page==='Notifications'&&<PhoneAlerts settings={true}/>}
 {page!=='Dashboard'&&page!=='Explore'&&<Announcements items={data.announcements}/>}
 {error&&!modal&&<p className="error" role="alert">{error}</p>}
 {offline&&<p className="notice">Connection lost. Reconnect to load current activity.</p>}
 {page==='Explore'&&<ExploreRedesign listings={visible} categories={categories} records={records} category={category} onCategory={choose} query={query} onQuery={setQuery} onOpen={profile} onRequest={()=>request()} onHousing={()=>go('Housing')} onFood={()=>{setFoodPath('menu');setQuery('')}} onDelivery={()=>gated('delivery-request')} formatPrice={naira}/>}
 {page==='Guide'&&<ContentPlacements ads={data.ads} placement="guide"/>}
 {page==='Guide'&&<CampusGuide guide={guide} id={guideId} listings={listings} onListing={profile}/>}
 {page==='Housing' && <>
   <section className="housing-hero"><div><div className="hero-campus"><span/> DELSU ABRAKA</div><h1>Find your<br/>campus room.</h1><p>Compare rent, fees and move in costs. Chat with the landlord or agent and arrange a viewing.</p><button className="dark" onClick={()=>request()}><Plus size={18}/> Post a housing request</button></div><img src="/images/housing.webp" alt="A bright student studio with a bed"/></section>
   <section><div className="section-head results-head"><div><h2>Rooms to explore</h2><p>See the full cost before requesting a viewing.</p></div><div className="filters"><select aria-label="Filter by property type" value={housingType} onChange={e=>setHousingType(e.target.value)}><option value="">Any room type</option>{propertyTypes.map(type=><option key={type}>{type}</option>)}</select><label className="search"><Search size={18}/><input aria-label="Search housing" placeholder="Room type or area" value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="search budget"><span>₦</span><input type="number" min="0" aria-label="Maximum move in cost" placeholder="Max budget" value={housingBudget} onChange={e=>setHousingBudget(e.target.value)}/></label></div></div>{cards(visible)}</section>
 <section className="workspace"><div className="section-head"><div><h2>{ownHousing.length?'Your housing listings':'Have a room to list?'}</h2></div><button className="secondary" onClick={()=>{setPhoto('');gated('edit',{initialCategory:'Housing'});}}><Plus size={18}/> Add housing listing</button></div>{ownHousing.map(manageListing)}</section>
 <Roommates data={data} busy={busy} send={send} error={error} setError={setError} onSignIn={()=>open('account',{signup:true})}/>
 </>}
 {page==='Dashboard'&&user&&<AccountDashboard user={user} campus={campusName} requests={requests} listings={mine} businesses={ownBusinesses} unfinishedBusiness={unfinishedBusiness} savedCount={data.savedListingIds?.length || 0} onRequest={()=>request()} onCreate={()=>gated('business-edit',{setup:true})} onManage={()=>go('My listings')} onRequests={()=>{go('Requests');setRequestTab(user.accountRole==='provider'?'Incoming':'Mine');}} onBrowse={()=>go('Explore')} onSaved={()=>go('Saved')} onAppointments={()=>go('Appointments')} onHelp={()=>open('help-center')} onMessages={()=>go('Requests')} onEditProfile={()=>open('edit-profile')} onSetup={()=>open('role-setup')} onOpen={viewRequest}/>}
 
 {page==='Notifications'&&user&&<><Notifications notifications={data.notifications || []} unreadCount={unread} busy={busy} onOpen={openNotification} onRead={n=>send('notifications/'+n.id+'/read',{})} onReadAll={()=>send('notifications/read-all',{})}/></>}
 {page==='Appointments'&&<Appointments key={user.id} requests={requests} user={user} onOpen={viewRequest} busy={busy} onSave={reminders=>send('appointment-reminders',{reminders},()=>setToast('Reminder settings saved'))}/>}
 {page==='Requests'&&user&&<section className="workspace"><div className="section-head"><div><h1>{requestTab==='Mine'?'My Requests':'Incoming Requests'}</h1><p>{requestTab==='Mine'?'Track replies, compare offers and review your bookings.':'Matching requests for your available listings.'}</p></div><button className="dark" onClick={()=>request()}><Plus size={18}/> New request</button></div><div className="tabs">{['Mine','Incoming'].map(tab=><button key={tab} className={tab===requestTab?'selected':''} onClick={()=>setRequestTab(tab)}>{tab==='Mine'?'My Requests':'Incoming Requests'}{tab==='Incoming'&&incoming>0?' · '+incoming:''}</button>)}</div><RequestList key={user.id+'-'+requestTab} requests={requests} user={user} tab={requestTab} listings={listings} onOpen={viewRequest} onArchive={archiveRequest} busy={busy} onClear={after=>send('request-history/clear',{tab:requestTab},r=>{after();setToast(r.count?'Finished history cleared':'No finished requests to clear');})}/></section>}
 {page==='My listings' && user && <section className="workspace"><div className="section-head"><div><h1>{user.accountRole==='provider'?'Manage businesses':'Your housing listings'}</h1><p>{user.accountRole==='provider'?'Each business has its own services and listings.':'Manage the rooms you listed.'}</p></div><button className="dark" onClick={()=>user.accountRole==='provider'?gated('business-edit'):(setPhoto(''),gated('edit',{initialCategory:'Housing'}))}><Plus size={18}/> {user.accountRole==='provider'?'Create a business':'Add housing listing'}</button></div>
 {user.accountRole==='provider'?<>
  {ownBusinesses.map(b=>{const services=ownServices.filter(l=>l.businessId===b.id);return <section className="business-manager" key={b.id} aria-label={b.name}><div className="section-head"><div><h2>{b.name}</h2><p>{services.length} {services.length===1?'listing':'listings'} · {(b.areas||[]).join(', ')}</p></div><div className="row-actions"><button className="dark" onClick={()=>addBusinessService(b,!services.length)}><Plus size={16}/> Add listing</button><button className="secondary" onClick={()=>viewBusiness(b.id)}>Manage business</button></div></div>
   {services.length?services.map(manageListing):<div className="empty"><Store size={22}/><h3>No listings for this business yet</h3><p>Add a service to {b.name}.</p><button className="secondary" onClick={()=>addBusinessService(b,true)}>Add first service</button></div>}</section>;})}
  {!ownBusinesses.length&&<div className="empty"><Store size={22}/><h3>No businesses yet</h3><p>Create your first business to organize its service listings.</p><button className="dark" onClick={()=>gated('business-edit')}>Create a business</button></div>}
  {ownServices.some(l=>!l.businessId||!ownBusinesses.some(b=>b.id===l.businessId))&&<section className="business-manager" aria-label="Unassigned listings"><div className="section-head"><div><h2>Listings not assigned to a business</h2><p>These existing listings are kept separate until you link them to one of your businesses.</p></div></div>{ownServices.filter(l=>!l.businessId||!ownBusinesses.some(b=>b.id===l.businessId)).map(manageListing)}<p className="muted">Open a business and select Link an existing listing to organize these services.</p></section>}
 </>:<>{ownHousing.map(manageListing)}{!ownHousing.length&&<div className="empty"><Store/><h3>No housing listings yet</h3><p>Create a housing listing to start receiving requests.</p></div>}</>}
 {user&&!user.googleConnected&&<GoogleSignIn link onError={setError} onCredential={credential=>send('account/google',{credential,link:true},()=>setToast('Google account connected'))}/>}
 <button className="secondary" onClick={()=>signOut()}>Sign out</button></section>}
 {page==='Saved'&&<section><div className="section-head"><div><h1>Saved listings</h1><p>Keep your favourites together.</p></div></div>{listings.some(l=>data.savedListingIds?.includes(l.id)&&l.available)?cards(listings.filter(l=>data.savedListingIds?.includes(l.id)&&l.available)):<p className="muted">Listings you save will appear here when available.</p>}</section>}
 {page==='Business'&&selectedBusiness&&<BusinessPage business={selectedBusiness} listings={listings} user={user} busy={busy} onProfile={profile} onEdit={()=>gated('business-edit',{business:selectedBusiness.id})} onAdd={()=>addBusinessService({...selectedBusiness,category:selectedBusiness.category || ownServices.find(l=>l.businessId===selectedBusiness.id)?.category},!ownServices.some(l=>l.businessId===selectedBusiness.id))} onLink={()=>gated('link-listing',{business:selectedBusiness.id})} onGallery={()=>setGallery({...selectedBusiness,title:selectedBusiness.name,entityType:'business'})} onCover={()=>setMedia({url:coverPhotoUrl(selectedBusiness),title:selectedBusiness.name+' cover photo'})}/>}
 </main></div>
 {user&&<nav className="campus-mobile-tabs" aria-label="Mobile app navigation">
  <button className={page==='Dashboard'?'selected':''} onClick={()=>go('Dashboard')}><House size={20}/><span>Home</span></button>
  <button className={page==='Explore'?'selected':''} onClick={()=>go('Explore')}><Search size={20}/><span>Explore</span></button>
  <button className={page==='My listings'?'selected':''} onClick={()=>user.accountRole==='provider'?go('My listings'):go('Saved')}><Store size={20}/><span>{user.accountRole==='provider'?'My business':'Saved'}</span></button>
  <button className={page==='Requests'?'selected':''} onClick={()=>go('Requests')}><BookOpen size={20}/><span>Requests</span>{incoming>0&&<b>{incoming}</b>}</button>
  <button onClick={()=>open('account-menu')}><Avatar name={user.name} src={user.avatarUrl}/><span>Account</span></button>
 </nav>}
 {user?.accountRole==='provider'&&<ProviderSetupAssistant user={user} businesses={ownBusinesses} listings={ownServices} onCreateBusiness={()=>gated('business-edit')} onAddService={addBusinessService} onManage={()=>go('My listings')}/>}
 {media&&<MediaViewer {...media} onClose={()=>setMedia(null)}/>}
 {gallery&&<Gallery listing={gallery} videoFirst={gallery.videoFirst} onClose={()=>setGallery(null)}/>}
 <footer className={page==='Dashboard'?'cl-dashboard-footer':undefined}><Logo/><span>DELSU Abraka</span><button onClick={()=>{setPhoto('');gated('business-edit',{setup:true});}}>Offer a service <ArrowUpRight size={15}/></button></footer>

 {toast&&<div className="toast" role="status"><Check size={18}/>{toast}</div>}
 {modal && <div className="overlay" style={{display:authPrompt?'none':undefined}} onClick={e=>{if(e.target===e.currentTarget)close();}}><div key={modal.firstService||modal.type==='service-published'?modal.type:undefined} className="dialog" role="dialog" aria-modal="true" aria-label="Campus Loop form">
 <button className="icon-btn close" onClick={close} aria-label="Close"><X size={22}/></button>
 {error&&<p className="error" role="alert">{error}</p>}
 {modal.type==='campus'&&<><h2>Your campus</h2>{data.campuses.map(c=><p key={c.id} className="campus-row"><MapPin size={17}/>{c.name}{c.name===campusName&&<Check size={17}/>}</p>)}</>}
 {modal.type==='account'&&<AccountForm key={modal.requiredRole || 'general'} signup={modal.signup} accountRole={modal.accountRole} requiredRole={modal.requiredRole} campuses={data.campuses} busy={busy} onSend={send} onError={setError} onSuccess={finishAuth}/>}
 {modal.type==='business-edit'&&<BusinessForm categoryRecords={records} business={businesses.find(b=>b.id===modal.business)} busy={busy} error={setError} onSend={b=>send('businesses',b,r=>{if(b.id){viewBusiness(r.id);setToast('Business saved');}else addBusinessService({id:r.id,category:b.category},true);})}/>}
 {modal.type==='link-listing'&&<LinkListingForm business={businesses.find(b=>b.id===modal.business)} listings={mine} busy={busy} onLink={l=>send('listings',{...l,businessId:modal.business,fees:(l.fees||0)-(l.agentFee||0),image:l.legacyImage || (l.image?.startsWith('data:')?l.image:''),permission:l.role==='Agent'},()=>{close();setToast('Listing linked');})}/>}
 {modal.type==='profile'&&listing&&<>{listingCover&&<button type="button" className="cover-photo-button" onClick={()=>setMedia({url:listingCover,title:listing.title+' cover photo'})}><img className="profile-photo" src={listingCover} alt="View cover photo"/></button>}<span className="eyebrow">{listing.role || listing.categoryName || listing.category} · {listing.area}</span><div className="account-avatar-row">{listing.category!=='Housing'&&!listing.demo&&<Avatar name={listing.title} src={listing.providerAvatarUrl}/>}<h2>{listing.title}</h2></div>{listing.demo&&<p className="notice">Sample listing</p>}{(listing.galleryIds?.length||listing.image)&&<button className="secondary" onClick={()=>setGallery(listing)}>Open gallery{listing.galleryIds?.length?' · '+listing.galleryIds.length:''}</button>}{listing.businessId&&<button className="text-btn" onClick={()=>viewBusiness(listing.businessId)}>View {businesses.find(b=>b.id===listing.businessId)?.name || 'business page'} →</button>}<ReportButton targetType="listing" targetId={listing.id} label="Report this listing"/><ListingDetails listing={listing}/><div className="terms"><strong>{listing.pricingMode==='quote'?'Request a quote':naira(listing.price)}{listing.category==='Housing'?' annual rent':''}</strong>{listing.category==='Housing'?<>{listing.role==='Agent'&&<span>Agent fee {naira(listing.agentFee || 0)}</span>}<span>Other fees {naira(listing.fees-(listing.agentFee || 0))}</span><strong>Total move in {naira(listing.price+listing.fees)}</strong></>:<><span>{listing.category==='Transport'?'Starting fare · final fare quoted by driver':listing.negotiable?'Negotiable':'Fixed price'}</span><span>{listing.modes.join(' · ')}</span></>}</div>
 {!listing.demo&&listing.category!=='Housing'&&<ListingReviews id={listing.id}/>}
 <button className="secondary" disabled={busy} onClick={()=>send('listings/'+listing.id+'/saved',{saved:!data.savedListingIds?.includes(listing.id)})}>{data.savedListingIds?.includes(listing.id)?'Remove from saved':'Save listing'}</button>
 {listing.available&&!listing.demo&&listing.owner!==user?.id&&records.some(c=>c.visible!==false&&(c.id===listing.categoryId||c.value===listing.category))&&<button className="dark" onClick={()=>request(listing)}>{listing.category==='Housing'?'Request a viewing':listing.food?.kind==='menu'?'Order food':listing.category==='Delivery'?'Request delivery':'Request a service'} <ArrowRight size={17}/></button>}</>}
 {modal.type==='food-order'&&listing&&<FoodOrderForm listing={listing} busy={busy} onSend={b=>send('requests',b,r=>{navigate('/app/requests');open('request-detail',{request:r.id});})}/>}
 {modal.type==='delivery-request'&&<DeliveryRequest target={listing} order={requests.find(r=>r.id===modal.order)} busy={busy} onSend={b=>send('requests',b,r=>{navigate('/app/requests');open('request-detail',{request:r.id});})}/>}
 {modal.type==='request'&&<RequestForm categoryRecords={records} accountRole={user?.accountRole} listings={listings} target={modal.target} initialCategory={modal.category} busy={busy} onSend={b=>send('requests',b,()=>{close();go('Requests');setRequestTab('Mine');setToast('Request sent');})}/>}
 {modal.type==='edit-profile'&&user&&<ProfilePhoto user={user} busy={busy} onError={setError} onSave={image=>send('profile-photo',{image},()=>{open('account-menu');setToast(image?'Profile photo saved':'Profile photo removed');})}/>}
 {modal.type==='help-center'&&user&&<HelpCenter key={user.id+':'+(modal.tab || 'faq')} initialTab={modal.tab} busy={busy} onSend={send}/>}
 {modal.type==='account-settings'&&user&&<><h2>Account Settings</h2><p className="muted">Manage your profile, security and notifications.</p><div className="cl-settings-options"><button onClick={()=>open('edit-profile')}><span><strong>Profile photo</strong><small>Update the photo shown on your account</small></span><ArrowRight size={18}/></button><button onClick={()=>{close();go('Notifications')}}><span><strong>Notifications</strong><small>Review alerts and notification preferences</small></span><ArrowRight size={18}/></button><button onClick={()=>open('account-switcher')}><span><strong>Account access</strong><small>Switch between your available accounts</small></span><ArrowRight size={18}/></button><button onClick={()=>open('help-center')}><span><strong>Help and support</strong><small>Get assistance with Campus Loop</small></span><ArrowRight size={18}/></button></div></>}
 {modal.type==='account-menu'&&user&&<><h2>Your account</h2><div className="account-avatar-row"><Avatar name={user.name} src={user.avatarUrl}/><strong>{user.name}</strong></div><span className="account-role-label">{user.accountRole?user.accountRole+' account':'Account role needs setup'}</span>{user.roleStatus==='inferred'&&<p className="muted">Role recognised from your existing service activity. Your stored account has not been migrated.</p>}<div className="account-menu-actions"><button className="secondary" onClick={()=>open('account-settings')}>Account settings</button><button className="secondary" onClick={()=>open('help-center')}>Help and feedback</button><button className="secondary" onClick={()=>{close();go('Appointments');}}>Appointments</button><button className="secondary" onClick={()=>open('edit-profile')}>Edit profile</button><button className="secondary" onClick={()=>open('account-switcher')}>Switch account</button><button className="secondary" onClick={()=>{close();go('Saved');}}>Saved listings</button><button className="secondary" onClick={()=>{close();go('Notifications');}}>Notifications{unread?' · '+unread+' unread':''}</button><button className="dark" onClick={()=>{close();go('Dashboard');}}>Open dashboard</button>{user.accountRole==='provider'&&<button className="secondary" onClick={()=>{close();go('My listings');}}>My listings</button>}{!user.accountRole&&<button className="secondary" onClick={()=>open('role-setup')}>Set up separate roles</button>}<button className="secondary" onClick={()=>signOut()}>Sign out</button></div></>}
 {modal.type==='switch-account'&&<><h2>Use a {modal.requiredRole} account</h2><p>You’re signed in with a {user?.accountRole} account. To {modal.requiredRole==='provider'?'offer services':'request services'}, sign in to or create a separate {modal.requiredRole} account.</p><p className="muted">Your current account and its history will stay available. We’ll return you to this action after sign-in.</p><button className="dark" disabled={busy} onClick={()=>open('account-switcher',{requiredRole:modal.requiredRole,next:modal.next})}>Choose {modal.requiredRole} account</button></>}
 {modal.type==='account-switcher'&&user&&<AccountSwitcher user={user} accounts={data.linkedAccounts || []} requiredRole={modal.requiredRole} busy={busy} onSend={send} onSwitch={switchTo} onError={setError} onSetup={()=>open('role-setup')}/>}
 {modal.type==='role-setup'&&user&&<AccountRoleSetup user={user} requiredRole={modal.requiredRole} busy={busy} onSend={send} onSuccess={finishAuth}/>}
 {modal.type==='service-published'&&<><h2>Your service is live</h2><p>Students can now find and request your service.</p><div className="row-actions"><button className="dark" onClick={()=>open('profile',{listing:modal.listing})}>View listing</button><button className="secondary" onClick={()=>addBusinessService({id:modal.business,category:modal.initialCategory})}>Add another service</button></div></>}
 {modal.type==='edit'&&<EditForm categoryRecords={records} accountRole={user?.accountRole} listing={listing?{...listing,available:listing.storedAvailable ?? listing.available}:listing} businesses={ownBusinesses} initialBusinessId={modal.business} firstService={modal.firstService} initialCategory={modal.initialCategory} photo={photo} setPhoto={setPhoto} error={setError} busy={busy} onSend={b=>send('listings',b,r=>{if(modal.firstService){open('service-published',{listing:r.id,business:b.businessId,initialCategory:b.category});return;}close();if(b.category==='Housing')go('Housing');else if(b.businessId)viewBusiness(b.businessId);else go('My listings');setToast('Listing saved');})}/>}
 {modal.type==='request-detail'&&activeRequest&&user&&<RequestDetail request={activeRequest} user={user} listings={listings} busy={busy} focusOffer={modal.focusOffer} onArchive={archiveRequest} requests={requests} onDelivery={r=>gated('delivery-request',{order:r.id})} onOpen={viewRequest} onOrderResponse={decision=>send('requests/'+activeRequest.id+'/order-response',{decision},()=>setToast('Order '+(decision==='accept'?'accepted':'declined')))} onCancel={()=>send('requests/'+activeRequest.id+'/cancel',{},()=>setToast('Request cancelled'))} onResend={appointment=>send('requests/'+activeRequest.id+'/resend',{appointment},r=>{navigate('/app/requests/'+r.id);setRequestTab('Mine');open('request-detail',{request:r.id});setToast('Request sent again');})} onAction={(action,body,after)=>send('requests/'+activeRequest.id+'/'+action,body,()=>{after?.();setToast('Changes saved');})} onBrowse={()=>{close();go(activeRequest.category==='Housing'?'Housing':'Explore');if(activeRequest.category!=='Housing')setCategory(activeRequest.category);}} onComplete={()=>send('requests/'+activeRequest.id+'/complete',{},()=>setToast(activeRequest.kind==='food-order'?'Order received':'Service completed'))} onReview={review=>send('requests/'+activeRequest.id+'/review',review,()=>setToast('Review published'))} onAcceptBudget={body=>send('requests/'+activeRequest.id+'/offer',body,()=>setToast('Budget accepted. Waiting for the customer to confirm.'))} onQuote={()=>gated('quote',{request:activeRequest.id})} onChat={o=>open('chat',{request:activeRequest.id,offer:o.id})} onProfile={profile} onDecline={()=>send('requests/'+activeRequest.id+'/dismiss',{},()=>{close();setToast('Request declined');})}/>}
 {modal.type==='quote'&&activeRequest&&<OfferForm request={activeRequest} listings={mine.filter(l=>activeRequest.options?.includes(l.id))} busy={busy} onSend={b=>send('requests/'+activeRequest.id+'/offer',b,()=>{open('request-detail',{request:activeRequest.id});setToast('Offer sent');})}/>}
 {modal.type==='chat'&&activeRequest&&activeOffer&&<><button className="text-btn" onClick={()=>open('request-detail',{request:activeRequest.id,focusOffer:activeOffer.id})}>← Back to request</button><div className="account-avatar-row"><Avatar name={isStudent?(listings.find(l=>l.id===activeOffer.listing)?.title || 'Provider'):activeRequest.student} src={isStudent?listings.find(l=>l.id===activeOffer.listing)?.providerAvatarUrl:activeRequest.customerAvatarUrl}/><h2>{isStudent?(listings.find(l=>l.id===activeOffer.listing)?.title || 'Provider'):activeRequest.student}</h2></div><p className="muted">{activeRequest.category} · {activeRequest.mode}</p>{!accepted&&<div className="terms"><strong>{naira(activeOffer.terms.price)} · {activeOffer.terms.time}</strong><OfferTerms terms={activeOffer.terms}/></div>}
 {isStudent&&activeRequest.status==='Open'&&<button className="dark" disabled={busy} onClick={()=>send('requests/'+activeRequest.id+'/offers/'+activeOffer.id+'/confirm',{revision:activeOffer.revision},()=>setToast(viewing?'Viewing confirmed':'Booking confirmed'))}>{viewing?'Confirm viewing':activeRequest.category==='Transport'?'Confirm ride':'Confirm booking'} <Check size={17}/></button>}
 {activeRequest.transport&&<RideDetails ride={activeRequest.transport} exact={isStudent||accepted}/>}
 {accepted&&<BookingSummary request={activeRequest} listings={listings} compact/>}
 <ReportButton targetType="conversation" targetId={activeOffer.id} requestId={activeRequest.id} label="Report this conversation"/><MessageThread messages={activeOffer.messages} userId={user.id} busy={busy} canSend={activeRequest.status==='Open'||accepted} onSend={(message,after)=>send('requests/'+activeRequest.id+'/offers/'+activeOffer.id+'/message',{message},after)}/>
 </>}
 </div></div>}
 {authPrompt&&<div className="overlay auth-overlay"><div className="dialog" role="dialog" aria-modal="true" aria-label="Sign in to continue"><button className="icon-btn close" aria-label="Return to draft" onClick={()=>{setAuthPrompt(false);setError('');}}>×</button>{error&&<p className="error" role="alert">{error}</p>}<AccountForm requiredRole={requiredFor(modal?.type,modal)} campuses={data.campuses} busy={busy} onSend={send} onError={setError} onSuccess={finishAuth}/></div></div>}
 </>;
}
function Field({label,...props}){return <label>{label}<input {...props}/></label>;}
function Submit({busy,children}){return <button className="dark" disabled={busy}>{busy?'Saving…':children}<ArrowRight size={16}/></button>;}
function RequestForm({categoryRecords=defaultCategories,accountRole,target,initialCategory,busy,onSend,listings}){
 const [category,setCategory]=useState(categoryRecords.find(c=>c.visible!==false&&c.value===initialCategory)?.value || categoryRecords.find(c=>c.visible!==false&&(accountRole==='customer'||c.value==='Housing'))?.value || '');
 const [type,setType]=useState(target?serviceName(target):'');
 const [rooms,setRooms]=useState(target?.propertyType?[target.propertyType]:[]),[space,setSpace]=useState(''),[areas,setAreas]=useState([]);
 const types=[...new Set([...Object.keys(servicePresets[category] || {}),...listings.filter(l=>(l.category===category||l.categoryId===categoryRecords.find(c=>c.value===category)?.id)&&l.available).map(serviceName).filter(Boolean)])];
 const modes=target?.modes || (category==='Housing'?['Viewing']:appointmentTypes);
 const [visit,setVisit]=useState(target?.modes?.[0] || ''),[serviceLocation,setServiceLocation]=useState(null);
 const mode=category==='Housing'?'Viewing':visit;

 if(category==='Food & Cooking')return <><button className="text-btn" onClick={()=>setCategory('Nails')}>← Other services</button><CookingRequest target={target} busy={busy} onSend={onSend}/></>;
 if(category==='Delivery')return <DeliveryRequest target={target} busy={busy} onSend={onSend}/>;
 if(category==='Transport')return <TransportRequest target={target} busy={busy} onSend={onSend} onBack={target?undefined:()=>setCategory('Nails')}/>;
 return <><h2>{target?'Request '+target.title:category==='Housing'?'Post a housing request':'Request a service'}</h2><p className="muted">{target?'Send your request directly to this provider.':'Available providers in your category will see your request.'}</p><form onSubmit={e=>{e.preventDefault();const fields=formData(e);onSend({...fields,category,serviceType:category==='Housing'?'':type,target:target?.id,propertyTypes:category==='Housing'?rooms:[],serviceLocation:allowsServiceLocation(category,mode)?serviceLocation:null,cleaning:category==='Cleaning'?{propertyType:space,areas,workAreas:fields.workAreas}:undefined});}}>
 {!target&&<label>Category<select aria-label="Category" value={category} onChange={e=>{setCategory(e.target.value);setType('');setVisit('');setServiceLocation(null);setRooms([]);setSpace('');setAreas([]);}}>{categoryRecords.filter(c=>c.visible!==false&&(accountRole==='customer'||c.value==='Housing')).map(c=><option key={c.id} value={c.value}>{c.name}</option>)}</select></label>}
 {category!=='Housing'&&(target?<p className="muted">{serviceName(target)}</p>:<label>Service type (optional)<select aria-label="Requested service type" value={type} onChange={e=>setType(e.target.value)}><option value="">Any service type</option>{types.map(t=><option key={t}>{t}</option>)}</select></label>)}
 {category==='Housing'&&!target&&<Choices legend="Room types you would consider" options={propertyTypes.filter(type=>type!=='Self contained room'&&type!=='Flat')} value={rooms} onChange={setRooms} multiple/>}{rooms.includes('Bedsitter / Self contain')&&category==='Housing'&&<p className="muted">One main room for sleeping and living. Check each listing for private or shared facilities.</p>}
 {category==='Cleaning'&&<><Choices legend="Property type" options={target?.cleaningPropertyTypes?.length?target.cleaningPropertyTypes:cleaningPropertyTypes} value={space} onChange={type=>{setSpace(type);setAreas([]);}}/>
 <Choices legend="Areas to clean" options={cleaningAreas.filter(area=>!['Office','Shop'].includes(space)||!['Bedroom','Kitchenette','Living area','Oven'].includes(area))} value={areas} onChange={setAreas} multiple/>
 <Field label={['Office','Shop'].includes(space)?'Number of work areas (optional)':'Number of rooms or areas (optional)'} name="workAreas" type="number" min="1" max="500"/></>}
 <label>{category==='Housing'?'What kind of room do you need?':'What do you need?'}<textarea name="details" maxLength={1000} placeholder={category==='Housing'?'Room type, area and must haves':'Describe the service you need'} required/></label>
 <label>Appointment type<select aria-label="Appointment type" name="mode" value={mode} onChange={e=>setVisit(e.target.value)}>{!target&&category!=='Housing'&&<option value="">Any visit type</option>}{modes.map(m=><option key={m}>{m}</option>)}</select></label>
 {allowsServiceLocation(category,mode)&&<ServiceLocation value={serviceLocation} onChange={setServiceLocation}/>}
 <AppointmentPicker/><Field label="Budget in naira (optional)" name="budget" type="number" min="0"/><Submit busy={busy}>Send request</Submit></form></>;
}
createRoot(document.getElementById('root')).render(location.pathname==='/admin'||location.pathname.startsWith('/admin/')?<React.Suspense fallback={<p>Opening private admin…</p>}><AdminApp/></React.Suspense>:<App/>);
