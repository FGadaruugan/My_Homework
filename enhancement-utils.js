(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HomeworkEnhancementUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function quickText(current, label) {
    const base = String(current || '').trim();
    const prefix = String(label || '').trim();
    if (!prefix) return base;
    return base ? `${base} · ${prefix} ` : `${prefix} `;
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

  return {quickText, addDays, shouldShowSearchEmpty, smartDueLabel, matchesTask};
});