import {defaultCategories} from '../shared/category-defaults.js';
export const campus = { id: 'delsu-abraka', name: 'DELSU Abraka' };
export const categories=defaultCategories.map(c=>c.value);
export const money = value => new Intl.NumberFormat('en-NG').format(value);
export function seed() {
  return {
    campuses: [campus], users: [], sessions: [], requests: [],
    listings: [
      {id:'nails', title:'Gloss by Tami', category:'Nails', area:'Abraka', image:'/images/nails.webp', price:5000, package:'Gel manicure', description:'Nail shaping, cuticle care and one gel colour.', modes:['Home visit','Shop visit'], available:true, negotiable:true},
      {id:'hair', title:'The Braid Room', category:'Hair', area:'Abraka', image:'/images/hair.webp', price:7500, package:'Medium knotless braids', description:'Consultation, parting and styling. Extensions are priced separately.', modes:['Shop visit'], available:true},
      {id:'laundry', title:'Fresh Fold Laundry', category:'Laundry', area:'Abraka', image:'/images/laundry.webp', price:2500, package:'Wash and fold', description:'Wash, dry and fold for up to 3 kg of everyday clothing.', modes:['Home visit','Shop visit'], available:true},
      {id:'housing', title:'Self contained studio', category:'Housing', area:'Abraka', image:'/images/housing.webp', price:280000, fees:20000, role:'Landlord', description:'Private bathroom and kitchenette. Request a viewing to see the room.', modes:['Viewing'], available:true}
    ].map(l => ({...l, campus:campus.id, demo:true}))
  };
}
