export const vehicles=['Bike (Okada)','Keke','Car ride'];
export const rideVehicleLabels={'Bike (Okada)':'Bike (Okada)','Keke':'Keke drop','Car ride':'Taxi / car'};
export const tripScopes=['Around campus','Around Abraka','Out of town'];
export const driverAvailability=['Now and scheduled','Now only','Scheduled trips'];
export const tripAreas=[
 'DELSU campus','DELSU Campus 1','DELSU Campus 2','DELSU Campus 3','Big Gate (Main Gate)','Small Gate',
 'Abraka town','Abraka Post Office area','Abraka Inland (Otorho)','Ubiaruko','Ekrejeta','Urhuoka','Umege',
 'Obeje','Ajalomi','Urhuovie','Erho','Oria','Urhogbesa','Ughere','Oteri','Ugono-Abraka','Other area',
];
export function rideLocationLabel(location){
 return location?.label?.trim()||(location?.area&&location.area!=='Other area'?location.area:'');
}
export function coordinate(v){return v&&typeof v.lat==='number'&&typeof v.lng==='number'&&Number.isFinite(v.lat)&&Number.isFinite(v.lng)&&Math.abs(v.lat)<=90&&Math.abs(v.lng)<=180?{lat:v.lat,lng:v.lng}:null;}
export function publicRide(ride){
 if(!ride)return ride;
 const publicPoint=point=>({area:point.area,...(ride.sharePlaceNames?{label:point.label}:{})});
 return {...ride,pickup:publicPoint(ride.pickup),destination:publicPoint(ride.destination),landmark:undefined};
}
export function transportMatches(r,l){return l.category==='Transport'&&vehicles.includes(r.serviceType)&&l.serviceType===r.serviceType&&l.transport?.coverage?.includes(r.transport?.scope)&&(r.time==='Now'?l.transport.availability!=='Scheduled trips':l.transport.availability!=='Now only');}
