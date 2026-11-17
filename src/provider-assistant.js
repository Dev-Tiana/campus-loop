const words=s=>String(s||'').trim();
const split=s=>words(s).split(/\s*(?:,|;|\n|\s+\band\b\s+|\s*&\s*)\s*/i).map(x=>x.trim()).filter(x=>x.length>2);
const normalize=s=>words(s).toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const groups=[
 ['hair ventilation','hair revamping','hair styling','hair refilling','wig installation','wig making','braiding','hair coloring'],
 ['house cleaning','deep cleaning','move out cleaning','office cleaning','sofa cleaning','laundry','ironing'],
 ['gel polish','acrylic nails','manicure','pedicure','nail extensions'],
 ['plumbing','electrical repair','painting','carpentry'],
 ['cooking','meal prep','food delivery','catering']
];
export function reviewServiceListing(listing){
 const title=words(listing.title),description=words(listing.description),extras=Array.isArray(listing.extras)?listing.extras:[];
 const issues=[];const suggestions=[];
 const titleParts=split(title);
 if(titleParts.length>1){issues.push('Your service name may contain more than one service.');suggestions.push(...titleParts);}
 const text=normalize(title+' '+description);
 for(const group of groups){
  const matches=group.filter(term=>text.includes(term));
  if(matches.length>=2){issues.push('Your title or description mentions several different services.');suggestions.push(...matches);}
  const extraMatches=extras.filter(e=>group.some(term=>normalize(e.name).includes(term)));
  if(extraMatches.length>=2 || (matches.length&&extraMatches.length)){
   issues.push('Some optional extras may actually be separate services with their own prices.');
   suggestions.push(...extraMatches.map(e=>words(e.name)));
  }
 }
 if(!title)issues.push('Add a clear service name.');
 if(!Number.isFinite(Number(listing.price))||Number(listing.price)<0)issues.push('Check the service price.');
 const unique=[...new Map(suggestions.map(x=>[normalize(x),x])).values()].filter(x=>normalize(x)!==normalize(title));
 return {issues:[...new Set(issues)],suggestions:unique.slice(0,8),needsReview:issues.length>0};
}
export function answerProviderQuestion(question){
 const q=normalize(question);
 if(/price|cost|how much|charge|change.*amount/.test(q))return 'Open Manage businesses, choose your business, then edit the service listing. Set the price for that service and save. Do not put separate service prices under Optional extras.';
 if(/add|create|list|post|upload|new service|another service/.test(q))return 'Open Manage businesses, select your business, and tap Add listing. Create one listing for each service, with its own name, price, description and photos.';
 if(/photo|picture|image|gallery/.test(q))return 'Open the service listing and use the photo or gallery controls. Choose clear photos showing that particular service, then save your changes.';
 if(/business|page|profile|register|start|setup/.test(q))return 'Create a business page first. Add your business name and category, then add each service separately under that business.';
 if(/extra|combine|separate|split|different|together/.test(q))return 'List each service that customers can book independently as its own listing. Use Optional extras only for additions to that same service. Review each price before publishing.';
 if(/edit|correct|mistake|update|change/.test(q))return 'Go to Manage businesses, open the business, select the listing to edit, make your changes and save. Your existing listings remain unchanged until you save.';
 if(/pidgin|abeg|how i go|wetin/.test(q))return 'No wahala. Go Manage businesses, choose your business, tap Add listing. Put one service with im own price and picture. Save am, then add the next one.';
 return 'I can help you create a business, add separate services, change prices, upload photos, or correct an existing listing. Which one do you want to do?';
}
