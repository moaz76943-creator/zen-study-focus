'use strict';
// Notes data safety scenarios are also exercised by the existing WebView QA workflow.
require('../notes_ui/df_parallel05_stale_page.test.cjs');

require('../notes_ui/df_parallel05_draft_guard.test.cjs');

require('../notes_ui/df_parallel05_draft_locales.test.cjs');

require('../notes_ui/df_parallel05_reader.test.cjs');

require('../notes_ui/df_parallel05_locale_refresh.test.cjs');

// Keep DF-FINAL-03 durable save/reopen guarantees in the WebView source gate.
require('../notes_ui/df_final03_reopen.test.cjs');
