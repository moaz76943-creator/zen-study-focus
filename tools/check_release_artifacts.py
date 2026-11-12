#!/usr/bin/env python3
import urllib.request
import json
import sys

REPO = "moaz76943-creator/zen-study-focus"
RUNS_URL = f"https://api.github.com/repos/{REPO}/actions/workflows/build_aab.yml/runs?per_page=5"
HEADERS = {
    "User-Agent": "Deep-Focus-Production-Auditor",
    "Accept": "application/vnd.github.v3+json"
}

print("==================================================================")
print("🔍 Sovereign CI Auditor: Checking build_aab.yml Workflow Runs")
print("==================================================================")

try:
    req = urllib.request.Request(RUNS_URL, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())

    runs = data.get("workflow_runs", [])
    if not runs:
        print("⚠️ No build_aab.yml workflow runs found.")
        sys.exit(0)

    print(f"Found {len(runs)} recent run(s) for build_aab.yml:")
    for idx, r in enumerate(runs[:3]):
        run_id = r.get("id")
        status = r.get("status")
        conclusion = r.get("conclusion")
        head_commit = r.get("head_commit", {}).get("message", "").split("\n")[0]
        html_url = r.get("html_url")
        print(f"\n[{idx+1}] Run ID: {run_id}")
        print(f"    Status: {status} | Conclusion: {conclusion}")
        print(f"    Commit: {head_commit}")
        print(f"    URL: {html_url}")

        # Check artifacts for the run
        artifacts_url = r.get("artifacts_url")
        if artifacts_url:
            areq = urllib.request.Request(artifacts_url, headers=HEADERS)
            try:
                with urllib.request.urlopen(areq, timeout=15) as aresp:
                    adata = json.loads(aresp.read().decode())
                arts = adata.get("artifacts", [])
                if arts:
                    print("    📦 Artifacts:")
                    for a in arts:
                        size_mb = round(a.get("size_in_bytes", 0) / (1024 * 1024), 2)
                        print(f"       - {a.get('name')}: {size_mb} MB")
                else:
                    print("    ℹ️ No uploaded artifacts recorded yet.")
            except Exception:
                pass

        # If failed, inspect jobs to find exact failing step
        if conclusion == "failure":
            jobs_url = r.get("jobs_url")
            if jobs_url:
                jreq = urllib.request.Request(jobs_url, headers=HEADERS)
                try:
                    with urllib.request.urlopen(jreq, timeout=15) as jresp:
                        jdata = json.loads(jresp.read().decode())
                    for job in jdata.get("jobs", []):
                        if job.get("conclusion") == "failure":
                            print(f"    ❌ Failing Job: {job.get('name')}")
                            for step in job.get("steps", []):
                                if step.get("conclusion") == "failure":
                                    print(f"       -> Failed Step: {step.get('name')} (Step #{step.get('number')})")
                except Exception:
                    pass

except Exception as err:
    print(f"⚠️ Network check deferred or error: {err}")

print("==================================================================")
