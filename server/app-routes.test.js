import test from 'node:test';import assert from 'node:assert/strict';import {appPath,authPath,welcomePath,parseAppRoute,resolveSessionRoute,safeAppPath} from '../shared/app-routes.js';
test('public welcome, direct role signup and sign-in destinations are separate from protected app pages',()=>{
 assert.equal(parseAppRoute('/').kind,'welcome');for(const role of ['customer','provider']){const path=authPath({signup:true,role});assert.equal(path,'/signup/'+role);const route=parseAppRoute(path);assert.equal(route.kind,'signup');assert.equal(route.requiredRole,role);assert.equal(resolveSessionRoute(route,null),null);assert.equal(resolveSessionRoute(route,{accountRole:role}),'/app');}
 assert.equal(authPath(),'/signin');assert.equal(parseAppRoute('/signin').kind,'signin');for(const page of ['Explore','Housing','Requests','Notifications','Dashboard','My listings']){const path=appPath(page),route=parseAppRoute(path);assert.equal(route.kind,'protected');assert.equal(route.page,page);assert.equal(resolveSessionRoute(route,null),welcomePath(path));assert.equal(resolveSessionRoute(route,{accountRole:'customer'}),null);}
});
test('protected deep links resume after authentication and redirect destinations stay within the app',()=>{
 for(const path of ['/app/requests/request-id','/app/requests/request-id/offers/offer-id/chat','/app/business/business-id','/app/request-service?listing=gel-id&category=Nails','/app/offer-service']){
  const welcome=parseAppRoute(welcomePath(path));assert.equal(welcome.kind,'welcome');assert.equal(welcome.next,path);const signin=parseAppRoute(authPath({next:welcome.next}));assert.equal(resolveSessionRoute(signin,{accountRole:'customer'}),path);assert.equal(resolveSessionRoute(signin,null),null);
 }
 for(const bad of ['https://example.com','//example.com','/app/../../signin','/app/%2e%2e/signin','/application','/app\\example.com','javascript:alert(1)'])assert.equal(safeAppPath(bad),null);
 assert.equal(parseAppRoute('/signin?next=https://example.com').next,null);assert.equal(resolveSessionRoute(parseAppRoute('/?next=//example.com'),{id:'active'}),'/app');
});
