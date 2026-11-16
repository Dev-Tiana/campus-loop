import AppointmentPicker from './AppointmentPicker.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {vehicles,rideVehicleLabels,tripScopes,tripAreas,rideLocationLabel} from '../shared/transport.js';
import {Choices} from './ListingForm.jsx';
let mapsPromise;
export function loadMaps(key){
 if(window.google?.maps?.places&&window.google?.maps?.Map)return Promise.resolve();
 if(!mapsPromise)mapsPromise=new Promise((resolve,reject)=>{
  const s=document.createElement('script');let settled=false;
  const timeout=setTimeout(()=>fail(),15000);
  function fail(){if(settled)return;settled=true;clearTimeout(timeout);mapsPromise=null;s.remove();reject(Error('Maps could not load. Manual entry is still available.'));}
  window.campusloopMapsReady=async()=>{try{await google.maps.importLibrary('maps');await google.maps.importLibrary('places');await google.maps.importLibrary('geometry');if(!settled){settled=true;clearTimeout(timeout);resolve();}}catch{fail();}};
  s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&libraries=places,geometry&loading=async&v=weekly&callback=campusloopMapsReady';s.async=true;s.onerror=fail;document.head.append(s);
 });return mapsPromise;
}
const blank={label:'',area:''};
export function LocationField({name,value,onChange,mapsReady,optional=false,hideArea=false}){
 const [suggestions,setSuggestions]=useState([]),[warning,setWarning]=useState(''),[manual,setManual]=useState(false);const generation=useRef(0),session=useRef(null);
 useEffect(()=>{if(manual||!mapsReady||(value.label || '').length<3||Number.isFinite(value.lat)){setSuggestions([]);return;}const id=++generation.current;const timer=setTimeout(async()=>{try{session.current ||= new google.maps.places.AutocompleteSessionToken();const data=await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({input:value.label,sessionToken:session.current,includedRegionCodes:['ng'],locationBias:{center:{lat:5.791,lng:6.104},radius:30000}});if(id===generation.current)setSuggestions(data.suggestions.filter(s=>s.placePrediction).slice(0,5));}catch{setWarning('Search is unavailable. Type the place or select a point on the map.');}},350);return()=>clearTimeout(timer);},[value.label,mapsReady,manual]);
 async function select(prediction){try{const place=prediction.toPlace();await place.fetchFields({fields:['displayName','formattedAddress','location']});if(place.location){onChange({...value,label:place.displayName || place.formattedAddress,lat:place.location.lat(),lng:place.location.lng()});}setSuggestions([]);generation.current++;session.current=null;}catch{setWarning('Use manual entry or a map pin for this location.');}}
 return <div className="location-field"><label>{name}<input aria-label={name} value={value.label || ''} autoComplete="off" required={!optional} maxLength={160} placeholder={name==='Pickup'?'e.g. Nasco Hostel, Badudru or Omono Junction':name==='Destination'?'e.g. DELSU Big Gate':'Search a hostel or street'} onChange={e=>{onChange({label:e.target.value,area:value.area});}}/></label>{mapsReady&&<button className="text-btn" type="button" onClick={()=>setManual(!manual)}>{manual?'Use place search':'Enter '+name.toLowerCase()+' manually'}</button>}{manual&&<p className="muted">Type a campus landmark or local place. You can correct it with a map pin.</p>}{suggestions.length>0&&<div className="place-suggestions">{suggestions.map((s,i)=><button className="secondary" type="button" key={i} onClick={()=>select(s.placePrediction)}>{s.placePrediction.text.toString()}</button>)}</div>}{!hideArea&&<label>{name} general area<select value={value.area || ''} onChange={e=>onChange({...value,area:e.target.value})}><option value="">Choose an area (optional)</option>{tripAreas.map(a=><option key={a}>{a}</option>)}</select></label>}{warning&&<p className="muted">{warning}</p>}</div>;
}
function RouteMap({pickup,destination,onPickup,onDestination}){
 const node=useRef(null),map=useRef(null),markers=useRef([]),[target,setTarget]=useState('Pickup'),callbacks=useRef({onPickup,onDestination,pickup,destination,target});callbacks.current={onPickup,onDestination,pickup,destination,target};
 useEffect(()=>{const m=new google.maps.Map(node.current,{center:{lat:5.791,lng:6.104},zoom:13,mapTypeControl:false,streetViewControl:false});map.current=m;const listener=m.addListener('click',e=>{const c=callbacks.current,key=c.target==='Pickup'?'pickup':'destination';c[key==='pickup'?'onPickup':'onDestination']({...c[key],label:c[key].label||('Pinned '+key),lat:e.latLng.lat(),lng:e.latLng.lng()});});return()=>listener.remove();},[]);
 useEffect(()=>{if(!map.current)return;markers.current.forEach(m=>m.setMap(null));markers.current=[];for(const [point,label,change] of [[pickup,'P',onPickup],[destination,'D',onDestination]])if(Number.isFinite(point.lat)&&Number.isFinite(point.lng)){const marker=new google.maps.Marker({position:{lat:point.lat,lng:point.lng},map:map.current,draggable:true,label});marker.addListener('dragend',e=>change({...point,lat:e.latLng.lat(),lng:e.latLng.lng()}));markers.current.push(marker);}if(markers.current.length){const bounds=new google.maps.LatLngBounds();markers.current.forEach(m=>bounds.extend(m.getPosition()));map.current.fitBounds(bounds);if(markers.current.length===1)map.current.setZoom(15);}},[pickup.lat,pickup.lng,destination.lat,destination.lng]);
 return <div><div className="row-actions">{['Pickup','Destination'].map(t=><button key={t} className="secondary" type="button" aria-pressed={target===t} onClick={()=>setTarget(t)}>Adjust {t.toLowerCase()} pin</button>)}</div><div className="route-map" ref={node}/><p className="muted">Drag either pin, or choose which pin to adjust and tap the map.</p></div>;
}
export function RideDetails({ride,exact=false}){
 if(!ride)return null;
 const showPoint=(point,kind)=>rideLocationLabel(exact||ride.sharePlaceNames?point:{area:point.area}) || kind+' area not listed';
 return <div className="ride-details">
  <p><strong>Pickup:</strong> {showPoint(ride.pickup,'Pickup')}</p>
  <p><strong>Destination:</strong> {showPoint(ride.destination,'Destination')}</p>
  <p>{ride.airport?'Airport taxi':ride.scope}</p>
  {ride.distanceKm!=null&&<p>{ride.distanceKm} km · {ride.distanceSource}{ride.durationMinutes!=null?' · About '+ride.durationMinutes+' min':''}</p>}
  {exact&&Number.isFinite(ride.pickup.lat)&&<p><a href={'https://www.google.com/maps/search/?api=1&query='+ride.pickup.lat+','+ride.pickup.lng} target="_blank" rel="noreferrer">Open pickup pin</a></p>}
  {exact&&Number.isFinite(ride.destination.lat)&&<p><a href={'https://www.google.com/maps/search/?api=1&query='+ride.destination.lat+','+ride.destination.lng} target="_blank" rel="noreferrer">Open destination pin</a></p>}
  {exact&&ride.landmark&&<p><strong>Pickup note:</strong> {ride.landmark}</p>}
 </div>;
}
export default function TransportRequest({target,busy,onSend,onBack}){
 const [pickup,setPickup]=useState({...blank}),[destination,setDestination]=useState({...blank});
 const coverage=target?.transport?.coverage?.length?target.transport.coverage:tripScopes;
 const [scope,setScope]=useState(coverage.includes('Around Abraka')?'Around Abraka':coverage[0]);
 const [vehicle,setVehicle]=useState(target?.serviceType || 'Keke'),[step,setStep]=useState(1),[now,setNow]=useState('Now');
 const [airport,setAirport]=useState(false),[landmark,setLandmark]=useState('');
 const [mapsReady,setMapsReady]=useState(false),[notice,setNotice]=useState(''),[showMap,setShowMap]=useState(false);
 const [locationError,setLocationError]=useState('');
 const airportAvailable=coverage.includes('Out of town')&&(!target||target.serviceType==='Car ride');
 useEffect(()=>{
  let stopped=false;
  fetch('/api/config').then(r=>r.ok?r.json():null).then(async data=>{
   if(stopped||!data?.mapsBrowserKey)return;
   try{await loadMaps(data.mapsBrowserKey);if(!stopped)setMapsReady(true);}catch{}
  }).catch(()=>{});
  return()=>{stopped=true;};
 },[]);
 function locate(){
  if(!navigator.geolocation){setNotice('Location is unavailable. Type your pickup point instead.');return;}
  navigator.geolocation.getCurrentPosition(p=>{
   setPickup({...pickup,label:pickup.label||'My current location',lat:p.coords.latitude,lng:p.coords.longitude});
   setNotice('Pickup pin added. You can also enter a landmark.');
  },()=>setNotice('Could not get your location. Type your pickup point instead.'),{enableHighAccuracy:true,timeout:10000});
 }
 function selectVehicle(label){
  const chosen=vehicles.find(value=>rideVehicleLabels[value]===label);setVehicle(chosen);if(chosen!=='Car ride')setAirport(false);
 }
 function selectCoverage(value){
  const toAirport=value==='Airport taxi';
  setAirport(toAirport);setScope(toAirport?'Out of town':value);
  if(toAirport)setVehicle('Car ride');
 }
 function submit(e){
  e.preventDefault();
  if(!rideLocationLabel(pickup)||!rideLocationLabel(destination)){
   setLocationError('Choose an area or type an exact place for both stops.');setStep(1);return;
  }
  setLocationError('');
  if(step===1){setStep(2);return;}
  const f=Object.fromEntries(new FormData(e.currentTarget));
  onSend({category:'Transport',serviceType:vehicle,mode:'Ride',target:target?.id,details:'Ride request',time:now==='Now'?'Now':undefined,appointment:f.appointment,budget:f.budget,
   transport:{pickup,destination,scope,airport,landmark,sharePlaceNames:true}});
 }
 return <><h2>Request a ride</h2><p className="muted">{step===1?'1 · Pickup and destination':'2 · Vehicle and pickup time'}</p>
 <form onSubmit={submit}>
  {step===1?<div>
   {locationError&&<p className="error" role="alert">{locationError}</p>}
   <p className="muted">Choose an area or type the exact place. Drivers who receive your request can see the place names. Your pins and pickup note are shared with the driver you book.</p>
   <LocationField name="Pickup" optional value={pickup} onChange={setPickup} mapsReady={mapsReady}/>
   <LocationField name="Destination" optional value={destination} onChange={setDestination} mapsReady={mapsReady}/>
   {mapsReady&&<div className="row-actions"><button className="secondary" type="button" onClick={locate}>Use my location</button><button className="text-btn" type="button" onClick={()=>setShowMap(!showMap)}>{showMap?'Hide map':'Choose a point on the map'}</button></div>}
   {notice&&<p className="notice" role="status">{notice}</p>}
   {mapsReady&&showMap&&<RouteMap pickup={pickup} destination={destination} onPickup={setPickup} onDestination={setDestination}/>}
   <label>Pickup note (private)<textarea name="pickup-note" value={landmark} onChange={e=>setLandmark(e.target.value)} maxLength={500} placeholder="e.g. Wait outside Nasco Hostel reception"/></label>
  </div>:<>
   <p className="notice">{rideLocationLabel(pickup)} → {rideLocationLabel(destination)}</p>
   <Choices legend="Trip type" options={airportAvailable?[...coverage,'Airport taxi']:coverage} value={airport?'Airport taxi':scope} onChange={selectCoverage}/>
   <Choices legend="Vehicle type" options={(target?[target.serviceType]:airport?['Car ride']:vehicles).map(value=>rideVehicleLabels[value])} value={rideVehicleLabels[vehicle]} onChange={selectVehicle}/>
   <Choices legend="Pickup time" options={['Now','Preferred time']} value={now} onChange={setNow}/>
   {now!=='Now'&&<AppointmentPicker label="Preferred pickup time"/>}
   <label>What I’m willing to pay (₦, optional)<input name="budget" type="number" min="0" max="100000000"/></label>
  </>}
  <div className="publish-actions">{step===2&&<button className="secondary" type="button" onClick={()=>setStep(1)}>Back</button>}
   <button className="dark" disabled={busy}>{busy?'Sending…':step===1?'Choose vehicle':'Send ride request'}</button>
  </div>
 </form>{onBack&&<button className="text-btn" onClick={onBack}>Other service categories</button>}</>;
}
