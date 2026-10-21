'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const draft=require('../../tools/localization_100/drafts.cjs');
const guard=require('../../tools/localization_100/guard.cjs');
const source={
 'analytics.dictionary':{analyticsTitle:'Recorded analytics',sessions:'Sessions',avg:'Average session',dateRange:'From {from} to {to}',export:'Export CSV'},
 'core.navigation':{navTimer:'Timer',navTasks:'Tasks'}
};
const sample=()=>({
 schema_version:1,locale:'sw',status:'DRAFT_TRANSLATION_NEEDS_NATIVE_REVIEW',
 inventorySha256:guard.inventoryHash(source),
 strings:{'analytics.dictionary':{analyticsTitle:'Takwimu zilizorekodiwa',sessions:'Vipindi',dateRange:'Kuanzia {from} hadi {to}'},
 'core.navigation':{navTimer:'Kipima muda'}}
});
test('draft records real progress but can NEVER mean approved or selectable',()=>{
 const r=draft.validateDraft(sample(),source);
 assert.equal(r.valid,true);
 assert.equal(r.readyForRuntime,false);
 assert.equal(r.humanReview,'NOT_TESTED');
 assert.equal(r.translated,4);
 assert.equal(r.total,7);
 assert.equal(r.missing,3);
 assert.equal(r.byCatalog['analytics.dictionary'].translated,3);
 assert.equal(r.byCatalog['core.navigation'].missing,1);
});
test('draft rejects invented locale, forbidden language, stale English inventory, and bogus approval',()=>{
 const s=sample();
 for(const code of ['he','iw','xx','en']){s.locale=code;assert.equal(draft.validateDraft(s,source).valid,false,code);}
 s.locale='sw';s.inventorySha256='stale';assert.equal(draft.validateDraft(s,source).valid,false);
 s.inventorySha256=guard.inventoryHash(source);s.status='APPROVED';assert.equal(draft.validateDraft(s,source).valid,false);
});
test('draft rejects unverified copied English, lost interpolation, unsafe HTML, Eastern digits, bidi, and ghost keys',()=>{
 const s=sample();
 s.strings['core.navigation'].navTimer='Timer';assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('IDENTICAL')));
 s.strings['core.navigation'].navTimer='Kipima muda';
 s.strings['analytics.dictionary'].dateRange='Kuanzia {from}';assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('PLACEHOLDER')));
 s.strings['analytics.dictionary'].dateRange='Kuanzia {from} hadi {to}';
 s.strings['analytics.dictionary'].sessions='Vipindi ١٢';assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('NON_WESTERN')));
 s.strings['analytics.dictionary'].sessions='Vipindi <script>';assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('UNREVIEWED_HTML')));
 s.strings['analytics.dictionary'].sessions='Vipindi\u202e';assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('CONTROL_CHAR')));
 s.strings['analytics.dictionary'].sessions='Vipindi';s.strings['analytics.dictionary'].ghost='xxx';
 assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('EXTRA_KEY')));
});
test('the checked-in Swahili UI draft is valid structurally, remains incomplete and unapproved',()=>{
 const real=require('../../tools/localization_100/drafts/sw.json');
 const actual=guard.sourceInventory(),r=draft.validateDraft(real,actual);
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.ok(r.translated>=25,'material initial reviewed-language working draft');
 assert.ok(r.missing>0,'an incomplete pack cannot pass as a complete translation');
 assert.equal(r.readyForRuntime,false);
 assert.equal(r.humanReview,'NOT_TESTED');
 assert.equal(guard.resolve('sw').selectable,false);
});
