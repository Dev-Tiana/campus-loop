import {cleaningPropertyTypes} from '../shared/booking-options.js';
import {appointmentTypes} from '../shared/marketplace.js';
import {foodCategory,deliveryAreas,ingredientOptions} from '../shared/commerce.js';
import {defaultCategories} from '../shared/category-defaults.js';
import ExtrasEditor from './ExtrasEditor.jsx';
import {CoverPhotoInput} from './MediaViewer.jsx';
import {GalleryEditor} from './Gallery.jsx';
import {tripScopes,driverAvailability} from '../shared/transport.js';
import React,{useState} from 'react';
import {servicePresets,propertyTypes,amenityGroups} from '../shared/listing-options.js';
import {categories,money} from '../server/seed.js';
const naira=n=>'₦'+money(n);
const nameOf=l=>l.serviceType==='Custom'?l.customServiceType:l.serviceType || l.package;
export function ListingDetails({listing:l}){
 const housing=l.category==='Housing';
 const items=housing?[...(l.amenities || []),...(l.customAmenities || [])]:[...(l.inclusions || []),...(l.customInclusions || [])];
 return <div className="listing-details">
  {l.cleaningPropertyTypes?.length>0&&<section><h3>Property types covered</h3><p>{l.cleaningPropertyTypes.join(' · ')}</p></section>}
  {(housing?l.propertyType:nameOf(l))&&<section><h3>{housing?'Property type':'Service type'}</h3><p>{housing?l.propertyType:nameOf(l)}</p></section>}
  {items.length>0&&<section><h3>{housing?'Amenities':"What’s included"}</h3><ul>{items.map(item=><li key={item}>{item}</li>)}</ul></section>}
  {l.extras?.length>0&&<section><h3>Optional extras</h3><ul>{l.extras.map((e,i)=><li key={e.id||i}>{e.name} · {naira(e.price)}</li>)}</ul></section>}
  {l.food?.kind==='menu'&&<section><h3>Food ordering</h3><p>{l.food.fulfilment.join(' · ')}</p><p>Pickup point: {l.food.pickupPoint || l.area}</p>{l.food.fulfilment.includes('Seller delivery')&&<p>Seller delivery fee: {naira(l.food.deliveryFee)}</p>}</section>}
  {l.delivery&&<section><h3>Delivery coverage</h3><p>{l.delivery.coverage.join(' · ')}</p>{l.delivery.availability&&<p>{l.delivery.availability}</p>}</section>}
  {l.transport&&<section><h3>Trips offered</h3><p>{l.transport.coverage.join(' · ')}</p><p>{l.transport.availability}</p>{l.transport.ratePerKm!=null&&<p>Distance rate {naira(l.transport.ratePerKm)} / km · final fare quoted by driver</p>}</section>}
  {l.description&&<section><h3>Additional details</h3><p className="preserve-lines">{l.description}</p></section>}
 </div>;
}
function Field({label,...props}){return <label>{label}<input {...props}/></label>;}
export function Choices({legend,options,value,onChange,multiple=false}){
 return <fieldset className="option-group"><legend>{legend}</legend><div className="option-grid">{options.map(option=>{
 const selected=multiple?value.includes(option):value===option;
 return <button type="button" className={'option-chip'+(selected?' is-selected':'')} aria-pressed={selected} key={option} onClick={()=>onChange(multiple?(selected?value.filter(x=>x!==option):[...value,option]):option)}><span aria-hidden="true">{selected?'✓':'+'}</span>{option}</button>;
 })}</div></fieldset>;
}
export function CustomOptions({label,items,setItems}){
 const [adding,setAdding]=useState(false),[value,setValue]=useState('');
 const add=()=>{const v=value.trim();if(!v)return;if(!items.includes(v))setItems([...items,v]);setValue('');setAdding(false);};
 return <div className="custom-options"><div className="option-grid">{items.map(item=><button className="option-chip is-selected" type="button" key={item} aria-label={'Remove '+item} onClick={()=>setItems(items.filter(x=>x!==item))}>✓ {item}<span aria-hidden="true">×</span></button>)}</div>
 {adding?<div className="custom-entry"><Field label={label} value={value} maxLength={120} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}}/><button type="button" className="secondary" disabled={!value.trim()} onClick={add}>Add</button><button className="text-btn" type="button" onClick={()=>{setAdding(false);setValue('');}}>Cancel</button></div>:<button type="button" className="secondary add-own" onClick={()=>setAdding(true)}>+ Add your own</button>}</div>;
}
export default function EditForm({listing,photo,setPhoto,error,busy,onSend,businesses=[],initialBusinessId,initialCategory,firstService=false,accountRole,categoryRecords=defaultCategories}){
 const serviceCategories=firstService?categoryRecords.filter(c=>c.value!=='Housing'):categoryRecords;
 const [category,setCategory]=useState(categoryRecords.find(c=>c.id===listing?.categoryId)?.value || listing?.category || serviceCategories.find(c=>c.visible!==false&&c.value===initialCategory)?.value || serviceCategories.find(c=>c.visible!==false&&(accountRole==='provider'||!accountRole||c.value==='Housing'))?.value || '');
 const [businessId,setBusinessId]=useState(listing?.businessId || initialBusinessId || '');
 const [title,setTitle]=useState(listing?.title || '');
 const [pricingMode,setPricingMode]=useState(listing?.pricingMode || 'fixed');
 const [extras,setExtras]=useState(listing?.extras || []);
 const [coverUploadId,setCoverUploadId]=useState(listing?.flyerPhotoId || null);
 const [available,setAvailable]=useState(listing?.available!==false);
 const [role,setRole]=useState(listing?.role || 'Landlord');
 const [serviceType,setServiceType]=useState(listing?.serviceType || (listing?.package?'Custom':''));
 const [customServiceType,setCustomServiceType]=useState(listing?.customServiceType || (!listing?.serviceType?listing?.package:'') || '');
 const [inclusions,setInclusions]=useState(listing?.inclusions || []);
 const [customInclusions,setCustomInclusions]=useState(listing?.customInclusions || []);
 const [coveredTypes,setCoveredTypes]=useState(listing?.cleaningPropertyTypes || []);
 const [propertyType,setPropertyType]=useState(listing?.propertyType || '');
 const [amenities,setAmenities]=useState(listing?.amenities || []);
 const [customAmenities,setCustomAmenities]=useState(listing?.customAmenities || []);
 const [price,setPrice]=useState(String(listing?.price ?? ''));
 const [fees,setFees]=useState(String((listing?.fees || 0)-(listing?.agentFee || 0)));
 const [agentFee,setAgentFee]=useState(String(listing?.agentFee || 0));
 const [preview,setPreview]=useState(null);
 const legacySource=listing?.legacyImage || (listing?.image&&!listing.image.startsWith('/api/photos/')?listing.image:'') || (photo&&!photo.startsWith('/api/photos/')?photo:'') || '';
 const [galleryIds,setGalleryIds]=useState(listing?.galleryIds?.length?listing.galleryIds:legacySource?['legacy']:[]);
 const [coverPhotoId,setCoverPhotoId]=useState(listing?.coverPhotoId || (legacySource?'legacy':null));
 const [uploading,setUploading]=useState(false),[coverUploading,setCoverUploading]=useState(false);
 const [coverage,setCoverage]=useState(listing?.transport?.coverage || ['Around campus','Around Abraka']);
 const [availability,setAvailability]=useState(listing?.transport?.availability || 'Now and scheduled');
 const [ratePerKm,setRatePerKm]=useState(listing?.transport?.ratePerKm ?? '');
 const transport=category==='Transport',food=category===foodCategory,menuFood=food&&serviceType&&serviceType!=='Cook a meal',delivery=category==='Delivery';
 const [fulfilment,setFulfilment]=useState(listing?.food?.fulfilment || ['Pickup']),[deliveryFee,setDeliveryFee]=useState(listing?.food?.deliveryFee ?? 0),[pickupPoint,setPickupPoint]=useState(listing?.food?.pickupPoint || listing?.area || 'Abraka'),[pickupArea,setPickupArea]=useState(listing?.food?.pickupArea || ''),[ingredients,setIngredients]=useState(listing?.food?.ingredients || ''),[deliveryCoverage,setDeliveryCoverage]=useState(listing?.delivery?.coverage || ['Around Abraka']),[deliveryAvailability,setDeliveryAvailability]=useState(listing?.delivery?.availability || '');
 const categoryOptions=serviceCategories.filter(c=>c.visible!==false||c.value===listing?.category);

 const coverUrl=coverUploadId?'/api/photos/'+coverUploadId:coverPhotoId==='legacy'?legacySource:coverPhotoId?'/api/photos/'+coverPhotoId:'';
 const housing=category==='Housing';
 function changeCategory(next){setFulfilment(['Pickup']);setDeliveryFee(0);setDeliveryCoverage(['Around Abraka']);setIngredients('');setPricingMode('fixed');setExtras([]);if(title===serviceType)setTitle('');setCategory(next);setServiceType('');setCustomServiceType('');setInclusions([]);setCustomInclusions([]);setPropertyType('');setAmenities([]);setCustomAmenities([]);setPreview(null);error('');}
 function chooseService(next){if(category===foodCategory&&next!=='Cook a meal'){setPricingMode('fixed');setExtras([]);}if((businessId||category===foodCategory&&next!=='Cook a meal')&&(!title||title===serviceType))setTitle(next==='Custom'?'':next);setServiceType(next);setInclusions([]);setCustomInclusions([]);setCustomServiceType('');error('');}
 async function loadPhoto(file){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12000000){error('Choose a JPG, PNG or WebP photo under 12 MB.');return;}
  try{const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,900/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();setPhoto(canvas.toDataURL('image/webp',0.8));error('');}catch{error('That photo could not be opened.');}
 }
 function review(e){e.preventDefault();error('');if(menuFood&&!fulfilment.length){error('Choose pickup, seller delivery, or both.');return;}if(delivery&&!deliveryCoverage.length){error('Choose at least one coverage area.');return;}if(housing&&!propertyType){error('Choose a property type.');return;}if(!housing&&(!serviceType || serviceType==='Custom'&&!customServiceType.trim())){error('Choose a service type or add your own.');return;}
 const f=new FormData(e.currentTarget);const modes=f.getAll('mode');if(!housing&&!transport&&!menuFood&&!delivery&&!modes.length){error('Choose at least one appointment type.');return;}
 setPreview({...Object.fromEntries(f),category,categoryId:categoryRecords.find(c=>c.value===category)?.id,role,businessId,food:food?menuFood?{kind:'menu',fulfilment,deliveryFee:Number(deliveryFee),pickupPoint,pickupArea}:{kind:'cook',ingredients}:null,delivery:delivery?{coverage:deliveryCoverage,availability:deliveryAvailability}:null,pricingMode:housing||transport||menuFood?'fixed':pricingMode,extras,flyerPhotoId:coverUploadId,id:listing?.id,modes:transport?['Ride']:delivery?['Delivery']:menuFood?fulfilment:modes,image:legacySource,galleryIds,coverPhotoId,transport:transport?{coverage,availability,ratePerKm}:null,permission:f.has('permission'),negotiable:f.has('negotiable'),available,serviceType:housing?'':serviceType,customServiceType:housing?'':customServiceType.trim(),inclusions:housing?[]:inclusions,customInclusions:housing?[]:customInclusions,propertyType:housing?propertyType:'',cleaningPropertyTypes:category==='Cleaning'?coveredTypes:[],amenities:housing?amenities:[],customAmenities:housing?customAmenities:[],price:Number(price),fees:housing?Number(fees):0,agentFee:housing&&role==='Agent'?Number(agentFee):0});}
 const previewListing=preview&&{...preview,image:coverUrl,fees:preview.fees+preview.agentFee};
 return <>{firstService&&<p className="eyebrow">Step 2 of 2</p>}<h2>{preview?(firstService?'Review your service':'Preview your listing'):firstService?'Add your first service':listing?'Edit listing':'Create a listing'}</h2>
 <div style={{display:preview?'none':undefined}}><p className="muted">Tap the options that describe your listing. Add only what your price covers.</p><form onSubmit={review}>
 <label>Category<select aria-label="Category" value={category} onChange={e=>changeCategory(e.target.value)}>{categoryOptions.filter(c=>accountRole==='provider'||c.value==='Housing').map(c=><option key={c.id} value={c.value}>{c.name}</option>)}</select></label>
 {firstService?<p className="muted">Business page · {businesses.find(b=>b.id===businessId)?.name}</p>:<label>Business page<select aria-label="Business page" value={businessId} onChange={e=>setBusinessId(e.target.value)}><option value="">No business page (standalone listing)</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
 <Field label={housing?'Listing title':menuFood?'Menu item name':businessId?'Service name':'Business name'} name="title" maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} required/>
 <Field label="Area" name="area" maxLength={80} defaultValue={listing?.area || 'Abraka'} required/>
 {housing?<>
 <Choices legend="Property type" options={propertyTypes.filter(type=>type===propertyType||!(type==='Self contained room'||type==='Flat'))} value={propertyType} onChange={setPropertyType}/>
 <section className="amenities-section"><h3>Amenities</h3><p className="muted">Select every feature this property offers.</p>{Object.entries(amenityGroups).map(([group,options])=><Choices key={group} legend={group} options={options} value={amenities} onChange={setAmenities} multiple/>)}<CustomOptions label="Custom feature" items={customAmenities} setItems={setCustomAmenities}/></section>
 </>:<>
 <Choices legend="Service type" options={[...Object.keys(servicePresets[category] || {}),...(transport?[]:['Add your own'])]} value={serviceType==='Custom'?'Add your own':serviceType} onChange={v=>chooseService(v==='Add your own'?'Custom':v)}/>
 {serviceType==='Custom'&&<Field label="Your service type" value={customServiceType} maxLength={80} onChange={e=>setCustomServiceType(e.target.value)} required/>}
 {serviceType&&<section key={category+serviceType} className="inclusions-section"><h3>What’s included</h3><p className="muted">Choose exactly what your price covers.</p>{serviceType!=='Custom'&&<Choices legend="Included in the price" options={servicePresets[category]?.[serviceType] || []} value={inclusions} onChange={setInclusions} multiple/>}<CustomOptions label="Custom inclusion" items={customInclusions} setItems={setCustomInclusions}/></section>}
 </>}
 <label>{housing?'Additional property details (optional)':'Additional service details (optional)'}<textarea name="description" maxLength={1500} defaultValue={listing?.description} placeholder={housing?'For example, when water is available':'Anything else a student should know'}/></label>
 {!housing&&!transport&&!menuFood&&<Choices legend="Pricing" options={['Set a price','Request a quote']} value={pricingMode==='quote'?'Request a quote':'Set a price'} onChange={v=>setPricingMode(v==='Request a quote'?'quote':'fixed')}/>}
 {(housing||transport||menuFood||pricingMode==='fixed')&&<Field label={housing?'Annual rent (₦)':transport?'Starting fare (₦)':'Service price (₦)'} name="price" type="number" min="0" max="100000000" step="1" value={price} onChange={e=>setPrice(e.target.value)} required/>}
 {housing?<>
 <label>Listed by<select aria-label="Listed by" value={role} onChange={e=>setRole(e.target.value)}><option>Landlord</option><option>Agent</option></select></label>
 {role==='Agent'&&<><Field label="Agent fee (₦)" name="agentFee" type="number" min="0" max="100000000" step="1" value={agentFee} onChange={e=>setAgentFee(e.target.value)} required/><label className="check"><input type="checkbox" name="permission" required/> I have permission to list this property</label></>}
 <Field label="Other fees (₦)" name="fees" type="number" min="0" max="100000000" step="1" value={fees} onChange={e=>setFees(e.target.value)} required/>
 <div className="terms" aria-live="polite"><span>Annual rent {naira(Number(price))}</span>{role==='Agent'&&<span>Agent fee {naira(Number(agentFee))}</span>}<span>Other fees {naira(Number(fees))}</span><strong>Total move in {naira(Number(price)+Number(fees)+(role==='Agent'?Number(agentFee):0))}</strong></div>
 </>:menuFood?<><Choices legend="Fulfilment" options={['Pickup','Seller delivery']} multiple value={fulfilment} onChange={setFulfilment}/><label>Pickup point<input value={pickupPoint} onChange={e=>setPickupPoint(e.target.value)} maxLength={300} required/></label><label>Pickup area<select value={pickupArea} onChange={e=>setPickupArea(e.target.value)} required><option value="">Choose pickup area</option>{deliveryAreas.filter(a=>a!=='Around Abraka').map(a=><option key={a}>{a}</option>)}</select></label>{fulfilment.includes('Seller delivery')&&<label>Seller delivery fee (₦)<input type="number" min="0" value={deliveryFee} onChange={e=>setDeliveryFee(e.target.value)} required/></label>}</>:delivery?<p className="muted">Collection and drop off delivery service.</p>:transport?<><Choices legend="Trip coverage" options={tripScopes} value={coverage} onChange={setCoverage} multiple/><Choices legend="Availability" options={driverAvailability} value={availability} onChange={setAvailability}/><Field label="Distance rate per km (₦, optional)" type="number" min="0" max="100000000" value={ratePerKm} onChange={e=>setRatePerKm(e.target.value)}/><p className="muted">Starting fare plus your distance rate gives an estimated fare. You send the final quote.</p></>:<><fieldset className="option-group"><legend>Appointment type</legend><div className="checks">{appointmentTypes.map(m=><label className="check" key={m}><input type="checkbox" name="mode" value={m} defaultChecked={listing?.modes.includes(m)||(!listing&&m==='Shop visit')}/>{m}</label>)}</div></fieldset><label className="check"><input type="checkbox" name="negotiable" defaultChecked={listing?.negotiable}/> Price is negotiable</label></>}
 {food&&!menuFood&&<label>Ingredients in your starting price<select value={ingredients} onChange={e=>setIngredients(e.target.value)}><option value="">Clarify in each quote</option>{ingredientOptions.map(v=><option key={v}>{v}</option>)}</select></label>}
 {delivery&&<><Choices legend="Delivery coverage" options={deliveryAreas} multiple value={deliveryCoverage} onChange={setDeliveryCoverage}/><label>Availability / operating hours<input value={deliveryAvailability} onChange={e=>setDeliveryAvailability(e.target.value)} maxLength={160} placeholder="e.g. Weekdays 9 am–6 pm"/></label><p className="muted">Choose fixed starting pricing or Request a quote. Only requests within your pickup and drop off coverage reach you.</p></>}
 {!housing&&!transport&&!menuFood&&<ExtrasEditor extras={extras} setExtras={setExtras}/>}
 <label>Availability when open<select name="availabilityLabel" defaultValue={listing?.availabilityLabel || 'By appointment'}><option>By appointment</option><option>Available today</option></select></label>
 {!firstService&&<label className="check"><input type="checkbox" checked={available} onChange={e=>setAvailable(e.target.checked)}/> Available for requests</label>}
 {category==='Cleaning'&&<Choices legend="Property types you clean (optional)" options={cleaningPropertyTypes} value={coveredTypes} onChange={setCoveredTypes} multiple/>}
 <CoverPhotoInput value={coverUploadId} onChange={setCoverUploadId} onError={error} onUploading={setCoverUploading}/>
 <GalleryEditor listing={listing} ids={galleryIds} setIds={setGalleryIds} cover={coverPhotoId} setCover={setCoverPhotoId} onError={error} onUploading={setUploading}/>

 <button className="dark" type="submit" disabled={busy||uploading||coverUploading}>{firstService?'Review service':'Preview listing'}</button>
 </form></div>
 {preview&&<div className="publish-preview">{coverUrl&&<img className="profile-photo" src={coverUrl} alt="Listing preview"/>}<span className="eyebrow">{housing?role:category} · {preview.area}</span><h3>{preview.title}</h3><ListingDetails listing={previewListing}/><div className="terms"><strong>{preview.pricingMode==='quote'?'Request a quote':naira(preview.price)}{housing?' annual rent':''}</strong>{housing?<>{role==='Agent'&&<span>Agent fee {naira(preview.agentFee)}</span>}<span>Other fees {naira(preview.fees)}</span><strong>Total move in {naira(preview.price+preview.fees+preview.agentFee)}</strong></>:<><span>{preview.modes.join(' · ')}</span><span>{preview.negotiable?'Negotiable':'Fixed price'}</span></>}</div><div className="publish-actions"><button className="secondary" disabled={busy} onClick={()=>{setPreview(null);error('');}}>Back to edit</button><button className="dark" disabled={busy} onClick={()=>onSend(preview)}>{busy?'Saving…':listing?'Save changes':firstService?'Publish service':'Publish listing'}</button></div></div>}
 </>;
}
