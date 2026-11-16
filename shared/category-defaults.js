import records from '../data/marketplace-categories.json' with {type:'json'};
export const defaultCategories=records.map(r=>({...r,value:r.presetKey || r.name}));
