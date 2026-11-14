'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('openLanguageModal opens the language modal and clears the search input', () => {
    const appJsSource = fs.readFileSync(path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js'), 'utf8');

    // We want to test that the exact string implementation behaves correctly
    // by extracting it and running it safely

    const openLanguageModalMatch = appJsSource.match(/function openLanguageModal\(\) \{[\s\S]*?\n\}/);
    assert.ok(openLanguageModalMatch, 'openLanguageModal function must exist in app.js');
    const openLanguageModalSource = openLanguageModalMatch[0];

    // Basic structural checks of the function implementation to ensure the correct behavior is present
    assert.ok(openLanguageModalSource.includes('document.getElementById(\'inpLangCountrySearch\').value = \'\';'),
        'Must clear the inpLangCountrySearch input');
    assert.ok(openLanguageModalSource.includes('renderLanguageList();'),
        'Must call renderLanguageList');
    assert.ok(openLanguageModalSource.includes('document.getElementById(\'langModal\').classList.add(\'open\');'),
        'Must add open class to langModal');

    // Execute a simulated version to ensure logic matches DOM expectations
    const domState = {
        inpLangCountrySearch: { value: 'initial' },
        langModal: { classList: { classes: [], add(c) { this.classes.push(c); } } },
        langListScrollBox: { innerHTML: 'old items' }
    };

    const document = {
        getElementById(id) {
            return domState[id] || {
                value: '',
                classList: { add() {} },
                innerHTML: '',
                replaceChildren() {}
            };
        }
    };

    // mock renderLanguageList
    let renderLanguageListCalled = false;
    function renderLanguageList() {
        renderLanguageListCalled = true;
    }

    // Evaluate the extracted function in this scope using new Function
    const testFunc = new Function('document', 'renderLanguageList', `
        ${openLanguageModalSource}
        openLanguageModal();
    `);

    testFunc(document, renderLanguageList);

    assert.equal(domState.inpLangCountrySearch.value, '', 'Input should be cleared');
    assert.ok(domState.langModal.classList.classes.includes('open'), 'Modal should have open class');
    assert.ok(renderLanguageListCalled, 'renderLanguageList should be called');
});
