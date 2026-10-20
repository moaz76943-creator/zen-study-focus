#!/usr/bin/env python3
"""Configuration checks; no network access, external libraries or user data."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/deep_focus_private_tool_lab.yml"
SECURITY = ROOT / ".github/workflows/deep_focus_privacy_security.yml"
MAESTRO = ROOT / "tools/tool_integrations/maestro_smoke.yaml"

def check():
    lab = WORKFLOW.read_text()
    security = SECURITY.read_text()
    flow = MAESTRO.read_text()
    assert "workflow_dispatch:" in lab
    assert "pull_request:" not in lab and "schedule:" not in lab, "Emulator/browser tool lab must stay manual"
    assert "permissions:\n  contents: read" in lab
    assert "MAESTRO_CLI_NO_ANALYTICS:" in lab and "MAESTRO_API_URL:" in lab
    assert "ip6tables -I OUTPUT" in lab and "iptables -I OUTPUT" in lab
    assert "secrets." not in lab
    assert "MAESTRO_CLOUD_API_KEY" not in lab
    assert "security-events: write" in security
    assert "gitleaks" in security and "--redact" in security and "sha256sum -c -" in security
    assert "assertVisible:" in flow
    assert "clearState" not in flow and "assertWithAI" not in flow and "assertNoDefectsWithAI" not in flow

if __name__ == "__main__":
    check()
    print("PASS: static privacy-first workflow invariants. No live service/device test.")
