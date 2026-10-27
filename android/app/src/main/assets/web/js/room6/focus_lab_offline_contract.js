/* Room6 U08 - Focus Lab offline contract checks.
 * Pure report builder: no writes, no network, no side effects.
 * Rendering helper uses createElement/textContent only (never innerHTML).
 */
(function (root) {
  'use strict';

  var ALLOWED_EXT = /\.(html|css|js|json|png|jpg|jpeg|svg|webp|gif|woff|woff2|ttf|mp3|wav|ogg)$/i;

  function isLocalAssetPath(path) {
    if (typeof path !== 'string' || path.trim() === '') {
      return { ok: false, reason: 'empty_path' };
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return { ok: false, reason: 'remote_or_protocol_url' };
    if (/^(?:https?:)?\/\//i.test(path)) return { ok: false, reason: 'remote_or_protocol_url' };
    var prefix = /^(?:\.\.\/)+/.exec(path);
    if (prefix && prefix[0].length > 3) return { ok: false, reason: 'parent_traversal' };
    if (path.charAt(0) === '/') return { ok: false, reason: 'root_absolute_url' };
    var clean = path.replace(/^\.\//, '');
    if (/\?|#/.test(clean)) return { ok: false, reason: 'query_or_fragment_not_allowed' };
    if (!ALLOWED_EXT.test(clean)) return { ok: false, reason: 'unknown_or_missing_extension' };
    return { ok: true, reason: 'local_asset' };
  }

  function checkAssetManifest(manifest) {
    if (!Array.isArray(manifest) || manifest.length === 0) {
      return [{ id: 'asset_manifest_non_empty', ok: false, reason: 'manifest_missing_or_empty' }];
    }
    var out = [];
    for (var i = 0; i < manifest.length; i++) {
      var v = isLocalAssetPath(manifest[i]);
      out.push({
        id: 'asset_manifest_entry',
        index: i,
        path: manifest[i],
        ok: v.ok,
        reason: v.reason
      });
    }
    return out;
  }

  var ATTR_LOCAL = /(?:^|\s)(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  var REMOTE_SCRIPT = /<script\b[^>]*\bsrc\s*=\s*["'](?:https?|ftp):\/\/[^"']*["']/i;
  var REMOTE_LINK = /<link\b[^>]*\bhref\s*=\s*["'](?:https?|ftp):\/\/[^"']*["']/i;
  var REMOTE_CSS_URL = /url\(\s*["']?\s*(?:(?:https?|ftp):\/\/)?\/\/[^"')]*["']?\s*\)/i;
  var FONT_FACE = /@font-face\b/i;

  function checkHtmlRemoteFree(html) {
    var out = [];
    if (typeof html !== 'string' || html.trim() === '') {
      return [{ id: 'html_remote_free', ok: false, reason: 'html_missing' }];
    }
    var hasRemoteScript = REMOTE_SCRIPT.test(html);
    out.push({
      id: 'no_remote_scripts',
      ok: !hasRemoteScript,
      reason: hasRemoteScript ? 'remote_script_tag_found' : 'no_remote_script_tags'
    });
    out.push({
      id: 'no_remote_stylesheets',
      ok: !REMOTE_LINK.test(html),
      reason: REMOTE_LINK.test(html) ? 'remote_link_tag_found' : 'no_remote_link_tags'
    });
    var offenders = [];
    ATTR_LOCAL.lastIndex = 0;
    var m;
    while ((m = ATTR_LOCAL.exec(html)) !== null) {
      var v = isLocalAssetPath(m[1]);
      if (!v.ok) offenders.push({ index: m.index, value: m[1], reason: v.reason });
    }
    out.push({
      id: 'all_src_href_local',
      ok: offenders.length === 0,
      reason: offenders.length ? 'remote_src_or_href_found' : 'all_src_href_local',
      offenders: offenders
    });
    out.push({
      id: 'no_font_face',
      ok: !FONT_FACE.test(html),
      reason: FONT_FACE.test(html) ? 'font_face_found_use_system_ui' : 'system_ui_fonts_only'
    });
    var hasRemoteCssUrl = REMOTE_CSS_URL.test(html);
    out.push({
      id: 'no_remote_css_urls',
      ok: !hasRemoteCssUrl,
      reason: hasRemoteCssUrl ? 'remote_url_in_css' : 'no_remote_css_urls'
    });
    return out;
  }

  var BREAKPOINTS = [320, 360, 393, 430];

  function extractMaxWidthBreakpoints(css) {
    var re = /max-width\s*:\s*(\d+)px/g;
    var found = [];
    var m;
    while ((m = re.exec(css)) !== null) found.push(parseInt(m[1], 10));
    return found;
  }

  function checkResponsiveCss(css) {
    var out = [];
    if (typeof css !== 'string' || css.trim() === '') {
      return [{ id: 'css_present', ok: false, reason: 'css_missing_or_empty' }];
    }
    out.push({ id: 'css_present', ok: true, reason: 'css_present' });

    var breakpoints = extractMaxWidthBreakpoints(css);
    for (var i = 0; i < BREAKPOINTS.length; i++) {
      var b = BREAKPOINTS[i];
      var exact = breakpoints.indexOf(b) !== -1;
      var margins = breakpoints.filter(function (x) { return Math.abs(x - b) <= 15; });
      out.push({
        id: 'responsive_breakpoint',
        breakpoint: b,
        ok: exact || margins.length > 0,
        reason: exact
          ? 'breakpoint_' + b + '_exact'
          : (margins.length > 0
            ? 'breakpoint_' + b + '_covered_near_' + margins.join('_')
            : 'breakpoint_' + b + '_missing')
      });
    }
    var floors = breakpoints.filter(function (x) { return x >= 300 && x <= 320; });
    out.push({
      id: 'small_screen_floor',
      ok: floors.length > 0,
      reason: floors.length > 0 ? 'small_screen_floor_present' : 'no_max_width_near_320'
    });
    out.push({
      id: 'max_width_ceiling_sane',
      ok: breakpoints.length === 0 || Math.max.apply(null, breakpoints) <= 530,
      reason: 'breakpoint_ceiling_within_desktop_range'
    });
    var fixedClip = /(?:body|html|main|\.app)\s*{[^}]{0,120}height\s*:\s*\d+px/.test(css);
    out.push({
      id: 'no_fixed_pixel_height_clipping',
      ok: !fixedClip,
      reason: fixedClip ? 'fixed_height_on_layout_root' : 'fluid_heights'
    });
    out.push({
      id: 'uses_fluid_units',
      ok: /(%|vh|vw|dvh|svh|minmax|auto)/.test(css),
      reason: 'fluid_units_used'
    });
    return out;
  }

  function checkStartupOrder(html) {
    var out = [];
    if (typeof html !== 'string' || html.trim() === '') {
      return [{ id: 'startup_order', ok: false, reason: 'html_missing' }];
    }
    var bodyOpen = html.search(/<body\b/i);
    var firstScript = html.search(/<script\b/i);
    var scriptsInsideBody = firstScript !== -1 && (bodyOpen === -1 || firstScript > bodyOpen);
    out.push({
      id: 'scripts_after_body_open',
      ok: scriptsInsideBody,
      reason: scriptsInsideBody ? 'scripts_inside_body' : 'script_before_body_open'
    });

    function posOf(re) {
      var m = html.match(re);
      return m ? html.indexOf(m[0]) : -1;
    }
    var domIdx = posOf(/focus_lab_dom\.js/);
    var ctrlIdx = posOf(/focus_lab_controller\.js|focus_lab_navigation\.js/);
    out.push({
      id: 'dom_before_controller',
      ok: domIdx !== -1 && ctrlIdx === -1 ? false : domIdx !== -1 && (ctrlIdx === -1 || domIdx < ctrlIdx),
      reason: ctrlIdx === -1
        ? 'controller_or_navigation_script_not_found'
        : (domIdx === -1
          ? 'dom_helper_script_not_added'
          : (domIdx < ctrlIdx ? 'order_ok' : 'order_wrong_dom_after_controller'))
    });

    var hasDocWrite = html.indexOf('document.write') !== -1;
    out.push({
      id: 'no_document_write',
      ok: !hasDocWrite,
      reason: hasDocWrite ? 'document_write_found' : 'clean_startup'
    });

    var inlineHandlers = html.match(/\son[a-z]+\s*=\s*["']/gi) || [];
    out.push({
      id: 'no_inline_event_handlers',
      ok: inlineHandlers.length === 0,
      reason: inlineHandlers.length ? 'inline_on_handlers_found' : 'delegated_listeners_only',
      count: inlineHandlers.length
    });
    return out;
  }

  var FIXTURES = {
    goodHtml: [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<link rel="stylesheet" href="../css/focus_lab.css">',
      '</head>',
      '<body>',
      '<main id="app"></main>',
      '<script src="focus_lab_dom.js"></script>',
      '<script src="focus_lab_controller.js"></script>',
      '</body>',
      '</html>'
    ].join('\n'),
    badHtml: [
      '<!DOCTYPE html>',
      '<html>',
      '<head><meta charset="utf-8">',
      '<link rel="stylesheet" href="https://cdn.example.com/x.css">',
      '</head>',
      '<body onload="start()">',
      '<main id="app"></main>',
      '<script src="https://cdn.example.com/lib.js"></script>',
      '<script src="styles.css"></script>',
      '<script>document.write("x");</script>',
      '<style>body{background:url(//cdn.example.com/pic.png)}</style>',
      '</body>',
      '</html>'
    ].join('\n'),
    goodCss: [
      'html,body{margin:0;font-family:system-ui,sans-serif;min-height:100svh;width:100%;}',
      '@media (max-width:320px){main{width:100%}}',
      '@media (max-width:360px){main{padding:8px}}',
      '@media (max-width:393px){main{padding:12px}}',
      '@media (max-width:430px){main{padding:16px}}'
    ].join('\n'),
    badCss: 'body{height:600px;font-size:150%}',
    badCssExpected: [
      'responsive_breakpoint',
      'small_screen_floor',
      'no_fixed_pixel_height_clipping'
    ],
    goodManifest: [
      '../css/focus_lab.css',
      'focus_lab_dom.js',
      'focus_lab_controller.js',
      './data/focus_plans.json'
    ],
    badManifest: [
      'https://cdn.example.com/lib.js',
      '../../escape.css',
      '/root/asset.css',
      '',
      'asset.txt'
    ]
  };

  function runAll(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var all = [].concat(
      checkAssetManifest(opts.manifest || []),
      checkHtmlRemoteFree(opts.html || ''),
      checkResponsiveCss(opts.css || ''),
      checkStartupOrder(opts.html || '')
    );
    var failures = [];
    for (var i = 0; i < all.length; i++) if (!all[i].ok) failures.push(all[i]);
    return { ok: failures.length === 0, failures: failures, checks: all };
  }

  /* Render a report container using textContent only; never innerHTML. */
  function renderReport(doc, container, report) {
    var frag = doc.createElement('div');
    var title = doc.createElement('h2');
    title.textContent = 'Focus Lab offline contract';
    frag.appendChild(title);
    var status = doc.createElement('pre');
    status.textContent = report && report.ok ? 'OK' : 'FAIL';
    frag.appendChild(status);
    var lines = doc.createElement('ul');
    if (report) {
      for (var i = 0; i < report.checks.length; i++) {
        var c = report.checks[i];
        var li = doc.createElement('li');
        li.textContent = c.id + ': ' + (c.ok ? 'pass' : 'fail') + ' (' + c.reason + ')';
        lines.appendChild(li);
      }
    }
    frag.appendChild(lines);
    return frag;
  }

  var api = {
    isLocalAssetPath: isLocalAssetPath,
    checkAssetManifest: checkAssetManifest,
    checkHtmlRemoteFree: checkHtmlRemoteFree,
    checkResponsiveCss: checkResponsiveCss,
    checkStartupOrder: checkStartupOrder,
    runAll: runAll,
    fixtures: FIXTURES,
    renderReport: renderReport
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root = root || (typeof window !== 'undefined' ? window : globalThis);
  root.FocusLabOfflineContract = api;
})(typeof window !== 'undefined' ? window : globalThis);
