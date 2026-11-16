import React,{useEffect,useState} from 'react';
export default function ListingReviews({id}){
 const [reviews,setReviews]=useState(null);
 useEffect(()=>{const abort=new AbortController();setReviews(null);fetch('/api/listings/'+id+'/reviews',{signal:abort.signal}).then(r=>r.ok?r.json():null).then(data=>{if(data)setReviews(data.reviews);}).catch(()=>{});return()=>abort.abort();},[id]);
 return <section className="listing-reviews"><h3>Reviews from completed bookings</h3>{reviews?.length?reviews.map((review,i)=><article key={review.created+'-'+i}><strong>{review.rating}/5</strong>{review.comment&&<p>{review.comment}</p>}</article>):reviews&&<p className="muted">No reviews yet.</p>}</section>;
}
