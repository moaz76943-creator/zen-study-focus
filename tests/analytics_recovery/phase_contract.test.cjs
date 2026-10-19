'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('../../android/app/src/main/assets/web/analytics_core_v21.js');
const recovery=require('../../android/app/src/main/assets/web/analytics_recovery_core.js');
const row={date:'2026-10-19',minutes:25,domain:'study'};
for(const [name,A] of Object.entries({core,recovery}))test(`DF-123 ${name} excludes actual timer rest phases and unfinished records without mutating history`,()=>{
 const history=[{...row,id:'work',mode:'focus',completed:true},...['short','long','short_break','long_break'].map(mode=>({...row,id:mode,mode})),
 {...row,id:'unfinished',completed:false},{...row,id:'paused',status:'paused'},
 {...row,id:'work',mode:'focus',completed:true}];
 const before=JSON.stringify(history),result=A.normalizeSessions(history);
 assert.equal(result.sessions.length,1);assert.equal(result.sessions[0].id,'work');
 assert.equal(JSON.stringify(history),before);
});
