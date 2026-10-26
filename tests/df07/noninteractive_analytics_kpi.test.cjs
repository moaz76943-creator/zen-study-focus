'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/index.html'),'utf8');
const js=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
test('both analytics summary KPI cards are readable but do not advertise dead click actions',()=>{
  const cards=[...html.matchAll(/<div\s+class="an-kpi-card"([^>]*)>/g)];
  assert.equal(cards.length,2,'Expected exactly two source KPI summary cards');
  for(const [,attributes] of cards){
    assert.doesNotMatch(attributes,/\bonclick\s*=/i,'Misleading informational toast must not be clickable');
    assert.doesNotMatch(attributes,/\brole\s*=\s*["']button/i);
    assert.doesNotMatch(attributes,/\btabindex\s*=/i);
  }
  const rule=html.match(/\.an-kpi-card\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule,'Missing KPI card style');
  assert.doesNotMatch(rule,/cursor\s*:\s*pointer/i,'Non-interactive KPI cards must not show pointer cursor');
});
test('existing KPI values and explanation remain accessible without fake interactions',()=>{
  for(const id of ['kpiTotalMins','kpiWeeklyTrend','kpiTotalSessions','kpiSessionTrend'])
    assert.match(html,new RegExp('\\bid="'+id+'"'),'Missing meaningful KPI content '+id);
  assert.match(js,/function\s+addQuickSessionRecord\(/,'Do not remove shared JavaScript function without reviewing other handlers');
});
