'use strict';

const SCHEMA_VERSION = 1;
const STATUS_PASS = 'PASS';
const STATUS_FAIL = 'FAIL';
const STATUS_NOT_TESTED = 'NOT_TESTED';
const STATUS_ORDER = [STATUS_PASS, STATUS_FAIL, STATUS_NOT_TESTED];

const SHA_FIELD_KEYS = new Set(['sha', 'headSha', 'sourceSha']);
const CHECK_ID_KEYS = new Set(['id', 'checkId', 'check_id', 'name', 'test']);
const CHECK_RESULT_KEYS = new Set(['result', 'status', 'outcome', 'testResult', 'test_result', 'testOutcome']);
const BUILT_SHA_KEYS = new Set(['builtApkSha256', 'builtApkSha']);
const INSTALLED_SHA_KEYS = new Set(['installedApkSha256', 'installedApkSha']);
const TRANSPORT_FLAG_KEYS = new Set(['transportError', 'transport_error', 'transportFailure']);

const SHA40_PATTERN = /^[0-9a-f]{40}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const EMPTY_SHA40 = '0000000000000000000000000000000000000000';

const PASS_RESULTS = new Set(['pass', 'passed', 'success', 'ok']);
const FAIL_RESULTS = new Set(['fail', 'failed', 'error', 'assert_failed']);

const TRANSPORT_RESULTS = new Set([
  'timeout',
  'timed_out',
  'failed_ack',
  'ack_failed',
  'command_timeout',
  'install_timeout',
  'emulator_lost',
  'adb_error',
  'adb',
  'device_offline',
  'offline',
  'bootstrap',
  'failed_to_boot',
  'not_booted',
  'transport_error',
  'connectivity',
  'network'
]);

const TRANSPORT_KINDS = [
  'emulator_lost',
  'emulator_bootstrap',
  'failed_ack',
  'adb_offline',
  'command_timeout',
  'install_failure',
  'connectivity',
  'other'
];

const TRANSPORT_TOKEN_RULES = [
  ['failed_ack', /failed[-_ ]?ack|ack[-_ ]?failed/i],
  ['install_failure', /install/i],
  ['command_timeout', /timeout|timed[-_ ]?out/i],
  ['emulator_bootstrap', /bootstrap|not[-_ ]?booted|failed[-_ ]?to[-_ ]?boot/i],
  ['emulator_lost', /emulator|device[-_ ]?lost|\bcrash/i],
  ['adb_offline', /\badb\b|device[-_ ]?offline|\boffline\b/i],
  ['connectivity', /network|\bsocket\b|connect|transport/i]
];

const TRANSPORT_MESSAGE_RULES = [
  ['failed_ack', /failed[-_ ]?ack|ack[-_ ]?failed|\back\b/i],
  ['install_failure', /install/i],
  ['command_timeout', /timeout|timed[-_ ]?out/i],
  ['emulator_bootstrap', /bootstrap|not[-_ ]?booted/i],
  ['emulator_lost', /emulator|device[-_ ]?lost|\bcrash/i],
  ['adb_offline', /\badb\b|device[-_ ]?offline|\boffline\b/i],
  ['connectivity', /network|\bsocket\b|connect/i]
];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeToken(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeResultToken(value) {
  return normalizeToken(value).toLowerCase().replace(/[\s-]+/g, '_');
}

function firstDefined(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

function classifyResult(result) {
  const token = normalizeResultToken(result);
  if (!token) return STATUS_NOT_TESTED;
  if (TRANSPORT_RESULTS.has(token)) return STATUS_NOT_TESTED;
  for (const [, pattern] of TRANSPORT_MESSAGE_RULES) {
    if (pattern.test(token)) return STATUS_NOT_TESTED;
  }
  if (PASS_RESULTS.has(token)) return STATUS_PASS;
  if (FAIL_RESULTS.has(token)) return STATUS_FAIL;
  return STATUS_NOT_TESTED;
}

function classifyTransportEvent(kind, message) {
  const kindToken = normalizeToken(kind).toLowerCase().replace(/[\s-]+/g, '_');
  const patterns = TRANSPORT_TOKEN_RULES;
  if (kindToken) {
    for (const [matchedKind, pattern] of patterns) {
      if (pattern.test(kindToken)) return matchedKind;
    }
    return 'other';
  }
  for (const [matchedKind, pattern] of TRANSPORT_MESSAGE_RULES) {
    if (pattern.test(normalizeToken(message))) return matchedKind;
  }
  return 'other';
}

function transportReason(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  for (const flag of TRANSPORT_FLAG_KEYS) {
    if (candidate[flag] === true) return 'other';
  }
  const explicitKind = normalizeToken(candidate.kind) || normalizeToken(candidate.failureKind);
  if (explicitKind) {
    return classifyTransportEvent(explicitKind, candidate.message);
  }
  const failure = firstPlain(candidate.error);
  if (failure) {
    const failureKind = normalizeToken(failure.kind) || normalizeToken(failure.failureKind);
    if (failureKind) return classifyTransportEvent(failureKind, failure.message);
    const fromMessage = matchMessageRules(failure.message || failure.error);
    return fromMessage;
  }
  return matchMessageRules(candidate.message);
}

function firstPlain(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function matchMessageRules(message) {
  const token = normalizeToken(message);
  if (!token) return null;
  for (const [kind, pattern] of TRANSPORT_MESSAGE_RULES) {
    if (pattern.test(token)) return kind;
  }
  return null;
}

function resultTokenIsTransport(result) {
  return TRANSPORT_RESULTS.has(normalizeResultToken(result)) || matchMessageRules(result) !== null;
}

function shaStatus(device, expected) {
  const reported = firstDefined(device, SHA_FIELD_KEYS);
  const actual = normalizeToken(typeof reported === 'string' ? reported : '');
  const wanted = normalizeToken(expected);
  if (!wanted || !SHA40_PATTERN.test(wanted) || wanted.toLowerCase() === EMPTY_SHA40) {
    return { verified: false, reason: 'unsafe_expected_sha' };
  }
  if (!actual) {
    return { verified: false, reason: 'report_sha_missing' };
  }
  if (!SHA40_PATTERN.test(actual)) {
    return { verified: false, reason: 'report_sha_malformed' };
  }
  if (actual.toLowerCase() !== wanted.toLowerCase()) {
    return { verified: false, reason: 'report_sha_mismatch' };
  }
  return { verified: true, reason: null };
}

function apkIdentityStatus(device) {
  const built = normalizeToken(firstDefined(device, BUILT_SHA_KEYS));
  const installed = normalizeToken(firstDefined(device, INSTALLED_SHA_KEYS));
  if (!built || !installed || !SHA256_PATTERN.test(built) || !SHA256_PATTERN.test(installed)) {
    return { verified: false, reason: 'apk_identity_not_supplied' };
  }
  if (built.toLowerCase() !== installed.toLowerCase()) {
    return { verified: false, reason: 'built_and_installed_apk_differ' };
  }
  return { verified: true, reason: null };
}

function normalizeDeviceKey(value) {
  return normalizeToken(value).toUpperCase();
}

function checkIdOf(check) {
  const value = firstDefined(check, CHECK_ID_KEYS);
  return normalizeToken(typeof value === 'string' ? value : '') || 'unnamed_check';
}

function mapCheck(check, context) {
  if (!isPlainObject(check)) {
    return {
      id: 'malformed_check',
      status: STATUS_NOT_TESTED,
      reason: 'malformed_check_entry',
      transportKind: null,
      rawResult: null
    };
  }
  const rawValue = firstDefined(check, CHECK_RESULT_KEYS);
  const rawResult = typeof rawValue === 'string' && normalizeToken(rawValue) !== ''
    ? normalizeToken(rawValue)
    : null;
  let transportKind = transportReason(check);
  if (!transportKind && rawResult && resultTokenIsTransport(rawResult)) {
    transportKind = classifyTransportEvent(rawResult, rawResult);
  }
  let status;
  let reason;
  if (transportKind) {
    status = STATUS_NOT_TESTED;
    reason = 'transport:' + transportKind;
  } else {
    status = classifyResult(rawResult);
    reason = status === STATUS_PASS
      ? null
      : (rawResult ? 'unexpected_result_token' : 'missing_result');
  }
  if (status === STATUS_PASS && (!context.shaVerified || !context.apkVerified)) {
    status = STATUS_NOT_TESTED;
    reason = !context.shaVerified ? context.shaReason : context.apkReason;
  }
  return {
    id: checkIdOf(check),
    status,
    reason,
    transportKind,
    rawResult
  };
}

function collectTransportEvents(deviceKey, sink, source, viaCheck) {
  if (!Array.isArray(source)) return;
  for (const entry of source) {
    if (!isPlainObject(entry)) {
      sink.push({
        device: deviceKey,
        stage: 'unknown',
        kind: 'other',
        message: typeof entry === 'string' ? normalizeToken(entry) : String(entry),
        checkId: viaCheck || null,
        resolved: false
      });
      continue;
    }
    const kind = classifyTransportEvent(
      normalizeToken(entry.kind) || normalizeToken(entry.failureKind) || (entry.transportError === true ? 'other' : ''),
      entry.message || (firstPlain(entry.error) ? firstPlain(entry.error).message : entry.error)
    );
    if (!normalizeToken(entry.kind) && !normalizeToken(entry.failureKind) && entry.transportError !== true && kind === 'other') {
      continue;
    }
    const checkId = normalizeToken(typeof entry.checkId === 'string' ? entry.checkId : '');
    sink.push({
      device: deviceKey,
      stage: normalizeToken(entry.stage) || normalizeToken(entry.step) || 'unknown',
      kind,
      message: normalizeToken(entry.message) || null,
      checkId: checkId || viaCheck || null,
      resolved: entry.resolved === true
    });
  }
}

function mapDevice(deviceKey, entity, expectedSha) {
  if (!isPlainObject(entity)) {
    return {
      device: deviceKey,
      present: false,
      reason: 'invalid_device_evidence',
      shaVerified: false,
      apkIdentityVerified: false,
      status: STATUS_NOT_TESTED,
      checks: [],
      transports: []
    };
  }
  const shaResult = shaStatus(entity, expectedSha);
  const identityResult = apkIdentityStatus(entity);
  const context = {
    shaVerified: shaResult.verified,
    shaReason: shaResult.reason,
    apkVerified: identityResult.verified,
    apkReason: identityResult.reason
  };
  const rawChecks = Array.isArray(entity.checks) ? entity.checks : [];
  const checks = rawChecks.map((check) => mapCheck(check, context));
  const transports = [];
  collectTransportEvents(deviceKey, transports, entity.transport, null);
  collectTransportEvents(deviceKey, transports, entity.transportErrors, null);
  for (const check of checks) {
    if (!check.transportKind) continue;
    transports.push({
      device: deviceKey,
      stage: 'check_result',
      kind: check.transportKind,
      message: check.rawResult,
      checkId: check.id,
      resolved: false
    });
  }
  let status;
  if (checks.some((check) => check.status === STATUS_FAIL)) {
    status = STATUS_FAIL;
  } else if (checks.some((check) => check.status === STATUS_NOT_TESTED)) {
    status = STATUS_NOT_TESTED;
  } else if (!shaResult.verified || !identityResult.verified) {
    status = STATUS_NOT_TESTED;
  } else if (checks.length === 0) {
    status = STATUS_NOT_TESTED;
  } else {
    status = STATUS_PASS;
  }
  let reason = null;
  if (status === STATUS_NOT_TESTED) {
    if (checks.length === 0) {
      reason = 'no_check_results';
    } else if (checks.some((check) => check.status === STATUS_NOT_TESTED)) {
      const blocked = checks.find((check) => check.status === STATUS_NOT_TESTED);
      reason = blocked.reason;
    } else if (!shaResult.verified) {
      reason = shaResult.reason;
    } else {
      reason = identityResult.reason;
    }
  }
  return {
    device: deviceKey,
    present: true,
    reason,
    shaVerified: shaResult.verified,
    apkIdentityVerified: identityResult.verified,
    status,
    checks,
    transports
  };
}

function countStatuses(checks, status) {
  let count = 0;
  for (const check of checks) {
    if (check.status === status) count += 1;
  }
  return count;
}

function countDevices(devices, status) {
  let count = 0;
  for (const device of devices) {
    if (device && device.status === status) count += 1;
  }
  return count;
}

function mapAndroidEvidence(report, expected) {
  const options = isPlainObject(expected) ? expected : {};
  const expectedSha = normalizeToken(options.sha);
  const wantedDevicesRaw = Array.isArray(options.devices) && options.devices.length > 0
    ? options.devices
    : ['API30', 'API35'];
  const wantedDevices = [];
  for (const device of wantedDevicesRaw) {
    const key = normalizeDeviceKey(device);
    if (key && !wantedDevices.includes(key)) wantedDevices.push(key);
  }

  const devicesSource = isPlainObject(report) ? (Array.isArray(report.devices) ? report.devices : isPlainObject(report.devices) ? report.devices : null) : null;

  const devices = [];
  const allChecks = [];
  const transport = [];

  for (const deviceKey of wantedDevices) {
    let entity = null;
    let present = false;
    let reason = 'device_absent';
    if (devicesSource) {
      if (Array.isArray(devicesSource)) {
        for (const entry of devicesSource) {
          if (isPlainObject(entry) && normalizeDeviceKey(entry.device || entry.name) === deviceKey) {
            entity = entry;
            present = true;
            reason = null;
            break;
          }
        }
      } else {
        for (const key of Object.keys(devicesSource)) {
          if (normalizeDeviceKey(key) === deviceKey) {
            const value = devicesSource[key];
            if (isPlainObject(value)) {
              entity = value;
              present = true;
              reason = null;
            } else {
              reason = 'invalid_device_evidence';
            }
            break;
          }
        }
      }
    }
    const mapped = mapDevice(deviceKey, entity, expectedSha);
    if (!present) {
      devices.push({
        device: deviceKey,
        present: false,
        reason: reason,
        shaVerified: false,
        apkIdentityVerified: false,
        status: STATUS_NOT_TESTED,
        checks: [],
        transports: []
      });
      continue;
    }
    devices.push(mapped);
    for (const check of mapped.checks) allChecks.push(check);
    for (const event of mapped.transports) transport.push(event);
  }

  if (isPlainObject(report)) {
    collectTransportEvents(null, transport, report.transport, null);
    collectTransportEvents(null, transport, report.transportErrors, null);
  }

  const shaVerifiedAll = devices.length > 0 && devices.every((device) => device.present && device.shaVerified);
  const identityVerifiedAll = devices.length > 0 && devices.every((device) => device.present && device.apkIdentityVerified);

  const counts = {
    checks: {
      PASS: countStatuses(allChecks, STATUS_PASS),
      FAIL: countStatuses(allChecks, STATUS_FAIL),
      NOT_TESTED: countStatuses(allChecks, STATUS_NOT_TESTED)
    },
    devices: {
      PASS: countDevices(devices, STATUS_PASS),
      FAIL: countDevices(devices, STATUS_FAIL),
      NOT_TESTED: countDevices(devices, STATUS_NOT_TESTED)
    },
    transport: transport.length
  };

  const reasons = [];
  for (const device of devices) {
    if (!device.present) {
      reasons.push(device.device + ':' + device.reason);
      continue;
    }
    if (!device.shaVerified) reasons.push(device.device + ':' + (device.reason || 'report_sha_missing'));
    if (!device.apkIdentityVerified) reasons.push(device.device + ':apk_identity_not_verified');
    if (device.status === STATUS_FAIL) reasons.push(device.device + ':failing_checks');
    if (device.status === STATUS_NOT_TESTED && device.reason) {
      const blocker = device.device + ':' + device.reason;
      if (!reasons.includes(blocker)) reasons.push(blocker);
    }
    if (device.checks.length === 0) reasons.push(device.device + ':no_check_results');
  }
  for (const event of transport) {
    if (!event.resolved) {
      const blocker = event.device ? event.device + ':transport:' + event.kind : 'transport:' + event.kind;
      reasons.push(blocker);
    }
  }

  let overall;
  if (counts.checks.FAIL > 0 || counts.devices.FAIL > 0) {
    overall = STATUS_FAIL;
  } else if (
    counts.checks.NOT_TESTED > 0 ||
    counts.devices.NOT_TESTED > 0 ||
    !shaVerifiedAll ||
    !identityVerifiedAll ||
    reasons.some((reason) => reason.indexOf(':transport:') !== -1 || reason.indexOf('transport:') === 0)
  ) {
    overall = STATUS_NOT_TESTED;
  } else if (counts.checks.PASS === 0) {
    overall = STATUS_NOT_TESTED;
    reasons.push('no_passing_checks');
  } else {
    overall = STATUS_PASS;
  }
  const finalReasons = [...new Set(reasons)];

  return {
    schemaVersion: SCHEMA_VERSION,
    overall,
    shaVerified: shaVerifiedAll,
    apkIdentityVerified: identityVerifiedAll,
    expectedSha,
    devices,
    transport,
    counts,
    reasons: finalReasons
  };
}

module.exports = {
  SCHEMA_VERSION,
  STATUS_PASS,
  STATUS_FAIL,
  STATUS_NOT_TESTED,
  STATUS_ORDER,
  TRANSPORT_KINDS,
  classifyResult,
  classifyTransportEvent,
  transportReason,
  shaStatus,
  apkIdentityStatus,
  mapCheck,
  mapDevice,
  mapAndroidEvidence
};
