'use strict';
// Parse only the repository-owned recovery ledger. Never infer validation from status labels.
const fs = require('node:fs');
const path = require('node:path');
const STATUSES = ['TESTED', 'IN_PROGRESS', 'BLOCKED', 'TODO', 'DEFERRED'];
function parseBacklog(markdown, expected = 161) {
  if (typeof markdown !== 'string') throw new TypeError('Markdown must be text');
  const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
  const tasks = [], problems = [], seen = new Set();
  const systemCounts = new Map();
  const rx = /^\|\s*(DF-\d{3})\s*\|\s*([A-Z_]+)\s*\|\s*([A-Z0-9_]+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/;
  for (const line of markdown.split(/\r?\n/)) {
    if (!/^\|\s*DF-\d{3}\b/.test(line)) continue;
    const match = line.match(rx);
    if (!match) { problems.push(`Invalid task row: ${line.slice(0, 100)}`); continue; }
    const [, id, status, system, title, evidence] = match;
    if (seen.has(id)) problems.push(`Duplicate ${id}`);
    seen.add(id);
    if (!STATUSES.includes(status)) { problems.push(`Invalid status ${status}: ${id}`); continue; }
    if (!title.trim() || !evidence.trim()) problems.push(`Missing task or evidence: ${id}`);
    counts[status]++;
    const group = systemCounts.get(system) || Object.fromEntries(STATUSES.map(s => [s, 0]));
    group[status]++;
    systemCounts.set(system, group);
    tasks.push({id, status, system, title, evidence});
  }
  if (tasks.length !== expected) problems.push(`Expected exactly ${expected} parsed rows; found ${tasks.length}`);
  for (let i = 1; i <= expected; i++) {
    const id = `DF-${String(i).padStart(3,'0')}`;
    if (!seen.has(id)) problems.push(`Missing ${id}`);
  }
  const systems = Array.from(systemCounts, ([name, statuses]) => ({name, statuses, total: Object.values(statuses).reduce((a,b) => a+b,0)})).sort((a,b) => a.name.localeCompare(b.name));
  return {ok: problems.length === 0, total:tasks.length, expected, counts, systems, tasks, problems};
}
function loadBacklog(file) {
  try { return parseBacklog(fs.readFileSync(path.resolve(file),'utf8')); }
  catch (error) { const empty = parseBacklog(''); empty.problems.unshift(`Cannot read backlog: ${error.message}`); return empty; }
}
module.exports = {parseBacklog, loadBacklog};
