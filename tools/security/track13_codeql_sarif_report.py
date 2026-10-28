#!/usr/bin/env python3
"""Summarize CodeQL SARIF without disclosing paths, messages, snippets or findings."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

SHA = re.compile(r"[a-f0-9]{40}\Z")
MAX_BYTES = 32 * 1024 * 1024
SAFE_CODEQL_RULE = re.compile(r"js/[a-z0-9-]{1,64}(?:/[a-z0-9-]{1,64}){0,3}\Z")
MAX_RULE_GROUPS = 24
MAX_EVIDENCE = 16
SOURCE_SUFFIXES = {'.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx', '.java', '.py', '.sh', '.html', '.yml', '.yaml'}
EVIDENCE_SINK = ('js/http-to-file-access', 'tests/android_e2e_recovery/private_evidence.cjs', 68)
ADJUDICATION_ID = 'DF-CODEQL-QA-EVIDENCE-001'


def evidence_source_scope(root: Path) -> list[str]:
    """Discover the reviewed QA trust boundary, including new callers/readers.

    Production pages are untrusted *data* in this adjudication: their bytes may
    change the report, but cannot turn a fixed PNG/JSON artifact into executable
    code. A production file importing this helper is nevertheless a new caller.
    """
    names = subprocess.check_output(['git', '-C', str(root), 'ls-files', '-z'], timeout=10)
    tracked = sorted(set(names.split(b'\0')) - {b''})
    sources = {}
    for raw in tracked:
        relative = raw.decode('utf-8')
        if Path(relative).suffix.lower() not in SOURCE_SUFFIXES:
            continue
        path = root / relative
        if path.is_symlink() or not path.is_file() or path.stat().st_size > MAX_BYTES:
            raise ValueError('Invalid tracked source')
        sources[relative] = path.read_text(encoding='utf-8')
    sink = EVIDENCE_SINK[1]
    if sink not in sources:
        raise ValueError('Missing evidence helper')
    marker = re.compile(r'private_evidence(?:\.cjs)?|createEvidenceDirectory|createEvidenceReport')
    is_guard = lambda name: '.test.' in name or name == 'tools/security/track13_codeql_sarif_report.py'
    scope = {name for name, text in sources.items() if marker.search(text) and not is_guard(name)}
    scope.add(sink)
    # QA imports/launchers and output readers form a conservative bidirectional
    # graph. Scan all source files for new edges on every invocation. Literal
    # basename matching intentionally over-includes ambiguous QA references.
    qa = {name for name in sources if name.startswith(('tests/', 'tools/', '.github/')) and not is_guard(name)}
    local_import = re.compile(r"(?:require\s*\(\s*|(?:import|export)\s+(?:[^;\n]*?\s+from\s+)?)[\"'](\.[^\"']+)[\"']")
    runtime_import = re.compile(r"\b(?:require|import)\s*\(\s*([^\s])")
    edges = {name: set() for name in sources}
    for name, text in sources.items():
        if name not in qa and name not in scope:
            continue
        for other in qa:
            if other != name and (other in text or Path(other).name in text):
                edges[name].add(other)
                edges[other].add(name)
        for specifier in local_import.findall(text):
            candidate = (root / name).parent / specifier
            relative = str(candidate.resolve().relative_to(root.resolve()))
            resolved = next((v for v in (relative, relative+'.js', relative+'.cjs', relative+'.mjs', relative+'/index.js') if v in sources), None)
            if resolved:
                edges[name].add(resolved)
                edges[resolved].add(name)
    # Artifact data never becomes code in approved consumers. Bind new readers
    # and directory/env routing changes as well as writers and launch scripts.
    artifact = re.compile(r"[\"']([^\"'\n/]+\.(?:json|xml|png|txt))[\"']")
    routing = re.compile(r'\b[A-Z][A-Z0-9_]*(?:EVIDENCE|REPORT)\b')
    while True:
        old = set(scope)
        identifiers = set()
        for name in old:
            text = sources[name]
            scope.update(edges[name])
            identifiers.update(artifact.findall(text))
            identifiers.update(routing.findall(text))
        for name in qa:
            if any(token in sources[name] for token in identifiers):
                scope.add(name)
        if scope == old:
            break
    for name in scope:
        text = sources[name]
        if Path(name).suffix.lower() in {'.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx'}:
            # Computed module loading in this trust boundary requires an explicit
            # security review and a supported dependency model first.
            if any(token not in "\"'" for token in runtime_import.findall(text)):
                raise ValueError('Unmodelled runtime import in evidence scope: '+name)
            for specifier in local_import.findall(text):
                candidate = (root / name).parent / specifier
                relative = str(candidate.resolve().relative_to(root.resolve()))
                if not any(v in sources for v in (relative, relative+'.js', relative+'.cjs', relative+'.mjs', relative+'/index.js')):
                    raise ValueError('Unresolved evidence runtime dependency')
    # A computed loader anywhere could hide a new helper consumer. Bind its
    # complete file as a conservative guard even before it enters the static
    # graph; changing the computed value therefore requires review.
    scope.update(name for name, text in sources.items()
                 if Path(name).suffix.lower() in {'.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx'}
                 and any(token not in "\"'" for token in runtime_import.findall(text)))
    # Escaped specifiers may conceal the helper's basename. Snapshot their full
    # files even outside the graph, just like computed module loaders.
    escaped_import = re.compile(r"(?:\b(?:require|import)\s*\(\s*|\bfrom\s*|\bimport\s*)[\"']([^\"'\n]*\\[^\"'\n]*)[\"']")
    scope.update(name for name, text in sources.items()
                 if Path(name).suffix.lower() in {'.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx'}
                 and escaped_import.search(text))
    # Dependency installation can change how imported package code behaves.

    scope.update(name for name, text in sources.items() if marker.search(text) and is_guard(name))
    manifests = {'package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml'}
    scope.update(raw.decode('utf-8') for raw in tracked if Path(raw.decode('utf-8')).name in manifests)
    return sorted(scope)


def executable_source_digest(root: Path) -> str:
    """Compatibility API: fingerprint the discovered evidence boundary only."""
    digest = hashlib.sha256(b'DF-QA-EVIDENCE-SCOPE-v2\0')
    for relative in evidence_source_scope(root):
        path = root / relative
        if path.is_symlink() or not path.is_file() or path.stat().st_size > MAX_BYTES:
            raise ValueError('Invalid evidence source')
        digest.update(relative.encode('utf-8') + b'\0' + hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest()


def approved_evidence_sink(root: Path):
    """One explicit adjudication. Never infer approval or update its snapshot."""
    try:
        registry = root / 'tools/security/codeql_adjudications.json'
        if registry.is_symlink() or registry.stat().st_size > 16384:
            return None
        policy = json.loads(registry.read_text(encoding='utf-8'))
        entries = policy.get('adjudications')
        if policy.get('schemaVersion') != 2 or not isinstance(entries, list) or len(entries) != 1:
            return None
        entry = entries[0]
        if (entry.get('id') != ADJUDICATION_ID or entry.get('verdict') != 'FALSE_POSITIVE_WITH_EVIDENCE'
                or entry.get('reviewStatus') != 'APPROVED'
                or not isinstance(entry.get('reviewedBy'), str) or not entry['reviewedBy'].strip()
                or (entry.get('rule'), entry.get('path'), entry.get('line')) != EVIDENCE_SINK):
            return None
        source_hash, tree_hash = entry.get('sourceSha256'), entry.get('relevantSourceSha256')
        if not all(isinstance(value, str) and re.fullmatch(r'[a-f0-9]{64}', value) for value in (source_hash, tree_hash)):
            return None
        source = root / EVIDENCE_SINK[1]
        if source.is_symlink() or hashlib.sha256(source.read_bytes()).hexdigest() != source_hash:
            return None
        if executable_source_digest(root) != tree_hash:
            return None
        return {key: entry[key] for key in ('id', 'verdict', 'sourceSha256', 'relevantSourceSha256')}
    except (OSError, ValueError, UnicodeError, subprocess.SubprocessError, AttributeError, TypeError):
        return None


def summarize(directory: Path, sha: str, source_root=None) -> dict:
    is_sha = bool(SHA.fullmatch(sha))
    output = {"sha": sha if is_sha else "", "status": "BLOCKED", "reason": "INVALID_SHA" if not is_sha else "SARIF_UNAVAILABLE", "findings": None}
    if not is_sha:
        return output
    try:
        paths = sorted(p for p in directory.rglob("*.sarif") if p.is_file() and not p.is_symlink())
        if not paths:
            return output
        count = 0
        rule_counts = {}
        unclassified_reasons = {}
        unclassified_structure = {}
        evidence = []
        adjudication = approved_evidence_sink(Path(source_root) if source_root is not None else Path(__file__).resolve().parents[2])
        adjudicable = 0
        for path in paths:
            if path.stat().st_size > MAX_BYTES:
                output["reason"] = "SARIF_INVALID"
                return output
            report = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(report, dict) or report.get("version") != "2.1.0":
                output["reason"] = "SARIF_INVALID"
                return output
            runs = report.get("runs")
            if not isinstance(runs, list) or not runs:
                output["reason"] = "SARIF_INVALID"
                return output
            for run in runs:
                if not isinstance(run, dict) or not isinstance(run.get("tool"), dict) or not isinstance(run["tool"].get("driver"), dict) or run["tool"]["driver"].get("name") != "CodeQL" or not isinstance(run.get("results"), list):
                    output["reason"] = "SARIF_INVALID"
                    return output
                if any(not isinstance(item, dict) for item in run["results"]):
                    output["reason"] = "SARIF_INVALID"
                    return output
                descriptors = run["tool"]["driver"].get("rules", [])
                if not isinstance(descriptors, list):
                    output["reason"] = "SARIF_INVALID"
                    return output
                count += len(run["results"])
                for item in run["results"]:
                    raw_rule = item.get("ruleId")
                    # SARIF permits ruleIndex without ruleId. Check descriptor consistency,
                    # never infer a clean result from missing or conflicting metadata.
                    if "ruleIndex" in item:
                        index = item["ruleIndex"]
                        if type(index) is not int or index < 0 or index >= len(descriptors):
                            output["reason"] = "SARIF_INVALID"
                            return output
                        descriptor = descriptors[index]
                        if not isinstance(descriptor, dict) or not isinstance(descriptor.get("id"), str):
                            output["reason"] = "SARIF_INVALID"
                            return output
                        descriptor_id = descriptor["id"]
                        if raw_rule is not None and raw_rule != descriptor_id:
                            output["reason"] = "SARIF_INVALID"
                            return output
                        raw_rule = descriptor_id
                    rule = raw_rule if isinstance(raw_rule, str) and len(raw_rule) <= 128 and SAFE_CODEQL_RULE.fullmatch(raw_rule) else "unknown"
                    if rule == "unknown":
                        if raw_rule is None:
                            reason = "MISSING_RULE_ID"
                        elif not isinstance(raw_rule, str):
                            reason = "INVALID_RULE_ID_TYPE"
                        elif raw_rule.startswith("js/"):
                            reason = "UNSUPPORTED_JS_RULE_ID"
                            suffix = raw_rule[3:]
                            if len(raw_rule) > 128 or any(len(part) > 64 for part in suffix.split("/")):
                                shape = "TOO_LONG"
                            elif "_" in suffix:
                                shape = "HAS_UNDERSCORE"
                            elif "." in suffix:
                                shape = "HAS_DOT"
                            elif "/" in suffix:
                                shape = "HAS_NESTED_SEPARATOR"
                            else:
                                shape = "OTHER_SYNTAX"
                            unclassified_structure[shape] = unclassified_structure.get(shape, 0) + 1
                        elif re.fullmatch(r"[a-z][a-z0-9-]*/[a-z0-9-]+", raw_rule):
                            reason = "OTHER_LANGUAGE_RULE_ID"
                        else:
                            reason = "UNSAFE_RULE_ID"
                        unclassified_reasons[reason] = unclassified_reasons.get(reason, 0) + 1
                    if rule not in rule_counts and len(rule_counts) >= MAX_RULE_GROUPS:
                        rule = "unknown"
                    rule_counts[rule] = rule_counts.get(rule, 0) + 1
                    locations = item.get('locations')
                    if adjudication and isinstance(locations, list) and len(locations) == 1:
                        physical = locations[0].get('physicalLocation', {}) if isinstance(locations[0], dict) else {}
                        if isinstance(physical, dict):
                            artifact, region = physical.get('artifactLocation', {}), physical.get('region', {})
                            if (isinstance(artifact, dict) and isinstance(region, dict)
                                    and artifact.get('uriBaseId') in (None, '%SRCROOT%')
                                    and type(region.get('startLine')) is int
                                    and type(region.get('endLine', EVIDENCE_SINK[2])) is int
                                    and (raw_rule, artifact.get('uri'), region.get('startLine')) == EVIDENCE_SINK
                                    and region.get('endLine', EVIDENCE_SINK[2]) == EVIDENCE_SINK[2]):
                                adjudicable += 1
                    if len(evidence) < MAX_EVIDENCE:
                        locations = item.get("locations")
                        location = locations[0] if isinstance(locations, list) and locations and isinstance(locations[0], dict) else {}
                        physical = location.get("physicalLocation")
                        physical = physical if isinstance(physical, dict) else {}
                        artifact = physical.get("artifactLocation")
                        artifact = artifact if isinstance(artifact, dict) else {}
                        uri = artifact.get("uri")
                        uri = uri if isinstance(uri, str) and len(uri) <= 8192 else ""
                        region = physical.get("region")
                        region = region if isinstance(region, dict) else {}
                        line = region.get("startLine")
                        line = line if type(line) is int and 0 <= line <= 100000000 else 0
                        evidence.append({"rule": rule, "path_sha256_16": hashlib.sha256(uri.encode("utf-8")).hexdigest()[:16] if uri else "", "line": line})
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError, RecursionError):
        output["reason"] = "SARIF_INVALID"
        return output
    # Duplicated/multiple flows at the sink require fresh review. Preserve the
    # scanner's raw total, its evidence and rule counts even when adjudicated.
    false_positives = 1 if adjudicable == 1 else 0
    unresolved = count - false_positives
    output.update(findings=count, false_positives=false_positives, unresolved=unresolved,
                  adjudications=[adjudication] if false_positives else [],
                  status="PASS" if unresolved == 0 else "FAIL",
                  reason="ZERO_FINDINGS" if count == 0 else "REVIEWED_FALSE_POSITIVE" if unresolved == 0 else "CODEQL_FINDINGS",
                  rule_counts=dict(sorted(rule_counts.items())), unclassified_reasons=dict(sorted(unclassified_reasons.items())), unclassified_structure=dict(sorted(unclassified_structure.items())), evidence=evidence)
    return output


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--directory", type=Path, required=True)
    p.add_argument("--sha", required=True)
    args = p.parse_args()
    result = summarize(args.directory, args.sha)
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
