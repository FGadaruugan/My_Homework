(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HomeworkEnhancementUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SMART_SUGGESTIONS = Object.freeze({
    'Дасгал': Object.freeze({
      inputLabel: 'Дасгалын дугаар',
      placeholder: 'Жишээ: 5, 6, 7',
      actions: Object.freeze(['Хийх', 'Бодох', 'Шалгах', 'Дэвтэрт хийх']),
      separator: ' '
    }),
    'Хуудас': Object.freeze({
      inputLabel: 'Хуудасны дугаар',
      placeholder: 'Жишээ: 12–15',
      actions: Object.freeze(['Унших', 'Тэмдэглэл', 'Цээжлэх', 'Дүгнэх']),
      separator: ' '
    }),
    'Мэдээлэл хайх': Object.freeze({
      inputLabel: 'Хайх сэдэв',
      placeholder: 'Жишээ: Нельсон Мандела',
      actions: Object.freeze(['Эх сурвалж олох', 'Тэмдэглэл', 'Товчлох', 'Дүгнэх']),
      separator: ': '
    }),
    'Цээжлэх': Object.freeze({
      inputLabel: 'Юуг цээжлэх вэ?',
      placeholder: 'Жишээ: 20 шинэ үг',
      actions: Object.freeze(['Давтах', 'Өөрийгөө шалгах', 'Карт хийх', 'Бичиж тогтоох']),
      separator: ': '
    }),
    'Бодлого': Object.freeze({
      inputLabel: 'Бодлогын дугаар / сэдэв',
      placeholder: 'Жишээ: 8–11',
      actions: Object.freeze(['Бодох', 'Шалгах', 'Аргаа бичих', 'Дахин бодох']),
      separator: ' '
    }),
    'Унших': Object.freeze({
      inputLabel: 'Юу унших вэ?',
      placeholder: 'Жишээ: §12 эсвэл 24–30-р хуудас',
      actions: Object.freeze(['Унших', 'Тэмдэглэл', 'Асуулт гаргах', 'Дүгнэх']),
      separator: ': '
    })
  });

  function quickText(current, label) {
    const base = String(current || '').trim();
    const prefix = String(label || '').trim();
    if (!prefix) return base;
    return base ? `${base} · ${prefix} ` : `${prefix} `;
  }

  function smartSuggestionPreset(label) {
    return SMART_SUGGESTIONS[String(label || '').trim()] || null;
  }

  function buildSmartSuggestion(label, detail, action) {
    const name = String(label || '').trim();
    const preset = smartSuggestionPreset(name);
    const value = String(detail || '').trim();
    const nextAction = String(action || '').trim();
    if (!preset || !value || !nextAction) return '';
    return `${name}${preset.separator}${value} · ${nextAction}`;
  }

  function mergeSmartSuggestion(current, suggestion) {
    const base = String(current || '').trim();
    const next = String(suggestion || '').trim();
    if (!next) return base;
    if (!base || base === next) return next;
    return `${base} · ${next}`;
  }

  function addDays(value, amount) {
    const [y, m, d] = String(value).split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + Number(amount || 0));
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0')
    ].join('-');
  }

  function shouldShowSearchEmpty(totalRows, visibleRows, query) {
    return Number(totalRows) > 0 &&
      Number(visibleRows) === 0 &&
      String(query || '').trim().length > 0;
  }

  function toUtcDay(value) {
    const [y, m, d] = String(value).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  }

  function smartDueLabel(today, due) {
    const diff = Math.round((toUtcDay(due) - toUtcDay(today)) / 86400000);
    if (diff < 0) return {label: `${Math.abs(diff)} хоног хэтэрсэн`, tone: 'late'};
    if (diff === 0) return {label: 'Өнөөдөр', tone: 'today'};
    if (diff === 1) return {label: 'Маргааш', tone: 'soon'};
    if (diff <= 3) return {label: `${diff} хоног үлдлээ`, tone: 'soon'};
    return {label: `${diff} хоног үлдлээ`, tone: 'normal'};
  }

  function matchesTask(task, query) {
    const q = String(query || '').trim().toLocaleLowerCase('mn');
    if (!q) return true;
    const haystack = [task && task.subject, task && task.title, task && task.notes]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('mn');
    return haystack.includes(q);
  }

  return {
    quickText,
    smartSuggestionPreset,
    buildSmartSuggestion,
    mergeSmartSuggestion,
    addDays,
    shouldShowSearchEmpty,
    smartDueLabel,
    matchesTask
  };
});
