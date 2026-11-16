export const appointmentTypes = ['Home visit','Shop visit','Office visit'];
export const roommateAreas=['Any area around Abraka','Campus 1 area','Campus 2 area','Campus 3 area','Eku Road','Oria','Erho','Urhuoka','Abraka town'];
export const roommatePreferences=['Non-smoking','Tidy','Quiet environment','Early sleeper','Shared chores','No pets','Female roommate','Male roommate'];
export const roommateIntents=['Join an existing place','Find a place together'];
export const serviceName=l=>l?.serviceType==='Custom'?l.customServiceType:l?.serviceType || l?.package || '';
export const sameService=(a,b)=>a.trim().toLocaleLowerCase()===b.trim().toLocaleLowerCase();
export const cleanEntries=value=>Array.isArray(value)?[...new Set(value.filter(x=>typeof x==='string').map(x=>x.trim().slice(0,120)).filter(Boolean))].slice(0,30):[];
