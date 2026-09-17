const assert = require('assert');
const U = require('../enhancement-utils.js');

const expectedPresets = {
  'Хуудас': ['Хуудасны дугаар', 'Жишээ: 12–15', ['Унших', 'Тэмдэглэл', 'Цээжлэх', 'Дүгнэх']],
  'Дасгал': ['Дасгалын дугаар', 'Жишээ: 5, 6, 7', ['Хийх', 'Бодох', 'Шалгах', 'Дэвтэрт хийх']],
  'Мэдээлэл хайх': ['Хайх сэдэв', 'Жишээ: Нельсон Мандела', ['Эх сурвалж олох', 'Тэмдэглэл', 'Товчлох', 'Дүгнэх']],
  'Цээжлэх': ['Юуг цээжлэх вэ?', 'Жишээ: 20 шинэ үг', ['Давтах', 'Өөрийгөө шалгах', 'Карт хийх', 'Бичиж тогтоох']],
  'Бодлого': ['Бодлогын дугаар / сэдэв', 'Жишээ: 8–11', ['Бодох', 'Шалгах', 'Аргаа бичих', 'Дахин бодох']],
  'Унших': ['Юу унших вэ?', 'Жишээ: §12 эсвэл 24–30-р хуудас', ['Унших', 'Тэмдэглэл', 'Асуулт гаргах', 'Дүгнэх']]
};

for (const [label, [inputLabel, placeholder, actions]] of Object.entries(expectedPresets)) {
  const preset = U.smartSuggestionPreset(label);
  assert.strictEqual(preset.inputLabel, inputLabel);
  assert.strictEqual(preset.placeholder, placeholder);
  assert.deepStrictEqual(preset.actions, actions);
}

assert.strictEqual(U.buildSmartSuggestion('Хуудас', ' 12–15 ', 'Унших'), 'Хуудас 12–15 · Унших');
assert.strictEqual(U.buildSmartSuggestion('Дасгал', '5, 6, 7', 'Бодох'), 'Дасгал 5, 6, 7 · Бодох');
assert.strictEqual(U.buildSmartSuggestion('Мэдээлэл хайх', 'Нельсон Мандела', 'Тэмдэглэл'), 'Мэдээлэл хайх: Нельсон Мандела · Тэмдэглэл');
assert.strictEqual(U.mergeSmartSuggestion('', 'Хуудас 12–15 · Унших'), 'Хуудас 12–15 · Унших');
assert.strictEqual(U.mergeSmartSuggestion('Хими', 'Дасгал 5 · Хийх'), 'Хими · Дасгал 5 · Хийх');
assert.strictEqual(U.smartSuggestionPreset('Тодорхойгүй'), null);

console.log('smart-suggestions tests passed');
