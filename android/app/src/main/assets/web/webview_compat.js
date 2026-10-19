/* Compatibility for WebViews without ParentNode.replaceChildren (e.g. Chromium 83).
 * Nodes/text only: never parses HTML, rewrites storage, or replaces native implementations. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.DeepFocusWebViewCompat = api; api.install(root); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function install(host) {
    var installed = 0;
    [host.Element, host.DocumentFragment].forEach(function (Type) {
      if (!Type || typeof Type.prototype.replaceChildren === 'function') return;
      Object.defineProperty(Type.prototype, 'replaceChildren', {
        configurable: true, writable: true,
        value: function () {
          var owner = this.ownerDocument || host.document;
          var nodes = [], i;
          // Validate/convert every argument before moving any existing child.
          for (i = 0; i < arguments.length; i++) {
            var value = arguments[i];
            var node = value instanceof host.Node ? value : owner.createTextNode(String(value));
            if (node === this || (node.contains && node.contains(this)))
              throw new host.DOMException('Cannot insert an ancestor', 'HierarchyRequestError');
            nodes.push(node);
          }
          var fragment = owner.createDocumentFragment();
          for (i = 0; i < nodes.length; i++) fragment.appendChild(nodes[i]);
          while (this.firstChild) this.removeChild(this.firstChild);
          this.appendChild(fragment);
        }
      });
      installed++;
    });
    return installed;
  }
  return Object.freeze({install: install});
});
