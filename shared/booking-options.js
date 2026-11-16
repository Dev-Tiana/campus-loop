export const cleaningPropertyTypes=['Single room','Bedsitter / Self contain','One bedroom flat','Two bedroom flat','Three bedroom flat','Office','Shop','Other'];
export const cleaningAreas=['Bedroom','Bathroom','Toilet','Kitchen','Kitchenette','Living area','Floors','Desks','Counters','Windows','Oven'];
export const propertyKeysMatch=(a,b)=>propertyKey(a)===propertyKey(b);
function propertyKey(value){
 return value==='Self contained room'||value==='Bedsitter / Self contain'?'bedsitter':(value || '').toLowerCase();
}
export function matchesProperty(request,listing){
 if(request.category==='Housing'&&request.propertyTypes?.length)return request.propertyTypes.some(type=>propertyKeysMatch(type,listing.propertyType));
 if(request.category==='Cleaning'&&request.cleaning?.propertyType&&listing.cleaningPropertyTypes?.length)return listing.cleaningPropertyTypes.includes(request.cleaning.propertyType);
 return true;
}
export function availableBooking(request){return ['Booked','Viewing confirmed'].includes(request.status)&&!!request.booking;}
export function bookingTime(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
 const at=Date.parse(value+'+01:00');
 return Number.isFinite(at)&&new Date(at+3600000).toISOString().slice(0,16)===value?at:null;
}
export const formatBookingTime=at=>new Intl.DateTimeFormat('en-NG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Lagos'}).format(at);
export function quoteTotal(items){return items.reduce((total,item)=>total+Number(item.price),0);}
