import urllib.request, json

api_url = "https://api.github.com/repos/moaz76943-creator/zen-study-focus/actions/runs?status=success&per_page=1"
req = urllib.request.Request(api_url, headers={"User-Agent": "DeepFocus-Artifact-Inspector"})

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        runs = data.get("workflow_runs", [])
        if not runs:
            print("No successful runs found yet.")
        else:
            r = runs[0]
            print("Latest Successful CI Run ID:", r.get("id"))
            print("Commit SHA:", r.get("head_sha"))
            art_url = r.get("artifacts_url")
            if art_url:
                areq = urllib.request.Request(art_url, headers={"User-Agent": "DeepFocus-Artifact-Inspector"})
                with urllib.request.urlopen(areq, timeout=10) as aresp:
                    adata = json.loads(aresp.read().decode("utf-8"))
                    for a in adata.get("artifacts", []):
                        mb = round(a.get("size_in_bytes", 0) / (1024 * 1024), 2)
                        print("Artifact:", a.get("name"), "| Size:", mb, "MB | Expired:", a.get("expired"))
except Exception as e:
    print("Artifact inspection note:", e)
