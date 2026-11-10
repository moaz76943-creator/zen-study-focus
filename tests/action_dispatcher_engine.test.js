const assert = require("assert");

global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
};

class MockElement {
    constructor(id) {
        this.id = id;
        this.textContent = "";
        this.style = {};
        this.classList = {
            _classes: new Set(),
            add(c) { this._classes.add(c); },
            remove(c) { this._classes.delete(c); }
        };
        this.onclick = null;
    }
    setAttribute(k, v) { this[k] = v; }
    getAttribute(k) { return this[k] || null; }
}

global.document = {
    elements: {
        "timerDisplay": new MockElement("timerDisplay"),
        "domBtn-study": new MockElement("domBtn-study"),
        "homeQuick25": new MockElement("homeQuick25")
    },
    getElementById(id) { return this.elements[id] || null; },
    querySelector(s) { return this.elements["timerDisplay"] || null; },
    querySelectorAll() { return Object.values(this.elements); },
    body: { addEventListener() {}, appendChild() {} },
    createElement(t) { return new MockElement(t); }
};

const ActionDispatcher = require("../android/app/src/main/assets/web/modules/core/action_dispatcher_engine.js");

ActionDispatcher.init();
assert.strictEqual(ActionDispatcher.isInitialized, true, "Engine initialized");
assert.strictEqual(typeof ActionDispatcher.handlers["domBtn-study"], "function", "Handler registered");
ActionDispatcher.applyPreset("read", 1200, "قراءة");
assert.strictEqual(ActionDispatcher.activePreset, "read", "Active preset set");
ActionDispatcher.setDurationSeconds(1500, "25:00");
assert.strictEqual(global.document.getElementById("timerDisplay").textContent, "25:00", "DOM timer verified");

console.log("🎉 All ActionDispatcher tests passed successfully!");
