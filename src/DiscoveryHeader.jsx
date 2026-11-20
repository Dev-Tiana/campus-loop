import React from 'react';
import {ArrowRight, MapPin, Search} from 'lucide-react';

export default function DiscoveryHeader({campus,query,onQuery,onRequest,onOffer}) {
  return <section className="discovery-header">
    <div><span className="discovery-campus"><MapPin size={15}/>{campus}</span>
      <h1>Explore services</h1>
      <form role="search" onSubmit={event=>{
        event.preventDefault();
        document.getElementById('results')?.scrollIntoView({block:'start'});
      }}>
        <Search aria-hidden="true" size={19}/>
        <input type="search" aria-label="Search providers" placeholder="Search a service or business" value={query} onChange={event=>onQuery(event.target.value)}/>
        <button>Search</button>
      </form>
      <div className="discovery-actions"><button onClick={onRequest}>Request a service <ArrowRight size={15}/></button><button onClick={onOffer}>Offer a service <ArrowRight size={15}/></button></div>
    </div>
    <img src="/images/welcome-nigerian-campus.webp" alt="" width="1400" height="933"/>
  </section>;
}
