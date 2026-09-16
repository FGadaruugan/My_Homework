/* Date and record rules shared by the interface and validation. No network calls. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HomeworkModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'my-homework:v1';
  const SUBJECTS = ['Математик', 'Монгол хэл', 'Уран зохиол', 'Үндэсний бичиг', 'Англи хэл', 'Хими', 'Физик', 'Биологи', 'Газар зүй', 'Нийгэм', 'Түүх', 'Мэдээлэл зүй', 'Дизайн технологи', 'Биеийн тамир', 'Эрүүл мэнд', 'Ёс зүй', 'Сонгон', 'Бусад'];
  function localDate(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return y >= 2000 && y <= 2100 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }
  function daysBetween(from, to) {
    if (!validDate(from) || !validDate(to)) throw new Error('Огноо буруу байна.');
    return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
  }
  function validate(input) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
    if (!SUBJECTS.includes(input.subject)) throw new Error('Хичээлээ сонгоорой.');
    if (!title || title.length > 180) throw new Error('Хийх зүйлээ 1–180 тэмдэгтээр бичээрэй.');
    if (!validDate(input.due)) throw new Error('2000–2100 оны хоорондох зөв огноо сонгоорой.');
    if (notes.length > 2000) throw new Error('Тэмдэглэл 2000 тэмдэгтээс ихгүй байна.');
    if (!['normal', 'high'].includes(input.priority)) throw new Error('Ач холбогдлоо сонгоорой.');
    return {subject: input.subject, title, due: input.due, priority: input.priority, notes};
  }
  function decode(raw) {
    if (raw === null) return [];
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.tasks) || data.tasks.length > 500) throw new Error('Хадгалсан мэдээллийн бүтэц буруу байна.');
    const ids = new Set();
    return data.tasks.map(item => {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id) || typeof item.completed !== 'boolean' || !Number.isFinite(item.createdAt)) throw new Error('Хадгалсан даалгаврыг уншиж чадсангүй.');
      ids.add(item.id);
      return {...validate(item), id:item.id, completed:item.completed, createdAt:item.createdAt, completedAt:Number.isFinite(item.completedAt) ? item.completedAt : null};
    });
  }
  function encode(tasks) {
    const raw = JSON.stringify({version:1, tasks});
    decode(raw);
    return raw;
  }
  function select(tasks, view, subject, today = localDate()) {
    return tasks.filter(task => {
      if (subject !== 'all' && task.subject !== subject) return false;
      if (view === 'done') return task.completed;
      if (task.completed) return false;
      return view !== 'today' || task.due <= today;
    }).sort((a, b) => {
      if (view === 'done') return (b.completedAt || 0) - (a.completedAt || 0) || b.createdAt - a.createdAt;
      return a.due.localeCompare(b.due) || Number(b.priority === 'high') - Number(a.priority === 'high') || a.createdAt - b.createdAt;
    });
  }
  function stats(tasks, today = localDate()) {
    return tasks.reduce((out, t) => {
      if (t.completed) out.done++;
      else { out.active++; if (t.due === today) out.today++; if (t.due < today) out.overdue++; }
      return out;
    }, {active:0, today:0, overdue:0, done:0});
  }
  return {KEY, SUBJECTS, localDate, validDate, daysBetween, validate, decode, encode, select, stats};
});
