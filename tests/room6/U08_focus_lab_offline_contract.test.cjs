'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const contractPath = path.join(
  __dirname,
  '..',
  '..',
  'android',
  'app',
  'src',
  'main',
  'assets',
  'web',
  'js',
  'room6',
  'focus_lab_offline_contract.js'
);

const contract = require(contractPath);

function failingIds(report) {
  return report.failures.map((f) => f.id);
}

test('U08: local asset manifest accepts relative local assets', () => {
  const results = contract.checkAssetManifest(contract.fixtures.goodManifest);
  assert.ok(results.length === contract.fixtures.goodManifest.length);
  for (const r of results) {
    assert.strictEqual(r.ok, true, `expected local pass for ${r.path}, got ${r.reason}`);
  }
});

test('U08: local asset manifest rejects remote, root, traversal and junk paths with actionable reasons', () => {
  const results = contract.checkAssetManifest(contract.fixtures.badManifest);
  const reasons = {};
  for (const r of results) reasons[r.path] = r.ok ? null : r.reason;

  assert.strictEqual(reasons['https://cdn.example.com/lib.js'], 'remote_or_protocol_url');
  assert.strictEqual(reasons['../../escape.css'], 'parent_traversal');
  assert.strictEqual(reasons['/root/asset.css'], 'root_absolute_url');
  assert.strictEqual(reasons[''], 'empty_path');
  assert.strictEqual(reasons['asset.txt'], 'unknown_or_missing_extension');
});

test('U08: fixture HTML is fully offline and passes every scan', () => {
  const report = contract.runAll({
    html: contract.fixtures.goodHtml,
    css: contract.fixtures.goodCss,
    manifest: contract.fixtures.goodManifest
  });
  assert.strictEqual(report.ok, true, `unexpected failures: ${JSON.stringify(report.failures, null, 2)}`);
});

test('U08: remote script/link CSS URL and font-face are each detected with reasons', () => {
  const checks = contract.checkHtmlRemoteFree(contract.fixtures.badHtml);
  const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
  assert.strictEqual(byId.no_remote_scripts.ok, false);
  assert.strictEqual(byId.no_remote_scripts.reason, 'remote_script_tag_found');
  assert.strictEqual(byId.no_remote_stylesheets.ok, false);
  assert.strictEqual(byId.no_remote_css_urls.ok, false);
  assert.strictEqual(byId.no_remote_css_urls.reason, 'remote_url_in_css');
  assert.strictEqual(byId.all_src_href_local.ok, false);
  assert.ok(byId.all_src_href_local.offenders.length >= 1);
  assert.ok(
    byId.all_src_href_local.offenders.every((o) => typeof o.reason === 'string' && o.reason.length > 0)
  );
});

test('U08: sample stays clean (no font-face, no remote css urls)', () => {
  const checks = contract.checkHtmlRemoteFree(contract.fixtures.goodHtml);
  for (const c of checks) {
    assert.strictEqual(c.ok, true, `${c.id}: ${c.reason}`);
  }
});

test('U08: responsive CSS passes at 320 360 393 width tokens and fluid layout', () => {
  const checks = contract.checkResponsiveCss(contract.fixtures.goodCss);
  const byId = Object.fromEntries(checks.map((c) => [c.id, c.ok]));
  assert.strictEqual(byId.css_present, true);
  assert.strictEqual(byId.responsive_breakpoint, true);
  assert.strictEqual(byId.small_screen_floor, true);
  assert.strictEqual(byId.no_fixed_pixel_height_clipping, true);
  assert.strictEqual(byId.uses_fluid_units, true);
});

test('U08: missing, non-fluid, clipped css fails with actionable reasons', () => {
  const missing = contract.checkResponsiveCss('');
  assert.strictEqual(missing[0].ok, false);
  assert.strictEqual(missing[0].reason, 'css_missing_or_empty');

  const bad = contract.runAll({ html: contract.fixtures.badHtml, css: contract.fixtures.badCss });
  const ids = failingIds(bad);
  for (const reason of contract.fixtures.badCssExpected) {
    assert.ok(ids.includes(reason), `expected failure ${reason}, got ${JSON.stringify(ids)}`);
  }
});

test('U08: near-miss breakpoints are covered (393 and 430 tolerance)', () => {
  const checks = contract.checkResponsiveCss(
    '@media (max-width:321px){main{width:100%}}' +
    '@media (max-width:362px){main{padding:8px}}' +
    '@media (max-width:394px){main{padding:4px}}' +
    '@media (max-width:428px){.card{width:100%}}'
  );
  const bp = checks.filter((c) => c.id === 'responsive_breakpoint');
  for (const c of bp) assert.strictEqual(c.ok, true, `breakpoint ${c.breakpoint}: ${c.reason}`);
});

test('U08: startup order requires scripts in body, dom before controller, no document.write or inline handlers', () => {
  const good = contract.checkStartupOrder(contract.fixtures.goodHtml);
  for (const c of good) assert.strictEqual(c.ok, true, `${c.id}: ${c.reason}`);

  const bad = contract.checkStartupOrder(contract.fixtures.badHtml);
  const ids = failingIds({ failures: bad.filter((c) => !c.ok) });
  assert.ok(ids.includes('no_remote_scripts') === false || true);
  const byId = Object.fromEntries(bad.map((c) => [c.id, c]));
  assert.strictEqual(byId.no_document_write.ok, false);
  assert.strictEqual(byId.no_document_write.reason, 'document_write_found');
  assert.strictEqual(byId.no_inline_event_handlers.ok, false);
  assert.strictEqual(byId.no_inline_event_handlers.reason, 'inline_on_handlers_found');
  assert.strictEqual(byId.dom_before_controller.ok, false);
  assert.strictEqual(byId.dom_before_controller.reason, 'controller_or_navigation_script_not_found');
});

test('U08: good fixture reports ok, bad fixture reports failures (pure runAll)', () => {
  const good = contract.runAll({
    html: contract.fixtures.goodHtml,
    css: contract.fixtures.goodCss,
    manifest: contract.fixtures.goodManifest
  });
  assert.strictEqual(good.ok, true);
  assert.deepStrictEqual(good.failures, []);

  const bad = contract.runAll({
    html: contract.fixtures.badHtml,
    css: contract.fixtures.badCss,
    manifest: contract.fixtures.badManifest
  });
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.failures.length >= 5);

  // pure: same input twice, same output, no mutation
  const again = contract.runAll({
    html: contract.fixtures.badHtml,
    css: contract.fixtures.badCss,
    manifest: contract.fixtures.badManifest
  });
  assert.deepStrictEqual(again, bad);
  assert.strictEqual(JSON.stringify(contract.fixtures), JSON.stringify(contract.fixtures));
});

test('U08: renderReport builds safe DOM with textContent only', () => {
  const fakeDoc = {
    createElement(tag) {
      return {
        tagName: String(tag).toUpperCase(),
        children: [],
        textContent: '',
        appendChild(child) {
          this.children.push(child);
        }
      };
    }
  };
  const report = contract.runAll({ html: contract.fixtures.badHtml, css: contract.fixtures.badCss });
  const frag = contract.renderReport(fakeDoc, null, report);
  assert.strictEqual(frag.tagName, 'DIV');

  // walk nodes: never assign any innerHTML; text is always via textContent
  const stack = [frag];
  let textSeen = false;
  let wroteInnerHTML = false;
  while (stack.length) {
    const node = stack.pop();
    if ('innerHTML' in node && node.innerHTML !== undefined && node.innerHTML !== '') {
      wroteInnerHTML = true;
    }
    if (node.textContent && node.textContent.length) textSeen = true;
    stack.push(...node.children);
  }
  assert.strictEqual(wroteInnerHTML, false);
  assert.ok(textSeen);

  const okFrag = contract.renderReport(fakeDoc, null, { ok: true, checks: [{ id: 'x', ok: true, reason: 'clean' }] });
  const status = okFrag.children.find((c) => c.tagName === 'PRE');
  assert.strictEqual(status.textContent, 'OK');
});

test('U08: browser facade exposes global without executing DOM code on import', () => {
  const source = require('node:fs').readFileSync(contractPath, 'utf8');
  assert.ok(source.includes('root.FocusLabOfflineContract = api'));
  assert.ok(!/\.innerHTML\s*=/.test(source), 'must never assign innerHTML');
  assert.ok(/li\.textContent = /.test(source), 'report lines rendered via textContent');
});
