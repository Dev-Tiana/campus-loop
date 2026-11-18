import React from 'react';import {Plus,ArrowUpRight,Search} from 'lucide-react';
export default function MarketplaceHero({onRequest,onOffer}){return <section className="hero">
     <div className="hero-copy"><div className="hero-campus"><span/> DELSU ABRAKA</div>
     <h1><span className="hero-line">Explore campus</span><em>services.</em></h1>
     <p>Find trusted local services for campus life. Browse food, laundry, beauty, repairs and more from people around DELSU Abraka.</p>
     <div className="hero-actions"><button className="dark" onClick={onRequest}><Plus size={19}/> Request a service</button><button className="light" onClick={onOffer}>Offer a service <ArrowUpRight size={17}/></button></div>
     </div><div className="hero-image"><img src="/images/hero.webp" alt="Two smiling university students with backpacks"/><span className="hero-sticker"><img className="badge-loop" src="/brand/loop.svg" alt="Campus Loop"/><span>Made for<br/><strong>campus life.</strong></span></span></div>
   </section>;}
