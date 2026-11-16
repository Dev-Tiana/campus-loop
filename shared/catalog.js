import config from '../data/campus-guide.json' with {type:'json'};
export const guideConfiguration=config;
import {defaultCategories} from './category-defaults.js';
export {defaultCategories} from './category-defaults.js';
export function categoryRecords(state={}){const stored=state.categoryRecords || [];const ids=new Set(stored.map(r=>r.id));return [...stored,...defaultCategories.filter(r=>!ids.has(r.id))].map(r=>({...r,value:r.presetKey || r.name})).sort((a,b)=>a.displayOrder-b.displayOrder);}
export function findCategory(state,value){return categoryRecords(state).find(r=>r.id===value||r.name===value||r.value===value||r.legacyNames?.includes(value));}
export const categoryKey=(state,item)=>item.categoryId || findCategory(state,item.category)?.id || item.category;
export function externalLink(value,type='https'){try{const u=new URL(value);if(u.protocol!=='https:')return null;if(type==='maps'&&!(['www.google.com','maps.google.com','maps.app.goo.gl','goo.gl'].includes(u.hostname)&&(u.hostname!=='www.google.com'||u.pathname.startsWith('/maps'))))return null;if(type==='whatsapp'&&(u.hostname!=='chat.whatsapp.com'||!/^\/[A-Za-z0-9]+$/.test(u.pathname)))return null;return u.href;}catch{return null;}}
export function campusGuide(state,campus,now=Date.now()){
 const menuItems=(state.guideMenu || config.menuItems).filter(m=>m.visible!==false).sort((a,b)=>a.displayOrder-b.displayOrder);
 const entries=(state.guideEntries || config.entries).filter(e=>e.approved===true&&e.visible!==false&&e.campus===campus&&menuItems.some(m=>m.id===e.menuId)).flatMap(e=>{
  const menu=menuItems.find(m=>m.id===e.menuId);if(menu.type==='events'&&(!Number.isFinite(Date.parse(e.startsAt))||!Number.isFinite(Date.parse(e.endsAt))||Date.parse(e.endsAt)<=now||Date.parse(e.endsAt)<Date.parse(e.startsAt)))return [];
  const {draft,...published}=e;return [{...published,directionsUrl:externalLink(e.directionsUrl,'maps'),inviteUrl:externalLink(e.inviteUrl,'whatsapp'),registrationUrl:externalLink(e.registrationUrl)}];
 }).sort((a,b)=>(Date.parse(a.startsAt)||0)-(Date.parse(b.startsAt)||0)||(a.displayOrder || 0)-(b.displayOrder || 0));
 return {menuItems,entries,ownerContactUrl:externalLink(state.guideOwnerContactUrl || config.ownerContactUrl)};
}
