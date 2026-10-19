# UX Recovery 15 — standalone functional preview

Open \`index.html\` locally in a modern browser. No server, login, dependency install, internet access or production data is needed. The demo deliberately contains sample tasks and one note.

**Try:** add a task, choose a top-three priority, complete/reopen it, expand More to add/tick checklist steps or delete/undo; open Notes, add a quick or Cornell note, search, enter Read, Edit, or delete/undo; switch Arabic/English with a dialog open. All edits are **temporary in-memory data** and disappear on refresh.

Design: white premium futuristic; soft cyan, blue, violet; 44px touch surfaces; scoped \`.ux15\` CSS; semantic interactive controls. No toolbar buttons are decorative.

Run after checking out repository:
\`\`\`sh
node --check design/ux_recovery15/prototype.js
node --test tests/ux_recovery15/*.test.cjs
\`\`\`

See [UX_REPORT.md](./UX_REPORT.md) for tap counts, existing-core mapping, integration contracts, blockers and test status. This demo must not be loaded directly into the Android production page. The recovery-00 owner should incorporate the patterns through the existing Notes/Tasks adapter APIs.
