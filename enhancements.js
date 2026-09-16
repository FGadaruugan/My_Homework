(() => {
  'use strict';

  const M = window.HomeworkModel;
  const U = window.HomeworkEnhancementUtils;
  if (!M || !U) return;

  const $ = id => document.getElementById(id);
  let searchQuery = '';
  let observer;

  function readTasks() {
    try { return M.decode(localStorage.getItem(M.KEY)); }
    catch (_) { return []; }
  }

  function addDays(value, amount) {
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12);
    date.setDate(date.getDate() + amount);
    return M.localDate(date);
  }

  function installQuickActions() {
    const title = $('task-title');
    if (!title) return;
    const currentWrap = title.closest('.field')?.nextElementSibling;
    let wrap = currentWrap && currentWrap.getAttribute('aria-label') === 'Даалгаврын хурдан сонголт' ? currentWrap : null;
    if (!wrap) return;

    wrap.className = 'quick-actions';
    wrap.removeAttribute('style');
    wrap.querySelectorAll('button').forEach(button => {
      button.className = 'quick-chip';
      button.removeAttribute('style');
      button.removeAttribute('onclick');
    });

    const wanted = ['Дасгал','Хуудас','Мэдээлэл хайх','Цээжлэх','Бодлого','Унших'];
    const existing = new Set([...wrap.querySelectorAll('button')].map(b => b.textContent.trim()));
    wanted.forEach(label => {
      if (existing.has(label)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick-chip';
      button.textContent = label;
      wrap.append(button);
    });

    wrap.querySelectorAll('.quick-chip').forEach(button => {
      button.addEventListener('click', () => {
        title.value = U.quickText(title.value, button.textContent);
        title.dispatchEvent(new Event('input', {bubbles:true}));
        title.focus();
        title.setSelectionRange(title.value.length, title.value.length);
      });
    });
  }

  function installDateShortcuts() {
    if ($('date-shortcuts')) return;
    const due = $('task-due');
    if (!due) return;
    const row = due.closest('.form-row');
    if (!row) return;

    const wrap = document.createElement('div');
    wrap.id = 'date-shortcuts';
    wrap.className = 'date-shortcuts';
    [
      ['Өнөөдөр', 0],
      ['Маргааш', 1],
      ['+3 хоног', 3],
      ['+7 хоног', 7]
    ].forEach(([label, days]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'date-shortcut';
      button.textContent = label;
      button.addEventListener('click', () => {
        const base = $('task-assigned').value || M.localDate();
        due.value = addDays(base, days);
        due.focus();
      });
      wrap.append(button);
    });
    const tip = document.createElement('p');
    tip.className = 'form-tip';
    tip.textContent = 'Хугацааг дээрх товчоор хурдан сонгож болно.';
    row.insertAdjacentElement('afterend', wrap);
    wrap.insertAdjacentElement('afterend', tip);
  }

  function installSearch() {
    if ($('task-search')) return;
    const taskList = $('task-list');
    if (!taskList) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'smart-toolbar';
    const search = document.createElement('label');
    search.className = 'smart-search';
    search.innerHTML = '<span class="sr-only">Даалгавар хайх</span><input id="task-search" type="search" placeholder="Даалгавар эсвэл хичээл хайх…" autocomplete="off"><button type="button" class="smart-search-clear" aria-label="Хайлтыг цэвэрлэх">×</button>';
    const hint = document.createElement('span');
    hint.className = 'smart-hint';
    hint.textContent = 'N = шинэ даалгавар';
    toolbar.append(search, hint);
    taskList.insertAdjacentElement('beforebegin', toolbar);

    const input = $('task-search');
    input.addEventListener('input', () => {
      searchQuery = input.value;
      applyEnhancements();
    });
    toolbar.querySelector('.smart-search-clear').addEventListener('click', () => {
      input.value = '';
      searchQuery = '';
      input.focus();
      applyEnhancements();
    });
  }

  function ensureSearchEmpty(visible) {
    let empty = $('search-empty');
    if (!empty) {
      empty = document.createElement('div');
      empty.id = 'search-empty';
      empty.className = 'search-empty';
      empty.innerHTML = '<strong>Илэрц олдсонгүй</strong><span>Өөр үгээр хайгаад үзээрэй.</span>';
      $('task-list')?.insertAdjacentElement('afterend', empty);
    }
    empty.hidden = visible !== 0 || !searchQuery.trim();
  }

  function applyEnhancements() {
    const tasks = readTasks();
    const byId = new Map(tasks.map(task => [task.id, task]));
    const today = M.localDate();
    let visible = 0;

    document.querySelectorAll('#task-list .task-row').forEach(row => {
      const task = byId.get(row.dataset.taskId);
      if (!task) return;

      const match = U.matchesTask(task, searchQuery);
      row.hidden = !match;
      if (match) visible++;

      const meta = row.querySelector('.task-meta');
      if (meta && !task.completed) {
        let badge = meta.querySelector('.smart-due');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'smart-due';
          meta.append(badge);
        }
        const info = U.smartDueLabel(today, task.due);
        badge.textContent = info.label;
        badge.dataset.tone = info.tone;
      } else if (meta) {
        meta.querySelector('.smart-due')?.remove();
      }
    });

    ensureSearchEmpty(visible);
    $('list-count').textContent = visible;
  }

  function installKeyboardShortcut() {
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
      if (typing) return;
      if (event.key.toLocaleLowerCase('en') !== 'n') return;
      const add = document.querySelector('[data-add]');
      if (add) {
        event.preventDefault();
        add.click();
      }
    });
  }

  function watchRenders() {
    const list = $('task-list');
    if (!list) return;
    observer = new MutationObserver(() => applyEnhancements());
    observer.observe(list, {childList:true});
    window.addEventListener('pagehide', () => observer?.disconnect(), {once:true});
  }

  function boot() {
    installQuickActions();
    installDateShortcuts();
    installSearch();
    installKeyboardShortcut();
    applyEnhancements();
    watchRenders();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();