import React from 'react';
export default function Logo({iconOnly=false}){return <span className="loop-logo"><img src="/brand/loop.svg" alt={iconOnly?'Campus Loop':''}/>{!iconOnly&&<span className="loop-wordmark">Campus Loop</span>}</span>;}
