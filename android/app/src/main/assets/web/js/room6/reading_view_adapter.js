/** Deep Focus Room6 F01 — safe reading view adapter over the real B03 reading bookmarks engine; no storage, no network. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.DeepFocusReadingViewAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  const ENGINE_PATH = '../room5/reading_bookmarks_engine.js';
  const GLOBAL_ENGINE_KEY = 'DeepFocusReadingBookmarks';
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const percent = (page, totalPages) => Math.round((10000 * page) / totalPages) / 100;
  const markerSignature = (bookmarks) => bookmarks
    .map((marker) => `${marker.id}\u0000${marker.label}`)
    .sort()
    .join('\u0001');
  const frozenErrors = (errors) => Object.freeze((errors || []).map((error) => Object.freeze({ ...error })));

  const INTENT_TYPES = Object.freeze({
    PROGRESS: 'reading-view/progress',
    REGRESS: 'reading-view/progress-regress',
    ADD_MARKER: 'reading-view/add-marker',
    REMOVE_MARKER: 'reading-view/remove-marker'
  });

  function resolveEngine() {
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return require(ENGINE_PATH);
    }
    if (root && root[GLOBAL_ENGINE_KEY]) return root[GLOBAL_ENGINE_KEY];
    throw new Error('DeepFocusReadingBookmarks engine is required: load room5/reading_bookmarks_engine.js first');
  }

  function createReadingViewAdapter(engineModule) {
    if (engineModule === null) {
      throw new Error('DeepFocusReadingBookmarks engine is required: load room5/reading_bookmarks_engine.js first');
    }
    const engine = engineModule === undefined ? resolveEngine() : engineModule;
    if (!engine || typeof engine.createBook !== 'function' || typeof engine.summarizeBook !== 'function') {
      throw new Error('DeepFocusReadingBookmarks engine is required: load room5/reading_bookmarks_engine.js first');
    }

    function canonicalBookOrErrors(raw) {
      if (!record(raw)) {
        const created = engine.createBook(raw);
        return created.ok ? { book: created.book } : { errors: created.errors };
      }
      if (raw.schemaVersion === 1) {
        const validated = engine.validateBook(raw);
        return validated.ok ? { book: raw } : { errors: validated.errors };
      }
      if (raw.schemaVersion === undefined) {
        const created = engine.createBook(raw);
        return created.ok ? { book: created.book } : { errors: created.errors };
      }
      const migrated = engine.migrate(raw);
      return migrated.ok ? { book: migrated.book } : { errors: migrated.errors };
    }

    function createReadingViewModel(raw) {
      const resolved = canonicalBookOrErrors(raw);
      if (resolved.errors) {
        return Object.freeze({ ok: false, errors: frozenErrors(resolved.errors) });
      }
      const book = resolved.book;
      const summary = engine.summarizeBook(book);
      const viewmodel = Object.freeze({
        bookId: book.id,
        title: book.title,
        totalPages: book.totalPages,
        currentPage: book.currentPage,
        summary: Object.freeze({ ...summary }),
        progress: Object.freeze({
          percentComplete: summary.percentComplete,
          remainingPages: book.totalPages - book.currentPage,
          isStarted: book.currentPage > 0,
          isComplete: book.currentPage >= book.totalPages
        }),
        markers: Object.freeze(book.bookmarks.map((marker) => Object.freeze({
          id: marker.id,
          page: marker.page,
          label: marker.label,
          percentPosition: percent(marker.page, book.totalPages)
        })))
      });
      return Object.freeze({ ok: true, viewmodel });
    }

    const createProgressIntent = (page) => Object.freeze({ type: INTENT_TYPES.PROGRESS, page });
    const createRegressIntent = (page) => Object.freeze({ type: INTENT_TYPES.REGRESS, page });
    const createAddMarkerIntent = (page, label) => Object.freeze({ type: INTENT_TYPES.ADD_MARKER, page, label });
    const createRemoveMarkerIntent = (id) => Object.freeze({ type: INTENT_TYPES.REMOVE_MARKER, id });

    function normalizedBefore(raw) {
      const before = engine.summarizeBook(raw);
      if (!before) return null;
      return engine.updateProgress(raw, before.currentPage, { allowRegression: true }).book;
    }

    function applyIntent(raw, intent) {
      if (!record(intent) || typeof intent.type !== 'string') {
        return Object.freeze({
          ok: false,
          intentType: null,
          errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
        });
      }
      let outcome;
      switch (intent.type) {
        case INTENT_TYPES.PROGRESS:
          outcome = engine.updateProgress(raw, intent.page);
          break;
        case INTENT_TYPES.REGRESS:
          outcome = engine.updateProgress(raw, intent.page, { allowRegression: true });
          break;
        case INTENT_TYPES.ADD_MARKER:
          outcome = engine.addBookmark(raw, { page: intent.page, label: intent.label });
          break;
        case INTENT_TYPES.REMOVE_MARKER:
          outcome = engine.removeBookmark(raw, intent.id);
          break;
        default:
          return Object.freeze({
            ok: false,
            intentType: intent.type,
            errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
          });
      }
      if (!outcome.ok) {
        return Object.freeze({ ok: false, intentType: intent.type, errors: frozenErrors(outcome.errors) });
      }
      const beforeBook = normalizedBefore(raw);
      const changed = beforeBook
        ? outcome.book.currentPage !== beforeBook.currentPage ||
          markerSignature(outcome.book.bookmarks) !== markerSignature(beforeBook.bookmarks)
        : true;
      return Object.freeze({ ok: true, intentType: intent.type, changed, book: outcome.book });
    }

    function safeRenderPlan(viewmodel, options) {
      const opts = options || {};
      const attrs = { class: 'reading-view', 'aria-label': viewmodel.title };
      if (opts.dir === 'rtl' || opts.dir === 'ltr' || opts.dir === 'auto') attrs.dir = opts.dir;
      const leaf = (tag, className, text) => Object.freeze({
        tag,
        attrs: Object.freeze({ class: className }),
        text,
        children: Object.freeze([])
      });
      return Object.freeze({
        tag: 'section',
        attrs: Object.freeze(attrs),
        children: Object.freeze([
          leaf('p', 'reading-view-title', viewmodel.title),
          leaf(
            'p',
            'reading-view-progress',
            `Page ${viewmodel.currentPage} of ${viewmodel.totalPages} - ${viewmodel.progress.percentComplete}%`
          ),
          Object.freeze({
            tag: 'progress',
            attrs: Object.freeze({
              class: 'reading-view-progress-bar',
              value: String(viewmodel.currentPage),
              max: String(viewmodel.totalPages)
            }),
            children: Object.freeze([])
          }),
          Object.freeze({
            tag: 'ol',
            attrs: Object.freeze({ class: 'reading-view-markers', 'aria-label': 'Reading markers' }),
            children: Object.freeze(viewmodel.markers.map((marker) => Object.freeze({
              tag: 'li',
              attrs: Object.freeze({ class: 'reading-view-marker', 'data-marker-id': marker.id }),
              children: Object.freeze([
                leaf('span', 'reading-view-marker-page', `p. ${marker.page}`),
                Object.freeze({
                  tag: 'span',
                  attrs: Object.freeze({ class: 'reading-view-marker-label', dir: 'auto' }),
                  text: marker.label,
                  children: Object.freeze([])
                }),
                leaf('span', 'reading-view-marker-position', `${marker.percentPosition}%`)
              ])
            })))
          })
        ])
      });
    }

    function mountProgressView(target, plan, documentFactory) {
      const doc = documentFactory || (typeof document !== 'undefined' ? document : null);
      if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('mountProgressView requires a DOM document factory');
      }
      const build = (node) => {
        const element = doc.createElement(node.tag);
        for (const [name, value] of Object.entries(node.attrs || {})) element.setAttribute(name, value);
        if (typeof node.text === 'string') element.textContent = node.text;
        for (const child of node.children || []) element.appendChild(build(child));
        return element;
      };
      const mounted = build(plan);
      if (target) target.appendChild(mounted);
      return mounted;
    }

    return Object.freeze({
      engine,
      schemaVersion: engine.SCHEMA_VERSION,
      INTENT_TYPES,
      createReadingViewModel,
      createProgressIntent,
      createRegressIntent,
      createAddMarkerIntent,
      createRemoveMarkerIntent,
      applyIntent,
      safeRenderPlan,
      mountProgressView
    });
  }

  const defaultAdapter = createReadingViewAdapter();
  return Object.freeze(Object.assign({}, defaultAdapter, { createReadingViewAdapter }));
});
