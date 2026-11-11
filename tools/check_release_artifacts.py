import urllib.request, json

api_url = "https://api.github.com/repos/moaz76943-creator/zen-study-focus/actions/workflows/build_aab.yml/runs?per_page=3"
req = urllib.request.Request(api_url, headers={"User-Agent": "DeepFocus-AAB-Inspector"})

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        runs = data.get("workflow_runs", [])
        if not runs:
            print("No build_aab.yml runs found yet.")
        else:
            for idx, r in enumerate(runs[:2]):
                print("--- AAB Workflow Run #" + str(idx + 1) + " ---")
                print("Run ID:", r.get("id"), "| Status:", r.get("status"), "| Conclusion:", r.get("conclusion"))
                print("URL:", r.get("html_url"))
                if r.get("conclusion") == "failure" and r.get("jobs_url"):
                    jreq = urllib.request.Request(r.get("jobs_url"), headers={"User-Agent": "DeepFocus-AAB-Inspector"})
                    with urllib.request.urlopen(jreq, timeout=10) as jresp:
                        jdata = json.loads(jresp.read().decode("utf-8"))
                        for job in jdata.get("jobs", []):
                            for st in job.get("steps", []):
                                if st.get("conclusion") == "failure":
                                    print("  ❌ Failed Step:", st.get("name"))
                elif r.get("conclusion") == "success" and r.get("artifacts_url"):
                    areq = urllib.request.Request(r.get("artifacts_url"), headers={"User-Agent": "DeepFocus-AAB-Inspector"})
                    with urllib.request.urlopen(areq, timeout=10) as aresp:
                        adata = json.loads(aresp.read().decode("utf-8"))
                        for a in adata.get("artifacts", []):
                            mb = round(a.get("size_in_bytes", 0) / (1024 * 1024), 2)
                            print("  📦 Artifact:", a.get("name"), "| Size:", mb, "MB")
except Exception as e:
    print("AAB Inspector note:", e)
