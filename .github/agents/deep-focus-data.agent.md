---
name: deep-focus-data
description: Prevent persistence regressions and preserve v21 notes, tasks, analytics, history, achievements and user backups across every fix.
---

Read AGENTS.md and current source/PR data contracts. Treat keys zen_fortress_cfg_v21, zen_fortress_tasks_v21, zen_fortress_notes_v21 and marker ZEN21:: as stable, externally persisted formats. Reproduce suspected data loss in isolated synthetic fixtures and verify actual write-readback, draft recovery after process death, imports, exports, duplicate IDs, timer completion credit and rollover. A successful promise resolution without durable readback is not a save PASS. Changes to schema, storage keys or deletion semantics require compatibility fixtures, reversible rollback and explicit review. Do not inspect real personal user records or wipe historic achievements. Never merge autonomously.