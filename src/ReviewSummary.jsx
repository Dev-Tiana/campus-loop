import React,{useEffect,useState} from 'react';
import {Star} from 'lucide-react';
const cache=new Map();
export default function ReviewSummary({id}){
 const [state,setState]=useState(()=>cache.get(id)||null);
 useEffect(()=>{let active=true;if(!id)return;const cached=cache.get(id);if(cached){setState(cached);return;}const controller=new AbortController();fetch('/api/listings/'+encodeURIComponent(id)+'/reviews',{signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(!active||!data||!Array.isArray(data.reviews))return;const valid=data.reviews.map(r=>Number(r.rating)).filter(n=>Number.isFinite(n)&&n>=1&&n<=5);const summary={count:valid.length,average:valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null};cache.set(id,summary);setState(summary)}).catch(()=>{});return()=>{active=false;controller.abort()};},[id]);
 if(!state)return null;
 return <span className="cl-review-summary">{state.count?<><Star size={14} fill="currentColor"/><strong>{state.average.toFixed(1)}</strong><span>({state.count})</span></>:<span className="cl-no-reviews">No reviews yet</span>}</span>;
}
