export const serviceAreas=['Big Gate (Main Gate)','Small Gate','Ubiaruko','Campus 1 area','Campus 2 area','Campus 3 area','Eku Road','Oria','Erho','Urhuoka','Abraka town','Other area'];
export const allowsServiceLocation=(category,mode)=>!['Housing','Transport','Delivery'].includes(category)&&(!mode||mode==='Home visit'||mode==='Office visit');
