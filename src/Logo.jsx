import React from 'react';
import {GraduationCap} from 'lucide-react';
export default function Logo({iconOnly=false}){return <span className="loop-logo campus-brand-logo"><span className="campus-cap" aria-hidden="true"><GraduationCap size={32} strokeWidth={2.5}/></span>{!iconOnly&&<span className="loop-wordmark">Campus Loop</span>}</span>;}
