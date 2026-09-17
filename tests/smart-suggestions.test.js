const assert = require('assert');
const U = require('../enhancement-utils.js');

const page = U.smartSuggestionPreset('Хуудас');
assert.strictEqual(page.inputLabel, 'Хуудасны дугаар');
assert.strictEqual(page.placeholder, 'Жишээ: 12–15');
assert.deepStrictEqual(page.actions, ['Унших', 'Тэмдэглэл', 'Цээжлэх', 'Дүгнэх']);
assert.strictEqual(U.buildSmartSuggestion('Хуудас', ' 12–15 ', 'Унших'), 'Хуудас 12–15 · Унших');

const exercise = U.smartSuggestionPreset('Дасгал');
assert.strictEqual(exercise.inputLabel, 'Дасгалын дугаар');
assert.deepStrictEqual(exercise.actions, ['Хийх', 'Бодох', 'Шалгах', 'Дэвтэрт хийх']);
assert.strictEqual(U.buildSmartSuggestion('Дасгал', '5, 6, 7', 'Бодох'), 'Дасгал 5, 6, 7 · Бодох');

assert.strictEqual(U.buildSmartSuggestion('Мэдээлэл хайх', 'Нельсон Мандела', 'Тэмдэглэл'), 'Мэдээлэл хайх: Нельсон Мандела · Тэмдэглэл');
assert.strictEqual(U.mergeSmartSuggestion('', 'Хуудас 12–15 · Унших'), 'Хуудас 12–15 · Унших');
assert.strictEqual(U.mergeSmartSuggestion('Хими', 'Дасгал 5 · Хийх'), 'Хими · Дасгал 5 · Хийх');
assert.strictEqual(U.smartSuggestionPreset('Тодорхойгүй'), null);

console.log('smart-suggestions tests passed');
