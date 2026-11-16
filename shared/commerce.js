export const foodCategory='Food & Cooking';export const deliveryAreas=['Around Abraka','Campus 1 area','Campus 2 area','Campus 3 area','Eku Road','Oria','Erho','Urhuoka','Abraka town'];
export const ingredientOptions=['Included','Not included','Customer supplies ingredients'];
export const requestOpen=r=>r.status==='Open'||r.kind==='food-order'&&r.status==='Pending seller';
export function deliveryMatches(r,l){if(!r.delivery)return true;const coverage=l.delivery?.coverage || [];return ['pickupArea','dropOffArea'].every(k=>coverage.includes('Around Abraka')||coverage.includes(r.delivery[k]));}
