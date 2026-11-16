import {appointmentInputValue} from './AppointmentPicker.jsx';
import {quoteTotal} from '../shared/booking-options.js';
import {ingredientOptions} from '../shared/commerce.js';
import React,{useState} from 'react';
import {Choices,CustomOptions} from './ListingForm.jsx';
import {servicePresets} from '../shared/listing-options.js';
import {serviceName,cleanEntries} from '../shared/marketplace.js';
export function OfferTerms({terms,hideServiceType=false,hideAcceptance=false}){
 const items=cleanEntries([...(terms.inclusions || []),...(terms.customInclusions || [])]);
 return <div className="offer-terms">{!hideAcceptance&&terms.acceptedBudget&&<p><strong>Customer budget accepted</strong></p>}{terms.ingredients&&<p><strong>Ingredients:</strong> {terms.ingredients}</p>}{!hideServiceType&&terms.serviceType&&<p>{terms.serviceType}</p>}{items.length>0&&<><strong>What’s included</strong><ul>{items.map(i=><li key={i}>{i}</li>)}</ul></>}{terms.extras?.length>0&&<><strong>Included extras</strong><ul>{terms.extras.map((e,i)=><li key={i}>{e.name} · ₦{e.price.toLocaleString('en-NG')}</li>)}</ul></>}{terms.lineItems?.length>0&&<><strong>Price breakdown</strong><ul>{terms.lineItems.map((item,i)=><li key={i}>{item.name} · ₦{item.price.toLocaleString('en-NG')}</li>)}</ul></>}{terms.details&&!(terms.acceptedBudget&&terms.details==='Agreed to the customer’s requested service and budget.')&&<p className="preserve-lines">{terms.details}</p>}</div>;
}
export default function OfferForm({request,listings,busy,onSend}){
 const offer=request.offers[0];
 const [lineItems,setLineItems]=useState(offer?.terms.lineItems || []);
 const [appointment,setAppointment]=useState(appointmentInputValue(offer?offer.terms.appointmentAt:request.appointmentAt));
 const [ingredients,setIngredients]=useState(offer?.terms.ingredients || listings.find(l=>l.id===(offer?.listing || listings[0]?.id))?.food?.ingredients || '');
 const [listingId,setListingId]=useState(offer?.listing || listings[0]?.id || '');
 const listing=listings.find(l=>l.id===listingId);
 const [inclusions,setInclusions]=useState(offer?.terms.inclusions || listing?.inclusions || []);
 const [custom,setCustom]=useState(offer?.terms.customInclusions || listing?.customInclusions || []);
 const [selectedExtras,setSelectedExtras]=useState(offer?.terms.extras || []);
 const [note,setNote]=useState(offer?.terms.details || (request.category==='Housing'?listing?.description || 'Annual rent and listed fees':request.category==='Transport'?'Total ride fare; pay driver directly.':''));
 const estimated=listing&&request.category==='Transport'&&request.transport?.distanceKm!=null?Math.round(listing.price+(listing.transport?.ratePerKm || 0)*request.transport.distanceKm):null;
 const [price,setPrice]=useState(String(offer?.terms.price ?? estimated ?? (listing?.pricingMode==='quote'?request.budget ?? '':listing?listing.price+(listing.fees||0):request.budget) ?? ''));
 const options=cleanEntries([...(listing?.inclusions || []),...(servicePresets[listing?.category]?.[serviceName(listing)] || []),...(listingId===offer?.listing?offer.terms.inclusions || []:[]),...inclusions]);
 function change(id){const l=listings.find(l=>l.id===id);setListingId(id);setLineItems([]);setSelectedExtras([]);setInclusions(l?.inclusions || []);setCustom(l?.customInclusions || []);setNote(request.category==='Housing'?l?.description || 'Annual rent and listed fees':request.category==='Transport'?'Total ride fare; pay driver directly.':'');setPrice(String(l?l.pricingMode==='quote'?'':request.category==='Transport'&&request.transport?.distanceKm!=null?Math.round(l.price+(l.transport?.ratePerKm || 0)*request.transport.distanceKm):l.price+(l.fees||0):''));}
 return <><h2>{offer?'Edit offer':'Send offer'}</h2><p>{request.details}</p>{request.cleaning&&<p className="notice">{request.cleaning.propertyType}{request.cleaning.areas.length?' · '+request.cleaning.areas.join(', '):null}{request.cleaning.workAreas?' · '+request.cleaning.workAreas+' areas':null}</p>}{request.cooking&&<p className="notice">{request.cooking.portions} portions · quote the total for all portions.</p>}<form onSubmit={e=>{e.preventDefault();const fields=Object.fromEntries(new FormData(e.currentTarget));onSend({...fields,lineItems,ingredients,listing:listingId,inclusions,customInclusions:custom,extras:selectedExtras,details:note});}}>
 <label>Listing<select aria-label="Offer listing" name="listing" value={listingId} onChange={e=>change(e.target.value)}>{listings.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
 {request.category==='Transport'&&<>{!offer&&estimated!=null&&<p className="notice">Estimated fare ₦{estimated.toLocaleString('en-NG')} · send an offer to quote the final total.</p>}{request.budget!=null&&<button type="button" className="secondary" onClick={()=>setPrice(String(request.budget))}>Accept proposed amount · ₦{request.budget.toLocaleString('en-NG')}</button>}</>}
 {listing&&<p className="muted">{serviceName(listing) || listing.propertyType || listing.category}</p>}
 <label>{request.category==='Housing'?'Total move in cost (₦)':listing?.extras?.length?'Quoted total including extras (₦)':'Price (₦)'}<input name="price" type="number" min="0" max="100000000" value={lineItems.length?quoteTotal(lineItems):price} readOnly={!!lineItems.length} onChange={e=>setPrice(e.target.value)} required/></label>
 <label>Proposed day and time<input name="time" defaultValue={offer?.terms.time || request.time} required={!appointment} maxLength={100}/></label>
 <label>Exact date and time for reminders (optional, Nigeria time)<input name="appointment" type="datetime-local" value={appointment} onChange={e=>setAppointment(e.target.value)}/></label>
 <section className="terms"><h3>Price breakdown (optional)</h3><p>Add every charge included in the total. Put any included extras here too.</p>
  {lineItems.map((item,i)=><div key={i} className="row-actions">
   <label>Charge<input value={item.name} maxLength={100} onChange={e=>setLineItems(rows=>rows.map((row,j)=>i===j?{...row,name:e.target.value}:row))} required/></label>
   <label>Amount (₦)<input type="number" value={item.price} min="0" max="100000000" onChange={e=>setLineItems(rows=>rows.map((row,j)=>i===j?{...row,price:e.target.value}:row))} required/></label>
   <button type="button" className="secondary" onClick={()=>setLineItems(rows=>rows.filter((_,j)=>j!==i))}>Remove charge</button>
  </div>)}
  {lineItems.length<12&&<button type="button" className="secondary" onClick={()=>setLineItems(rows=>[...rows,{name:'',price:''}])}>Add charge</button>}
 </section>
 <section className="inclusions-section" key={listingId}><h3>What’s included</h3><p className="muted">Your saved listing inclusions appear first. Tap to include or remove each item from this quote.</p><Choices legend="Included in this price" options={options} value={inclusions} onChange={setInclusions} multiple/><CustomOptions label="Custom offer inclusion" items={custom} setItems={setCustom}/></section>
 {listing?.extras?.length>0&&<Choices legend="Included extras (within the quoted total)" options={listing.extras.map(e=>e.name+' · ₦'+e.price.toLocaleString('en-NG'))} value={selectedExtras.map(e=>e.name+' · ₦'+e.price.toLocaleString('en-NG'))} multiple onChange={values=>{const next=listing.extras.filter(e=>values.includes(e.name+' · ₦'+e.price.toLocaleString('en-NG')));const delta=next.reduce((n,e)=>n+e.price,0)-selectedExtras.reduce((n,e)=>n+e.price,0);if(price!=='')setPrice(String(Math.max(0,Number(price)+delta)));setSelectedExtras(next);}}/>}
 {request.cooking&&<label>Ingredients in this quote<select value={ingredients} onChange={e=>{setIngredients(e.target.value);if(e.target.value!=='Included')setInclusions(items=>items.filter(i=>i!=='Ingredients'));}} required><option value="">Choose what this price covers</option>{ingredientOptions.map(v=><option key={v}>{v}</option>)}</select></label>}
 <label>Short note (optional)<textarea name="details" value={note} onChange={e=>setNote(e.target.value)} maxLength={1000}/></label>
 <button className="dark" disabled={busy||!listingId}>{busy?'Saving…':offer?'Save offer':'Send offer'}</button>
 </form></>;
}
