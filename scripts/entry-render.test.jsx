import {welcomeCopy} from '../shared/welcome-copy.js';
import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Welcome from '../src/Welcome.jsx';import AccountForm from '../src/AccountForm.jsx';import MarketplaceHero from '../src/MarketplaceHero.jsx';import CompactCategories from '../src/CompactCategories.jsx';import AccountSwitcher from '../src/AccountSwitcher.jsx';import {categories} from '../server/seed.js';
test('welcome renders the exact approved wording, direct signup paths and no marketplace content',()=>{
 const html=renderToStaticMarkup(<Welcome/>);
 for(const text of [welcomeCopy.headline,...welcomeCopy.intro.split('\n\n'),welcomeCopy.provider,'I’m looking for a service','I offer a service','Create a customer account','Create a provider account','Already have an account? Sign in'])assert.ok(html.includes(text),text);
 for(const href of ['/signup/customer','/signup/provider','/signin'])assert.ok(html.includes('href="'+href+'"'));
 for(const hidden of ['Browse categories','Services near you','Search providers','listing-card','Mobile navigation'])assert.ok(!html.includes(hidden));
 assert.ok(!html.includes('<br'));assert.ok(html.includes('/brand/loop.svg'));
});
test('each signup form has the selected fixed role; returning users see sign-in without another role choice',()=>{
 const campuses=[{id:'delsu-abraka',name:'DELSU Abraka'}];for(const role of ['customer','provider']){const html=renderToStaticMarkup(<AccountForm signup accountRole={role} requiredRole={role} campuses={campuses}/>);assert.ok(html.includes('Create a '+role+' account'));assert.ok(html.includes('name="name"'));assert.ok(html.includes('name="email"'));assert.ok(html.includes('name="password"'));assert.ok(!html.includes('Account type'));}
 const html=renderToStaticMarkup(<AccountForm campuses={campuses}/>);assert.ok(html.includes('Welcome back'));assert.ok(html.includes('>Sign in</button>'));assert.ok(!html.includes('Account type'));assert.ok(!html.includes('name="name"'));
});
test('signed-in marketplace keeps the two-line hero, both service actions and icon category cards',()=>{
 const html=renderToStaticMarkup(<><MarketplaceHero/><CompactCategories categories={categories} category=""/></>);assert.ok(html.includes('<span class="hero-line">Campus life,</span><em>sorted.</em>'));assert.ok(html.includes('Request a service'));assert.ok(html.includes('Offer a service'));assert.ok(html.includes('Browse categories'));for(const category of categories)assert.ok(html.includes('aria-label="'+category.replaceAll('&','&amp;')+'"'));assert.ok(!html.includes('/categories/'));assert.ok(!html.includes('Find a barber, nail tech, or lash tech near DELSU Abraka.'));
});

test('welcome has one campus image, and switcher shows active and separate linked roles',()=>{
 const html=renderToStaticMarkup(<Welcome/>);assert.equal((html.match(/class="loop-campus-hero"/g)||[]).length,1);assert.equal((html.match(/<img/g)||[]).length,4);assert.match(html,/src="\/walkthroughs\/customer\.webp"/);assert.match(html,/src="\/walkthroughs\/provider\.webp"/);assert.ok(html.includes('/images/welcome-nigerian-campus.webp'));assert.doesNotMatch(html,/Photo credit|<figcaption/);assert.ok(!html.includes('welcome-emblem'));
 const user={id:'customer',name:'Customer',accountRole:'customer'},accounts=[{...user,email:'customer@example.com'},{id:'provider',name:'Provider',accountRole:'provider',email:'provider@example.com'}];const switcher=renderToStaticMarkup(<AccountSwitcher user={user} accounts={accounts}/>);for(const text of ['Switch account','Active account','customer account','provider account','Switch to provider'])assert.ok(switcher.includes(text),text);
});

test('Campus Guide renders its four screens with approved links and preserves empty states',async()=>{
 const {default:CampusGuide,GuideMenu}=await import('../src/CampusGuide.jsx'),{guideFixture}=await import('../server/guide-fixture.js'),{campusGuide}=await import('../shared/catalog.js');const guide=campusGuide(guideFixture(),'delsu-abraka');
 const menu=renderToStaticMarkup(<GuideMenu items={guide.menuItems} onClose={()=>{}}/>);for(const label of ['Upcoming events','Locate a hotel','Join a WhatsApp group','Locate a restaurant'])assert.ok(menu.includes(label));
 for(const id of ['events','hotels','groups','restaurants']){const html=renderToStaticMarkup(<CampusGuide guide={guide} id={id} listings={[]}/>);assert.ok(html.includes(guide.menuItems.find(m=>m.id===id).label));if(id==='events'){assert.ok(html.includes('Campus hall'));assert.ok(html.includes('Approved organiser'));assert.ok(html.includes('https://example.com/register'));}if(id==='hotels')assert.ok(html.includes('Get directions'));if(id==='groups')assert.ok(html.includes('https://chat.whatsapp.com/ApprovedTestInvite'));if(id==='restaurants')assert.ok(html.includes('Rice and grills'));}
 const empty=renderToStaticMarkup(<CampusGuide guide={{...guide,entries:[]}} id="hotels" listings={[]}/>);assert.ok(empty.includes('Approved hotels and guesthouses will appear here.'));
});
test('commerce forms show cooking portions, menu totals, coverage and separate provider charges',async()=>{
 const {CookingRequest,FoodOrderForm,DeliveryRequest,DeliverySummary}=await import('../src/Commerce.jsx'),{default:ListingForm}=await import('../src/ListingForm.jsx');
 let html=renderToStaticMarkup(<CookingRequest/>);for(const text of ['Dishes you want','Number of portions','Budget'])assert.ok(html.includes(text));
 const menu={id:'food',category:'Food & Cooking',serviceType:'Shawarma',title:'Shawarma',area:'Oria',price:2500,food:{kind:'menu',fulfilment:['Seller delivery','Pickup'],deliveryFee:700,pickupPoint:'Oria food stand'},modes:['Seller delivery','Pickup']};html=renderToStaticMarkup(<FoodOrderForm listing={menu}/>);assert.ok(html.includes('3,200'));assert.ok(html.includes('Seller delivery fee'));assert.ok(html.includes('Drop off point'));
 html=renderToStaticMarkup(<DeliveryRequest/>);for(const text of ['What needs collecting?','Pickup point','Drop off point','Delivery budget'])assert.ok(html.includes(text));
 html=renderToStaticMarkup(<DeliverySummary request={{delivery:{item:'Meal',pickupPoint:'Food stand',pickupArea:'Oria',dropOffPoint:'Hostel',dropOffArea:'Campus 2 area',foodPurchaseTotal:4000,foodSeller:'Food seller'},booking:{agreedPrice:1300,providerName:'Courier'}}}/>);for(const text of ['4,000','1,300','5,300','pay each provider separately'])assert.ok(html.includes(text));
 html=renderToStaticMarkup(<ListingForm accountRole="provider" initialCategory="Delivery" error={()=>{}} businesses={[]}/>);assert.ok(html.includes('Delivery coverage'));assert.ok(!html.includes('Appointment type'));assert.ok(html.includes('Request a quote'));
});

test('admin workspace renders all eleven screens with real editor and moderation controls',async()=>{
 const {AdminPage}=await import('../src/Admin.jsx');const {defaultWelcome}=await import('../shared/admin-content.js');const {defaultCategories}=await import('../shared/category-defaults.js');const data={overview:{openReports:0,liveAds:0},activityLog:[],welcome:{draft:defaultWelcome,published:defaultWelcome},guide:{menuItems:[{id:'events',label:'Upcoming events',type:'events',visible:true}],entries:[]},categories:defaultCategories,listings:[],roommates:[],reports:[],users:[],ads:[],announcements:[]};
 for(const [page,text] of [['Overview','Review reports'],['Welcome Page','Publish welcome page'],['Campus Guide','Publish'],['Categories','Save category'],['Listings','Search listings'],['Reports','Select a report'],['Users','Search users'],['Announcements','Publish / schedule'],['Advertisements','Ad Performance'],['Marketplace Activity','Category'],['Activity Log','All actions']]){const html=renderToStaticMarkup(<AdminPage page={page} data={data} go={()=>{}} save={()=>Promise.resolve({})} act={()=>{}}/>);assert.ok(html.includes(text),page+' should render '+text);}
});
test('reporting is available for listings, guide entries, roommate posts and private conversations',async()=>{const {ReportButton}=await import('../src/CommunityContent.jsx');for(const type of ['listing','roommate','guide-entry','conversation','roommate-conversation']){const html=renderToStaticMarkup(<ReportButton targetType={type} targetId="test"/>);assert.ok(html.includes('>Report</button>'));}});

test('new listing form skips hidden default category while editing retains its stored category',async()=>{const {default:ListingForm}=await import('../src/ListingForm.jsx');const {defaultCategories}=await import('../shared/category-defaults.js');const records=defaultCategories.map(c=>({...c,visible:c.name!=='Nails'}));const html=renderToStaticMarkup(<ListingForm accountRole="provider" categoryRecords={records} error={()=>{}} businesses={[]}/>);assert.ok(!html.includes('<option value="Nails"'));assert.ok(html.includes('value="Hair" selected=""'));});
test('admin setup and sign in group labels, controls and feedback inside the form',async()=>{
 const {AdminAuthForm,Field,ImageUpload}=await import('../src/Admin.jsx');
 for(const setup of [false,true]){const html=renderToStaticMarkup(<AdminAuthForm setup={setup} form={{name:'',email:'',password:''}} set={()=>{}} error="A long validation message that must stay within the form."/>);assert.ok(html.includes('admin-form-grid admin-auth-form'));assert.ok(html.includes('class="admin-field-label">Admin email</span><input'));assert.ok(html.includes('minLength="12"'));assert.ok(html.indexOf('role="alert"')<html.indexOf('</form>'));assert.equal(html.includes('Your name'),setup);}
 const field=renderToStaticMarkup(<Field name="title" label="Title" form={{}} set={()=>{}} helper="Keep it short." error="Add a title."/>);assert.ok(field.includes('aria-invalid="true"'));assert.ok(field.includes('aria-describedby='));assert.ok(field.includes('admin-field-error'));assert.ok(field.includes('admin-field-help'));
 const upload=renderToStaticMarkup(<ImageUpload error="The selected filename is long and the file could not be uploaded." onUpload={()=>{}}/>);assert.ok(upload.includes('admin-field-wide admin-upload'));assert.ok(upload.includes('admin-upload-status'));assert.ok(upload.includes('aria-invalid="true"'));
});
test('ad editor places publishing controls below grouped fields and keeps the preview separate',async()=>{
 const {AdminPage}=await import('../src/Admin.jsx');const html=renderToStaticMarkup(<AdminPage page="Advertisements" data={{ads:[]}} save={()=>Promise.resolve({id:'saved'})}/>);
 for(const name of ['title','body','advertiser','buttonLabel','destination','startsAt','endsAt'])assert.ok(html.includes('name="'+name+'"'),name);
 assert.ok(html.includes('data-field="body"'));assert.ok(html.includes('admin-field-wide'));assert.ok(html.includes('aria-label="Publishing actions"'));assert.ok(html.includes('type="submit" class="dark">Publish / schedule'));
 assert.ok(html.indexOf('Save draft')>html.indexOf('name="endsAt"'));assert.ok(html.indexOf('aria-label="Ad preview"')>html.indexOf('</form>'));assert.ok(html.includes('excluded from performance counts'));
});
test('desktop panel and mobile drawer share visible, ordered guide links and active-page routing',async()=>{
 const {GuideSidebar,GuideMenu,guideHref}=await import('../src/CampusGuide.jsx');const {parseAppRoute}=await import('../shared/app-routes.js');
 const items=[{id:'events',type:'events',label:'Upcoming events',displayOrder:0},{id:'hotels',type:'hotels',label:'Locate a hotel',displayOrder:1},{id:'groups',type:'groups',label:'Join a WhatsApp group',displayOrder:2},{id:'restaurants',type:'restaurants',label:'Locate a restaurant',displayOrder:3},{id:'custom-section',label:'New owner section',displayOrder:4},{id:'hidden',label:'Hidden item',visible:false}];
 const desktop=renderToStaticMarkup(<GuideSidebar items={items} activeId="hotels"/>),mobile=renderToStaticMarkup(<GuideMenu items={items} activeId="hotels" onClose={()=>{}}/>);
 for(const html of [desktop,mobile]){assert.ok(!html.includes('Hidden item'));assert.equal((html.match(/aria-current="page"/g)||[]).length,1);for(const item of items.filter(m=>m.visible!==false)){assert.ok(html.includes('href="'+guideHref(item.id)+'"'));assert.ok(html.includes(item.label));const route=parseAppRoute(guideHref(item.id));assert.equal(route.page,'Guide');assert.equal(route.guideId,item.id);}assert.ok(html.indexOf('Upcoming events')<html.indexOf('Locate a hotel'));}
 assert.ok(!desktop.includes('aria-modal'));assert.ok(mobile.includes('aria-modal="true"'));
});
test('campaign validation allows incomplete drafts and identifies every missing publishing field',async()=>{
 const {validateCampaign}=await import('../shared/admin-form-validation.js');
 assert.deepEqual(validateCampaign({title:'Test',body:'Copy'},{publish:false}),{});
 const errors=validateCampaign({title:'',body:'',destination:'javascript:alert(1)'},{publish:true});for(const name of ['title','body','startsAt','endsAt','advertiser','buttonLabel','imageId','destination','placement'])assert.ok(errors[name],name);
 const complete={title:'Test',body:'Copy',advertiser:'Seller',buttonLabel:'Open',imageId:'uploaded-photo',destination:'/app/marketplace',placement:'guide',startsAt:'2027-01-01T10:00',endsAt:'2027-01-01T11:00'};assert.deepEqual(validateCampaign(complete,{publish:true}),{});assert.ok(validateCampaign({...complete,endsAt:'2027-01-01T09:00'},{publish:true}).endsAt);
});

import AccountDashboard from '../src/AccountDashboard.jsx';
test('account dashboards show role-specific actions and exclude housing activity',()=>{
 const requests=[
  {id:'made',owner:'test',category:'Nails',serviceType:'Gel polish',status:'Open',offers:[{id:'offer'}]},
  {id:'incoming',owner:'other',category:'Cleaning',serviceType:'House cleaning',status:'Open',offers:[],isNew:true},
  {id:'viewing',owner:'test',category:'Housing',status:'Viewing confirmed',offers:[]},
 ];
 const listings=[{available:true,category:'Cleaning'},{available:true,category:'Housing'}];
 const render=accountRole=>renderToStaticMarkup(<AccountDashboard user={{id:'test',name:'Tiana Test',accountRole}} campus="DELSU Abraka" requests={requests} listings={listings}/>);
 const customer=render('customer'),provider=render('provider');
 assert.match(customer,/Hi, Tiana\./);
 assert.match(customer,/Request a service/);
 assert.match(customer,/Gel polish/);
 assert.doesNotMatch(customer,/House cleaning|Create a business|Viewing confirmed|Roommates/);
 assert.match(provider,/Add a service/);
 assert.match(provider,/House cleaning/);
 assert.match(provider,/<strong>1<\/strong><span>Active listings<\/span>/);
 assert.doesNotMatch(provider,/Gel polish|Viewing confirmed|Roommates/);
});

import {BusinessForm,BusinessPage} from '../src/Businesses.jsx';
test('existing cover uploads display as landscape covers outside the gallery',()=>{
 const business={id:'shop',name:'Zamar',owner:'owner',description:'Cleaning',areas:['Abraka'],galleryIds:['portfolio'],coverPhotoId:'portfolio',image:'/api/photos/portfolio',flyerPhotoId:'existing'};
 const editor=renderToStaticMarkup(<BusinessForm business={business}/>);
 assert.match(editor,/Cover photo \(optional\)/);
 assert.match(editor,/src="\/api\/photos\/existing"/);
 assert.doesNotMatch(editor,/Flyer|Use as cover/);
 const page=renderToStaticMarkup(<BusinessPage business={business} listings={[]}/>);
 assert.match(page,/class="business-cover"><img src="\/api\/photos\/existing"/);
 assert.match(page,/View cover photo/);
 assert.match(page,/View gallery/);
});

import {RequestDetail} from '../src/RequestTracking.jsx';
import ServiceLocation from '../src/ServiceLocation.jsx';
test('provider actions keep the budget in request details and area picker lists local landmarks',()=>{
 const listing={id:'listing',title:'Cleaning'};
 const request={id:'r',owner:'c',category:'Cleaning',status:'Open',offers:[],options:['listing'],details:'Clean my room',budget:20000,time:'Tomorrow',serviceLocation:{area:'Small Gate'}};
 const html=renderToStaticMarkup(<RequestDetail request={request} user={{id:'p'}} listings={[listing]}/>);
 assert.match(html,/Budget:<\/strong> ₦20,000/);
 assert.match(html,/>Accept request<\/button>/);
 assert.match(html,/>Decline request<\/button>/);
 assert.match(html,/>Send a quote<\/button>/);
 assert.doesNotMatch(html,/Accept budget/);
 const location=renderToStaticMarkup(<ServiceLocation/>);
 for(const area of ['Big Gate','Small Gate','Ubiaruko'])assert.ok(location.includes(area));
});

test('confirmed requests show one booking summary and compact appointment action labels',()=>{
 const terms={price:20000,time:'16 Nov, 15:36',mode:'Home visit',acceptedBudget:true,details:'Agreed to the customer’s requested service and budget.'};
 const request={id:'booked',owner:'c',category:'Cleaning',status:'Booked',details:'Clean the kitchen floor',mode:'Home visit',time:'Tuesday 5 pm',budget:20000,confirmed:'offer',offers:[{id:'offer',listing:'listing',terms}],booking:{provider:'p',providerName:'Tiana',listingTitle:'Home cleaning',agreedPrice:20000,time:terms.time,terms}};
 const html=renderToStaticMarkup(<RequestDetail request={request} user={{id:'c'}} listings={[]}/>);
 assert.equal((html.match(/class="booking-summary"/g)||[]).length,1);
 assert.match(html,/<summary>Customer request and budget<\/summary>/);
 assert.match(html,/<summary>Booking terms<\/summary>[\s\S]*Requested work:<\/strong> Clean the kitchen floor/);
 for(const label of ['Reschedule','Cancel booking','Share address','Open chat'])assert.ok(html.includes(label));
 assert.doesNotMatch(html,/Current offers|Agreed to the customer’s requested service and budget/);
});

test('first service setup reuses the existing business and keeps the listing attached',async()=>{
 const {default:ListingForm}=await import('../src/ListingForm.jsx');
 const business={id:'cleaning-business',name:'Campus Cleaning',category:'Cleaning'};
 const setup=renderToStaticMarkup(<BusinessForm/>);
 assert.match(setup,/Step 1 of 2/);
 assert.match(setup,/Save and add your first service/);
 assert.doesNotMatch(setup,/type="file"/);
 const dashboard=renderToStaticMarkup(<AccountDashboard user={{id:'provider',name:'Provider',accountRole:'provider'}} campus="DELSU Abraka" requests={[]} listings={[]} unfinishedBusiness={business}/>);
 assert.match(dashboard,/Your business page is ready/);
 assert.match(dashboard,/Add your first service/);
 const form=renderToStaticMarkup(<ListingForm accountRole="provider" businesses={[business]} initialBusinessId={business.id} initialCategory={business.category} firstService/>);
 assert.match(form,/Step 2 of 2/);
 assert.match(form,/Campus Cleaning/);
 assert.match(form,/Review service/);
 assert.doesNotMatch(form,/No business page|<option value="Housing"/);
});
