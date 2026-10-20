'use strict';
// Existing v22 CI runs tests/notes_ui/*.test.cjs; load the independent recovery suite without changing CI.
require('../notes_recovery/notes_recovery.test.cjs');
require('../notes_recovery/draft_guard.test.cjs');
