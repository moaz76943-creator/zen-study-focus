/** Deep Focus Room6 U05 — browser-native safe DOM rendering for Focus Lab notes and tasks; textContent only, event delegation, no HTML-string injection, no network. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.DeepFocusLabDom = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {

  const MAX_LABEL_LENGTH = 300;
  const DEFAULT_ARIA_PREFIX = 'Focus Lab';
  // Control, zero-width and bidi-override characters are stripped: neither
  // textContent rendering nor screen readers should ever reveal them.
  const UNSAFE_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200d\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g;
  const SAFE_TAGS = Object.freeze(new Set([
    'section', 'article', 'header', 'footer', 'div', 'p', 'span', 'ul', 'ol',
    'li', 'button', 'h3', 'h4', 'label', 'time', 'strong', 'em', 'small', 'input'
  ]));
  const FORBIDDEN_ATTRS = /^(href|src|srcset|style|action|formaction|xlink:href|srcdoc|data:)$/i;
  const DATA_ACTION_ATTR = 'data-action';
  const DATA_ID_ATTR = 'data-task-id';

  const ACTIONS = Object.freeze({
    ADD_TASK: 'add-task',
    TOGGLE_TASK: 'toggle-task',
    REMOVE_TASK: 'remove-task',
    OPEN_NOTE: 'open-note',
    DELETE_NOTE: 'delete-note'
  });

  function sanitizeLabel(value, maxLength) {
    const cap = typeof maxLength === 'number' && maxLength > 0 ? Math.floor(maxLength) : MAX_LABEL_LENGTH;
    let text;
    if (typeof value === 'string') text = value;
    else if (value === null || value === undefined) text = '';
    else if (typeof value === 'number' || typeof value === 'boolean') text = String(value);
    else text = '';
    text = text.replace(UNSAFE_CHARS, '');
    if (text.length > cap) text = text.slice(0, cap);
    return text.trim();
  }

  function resolveDocument(documentFactory) {
    const doc = documentFactory || (typeof document !== 'undefined' ? document : null);
    if (!doc || typeof doc.createElement !== 'function') {
      throw new Error('createFocusLabDom requires a DOM document factory');
    }
    return doc;
  }

  function createFocusLabDom(documentFactory) {
    const doc = resolveDocument(documentFactory);

    function createElement(tag, attrs, text) {
      const tagName = String(tag).toLowerCase();
      if (!SAFE_TAGS.has(tagName)) {
        throw new Error(`tag <${tagName}> is not on the Focus Lab safe tag list`);
      }
      const element = doc.createElement(tagName);
      for (const [name, rawValue] of Object.entries(attrs || {})) {
        const attrName = String(name);
        if (attrName.toLowerCase().startsWith('on')) {
          throw new Error(`inline event attribute ${attrName} is forbidden; use delegateEvents instead`);
        }
        if (FORBIDDEN_ATTRS.test(attrName)) {
          throw new Error(`attribute ${attrName} is forbidden in safe Focus Lab rendering`);
        }
        element.setAttribute(attrName, sanitizeLabel(rawValue, MAX_LABEL_LENGTH * 4));
      }
      if (typeof text === 'string') element.textContent = sanitizeLabel(text);
      else if (text !== undefined && text !== null) {
        throw new Error('element text must be a string so textContent stays the only renderer');
      }
      return element;
    }

    function mount(target, element) {
      if (!target || typeof target.appendChild !== 'function') {
        throw new Error('mount requires a DOM element target');
      }
      target.appendChild(element);
      return element;
    }

    function renderTaskItem(task, options) {
      if (!task || typeof task !== 'object') {
        throw new Error('renderTaskItem requires a note/task record');
      }
      const opts = options || {};
      const id = sanitizeLabel(task.id, 120);
      const label = sanitizeLabel(task.title !== undefined ? task.title : task.label);
      const completed = task.completed === true;
      const li = createElement('li', {
        class: completed ? 'focus-lab-task is-complete' : 'focus-lab-task',
        [DATA_ID_ATTR]: id,
        'aria-label': `${opts.ariaLabelPrefix || DEFAULT_ARIA_PREFIX} task: ${label}`
      });
      const toggle = createElement('button', {
        type: 'button',
        class: 'focus-lab-task-toggle',
        [DATA_ACTION_ATTR]: ACTIONS.TOGGLE_TASK,
        [DATA_ID_ATTR]: id,
        'aria-label': completed ? `Toggle task (done): ${label}` : `Toggle task: ${label}`
      }, completed ? '\u2611' : '\u2610');
      const labelSpan = createElement('span', {
        class: completed ? 'focus-lab-task-label is-complete' : 'focus-lab-task-label',
        dir: 'auto'
      }, label);
      const remove = createElement('button', {
        type: 'button',
        class: 'focus-lab-task-remove',
        [DATA_ACTION_ATTR]: ACTIONS.REMOVE_TASK,
        [DATA_ID_ATTR]: id,
        'aria-label': `Remove task: ${label}`
      }, '\u00d7');
      li.appendChild(toggle);
      li.appendChild(labelSpan);
      li.appendChild(remove);
      return li;
    }

    function renderTaskList(tasks, options) {
      const opts = options || {};
      const list = createElement('ul', {
        class: 'focus-lab-task-list',
        'aria-label': opts.ariaLabel || `${DEFAULT_ARIA_PREFIX} tasks`
      });
      const records = Array.isArray(tasks) ? tasks : [];
      for (const task of records) list.appendChild(renderTaskItem(task, opts));
      return list;
    }

    function renderNoteCard(note) {
      if (!note || typeof note !== 'object') {
        throw new Error('renderNoteCard requires a note record');
      }
      const title = sanitizeLabel(note.title !== undefined ? note.title : note.label);
      const body = typeof note.body === 'string' ? note.body : '';
      const card = createElement('article', {
        class: 'focus-lab-note',
        'data-note-id': sanitizeLabel(note.id, 120)
      });
      card.appendChild(createElement('h3', { class: 'focus-lab-note-title', dir: 'auto' }, title));
      card.appendChild(createElement('p', {
        class: 'focus-lab-note-body',
        dir: 'auto',
        'aria-label': `Note body: ${sanitizeLabel(body, 120)}`
      }, sanitizeLabel(body)));
      card.appendChild(createElement('button', {
        type: 'button',
        class: 'focus-lab-note-open',
        [DATA_ACTION_ATTR]: ACTIONS.OPEN_NOTE,
        'data-note-id': sanitizeLabel(note.id, 120),
        'aria-label': `Open note: ${title}`
      }, 'Open'));
      card.appendChild(createElement('button', {
        type: 'button',
        class: 'focus-lab-note-delete',
        [DATA_ACTION_ATTR]: ACTIONS.DELETE_NOTE,
        'data-note-id': sanitizeLabel(note.id, 120),
        'aria-label': `Delete note: ${title}`
      }, '\u00d7'));
      return card;
    }

    function resolveActionTarget(target, stopAt) {
      let node = target || null;
      while (node) {
        const action = typeof node.getAttribute === 'function'
          ? node.getAttribute(DATA_ACTION_ATTR)
          : null;
        if (action) return { action: String(action), element: node };
        if (node === stopAt) break;
        node = node.parentElement || node.parentNode || null;
      }
      return null;
    }

    function delegateEvents(rootElement, handlers, options) {
      if (!rootElement || typeof rootElement.addEventListener !== 'function') {
        throw new Error('delegateEvents requires a root element with addEventListener');
      }
      if (!handlers || typeof handlers !== 'object') {
        throw new Error('delegateEvents requires an action handler map');
      }
      const eventType = (options && options.event) || 'click';
      const root = rootElement;
      const listener = (event) => {
        const match = resolveActionTarget(event && event.target, root);
        if (!match) return;
        const handler = handlers[match.action];
        if (typeof handler !== 'function') return;
        handler({
          action: match.action,
          element: match.element,
          id: match.element.getAttribute ? match.element.getAttribute(DATA_ID_ATTR) : null,
          noteId: match.element.getAttribute ? match.element.getAttribute('data-note-id') : null
        }, event);
      };
      rootElement.addEventListener(eventType, listener);
      return function detach() {
        if (typeof rootElement.removeEventListener === 'function') {
          rootElement.removeEventListener(eventType, listener);
        }
      };
    }

    return Object.freeze({
      document: doc,
      ACTIONS,
      MAX_LABEL_LENGTH,
      sanitizeLabel,
      createElement,
      mount,
      renderTaskItem,
      renderTaskList,
      renderNoteCard,
      delegateEvents,
      resolveActionTarget
    });
  }

  return Object.freeze({
    createFocusLabDom,
    sanitizeLabel,
    ACTIONS,
    MAX_LABEL_LENGTH,
    resolveDocument
  });
});
