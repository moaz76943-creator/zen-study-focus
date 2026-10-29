/**
 * DEEP FOCUS — Room5 Scope Collision Report (task A01)
 * Pure, standalone, offline analyzer: compares source-file owners of
 * independent rooms and reports collisions. Zero networking, zero
 * dependencies, zero persistence side-effects, deterministic output.
 *
 * Public API (stable):
 *   analyzeRoomOwnership(entries) -> { status, ok, roomCount, entryCount,
 *       collisions, duplicateSourceFiles, duplicateTestFiles,
 *       duplicateModules, duplicateRooms }
 *   findCollisions(entries) -> [ { kind, key, rooms, tasks, owners } ]
 *   formatReport(report) -> string
 */

const KINDS = ['source', 'test', 'module', 'room'];

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEntry(raw, index) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError(
      `Room ownership entry #${index} must be an object with room/task/module fields`
    );
  }
  const entry = {
    room: asString(raw.room),
    task: asString(raw.task),
    owner: asString(raw.owner) || 'unknown',
    module: asString(raw.module),
    sourceFile: asString(raw.sourceFile),
    testFile: asString(raw.testFile)
  };
  if (!entry.room) {
    throw new TypeError(`Room ownership entry #${index} must include a non-empty "room"`);
  }
  if (!entry.task) {
    throw new TypeError(`Room ownership entry #${index} must include a non-empty "task"`);
  }
  if (!entry.module) {
    throw new TypeError(`Room ownership entry #${index} must include a non-empty "module"`);
  }
  if (!entry.sourceFile) {
    throw new TypeError(`Room ownership entry #${index} must include a non-empty "sourceFile"`);
  }
  return entry;
}

function collectDuplicates(entries, keyOf) {
  const map = new Map();
  for (const entry of entries) {
    const key = keyOf(entry);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
  }
  const duplicates = [];
  for (const [key, group] of map) {
    if (group.length < 2) continue;
    duplicates.push({
      key,
      rooms: group.map(e => e.task),
      lanes: group.map(e => e.room),
      owners: [...new Set(group.map(e => e.owner))]
    });
  }
  duplicates.sort((a, b) =>
    a.key < b.key ? -1 : a.key > b.key ? 1 : 0
  );
  return duplicates;
}

function analyzeRoomOwnership(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError('analyzeRoomOwnership expects an array of room ownership entries');
  }
  const normalized = entries.map(normalizeEntry);

  const roomKeys = collectDuplicates(normalized, e => (e.room ? `${e.room}|${e.task}` : ''));
  const sourceDups = collectDuplicates(normalized, e => e.sourceFile);
  const testDups = collectDuplicates(normalized, e => e.testFile);
  const moduleDups = collectDuplicates(normalized, e => e.module);

  const byKind = {
    source: sourceDups,
    test: testDups,
    module: moduleDups,
    room: roomKeys
  };

  const seen = new Set();
  const collisions = [];
  for (const kind of KINDS) {
    for (const dup of byKind[kind]) {
      const id = `${kind}\u0000${dup.key}`;
      if (seen.has(id)) continue;
      seen.add(id);
      collisions.push({ kind, key: dup.key, rooms: dup.rooms, lanes: dup.lanes, owners: dup.owners });
    }
  }

  const ok = collisions.length === 0;
  return {
    status: ok ? 'PASS' : 'COLLISION',
    ok,
    roomCount: normalized.length,
    entryCount: normalized.length,
    collisions,
    duplicateSourceFiles: sourceDups,
    duplicateTestFiles: testDups,
    duplicateModules: moduleDups,
    duplicateRooms: roomKeys
  };
}

function findCollisions(entries) {
  return analyzeRoomOwnership(entries).collisions;
}

function formatReport(report) {
  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('formatReport expects an analyzeRoomOwnership report object');
  }
  const lines = [];
  lines.push(`status: ${report.status}`);
  lines.push(`rooms: ${report.roomCount}`);
  lines.push(`collisions: ${Array.isArray(report.collisions) ? report.collisions.length : 0}`);
  if (Array.isArray(report.collisions)) {
    for (const c of report.collisions) {
      const participants = Array.isArray(c.rooms) ? c.rooms.join(', ') : '';
      lines.push(`collision kind=${c.kind} key=${c.key} rooms=[${participants}]`);
    }
  }
  return lines.join('\n');
}

export { analyzeRoomOwnership, findCollisions, formatReport };
