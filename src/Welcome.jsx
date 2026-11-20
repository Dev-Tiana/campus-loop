import React from 'react';
import {ArrowRight, MapPin, Search, Store} from 'lucide-react';
import Logo from './Logo.jsx';
import {WelcomeWalkthroughs} from './Walkthrough.jsx';
import {welcomeCopy as copy} from '../shared/welcome-copy.js';
import {defaultWelcome} from '../shared/admin-content.js';
import {authPath} from '../shared/app-routes.js';

export default function Welcome({next,onNavigate,content={}}) {
  function link(path) {
    return {href:path,onClick:event=>{
      if (!onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onNavigate(path);
    }};
  }
  const choices = [
    {role:'customer', title:copy.customerLabel, label:copy.customerButton, Icon:Search},
    {role:'provider', title:copy.providerLabel, label:copy.providerButton, Icon:Store}
  ];
  return <div className="loop-welcome">
    <header className="loop-mast"><Logo/><a {...link(authPath({next}))}>Sign in <ArrowRight size={16}/></a></header>
    <main className="loop-front">
      <section className="loop-campus-hero">
        <img src={content.photoUrl || defaultWelcome.photoUrl} alt={content.photoAlt || defaultWelcome.photoAlt} width="1400" height="933" fetchPriority="high"/>
        <div className="loop-hero-copy">
          <span><MapPin size={16}/> DELSU Abraka</span>
          <h1>{content.headline || copy.headline}</h1>
          <a className="loop-cta" {...link(authPath({next:'/app/marketplace'}))}>Explore services <ArrowRight size={18}/></a>
        </div>
      </section>
      <section className="loop-roles" aria-label="Choose your account">
        {choices.map(({role,title,label,Icon})=><article key={role}>
          <Icon className="loop-role-icon" size={24}/><h2>{title}</h2>
          {role==='provider'?<p>{content.provider || copy.provider}</p>:
            (content.intro || copy.intro).split(/\n\s*\n/).map(p=><p key={p}>{p}</p>)}
          <a {...link(authPath({signup:true,role,next}))}>{label} <ArrowRight size={16}/></a>
        </article>)}
      </section>
      <a className="loop-return" {...link(authPath({next}))}>{copy.signin}</a>
      <WelcomeWalkthroughs/>
    </main>
  </div>;
}
