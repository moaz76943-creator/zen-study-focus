const assert = require('assert');

// Complete Mock DOM environment for Node.js
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
};

class MockElement {
    constructor(id) {
        this.id = id;
        this.textContent = '';
        this.style = {};
        this.classList = {
            _classes: new Set(),
            add(c) { this._classes.add(c); },
            remove(c) { this._classes.delete(c); },
            contains(c) { return this._classes.has(c); }
        };
        this.onclick = null;
    }
    setAttribute(k, v) { this[k] = v; }
    getAttribute(k) { return this[k] || null; }
}

global.document = {
    elements: {
        'timerDisplay': new MockElement('timerDisplay'),
        'domBtn-study': new MockElement('domBtn-study'),
        'domBtn-sport': new MockElement('domBtn-sport'),
        'domBtn-read': new MockElement('domBtn-read'),
        'domBtn-work': new MockElement('domBtn-work'),
        'homeQuick10': new MockElement('homeQuick10'),
        'homeQuick25': new MockElement('homeQuick25'),
        'homeQuick50': new MockElement('homeQuick50'),
        'qtStartButton': new MockElement('qtStartButton'),
        'goalsEditButton': new MockElement('goalsEditButton')
    },
    getElementById(id) {
        return this.elements[id] || null;
    },
    querySelector(selector) {
        return this.elements['timerDisplay'] || null;
    },
    querySelectorAll(selector) {
        return Object.values(this.elements);
    },
    body: {
        addEventListener() {},
        appendChild() {}
    },
    createElement(tag) {
        return new MockElement(tag);
    }
};

const ActionDispatcher = require('../android/app/src/main/assets/web/modules/core/action_dispatcher_engine.js');

console.log('🧪 Testing ActionDispatcherEngine...');

// Test 1: Initialization
ActionDispatcher.init();
assert.strictEqual(ActionDispatcher.isInitialized, true, 'Engine must be initialized');
console.log('✅ Test 1 Passed: Initialization verified.');

// Test 2: Handler Registration
assert.strictEqual(typeof ActionDispatcher.handlers['domBtn-study'], 'function', 'Study preset handler must be registered');
assert.strictEqual(typeof ActionDispatcher.handlers['homeQuick25'], 'function', 'Quick 25 handler must be registered');
console.log('✅ Test 2 Passed: Preset and quick handlers registered.');

// Test 3: Preset Switch Logic
ActionDispatcher.applyPreset('read', 1200, 'قراءة واستيعاب');
assert.strictEqual(ActionDispatcher.activePreset, 'read', 'Active preset must update to read');
assert.strictEqual(global.localStorage.getItem('zen_active_preset_v2'), 'read', 'Preset must persist to localStorage');
console.log('✅ Test 3 Passed: Preset switching and persistence verified.');

// Test 4: Duration Setting
ActionDispatcher.setDurationSeconds(1500, '25:00');
assert.strictEqual(global.document.getElementById('timerDisplay').textContent, '25:00', 'Timer display must be 25:00');
console.log('✅ Test 4 Passed: Duration setter functional and DOM updated to 25:00.');

console.log('🎉 All ActionDispatcherEngine tests passed successfully!');
