import React,{useEffect,useState} from 'react';
import {serviceAreas} from '../shared/service-location.js';
import {LocationField,loadMaps} from './Transport.jsx';

export default function ServiceLocation({value,onChange}){
 const [search,setSearch]=useState(false),[mapsReady,setMapsReady]=useState(false),[mapsAvailable,setMapsAvailable]=useState(false);
 useEffect(()=>{const abort=new AbortController();fetch('/api/config',{signal:abort.signal}).then(r=>r.ok?r.json():null).then(config=>setMapsAvailable(config?.mapsBrowserKey || false)).catch(()=>{});return()=>abort.abort();},[]);
 async function toggleMaps(){
  setSearch(!search);
  if(!search&&mapsAvailable&&!mapsReady){try{await loadMaps(mapsAvailable);setMapsReady(true);}catch{}}
 }
 return <fieldset className="service-location">
  <legend>Where do you need the service?</legend>
  <label>Area or landmark<select value={value?.area || ''} onChange={e=>onChange(e.target.value?{...value,area:e.target.value}:null)}>
   <option value="">Choose an area</option>{serviceAreas.map(area=><option key={area}>{area}</option>)}
  </select></label>
  <p className="muted">Providers see the area. Share your street or hostel directions after booking, or send them in the private chat.</p>
  {value?.area&&mapsAvailable&&<button className="text-btn" type="button" onClick={toggleMaps}>{search?'Close map search':'Find the exact place on Google Maps (optional)'}</button>}
  {search&&value?.area&&<LocationField name="Exact place (private until booked)" value={value} onChange={onChange} mapsReady={mapsReady} optional hideArea/>}
 </fieldset>;
}
