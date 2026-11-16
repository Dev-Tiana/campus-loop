import AppointmentPicker from './AppointmentPicker.jsx';
import {ingredientOptions} from '../shared/commerce.js';
import BookingActions,{ReviseRequest} from './BookingActions.jsx';
import {canClearRequest,isOpenServiceRequest,requestRetryAt} from '../shared/request-lifecycle.js';
import {Avatar} from './ProfilePhoto.jsx';
import {FoodOrderSummary,DeliverySummary} from './Commerce.jsx';
import React,{useEffect,useState} from 'react';import {ArrowRight,MessageCircle} from 'lucide-react';import {OfferTerms} from './OfferForm.jsx';import {RideDetails} from './Transport.jsx';import {money} from '../server/seed.js';
const naira=n=>'₦'+money(n);
export const activityTime=at=>at?new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at)):'Date not recorded';
export function requestStatus(r,own){if(r.statusLabel)return r.statusLabel;if(r.status!=='Open')return r.status;if(own)return r.offers.length?r.offers.length+' '+(r.offers.length===1?'offer':'offers')+' received':'Waiting for replies';return r.offers.length?(r.offers[0].revision>1?'Offer revised':'Offer sent'):r.isNew?'New request':'Awaiting your quote';}
export function BookingSummary({request:r,listings,compact=false}){
 const o=r.offers.find(o=>o.id===r.confirmed);if(!o)return null;
 const b=r.booking,l=listings.find(l=>l.id===o.listing),terms=b?.terms || o.terms;
 const title=b?.listingTitle || l?.title || 'Chosen provider',provider=b?.providerName || l?.title || 'Provider';
 const address=[r.serviceLocation?.area,b?.meetingAddress||r.serviceLocation?.label].filter(Boolean).join(' · ');
 return <section className="booking-summary">
  <span className="eyebrow">{r.status==='Cancelled'?'Cancelled booking':r.status==='Completed'?'Completed':r.category==='Housing'?'Confirmed viewing':'Confirmed booking'}</span>
  {!compact&&<><h3>{title}</h3>{provider!==title&&<p><strong>Provider:</strong> {provider}</p>}{r.customerAvatarUrl&&<div className="account-avatar-row"><Avatar name={r.student} src={r.customerAvatarUrl}/><strong>{r.student}</strong></div>}</>}
  <p className="booking-at-glance"><strong>{naira(b?.agreedPrice ?? terms.price)}</strong><span>{b?.time || terms.time}</span></p>
  {!!address&&<p><strong>Location:</strong> {address}{Number.isFinite(r.serviceLocation?.lat)&&<> · <a href={'https://www.google.com/maps/search/?api=1&query='+r.serviceLocation.lat+','+r.serviceLocation.lng} target="_blank" rel="noreferrer">Open map pin</a></>}</p>}
  {terms.acceptedBudget&&<span className="status">Customer budget accepted</span>}
  <details className="request-disclosure"><summary>Booking terms</summary>
   {r.details&&r.kind!=='food-order'&&<p><strong>Requested work:</strong> {r.details}</p>}
   {r.mode&&<p><strong>Appointment type:</strong> {r.mode}</p>}
   {r.cleaning&&<p><strong>{r.cleaning.propertyType}</strong>{r.cleaning.areas.length?' · '+r.cleaning.areas.join(', '):''}{r.cleaning.workAreas?' · '+r.cleaning.workAreas+' areas':''}</p>}
   {r.propertyTypes?.length>0&&<p><strong>Requested room types:</strong> {r.propertyTypes.join(', ')}</p>}
   {r.cooking&&<p><strong>Meal:</strong> {r.cooking.dishes} · {r.cooking.portions} portions</p>}
   <OfferTerms terms={terms} hideServiceType hideAcceptance/><p className="muted">Arrange payment directly with the provider.</p></details>
 </section>;
}
export function RequestList({requests,user,tab,listings,onOpen,onArchive,onClear,busy}){
 const [showCleared,setShowCleared]=useState(false),[confirm,setConfirm]=useState(false);
 const mine=tab==='Mine';
 const rows=requests.filter(r=>(r.owner===user.id)===mine&&!!r.archivedAt===showCleared).sort((a,b)=>(b.updatedAt || b.created || 0)-(a.updatedAt || a.created || 0));
 const cleared=requests.some(r=>(r.owner===user.id)===mine&&r.archivedAt);
 const listName=mine?'My Requests':'Incoming Requests';
 const canClear=!showCleared&&rows.some(canClearRequest);
 return <>
  {(canClear||cleared||showCleared)&&<div className="row-actions request-history-tools">
   {canClear&&<button className="secondary" disabled={busy} onClick={()=>setConfirm(true)}>Clear finished history</button>}
   {(cleared||showCleared)&&<button className="text-btn" onClick={()=>{setShowCleared(!showCleared);setConfirm(false);}}>{showCleared?'Back to '+listName:'View cleared history'}</button>}
  </div>}
  {canClear&&confirm&&<section className="terms"><p>Clear finished requests from {listName}? You can restore them from cleared history.</p><div className="row-actions"><button className="dark" disabled={busy} onClick={()=>onClear(()=>setConfirm(false))}>Clear history</button><button className="secondary" onClick={()=>setConfirm(false)}>Keep history</button></div></section>}
  {rows.length?<div className="request-list">{rows.map(r=>{const own=r.owner===user.id;return <article key={r.id} className={'request-card tracked-request'+(r.isNew?' is-new':'')}><button className="request-open" onClick={()=>onOpen(r)}><div className="request-top"><span className="eyebrow">{r.categoryName || r.category}</span>{r.isNew&&<span className="new-request-tag">New</span>}</div><h2>{r.serviceType || r.category}</h2><p className="request-description">{r.details}</p><p>{r.booking?<>{r.booking.time} · {naira(r.booking.agreedPrice)}</>:<>{r.time} · {r.mode || 'Any visit type'}{r.budget!=null?' · Budget '+naira(r.budget):''}</>}</p><span className="status">{requestStatus(r,own)}</span><div className="request-latest"><span>{r.latestActivity || 'Request sent'}</span><time dateTime={r.updatedAt?new Date(r.updatedAt).toISOString():undefined}>{activityTime(r.updatedAt || r.created)}</time></div><span className="request-open-label">View details, offers and chat <ArrowRight size={16}/></span></button>{canClearRequest(r)&&<div className="request-history-action"><button className="text-btn" disabled={busy} onClick={()=>onArchive(r,!r.archivedAt)}>{r.archivedAt?'Restore to history':'Clear from history'}</button></div>}</article>;})}</div>:<div className="empty"><h3>{showCleared?'No cleared requests':mine?'No requests yet':'No incoming requests'}</h3><p>{showCleared?'Requests you clear will appear here.':mine?'Send a request to get started.':'Available listings receive matching requests here.'}</p></div>}
 </>;
}
export function RequestDetail({request:r,user,listings,busy,onQuote,onChat,onProfile,onDecline,focusOffer,requests=[],onDelivery,onOpen,onOrderResponse,onComplete,onReview,onCancel,onResend,onAction,onBrowse,onArchive,onAcceptBudget}){
 useEffect(()=>{if(focusOffer)document.getElementById('offer-'+focusOffer)?.scrollIntoView({block:'start'});},[focusOffer,r.id]);
 const confirmed=r.offers.find(o=>o.id===r.confirmed);
 const own=r.owner===user.id,offers=[...r.offers].sort((a,b)=>(b.id===focusOffer?1:0)-(a.id===focusOffer?1:0));
 const requestDetails=<><span className="eyebrow">{own?'My request':'Incoming request'} · {r.categoryName || r.category}</span><h2>{r.serviceType || r.category}</h2><p>{r.details}</p><div className="terms"><span className="status">{requestStatus(r,own)}</span><p><strong>Preferred time:</strong> {r.time}</p><p><strong>Appointment type:</strong> {r.mode || 'Any visit type'}</p>{r.serviceLocation?.area&&<p><strong>Service area:</strong> {r.serviceLocation.area}</p>}{r.budget!=null&&<p><strong>Budget:</strong> {naira(r.budget)}</p>}<p>{r.latestActivity || 'Request sent'} · {activityTime(r.updatedAt || r.created)}</p></div>
 {r.propertyTypes?.length>0&&<p><strong>Room types:</strong> {r.propertyTypes.join(' · ')}</p>}
 {r.cleaning&&<section className="terms"><strong>{r.cleaning.propertyType}</strong>{r.cleaning.areas.length>0&&<p>Areas to clean · {r.cleaning.areas.join(', ')}</p>}{r.cleaning.workAreas&&<p>Number of areas · {r.cleaning.workAreas}</p>}</section>}
 {r.transport&&<RideDetails ride={r.transport} exact={own||!!r.booking}/>}
 {r.cooking&&<section className="commerce-summary"><h3>Meal requested</h3><p>{r.cooking.dishes}</p><p>{r.cooking.portions} portions</p></section>}</>;
 return <>{confirmed?<details className="request-disclosure"><summary>Customer request and budget</summary>{r.budget!=null&&<p><strong>Proposed budget:</strong> {naira(r.budget)}</p>}{r.time&&r.time!==r.booking?.time&&<p><strong>Originally requested time:</strong> {r.time}</p>}{r.budget==null&&<p>The customer did not propose a budget.</p>}</details>:requestDetails}
 <FoodOrderSummary request={r} user={user} requests={requests} onDelivery={onDelivery} onOpen={onOpen}/><DeliverySummary request={r}/>
 {!own&&r.kind==='food-order'&&r.status==='Pending seller'&&<div className="row-actions"><button className="dark" disabled={busy} onClick={()=>onOrderResponse('accept')}>Accept order</button><button className="secondary" disabled={busy} onClick={()=>onOrderResponse('decline')}>Decline order</button></div>}
 {confirmed&&r.transport&&<details className="request-disclosure"><summary>Ride details</summary><RideDetails ride={r.transport} exact={own||!!r.booking}/></details>}
 {r.kind!=='food-order'&&<BookingSummary request={r} listings={listings}/>}
 {r.booking&&<BookingActions key={'booking-'+r.id} request={r} user={user} busy={busy} onAction={onAction}/>}
 {own&&isOpenServiceRequest(r)&&!r.offers.length&&<ReviseRequest key={'revise-'+r.id} request={r} busy={busy} onAction={onAction} onBrowse={onBrowse}/>}
 {own&&isOpenServiceRequest(r)&&<RequestActions key={'request-'+r.id} request={r} busy={busy} onCancel={onCancel} onResend={onResend}/>}
 {own&&r.status==='Resent'&&r.resentTo&&<button className="secondary" onClick={()=>{const next=requests.find(item=>item.id===r.resentTo);if(next)onOpen(next);}}>Open new request</button>}
 {own&&(r.status==='Booked'||r.kind==='food-order'&&r.status==='Accepted')&&<button className="secondary" disabled={busy} onClick={onComplete}>{r.kind==='food-order'?'Mark order received':'Mark service complete'}</button>}
 {canClearRequest(r)&&<button className="secondary" disabled={busy} onClick={()=>onArchive(r,!r.archivedAt)}>{r.archivedAt?'Restore to history':'Clear from history'}</button>}
 {own&&r.kind!=='food-order'&&r.status==='Completed'&&(r.review?<p>Review published · {r.review.rating}/5</p>:<form key={'review-'+r.id} onSubmit={e=>{e.preventDefault();onReview(Object.fromEntries(new FormData(e.currentTarget)));}}><label>Rate the service<select name="rating" required defaultValue=""><option value="">Choose a rating</option>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label><label>Review (optional)<textarea name="comment" maxLength={700} placeholder="How was the work, timing and agreed price?"/></label><button className="dark" disabled={busy}>Publish review</button></form>)}
 {confirmed&&<div className="row-actions booking-open-chat"><button className="dark" onClick={()=>onChat(confirmed)}><MessageCircle size={16}/> Open chat</button>{own&&listings.some(l=>l.id===confirmed.listing)&&<button className="secondary" onClick={()=>onProfile(listings.find(l=>l.id===confirmed.listing))}>View provider</button>}</div>}
 {confirmed&&offers.length>1&&<details className="request-disclosure"><summary>Other offers</summary>{offers.filter(o=>o.id!==confirmed.id).map(o=><p key={o.id}>{listings.find(l=>l.id===o.listing)?.title || 'Provider'} · {naira(o.terms.price)}</p>)}</details>}
 {!confirmed&&<> <h3>{r.kind==='food-order'?(offers.length?'Order conversation':'Seller response'):own?'Current offers':'Your offer'}{offers.length?' · '+offers.length:''}</h3>{!offers.length&&<p className="muted">{r.kind==='food-order'?(r.status==='Pending seller'?'Waiting for the seller to accept or decline.':'This order was declined.'):r.status==='Open'?(own?'Waiting for providers to reply.':(r.budget!=null?'Choose how you’d like to respond.':'Review the request and send a quote.')):'This request is closed.'}</p>}
 {offers.filter(o=>o.id!==r.confirmed).map(o=>{const l=listings.find(l=>l.id===o.listing);return <section className={'tracked-offer'+(focusOffer===o.id?' highlighted-offer':'')} id={'offer-'+o.id} key={o.id}><div className="request-top"><strong>{l?.title || 'Provider'}</strong>{r.confirmed===o.id&&<span className="status">Confirmed</span>}</div><p className="offer-price">{naira(o.terms.price)} · {o.terms.time}</p><p className="muted">Revision {o.revision}{o.updatedAt?' · '+activityTime(o.updatedAt):''}</p><OfferTerms terms={o.terms}/><div className="row-actions">{l&&<button className="secondary" onClick={()=>onProfile(l)}>View provider</button>}<button className="dark" onClick={()=>onChat(o)}><MessageCircle size={16}/> {own&&r.status==='Open'?'Chat and review offer':'Open chat'}{o.messages.length?' · '+o.messages.length:''}</button></div></section>;})}
</>} {!own&&r.kind!=='food-order'&&r.status==='Open'&&r.options?.length>0&&<ProviderResponse key={'provider-'+r.id} request={r} listings={listings.filter(l=>r.options.includes(l.id))} busy={busy} onAcceptBudget={onAcceptBudget} onQuote={onQuote} onDecline={onDecline}/>}
 </>;
}

function RequestActions({request,busy,onCancel,onResend}){
 const [action,setAction]=useState(null);
 const retryAt=requestRetryAt(request);
 const ready=retryAt!==null&&Date.now()>=retryAt;
 if(action==='cancel')return <section className="terms"><p>Cancel this request? Providers will no longer be able to send offers for it.</p><div className="row-actions"><button className="dark" disabled={busy} onClick={onCancel}>Confirm cancellation</button><button className="secondary" onClick={()=>setAction(null)}>Keep request</button></div></section>;
 if(action==='resend'&&ready)return <form className="terms" onSubmit={event=>{event.preventDefault();onResend(new FormData(event.currentTarget).get('appointment'));}}>
  <p>Your previous request will close when you send a new one.</p>
  <AppointmentPicker initialAt={request.appointmentAt}/>
  <div className="row-actions"><button className="dark" disabled={busy}>Send again</button><button type="button" className="secondary" onClick={()=>setAction(null)}>Back</button></div>
 </form>;
 return <section className="terms"><div className="row-actions">
  {ready&&<button className="dark" disabled={busy} onClick={()=>setAction('resend')}>Request again</button>}
  <button className="secondary" disabled={busy} onClick={()=>setAction('cancel')}>Cancel request</button>
 </div>{retryAt!==null&&!ready&&<p className="muted">You can request again after two hours without an offer.</p>}</section>;
}

function ProviderResponse({request,listings,busy,onAcceptBudget,onQuote,onDecline}){
 const [showAccept,setShowAccept]=useState(false);
 const hasOffer=request.offers.length>0;
 const hasBudget=request.budget!=null;
 if(showAccept&&hasBudget&&!hasOffer)return <form className="terms" onSubmit={e=>{
  e.preventDefault();
  const fields=Object.fromEntries(new FormData(e.currentTarget));
  onAcceptBudget({...fields,acceptBudget:true,expectedBudget:request.budget,expectedEditAt:request.editedAt || 0});
 }}>
  <p>You’re agreeing to the requested service, time and budget. The customer will confirm before the booking is final.</p>
  <label>Your listing<select name="listing" required>{listings.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
  {request.cooking&&<label>Ingredients<select name="ingredients" required defaultValue=""><option value="">Choose what the budget covers</option>{ingredientOptions.map(item=><option key={item}>{item}</option>)}</select></label>}
  <div className="row-actions"><button className="dark" disabled={busy||!listings.length}>Confirm acceptance</button><button type="button" className="secondary" onClick={()=>setShowAccept(false)}>Back</button></div>
 </form>;
 return <div className="provider-response-actions">
  {hasBudget&&!hasOffer&&<button className="dark provider-accept" disabled={busy} onClick={()=>setShowAccept(true)}>Accept request</button>}
  {!hasOffer&&<button className="secondary" disabled={busy} onClick={onDecline}>Decline request</button>}
  <button className={hasOffer?'dark':'secondary'} disabled={busy} onClick={onQuote}>{hasOffer?'Edit offer':'Send a quote'}</button>
 </div>;
}
