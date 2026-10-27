export const VERSION = 1;
export const POLICY_VERSION = 1;

export const VERDICTS = Object.freeze({
  APPROVED: 'approved',
  REVIEW_REQUIRED: 'review_required',
  BLOCKED: 'blocked'
});

const PUBLIC_DOMAIN_FLAGS = Object.freeze({
  redistributionAllowed: true,
  commercialRedistribution: true,
  attributionRequired: false,
  shareAlikeRequired: false,
  derivativesAllowed: true
});

const FAMILY_FLAGS = Object.freeze({
  'public-domain': PUBLIC_DOMAIN_FLAGS,
  attribution: Object.freeze({
    redistributionAllowed: true,
    commercialRedistribution: true,
    attributionRequired: true,
    shareAlikeRequired: false,
    derivativesAllowed: true
  }),
  'attribution-share-alike': Object.freeze({
    redistributionAllowed: true,
    commercialRedistribution: true,
    attributionRequired: true,
    shareAlikeRequired: true,
    derivativesAllowed: true
  }),
  'noncommercial-attribution': Object.freeze({
    redistributionAllowed: true,
    commercialRedistribution: false,
    attributionRequired: true,
    shareAlikeRequired: false,
    derivativesAllowed: true
  }),
  'noncommercial-share-alike': Object.freeze({
    redistributionAllowed: true,
    commercialRedistribution: false,
    attributionRequired: true,
    shareAlikeRequired: true,
    derivativesAllowed: true
  }),
  'attribution-no-derivatives': Object.freeze({
    redistributionAllowed: true,
    commercialRedistribution: true,
    attributionRequired: true,
    shareAlikeRequired: false,
    derivativesAllowed: false
  }),
  'noncommercial-no-derivatives': Object.freeze({
    redistributionAllowed: true,
    commercialRedistribution: false,
    attributionRequired: true,
    shareAlikeRequired: false,
    derivativesAllowed: false
  }),
  proprietary: Object.freeze({
    redistributionAllowed: false,
    commercialRedistribution: false,
    attributionRequired: false,
    shareAlikeRequired: false,
    derivativesAllowed: false
  }),
  unknown: Object.freeze({
    redistributionAllowed: false,
    commercialRedistribution: false,
    attributionRequired: false,
    shareAlikeRequired: false,
    derivativesAllowed: false
  })
});

function policy(id, known, family) {
  const flags = FAMILY_FLAGS[family] || FAMILY_FLAGS.unknown;
  return Object.freeze({
    id,
    known,
    family,
    redistributionAllowed: flags.redistributionAllowed,
    commercialRedistribution: flags.commercialRedistribution,
    attributionRequired: flags.attributionRequired,
    shareAlikeRequired: flags.shareAlikeRequired,
    derivativesAllowed: flags.derivativesAllowed
  });
}

export const LICENSES = Object.freeze({
  'CC0-1.0': policy('CC0-1.0', true, 'public-domain'),
  'PUBLIC-DOMAIN': policy('PUBLIC-DOMAIN', true, 'public-domain'),
  'CC-BY-4.0': policy('CC-BY-4.0', true, 'attribution'),
  'CC-BY-SA-4.0': policy('CC-BY-SA-4.0', true, 'attribution-share-alike'),
  'CC-BY-NC-4.0': policy('CC-BY-NC-4.0', true, 'noncommercial-attribution'),
  'CC-BY-NC-SA-4.0': policy('CC-BY-NC-SA-4.0', true, 'noncommercial-share-alike'),
  'CC-BY-ND-4.0': policy('CC-BY-ND-4.0', true, 'attribution-no-derivatives'),
  'CC-BY-NC-ND-4.0': policy('CC-BY-NC-ND-4.0', true, 'noncommercial-no-derivatives'),
  'ALL-RIGHTS-RESERVED': policy('ALL-RIGHTS-RESERVED', true, 'proprietary')
});

const LICENSE_KEYS = Object.freeze(['license', 'licence']);
const AUTHOR_KEYS = Object.freeze(['author', 'creator', 'artist', 'rights_holder']);
const SOURCE_KEYS = Object.freeze([
  'source',
  'source_id',
  'source_url',
  'source_download_url',
  'origin'
]);
const EVIDENCE_KEYS = Object.freeze([
  'license_evidence',
  'licence_evidence',
  'license_url',
  'rights_url',
  'rights_evidence'
]);
const DIGEST_KEYS = Object.freeze([
  'source_sha256',
  'sha256',
  'file_sha256',
  'released_sha256'
]);
const PATH_KEYS = Object.freeze(['path', 'file', 'filename']);
const STATUS_KEYS = Object.freeze(['status', 'approval_status', 'review_status']);
const ID_KEYS = Object.freeze(['id', 'asset_id']);

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalizeLicense(value) {
  let text = value.trim().toUpperCase().replace(/[_\s]+/g, '-').replace(/-+/g, '-');
  if (!text) return null;
  if (/^CC-?ZERO(?:-?1(?:\.0)?)?$/.test(text)) return 'CC0-1.0';
  if (/^CC-?0(?:-?1(?:\.0)?)?$/.test(text)) return 'CC0-1.0';
  if (text === 'PUBLICDOMAIN' || text === 'PUBLIC-DOMAIN' || text === 'PD' ||
      text === 'PD-AUTHOR' || text === 'PD-AUTHOR-LICENSE' ||
      text === 'PUBLIC-DOMAIN-DEDICATION') {
    return 'PUBLIC-DOMAIN';
  }
  if (text === 'ALL-RIGHTS-RESERVED' || text === 'ARR' || text === 'PROPRIETARY' ||
      text === 'COPYRIGHT' || text === 'COPYRIGHTED') {
    return 'ALL-RIGHTS-RESERVED';
  }
  if (/^CC-(?:BY|BY-SA|BY-NC|BY-NC-SA|BY-ND|BY-NC-ND)$/.test(text)) {
    text += '-4.0';
  }
  const match = text.match(/^CC-(BY(?:-SA|-NC(?:-SA|-ND)?|-ND)?)-(\d+(?:\.\d+)?)$/);
  if (match) return 'CC-' + match[1] + '-' + match[2];
  return text;
}

function familyFor(id) {
  if (id === 'CC0-1.0' || id === 'PUBLIC-DOMAIN') return 'public-domain';
  if (id === 'ALL-RIGHTS-RESERVED') return 'proprietary';
  const match = id.match(/^CC-(BY(?:-SA|-NC(?:-SA|-ND)?|-ND)?)-/);
  if (!match) return 'unknown';
  if (match[1] === 'BY') return 'attribution';
  if (match[1] === 'BY-SA') return 'attribution-share-alike';
  if (match[1] === 'BY-NC') return 'noncommercial-attribution';
  if (match[1] === 'BY-NC-SA') return 'noncommercial-share-alike';
  if (match[1] === 'BY-ND') return 'attribution-no-derivatives';
  if (match[1] === 'BY-NC-ND') return 'noncommercial-no-derivatives';
  return 'unknown';
}

export function classifyLicense(value) {
  if (typeof value !== 'string') throw new TypeError('license must be a string');
  const id = canonicalizeLicense(value);
  if (!id) return policy(null, false, 'unknown');
  const family = familyFor(id);
  if (family === 'unknown') return policy(id, false, 'unknown');
  return LICENSES[id] || policy(id, true, family);
}

function readField(record, keys) {
  for (const key of keys) {
    if (!hasOwn(record, key)) continue;
    const value = record[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') return { present: true, value: '', invalid: true };
    return { present: true, value: value.trim(), invalid: false };
  }
  return { present: false, value: '', invalid: false };
}

function readBoolean(record, key) {
  if (!hasOwn(record, key)) return null;
  return typeof record[key] === 'boolean' ? record[key] : null;
}

function readOptions(options) {
  if (options === undefined) return {
    requireEvidence: true,
    requireDigest: true,
    requireAuthor: true,
    requireSource: true
  };
  if (!isPlainObject(options)) throw new TypeError('options must be a plain object');
  const output = {};
  for (const key of ['requireEvidence', 'requireDigest', 'requireAuthor', 'requireSource']) {
    if (!hasOwn(options, key)) {
      output[key] = true;
      continue;
    }
    if (typeof options[key] !== 'boolean') {
      throw new TypeError(key + ' must be a boolean');
    }
    output[key] = options[key];
  }
  return output;
}

function collectDigests(record) {
  const output = [];
  let present = false;
  let invalid = false;
  for (const key of DIGEST_KEYS) {
    if (!hasOwn(record, key)) continue;
    const value = record[key];
    if (value === undefined || value === null) continue;
    present = true;
    if (typeof value !== 'string') {
      invalid = true;
      continue;
    }
    const digest = value.trim().toLowerCase();
    if (!SHA256_PATTERN.test(digest)) {
      invalid = true;
      continue;
    }
    if (!output.includes(digest)) output.push(digest);
  }
  output.sort();
  return { present, invalid, digests: output };
}

function statusKind(status) {
  if (!status) return null;
  const value = status.trim().toUpperCase();
  if (/REJECT|BLOCK|DENIED|FORBIDDEN/.test(value)) return 'blocked';
  if (/QUARANTIN|NOT[-_ ]?APPROVED|PENDING|DRAFT|REVIEW/.test(value)) return 'review';
  return null;
}

function addReason(state, code, verdict) {
  if (!state.reasons.includes(code)) state.reasons.push(code);
  if (verdict === VERDICTS.BLOCKED) {
    state.verdict = VERDICTS.BLOCKED;
  } else if (state.verdict !== VERDICTS.BLOCKED) {
    state.verdict = VERDICTS.REVIEW_REQUIRED;
  }
}

function evaluateRecord(record, options, index) {
  if (!isPlainObject(record)) throw new TypeError('asset must be a plain object');

  const idField = readField(record, ID_KEYS);
  const pathField = readField(record, PATH_KEYS);
  const authorField = readField(record, AUTHOR_KEYS);
  const sourceField = readField(record, SOURCE_KEYS);
  const evidenceField = readField(record, EVIDENCE_KEYS);
  const statusField = readField(record, STATUS_KEYS);
  const licenseField = readField(record, LICENSE_KEYS);
  const digestInfo = collectDigests(record);

  const id = idField.value || pathField.value || 'asset_' + index;
  const state = { verdict: VERDICTS.APPROVED, reasons: [] };
  let license = null;

  if (!licenseField.present || !licenseField.value) {
    addReason(state, 'license_missing', VERDICTS.BLOCKED);
  } else if (licenseField.invalid) {
    addReason(state, 'license_invalid', VERDICTS.BLOCKED);
  } else {
    license = classifyLicense(licenseField.value);
    if (!license.known) {
      addReason(state, 'license_unknown', VERDICTS.BLOCKED);
    } else if (!license.redistributionAllowed) {
      addReason(state, 'license_no_redistribution', VERDICTS.BLOCKED);
    } else if (!license.commercialRedistribution) {
      addReason(state, 'license_noncommercial', VERDICTS.BLOCKED);
    }
    if (license.known && !license.derivativesAllowed) {
      const modified = readBoolean(record, 'modified');
      if (modified === true) {
        addReason(state, 'license_no_derivatives', VERDICTS.BLOCKED);
      } else if (modified !== false) {
        addReason(state, 'license_no_derivatives_unverified', VERDICTS.REVIEW_REQUIRED);
      }
    }
  }

  if (options.requireEvidence) {
    if (!evidenceField.present || !evidenceField.value) {
      addReason(state, 'evidence_missing', VERDICTS.BLOCKED);
    }
  }
  if (evidenceField.present && (evidenceField.invalid ||
      (evidenceField.value && !HTTPS_PATTERN.test(evidenceField.value)))) {
    addReason(state, 'evidence_not_https', VERDICTS.BLOCKED);
  }

  if (options.requireSource && (!sourceField.present || !sourceField.value)) {
    addReason(state, 'source_missing', VERDICTS.BLOCKED);
  } else if (sourceField.present && sourceField.invalid) {
    addReason(state, 'source_invalid', VERDICTS.BLOCKED);
  }

  if ((options.requireAuthor || (license && license.attributionRequired)) &&
      (!authorField.present || !authorField.value || authorField.invalid)) {
    addReason(state, 'author_missing', VERDICTS.BLOCKED);
  }

  if (digestInfo.invalid) {
    addReason(state, 'digest_invalid', VERDICTS.BLOCKED);
  } else if (!digestInfo.present && options.requireDigest) {
    addReason(state, 'digest_missing', VERDICTS.BLOCKED);
  }

  if (statusField.present && statusField.value && !statusField.invalid) {
    const kind = statusKind(statusField.value);
    if (kind === 'blocked') addReason(state, 'status_blocked', VERDICTS.BLOCKED);
    else if (kind === 'review') addReason(state, 'status_not_approved', VERDICTS.REVIEW_REQUIRED);
  }

  const approvedForRuntime = readBoolean(record, 'approved_for_runtime');
  const ready = readBoolean(record, 'ready');
  if (approvedForRuntime === false) {
    addReason(state, 'runtime_not_approved', VERDICTS.REVIEW_REQUIRED);
  }
  if (ready === false) {
    addReason(state, 'runtime_not_ready', VERDICTS.REVIEW_REQUIRED);
  }
  if (approvedForRuntime === true && ready === false) {
    addReason(state, 'runtime_approval_inconsistent', VERDICTS.REVIEW_REQUIRED);
  }

  return {
    id,
    path: pathField.value || null,
    license: license ? license.id : null,
    licenseFamily: license ? license.family : 'unknown',
    verdict: state.verdict,
    reasons: state.reasons,
    commercialRedistribution: !!(license && license.known &&
      license.redistributionAllowed && license.commercialRedistribution),
    obligations: {
      attribution: !!(license && license.attributionRequired),
      shareAlike: !!(license && license.shareAlikeRequired)
    },
    digests: digestInfo.digests,
    metadataOnly: true
  };
}

export function evaluateAudioAsset(record, options) {
  return evaluateRecord(record, readOptions(options), 0);
}

function compareAssets(left, right) {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  const leftPath = left.path || '';
  const rightPath = right.path || '';
  if (leftPath < rightPath) return -1;
  if (leftPath > rightPath) return 1;
  return 0;
}

function collectDuplicateDigests(assets) {
  const groups = new Map();
  for (const asset of assets) {
    for (const digest of asset.digests) {
      if (!groups.has(digest)) groups.set(digest, []);
      groups.get(digest).push(asset.id);
    }
  }
  const duplicates = [];
  for (const [digest, ids] of groups) {
    if (ids.length < 2) continue;
    duplicates.push(Object.freeze({
      sha256: digest,
      ids: Object.freeze(Array.from(new Set(ids)).sort())
    }));
  }
  duplicates.sort((left, right) => left.sha256 < right.sha256 ? -1 : left.sha256 > right.sha256 ? 1 : 0);
  return duplicates;
}

function applyDuplicateReviews(assets) {
  const duplicates = collectDuplicateDigests(assets);
  const flagged = new Set();
  for (const duplicate of duplicates) {
    for (const id of duplicate.ids) flagged.add(id);
  }
  for (const asset of assets) {
    if (!flagged.has(asset.id)) continue;
    if (!asset.reasons.includes('duplicate_digest')) asset.reasons.push('duplicate_digest');
    if (asset.verdict !== VERDICTS.BLOCKED) asset.verdict = VERDICTS.REVIEW_REQUIRED;
  }
  return duplicates;
}

function manifestAssets(input) {
  if (Array.isArray(input)) return input;
  if (!isPlainObject(input)) {
    throw new TypeError('manifest must be an array or an object with an assets/items array');
  }
  for (const key of ['assets', 'items']) {
    if (hasOwn(input, key)) {
      if (!Array.isArray(input[key])) {
        throw new TypeError('manifest ' + key + ' must be an array');
      }
      return input[key];
    }
  }
  throw new TypeError('manifest must be an array or an object with an assets/items array');
}

function countVerdicts(assets) {
  const counts = {
    total: assets.length,
    approved: 0,
    review_required: 0,
    blocked: 0,
    commercial_redistribution_allowed: 0,
    attribution_required: 0,
    share_alike_required: 0
  };
  for (const asset of assets) {
    counts[asset.verdict] += 1;
    if (asset.commercialRedistribution) counts.commercial_redistribution_allowed += 1;
    if (asset.obligations.attribution) counts.attribution_required += 1;
    if (asset.obligations.shareAlike) counts.share_alike_required += 1;
  }
  return counts;
}

function idsWhere(assets, predicate) {
  const output = [];
  for (const asset of assets) {
    if (predicate(asset) && !output.includes(asset.id)) output.push(asset.id);
  }
  return output.sort();
}

export function summarizeProvenanceAudit(report) {
  if (!isPlainObject(report) || !Array.isArray(report.assets)) {
    throw new TypeError('report must contain an assets array');
  }
  const counts = countVerdicts(report.assets);
  return {
    version: VERSION,
    policyVersion: POLICY_VERSION,
    status: report.status,
    ok: report.status === 'PASS',
    metadataOnly: true,
    byteVerification: 'NOT_PERFORMED',
    counts,
    obligations: {
      attribution: idsWhere(report.assets, (asset) => asset.obligations.attribution),
      shareAlike: idsWhere(report.assets, (asset) => asset.obligations.shareAlike)
    },
    duplicates: report.duplicates.map((duplicate) => ({
      sha256: duplicate.sha256,
      ids: duplicate.ids.slice()
    })),
    blockers: idsWhere(report.assets, (asset) => asset.verdict === VERDICTS.BLOCKED),
    review: idsWhere(report.assets, (asset) => asset.verdict === VERDICTS.REVIEW_REQUIRED)
  };
}

export function auditAudioProvenance(input, options) {
  const settings = readOptions(options);
  const rawAssets = manifestAssets(input);
  const assets = rawAssets.map((record, index) => {
    if (!isPlainObject(record)) {
      return {
        id: 'asset_' + index,
        path: null,
        license: null,
        licenseFamily: 'unknown',
        verdict: VERDICTS.BLOCKED,
        reasons: ['asset_not_object'],
        commercialRedistribution: false,
        obligations: { attribution: false, shareAlike: false },
        digests: [],
        metadataOnly: true
      };
    }
    return evaluateRecord(record, settings, index);
  });

  assets.sort(compareAssets);
  const duplicates = applyDuplicateReviews(assets);
  const counts = countVerdicts(assets);
  const status = counts.blocked > 0
    ? 'BLOCKED'
    : counts.review_required > 0
      ? 'REVIEW_REQUIRED'
      : 'PASS';

  const report = {
    version: VERSION,
    policyVersion: POLICY_VERSION,
    status,
    ok: status === 'PASS',
    metadataOnly: true,
    byteVerification: 'NOT_PERFORMED',
    counts,
    obligations: {
      attribution: idsWhere(assets, (asset) => asset.obligations.attribution),
      shareAlike: idsWhere(assets, (asset) => asset.obligations.shareAlike)
    },
    duplicates,
    blockers: idsWhere(assets, (asset) => asset.verdict === VERDICTS.BLOCKED),
    review: idsWhere(assets, (asset) => asset.verdict === VERDICTS.REVIEW_REQUIRED),
    assets
  };
  report.summary = summarizeProvenanceAudit(report);
  return report;
}

export function formatProvenanceReport(report) {
  if (!isPlainObject(report) || !Array.isArray(report.assets) || !isPlainObject(report.counts)) {
    throw new TypeError('report must contain assets and counts');
  }
  const lines = [
    'Audio provenance audit v' + VERSION + ' (policy v' + POLICY_VERSION + ')',
    'Status: ' + report.status,
    'Assets: ' + report.counts.total,
    'Approved: ' + report.counts.approved,
    'Review required: ' + report.counts.review_required,
    'Blocked: ' + report.counts.blocked,
    'Commercial redistribution allowed: ' + report.counts.commercial_redistribution_allowed,
    'Attribution required: ' + report.counts.attribution_required,
    'Share-alike required: ' + report.counts.share_alike_required,
    'Metadata only: ' + (report.metadataOnly === true),
    'Byte verification: ' + report.byteVerification,
    'Duplicates: ' + report.duplicates.length
  ];
  for (const asset of report.assets) {
    lines.push(
      '- ' + asset.id +
      ' ' + String(asset.verdict).toUpperCase() +
      ' license=' + (asset.license === null ? 'none' : asset.license) +
      ' reasons=' + (asset.reasons.length ? asset.reasons.join(',') : 'none')
    );
  }
  return lines.join('\n');
}
