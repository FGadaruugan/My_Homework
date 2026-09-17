const assert = require('assert');
const fs = require('fs');
const path = require('path');

const enhancements = fs.readFileSync(path.join(__dirname, '..', 'enhancements.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'super.css'), 'utf8');

assert.match(enhancements, /smart-suggestion-panel/);
assert.match(enhancements, /smart-suggestion-detail/);
assert.match(enhancements, /Ухаалаг санал болгох/);
assert.match(enhancements, /buildSmartSuggestion/);
assert.match(css, /\.smart-suggestion-panel/);
assert.match(css, /\.smart-suggestion-actions/);
assert.match(css, /\.smart-suggestion-action/);

console.log('smart-suggestions UI contract tests passed');
