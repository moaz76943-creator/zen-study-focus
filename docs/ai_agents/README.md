# Deep Focus free-model AI repair pilot

Adds a guarded optional AI code-repair workflow; does not change the existing hourly source audit.

The workflow is installed on default branch main (required for GitHub schedules).
It checks out live integration/master-qa-verified-v21 source, refuses stale heads,
and creates draft PRs only. It cannot merge or approve releases.

## Android Termux guided setup

On the owner's Android phone, in Termux:

```bash
pkg update -y && pkg install -y gh curl
curl -fsSLo "$HOME/df-ai-setup.sh" \
  https://raw.githubusercontent.com/moaz76943-creator/zen-study-focus/main/tools/ai_agents/setup_termux.sh
bash "$HOME/df-ai-setup.sh"
```

The script checks the GitHub account, securely accepts a Groq API key,
saves it as an Actions secret, sets DF_AI_ENABLED=false and sends only
a manual dry-run dispatch. It does not grant broad GitHub approval rights,
start billable activity, label issues, or install third-party GitHub Apps.

## Owner activation steps

1. Obtain a Groq free-tier API key: https://console.groq.com/keys .
   Confirm free-tier availability and limits; do not enable paid overages.
2. GitHub Settings > Secrets and variables > Actions > Secrets: add GROQ_API_KEY.
3. GitHub Settings > Actions > General: allow Actions to create pull requests.
4. GitHub Settings > Secrets and variables > Actions > Variables:
   set DF_AI_ENABLED=true only when ready to use AI.
5. Label an appropriate source-only GitHub issue BOTH agent-ready and agent-safe.
   Never label P0, security, privacy, data loss, SAF, native Android, or release work.
6. Test manually in Actions > Deep Focus AI Repair Pilot, dry_run=true.
   Switch dry_run=false to attempt one repair; hourly schedule runs if enabled.

Default state: disabled. A model invocation only happens after eligible label,
enable variable, usable provider secret, and non-dry run. One issue per hour.
Timeout: 9 minutes for AI, 18 minutes total. Maximum 6 modified files and
250 changed lines, strictly within daily-maintenance source/tests/docs.
Requires modified regression test; runs source tests; stable issue branch prevents
duplicate PRs. Existing integration branch checks and human review remain mandatory.

## Other tools needing separate account authorization

- CodeRabbit: https://www.coderabbit.ai/ — install GitHub App on the public repo.
  Public-source review free subject to fair-use limits; it is not installed by this PR.
- Google Jules: https://jules.google/ — sign into Google and authorize repo access.
- Kilo Code: https://kilo.ai/ — optional CLI/cloud worker; free models can have
  logging/training data policies. Do NOT connect confidential/private repositories
  to third-party free models without a separate security/data review.

Groq quotas are NOT unlimited; credentials belong in GitHub Secrets only.
The private deutsch-build repo is excluded. No GitHub Models dependency.

## Phase 2: owner-controlled first real trial (issue #307)

Before hourly model use, run this from Termux (existing `gh` login and
`GROQ_API_KEY` secret are reused; no key pasted twice):

```bash
curl -fsSLo "$HOME/df-ai-activate.sh" \
  https://raw.githubusercontent.com/moaz76943-creator/zen-study-focus/main/tools/ai_agents/activate_termux.sh
bash "$HOME/df-ai-activate.sh"
```

This runs an issue-specific dry-run, checks permissions, turns on the
variable, and watches the real run. It *only* keeps hourly AI enabled if a
real model call finished and an open **draft** PR for issue #307 exists.
All failures automatically attempt to reset `DF_AI_ENABLED=false`.
Task #307 is source-only and the worker cannot merge anything.
If the GitHub account's Actions permission policy prevents creating PRs,
the helper requests the necessary repo-level change, without changing the
default read-only token permission. This GitHub setting technically also
allows Actions to approve PRs, but the worker does not implement approval.

Groq free-tier rate limits still apply. The helper will not enable payments.
