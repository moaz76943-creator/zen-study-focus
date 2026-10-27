'use strict';

/**
 * Deep Focus Room6 Q06 — offline_dependencies
 * Read-only, fully offline static audit of Focus Lab pages and their supporting
 * module sources for: remote fonts, CDN resources, trackers, runtime network
 * calls and mutable/dangerous third-party dependencies (unpinned CDN URLs and
 * package.json version ranges). Never writes to disk, never touches the
 * network; every finding is a plain data object meant to be rendered by
 * callers with textContent only.
 */

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_WEB = 'android/app/src/main/assets/web';
const DEFAULT_FOCUS_LAB = DEFAULT_WEB + '/focus_lab.html';
const FOCUS_LAB_PATTERN = /focus[\s_-]?lab/i;

const CATEGORIES = Object.freeze({
  REMOTE_FONT: 'remote-font',
  CDN_RESOURCE: 'cdn-resource',
  TRACKING: 'tracking',
  NETWORK_CALL: 'network-call',
  MUTABLE_DEPENDENCY: 'mutable-dependency',
  MISSING_INTEGRITY: 'missing-integrity',
  REMOTE_REFERENCE: 'remote-reference',
  UNPARSABLE_PACKAGE_JSON: 'unparsable-package-json'
});

const SEVERITIES = Object.freeze({ ERROR: 'error', WARN: 'warn', INFO: 'info' });

const RESOURCE_TAGS = new Set(['script', 'link', 'img', 'iframe', 'source', 'video', 'audio', 'embed', 'track']);

const FONT_HOSTS = /(?:^|\.)(?:fonts\.googleapis\.com|fonts\.gstatic\.com|typekit\.com|use\.typekit\.net|fonts\.adobe\.com)$/i;
const TRACKER_HOSTS = /(?:^|\.)(?:google-analytics\.com|googletagmanager\.com|googlesyndication\.com|doubleclick\.net|facebook\.net|facebook\.com|mixpanel\.com|segment\.io|segment\.com|sentry\.io|amplitude\.com|hotjar\.com|clarity\.ms|plausible\.io|mc\.yandex\.ru|hm\.baidu\.com|branch\.io|appsflyer\.com|newrelic\.com)$/i;
const CDN_HOSTS = /(?:^|\.)(?:jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|rawgit\.com|rawgithubusercontent\.com|code\.jquery\.com|cdn\.staticfile\.org|stats\.wp\.com|jsdelivr\.net)$/i;

const TRACKER_FUNCTIONS = /\b(?:gtag\s*\(|fbq\s*\(|googletagmanager|google-analytics|dataLayer\s*\.|mixpanel\s*\.|amplitude\s*\.|_hmt\s*\.|analytics\s*\()/;
const TRACKER_MEMBERS = /\b(?:sentry|mixpanel|amplitude|plausible|umami|matomo|piwik|hotjar|posthog|clearbit)\b/i;

const NETWORK_CALLS = [
  { kind: 'fetch-call', pattern: /\bfetch\s*\(/ },
  { kind: 'xhr', pattern: /\bXMLHttpRequest\b/ },
  { kind: 'websocket', pattern: /\bWebSocket\b/ },
  { kind: 'eventsource', pattern: /\bEventSource\b/ },
  { kind: 'beacon', pattern: /navigator\s*\.\s*sendBeacon\b/ },
  { kind: 'remote-import', pattern: /\bimport\s*\(\s*["'`]https?:/i }
];

const PROVENANCE_KEYS = /^(?:sourceUrl|sourceURL|source_url|licenseUrl|license|homepage|projectUrl|repository|repo|attribution|source|credit|credits|origin|upstream)$/i;
const URL_LITERAL = /https?:\/\/[^\s"'`<>)\\]+/gi;
const CALL_SITE_HINTS = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|import)\b/;

const EXACT_SEMVER = /^\d+\.\d+\.\d+(?:[-+][\w.\-]+)?$/;
const FULL_SEMVER_IN_URL = /@(?:v)?\d+\.\d+\.\d+(?:[-+][\w.\-]+)?/;

function lineAt(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index && cursor < text.length; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function makeFinding(scope) {
  return Object.freeze({
    severity: scope.severity || SEVERITIES.ERROR,
    category: scope.category,
    kind: scope.kind,
    path: scope.path,
    line: scope.line,
    evidence: String(scope.evidence || '').slice(0, 160),
    message: scope.message || null
  });
}

function isExternalUrl(value) {
  if (typeof value !== 'string') return false;
  return /^https?:\/\//i.test(value) || /^\/\//.test(value) && !/^\/\/[/?]/.test(value);
}

function urlHost(url) {
  const match = String(url).match(/^(?:https?:\/\/|\/\/)([^/?#\s"'`]+)/i);
  return match ? match[1].split('@').pop().split(':')[0].toLowerCase() : '';
}

function attributeValue(attributes, name) {
  const pattern = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+))', 'i');
  const match = attributes.match(pattern);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? '';
}

function analyzeCdnUrl(url) {
  const host = urlHost(url);
  if (!host || !CDN_HOSTS.test('.' + host)) return { host, mutable: false, pinned: true };
  if (/@(?:latest|\^|~|\*)/i.test(url)) return { host, mutable: true, pinned: false };
  const pinned = FULL_SEMVER_IN_URL.test(url);
  return { host, mutable: !pinned, pinned };
}

function scanHtml(text, filePath, results) {
  for (const match of text.matchAll(/<([a-zA-Z][\w:-]*)\b([^>]*)>/g)) {
    const tag = match[1].toLowerCase();
    if (tag === 'style') continue;
    const attributes = match[2] || '';
    const rawUrl = attributeValue(attributes, 'src')
      || attributeValue(attributes, 'href')
      || attributeValue(attributes, 'srcset');
    if (!isExternalUrl(rawUrl)) continue;
    const host = urlHost(rawUrl);
    const line = lineAt(text, match.index);
    const lineText = (text.split('\n')[line - 1] || '').slice(0, 160);
    if (FONT_HOSTS.test(host)) {
      results.push(makeFinding({
        category: CATEGORIES.REMOTE_FONT, kind: 'font-host-stylesheet',
        path: filePath, line, evidence: lineText,
        message: 'External font host would fetch remotely at runtime; offline lock needs local assets'
      }));
    } else if (TRACKER_HOSTS.test(host)) {
      results.push(makeFinding({
        category: CATEGORIES.TRACKING, kind: 'tracker-host',
        path: filePath, line, evidence: lineText,
        message: 'Resource served by a known tracking/ad host'
      }));
    } else {
      results.push(makeFinding({
        category: CATEGORIES.CDN_RESOURCE,
        kind: tag === 'script' ? 'script-tag' : (tag === 'link' ? 'stylesheet-tag' : 'asset-tag'),
        severity: tag === 'script' || tag === 'iframe' ? SEVERITIES.ERROR : SEVERITIES.WARN,
        path: filePath, line, evidence: lineText,
        message: 'Resource loaded from a remote origin; classified as a dangerous dependency unless pinned and integrity-protected'
      }));
    }
    if (CDN_HOSTS.test(host) && analyzeCdnUrl(rawUrl).mutable) {
      results.push(makeFinding({
        category: CATEGORIES.MUTABLE_DEPENDENCY, kind: 'unpinned-cdn',
        path: filePath, line, evidence: lineText,
        message: 'CDN URL is not pinned to an exact semver version; its content can change silently'
      }));
    }
    if (tag === 'script' || tag === 'link') {
      const rel = attributeValue(attributes, 'rel') || '';
      const integrity = attributeValue(attributes, 'integrity');
      if (!integrity && (tag === 'script' || /stylesheet|preload|preconnect/i.test(rel))) {
        results.push(makeFinding({
          category: CATEGORIES.MISSING_INTEGRITY, kind: tag === 'script' ? 'script-tag' : 'stylesheet-tag',
          severity: tag === 'script' ? SEVERITIES.ERROR : SEVERITIES.WARN,
          path: filePath, line, evidence: lineText,
          message: 'External ' + tag + ' lacks a subresource integrity attribute'
        }));
      }
    }
  }
  return results;
}

function scanCss(text, filePath, results) {
  const fontFaceSpans = [];
  const importSpans = [];
  for (const block of text.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    fontFaceSpans.push([block.index, block.index + block[0].length]);
    for (const urlMatch of block[0].matchAll(/url\s*\(\s*["'`]?([^)\"'`]+)["'`]?\s*\)/gi)) {
      if (!isExternalUrl(urlMatch[1])) continue;
      results.push(makeFinding({
        category: CATEGORIES.REMOTE_FONT, kind: 'css-font-face-remote',
        path: filePath, line: lineAt(text, block.index + urlMatch.index),
        evidence: block[0].slice(0, 160),
        message: '@font-face declares a remote font source; the offline app must bundle the font asset'
      }));
    }
  }
  for (const match of text.matchAll(/@import\s+(?:url\s*\(\s*["'`]?([^)\"'`]+)["'`]?\s*\)|["']([^"']+)["'])/gi)) {
    importSpans.push([match.index, match.index + match[0].length]);
    const target = match[1] || match[2];
    if (!isExternalUrl(target)) continue;
    results.push(makeFinding({
      category: CATEGORIES.CDN_RESOURCE, kind: 'css-import',
      path: filePath, line: lineAt(text, match.index),
      evidence: match[0].slice(0, 160),
      message: 'External stylesheet import resolves a remote dependency at parse time'
    }));
    if (CDN_HOSTS.test('.' + urlHost(target)) && analyzeCdnUrl(target).mutable) {
      results.push(makeFinding({
        category: CATEGORIES.MUTABLE_DEPENDENCY, kind: 'unpinned-cdn',
        path: filePath, line: lineAt(text, match.index), evidence: match[0].slice(0, 160),
        message: 'CDN stylesheet URL is not pinned to an exact semver version'
      }));
    }
  }
  for (const match of text.matchAll(/url\s*\(\s*["'`]?[^)\"'`]+["'`]?\s*\)/gi)) {
    if (!isExternalUrl(String(match[0]).replace(/^url\s*\(\s*["'`]?/i, '').replace(/["'`]?\s*\)$/i, ''))) continue;
    const insideFontFace = fontFaceSpans.some((span) => match.index >= span[0] && match.index < span[1]);
    const insideImport = importSpans.some((span) => match.index >= span[0] && match.index < span[1]);
    if (insideFontFace || insideImport) continue;
    results.push(makeFinding({
      category: CATEGORIES.CDN_RESOURCE, kind: 'css-asset', severity: SEVERITIES.WARN,
      path: filePath, line: lineAt(text, match.index),
      evidence: (text.split('\n')[lineAt(text, match.index) - 1] || match[0]).slice(0, 160),
      message: 'CSS asset references a remote origin'
    }));
  }
  return results;
}

function scanJs(text, filePath, results) {
  const allLines = text.split('\n');
  for (let index = 0; index < allLines.length; index += 1) {
    const line = allLines[index];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    const lineNumber = index + 1;
    for (const call of NETWORK_CALLS) {
      if (!call.pattern.test(line)) continue;
      results.push(makeFinding({
        category: CATEGORIES.NETWORK_CALL, kind: call.kind,
        path: filePath, line: lineNumber, evidence: line.slice(0, 160),
        message: 'Runtime network API in shipped source; Focus Lab must stay fully offline'
      }));
    }
    if (TRACKER_FUNCTIONS.test(line) || TRACKER_MEMBERS.test(line)) {
      results.push(makeFinding({
        category: CATEGORIES.TRACKING, kind: 'tracker-function',
        path: filePath, line: lineNumber, evidence: line.slice(0, 160),
        message: 'Tracking or telemetry API referenced in shipped source'
      }));
    }
    const sinkMatch = !/^["'`]/.test(trimmed) && line.match(/(?:\.|\b)(?:src|href)\s*=\s*["'`]?(https?:\/\/[^\s"'`]+)/i);
    let sinkHandled = false;
    if (sinkMatch) {
      const host = urlHost(sinkMatch[1]);
      if (FONT_HOSTS.test(host)) {
        results.push(makeFinding({
          category: CATEGORIES.REMOTE_FONT, kind: 'font-host-stylesheet',
          path: filePath, line: lineNumber, evidence: line.slice(0, 160),
          message: 'Font host URL assigned to a load sink at runtime'
        }));
        sinkHandled = true;
      } else if (TRACKER_HOSTS.test(host)) {
        results.push(makeFinding({
          category: CATEGORIES.TRACKING, kind: 'tracker-host',
          path: filePath, line: lineNumber, evidence: line.slice(0, 160),
          message: 'Tracking/ad host URL assigned to a load sink at runtime'
        }));
        sinkHandled = true;
      } else {
        results.push(makeFinding({
          category: CATEGORIES.CDN_RESOURCE, kind: 'script-tag',
          path: filePath, line: lineNumber, evidence: line.slice(0, 160),
          message: 'Remote origin URL assigned to a resource-load sink (script/img/link) at runtime'
        }));
        sinkHandled = true;
      }
      if (CDN_HOSTS.test('.' + host) && analyzeCdnUrl(sinkMatch[1]).mutable) {
        results.push(makeFinding({
          category: CATEGORIES.MUTABLE_DEPENDENCY, kind: 'unpinned-cdn',
          path: filePath, line: lineNumber, evidence: line.slice(0, 160),
          message: 'Runtime CDN sink target is not pinned to an exact semver version'
        }));
      }
    }
    if (CALL_SITE_HINTS.test(line) || sinkHandled) continue;
    const propertyMatch = line.match(/([A-Za-z_$][\w$]*)\s*:\s*(?:["'`]?)\s*https?:\/\//i);
    const provenance = propertyMatch && PROVENANCE_KEYS.test(propertyMatch[1]);
    for (const urlMatch of line.matchAll(URL_LITERAL)) {
      results.push(makeFinding({
        category: CATEGORIES.REMOTE_REFERENCE,
        kind: provenance ? 'provenance-metadata' : 'literal-url',
        severity: SEVERITIES.INFO,
        path: filePath, line: lineNumber, evidence: line.slice(0, 160),
        message: provenance
          ? 'Provenance/attribution metadata URL; informational only'
          : 'Literal remote URL in source; not invoked on this line but kept under review'
      }));
    }
  }
  return results;
}

function scanPackageJson(text, filePath, results) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    results.push(makeFinding({
      category: CATEGORIES.UNPARSABLE_PACKAGE_JSON, kind: 'invalid-json', severity: SEVERITIES.WARN,
      path: filePath, line: 1,
      evidence: String(error && error.message).slice(0, 160),
      message: 'package.json unparsable; dependency mutability not measurable for that section'
    }));
    return results;
  }
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    const deps = parsed && parsed[section];
    if (!deps || typeof deps !== 'object') continue;
    const sectionIndex = text.indexOf('"' + section + '"');
    for (const name of Object.keys(deps)) {
      const version = String(deps[name] || '');
      const mutable = !EXACT_SEMVER.test(version)
        || /^[~^]/.test(version)
        || /(?:^|[\s,])(?:>|<)[=]?\s*\d/.test(version)
        || version.indexOf('*') !== -1
        || /^latest$/i.test(version)
        || /^(?:git[+@]|github:|gitlab:|bitbucket:|https?:|\/\/)/i.test(version);
      if (!mutable) continue;
      const depRegex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*"[^"]*"');
      const depMatch = text.slice(sectionIndex < 0 ? 0 : sectionIndex).match(depRegex);
      const line = depMatch ? lineAt(text, sectionIndex + depMatch.index) : 1;
      const lineText = depMatch ? (text.split('\n')[line - 1] || '').slice(0, 160) : version;
      results.push(makeFinding({
        category: CATEGORIES.MUTABLE_DEPENDENCY, kind: 'package-range',
        path: filePath, line, evidence: lineText,
        message: 'Mutable dependency version "' + version + '" can silently resolve to new third-party code'
      }));
    }
  }
  return results;
}

function scanText(text, extension, filePath) {
  const normalized = String(extension || '').replace(/^\./, '').toLowerCase();
  const results = [];
  if (normalized === 'html' || normalized === 'htm') {
    scanHtml(text, filePath, results);
    scanCss(text, filePath, results);
    const scriptParts = [];
    for (const block of text.matchAll(/<script((?:\s[^>]*)?)>([\s\S]*?)<\/script\s*>/gi)) {
      if (attributeValue(block[1] || '', 'src')) continue;
      const pad = '\n'.repeat(text.slice(0, block.index).split('\n').length - 1);
      scriptParts.push(pad + block[2]);
    }
    if (scriptParts.length) scanJs(scriptParts.join('\n'), filePath, results);
  } else if (normalized === 'css') {
    scanCss(text, filePath, results);
  } else if (normalized === 'js' || normalized === 'mjs' || normalized === 'cjs') {
    scanJs(text, filePath, results);
  } else if (normalized === 'json' && /(?:^|[/\\])package\.json$/i.test(filePath)) {
    scanPackageJson(text, filePath, results);
  }
  const seen = new Set();
  const deduped = [];
  for (const finding of results) {
    const key = finding.category + '\u0000' + finding.line + '\u0000' + finding.kind + '\u0000' + finding.evidence;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(finding);
  }
  return deduped;
}

function listCorpusFiles(root) {
  const webRootAbsolute = path.resolve(root, DEFAULT_WEB);
  const webRootExists = fs.existsSync(webRootAbsolute);
  const corpus = [];
  const walk = (absolute, relative) => {
    let entries;
    try {
      entries = fs.readdirSync(absolute, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return;
      throw error;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const childAbsolute = path.join(absolute, entry.name);
      const childRelative = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isDirectory()) {
        walk(childAbsolute, childRelative);
      } else if (/\.(?:html?|css|cjs|mjs|js|json)$/i.test(entry.name)) {
        const lower = childRelative.toLowerCase();
        const focusLab = FOCUS_LAB_PATTERN.test(lower);
        const room6Module = /^js\/room6\/[\w.\-]+\.js$/.test(lower);
        if (focusLab || room6Module) {
          corpus.push({
            path: DEFAULT_WEB + '/' + childRelative,
            absolutePath: childAbsolute,
            role: focusLab
              ? (lower.endsWith('.html') ? 'focus-lab-page' : 'focus-lab-asset')
              : 'room6-module',
            focusLab
          });
        }
      }
    }
  };
  walk(webRootAbsolute, '');
  // Follow locally loaded assets, including filenames outside the Room6 naming
  // convention. Resolve within the web root; do not follow symlinks or escapes.
  const known = new Set(corpus.map(entry => entry.path));
  for (let i = 0; i < corpus.length; i += 1) {
    const entry = corpus[i];
    let text;
    try { text = fs.readFileSync(entry.absolutePath, 'utf8'); } catch { continue; }
    const refs = [];
    if (/\.html?$/i.test(entry.path)) {
      for (const tag of text.matchAll(/<(script|link)\s([^>]*)>/gi)) {
        const ref = attributeValue(tag[2], tag[1].toLowerCase() === 'script' ? 'src' : 'href');
        if (ref) refs.push(ref);
      }
    }
    if (/\.(?:html?|css)$/i.test(entry.path)) {
      for (const match of text.matchAll(/@import\s+(?:url\(\s*["']?([^"')]+)["']?\s*\)|["']([^"']+)["'])/gi)) {
        refs.push(match[1] || match[2]);
      }
    }
    for (const ref of refs) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue;
      const absolutePath = path.resolve(path.dirname(entry.absolutePath), ref.split(/[?#]/)[0]);
      if (!absolutePath.startsWith(webRootAbsolute + path.sep)) continue;
      const relativePath = path.relative(path.resolve(root), absolutePath).split(path.sep).join('/');
      if (known.has(relativePath) || !/\.(?:js|mjs|cjs|css)$/i.test(absolutePath)) continue;
      try {
        if (!fs.lstatSync(absolutePath).isFile() || !fs.realpathSync(absolutePath).startsWith(fs.realpathSync(webRootAbsolute) + path.sep)) continue;
      } catch { continue; }
      known.add(relativePath);
      corpus.push({ path: relativePath, absolutePath, role: 'local-dependency', focusLab: false });
    }
  }
  const packageJson = 'package.json';
  if (fs.existsSync(path.resolve(root, packageJson))) {
    corpus.push({ path: packageJson, absolutePath: path.resolve(root, packageJson), role: 'dependency-manifest', focusLab: false });
  }
  return { webRoot: DEFAULT_WEB, webRootExists, corpus };
}

function auditRepository(dataSource) {
  const root = dataSource === undefined ? DEFAULT_ROOT : String(dataSource || '.');
  const { webRoot, webRootExists, corpus } = listCorpusFiles(root);
  const findings = [];
  const notTested = [];
  const scanned = [];
  let focusLabPage = null;
  for (const entry of corpus) {
    let text;
    try {
      text = fs.readFileSync(entry.absolutePath, 'utf8');
    } catch (error) {
      notTested.push({ path: entry.path, reason: 'unreadable: ' + (error && error.code) });
      continue;
    }
    scanned.push({ path: entry.path, role: entry.role, focusLab: entry.focusLab, bytes: Buffer.byteLength(text, 'utf8') });
    for (const finding of scanText(text, path.extname(entry.path), entry.path)) {
      findings.push(Object.assign({}, finding, { path: entry.path }));
    }
    if (entry.role === 'focus-lab-page') focusLabPage = entry.path;
  }
  if (!corpus.some((entry) => entry.role === 'focus-lab-page')) {
    notTested.push({
      path: DEFAULT_FOCUS_LAB,
      reason: 'Focus Lab page absent from this checkout; page-level offline dependency checks NOT_TESTED'
    });
  }
  if (!webRootExists) {
    notTested.push({ path: webRoot, reason: 'Web asset tree absent; corpus discovery scope reduced' });
  }
  notTested.push({
    path: 'runtime',
    reason: 'Static source audit only: runtime font loading, WebView fetches and service-worker behavior NOT_TESTED without emulator and network capture'
  });
  const summary = { total: findings.length, bySeverity: {}, byCategory: {} };
  for (const finding of findings) {
    summary.bySeverity[finding.severity] = (summary.bySeverity[finding.severity] || 0) + 1;
    summary.byCategory[finding.category] = (summary.byCategory[finding.category] || 0) + 1;
  }
  const verdict = summary.bySeverity.error || summary.bySeverity.warn ? 'findings' : 'clean';
  return { schemaVersion: SCHEMA_VERSION, root: path.resolve(root), focusLabPage, scanned, findings, summary, verdict, notTested };
}

module.exports = {
  SCHEMA_VERSION,
  DEFAULT_ROOT,
  DEFAULT_WEB,
  DEFAULT_FOCUS_LAB,
  FOCUS_LAB_PATTERN,
  CATEGORIES,
  SEVERITIES,
  lineAt,
  isExternalUrl,
  urlHost,
  attributeValue,
  analyzeCdnUrl,
  scanText,
  listCorpusFiles,
  auditRepository
};
