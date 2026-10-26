/* Offline ParentNode compatibility for Android's older bundled WebViews. */
(function () {
  'use strict';
  function replaceChildren() {
    var owner = this.ownerDocument || this;
    var fragment = owner.createDocumentFragment();
    for (var i = 0; i < arguments.length; i++) {
      var child = arguments[i];
      fragment.appendChild(child instanceof Node ? child : owner.createTextNode(String(child)));
    }
    while (this.firstChild) this.removeChild(this.firstChild);
    this.appendChild(fragment);
  }
  [Element.prototype, DocumentFragment.prototype, Document.prototype].forEach(function (prototype) {
    if (typeof prototype.replaceChildren !== 'function') {
      Object.defineProperty(prototype, 'replaceChildren', {
        configurable: true, writable: true, value: replaceChildren
      });
    }
  });
}());
