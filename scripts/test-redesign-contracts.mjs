import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=read('src/main.jsx');
const shell=read('src/AppSidebar.jsx');
const explore=read('src/ExploreRedesign.jsx');
const categories=read('src/CompactCategories.jsx');
const design=read('src/DesignSystem.jsx');
test('core authenticated pages share one shell',()=>{
 for(const page of ['Dashboard','Explore','Requests','My listings','Appointments','Notifications','Saved'])assert.ok(shell.includes("'"+page+"'"),page);
 assert.match(main,/<AppSidebar page=\{page\}/);
 assert.match(main,/SHELL_PAGES\.includes\(page\)/);
});
test('Explore uses independent component with search, categories and listings',()=>{
 assert.match(main,/<ExploreRedesign /);
 for(const token of ['cl-explore-search-row','CompactCategories','cl-featured-track','cl-service-list','cl-all-categories-page'])assert.ok(explore.includes(token),token);
 assert.match(categories,/onMore/);
});
test('Explore saving uses persisted API rather than local-only state',()=>{
 assert.match(main,/savedIds=\{data\.savedListingIds\|\|\[\]\}/);
 assert.match(main,/send\('listings\/'.*'\/saved'/);
 assert.doesNotMatch(explore,/\[saved,setSaved\]/);
});
test('common UI primitives exist',()=>{
 for(const token of ['PageHeader','SurfaceCard','ActionButton','EmptyState','StatusBadge'])assert.match(design,new RegExp('function '+token+'\\('));
});
