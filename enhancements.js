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

  function ensureSmartSuggestionStyles() {
    if (document.querySelector('link[data-smart-suggestions]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './smart-suggestions.css';
    link.dataset.smartSuggestions = 'true';
    document.head.append(link);
  }

  function installQuickActions() {
    const title = $('task-title');
    if (!title) return;
    const currentWrap = title.closest('.field')?.nextElementSibling;
    const wrap = currentWrap && currentWrap.getAttribute('aria-label') === 'Даалгаврын хурдан сонголт' ? currentWrap : null;
    if (!wrap) return;

    wrap.className = 'quick-actions';
    wrap.removeAttribute('style');
    wrap.querySelectorAll('button').forEach(button => {
      button.className = 'quick-chip';
      button.removeAttribute('style');
      button.removeAttribute('onclick');
    });

    const wanted = ['Дасгал','Хуудас','Мэдээлэл хайх','Цээжлэх','Бодлого','Унших'];
    const existing = new Set([...wrap.querySelectorAll('button')].map(button => button.textContent.trim()));
    wanted.forEach(label => {
      if (existing.has(label)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick-chip';
      button.textContent = label;
      wrap.append(button);
    });

    const panel = document.createElement('section');
    panel.id = 'smart-suggestion-panel';
    panel.className = 'smart-suggestion-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Ухаалаг санал болгох');
    panel.innerHTML = `
      <div class="smart-suggestion-head">
        <div>
          <span class="smart-suggestion-kicker">УХААЛАГ САНАЛ</span>
          <strong>Ухаалаг санал болгох</strong>
        </div>
        <button type="button" class="smart-suggestion-close" aria-label="Саналыг хаах">×</button>
      </div>
      <label class="smart-suggestion-field">
        <span id="smart-suggestion-label">Нэмэлт мэдээлэл</span>
        <input id="smart-suggestion-detail" type="text" maxlength="100" autocomplete="off">
      </label>
      <div class="smart-suggestion-actions" aria-label="Санал болгох үйлдлүүд"></div>
      <p class="smart-suggestion-tip">Дугаар эсвэл сэдвээ бичээд дараагийн үйлдлээ сонгоно уу.</p>`;
    wrap.insertAdjacentElement('afterend', panel);

    const detail = panel.querySelector('#smart-suggestion-detail');
    const detailLabel = panel.querySelector('#smart-suggestion-label');
    const actions = panel.querySelector('.smart-suggestion-actions');
    const close = panel.querySelector('.smart-suggestion-close');
    let selectedLabel = '';

    function closeComposer() {
      panel.hidden = true;
      selectedLabel = '';
      detail.value = '';
      wrap.querySelectorAll('.quick-chip').forEach(button => button.classList.remove('is-active'));
    }

    function applySuggestion(action) {
      const suggestion = U.buildSmartSuggestion(selectedLabel, detail.value, action);
      if (!suggestion) {
        detail.focus();
        detail.classList.add('needs-value');
        return;
      }

      title.value = U.mergeSmartSuggestion(title.value, suggestion);
      title.dispatchEvent(new Event('input', {bubbles:true}));
      closeComposer();
      title.focus();
      title.setSelectionRange(title.value.length, title.value.length);
    }

    function openComposer(label, sourceButton) {
      const preset = U.smartSuggestionPreset(label);
      if (!preset) {
        title.value = U.quickText(title.value, label);
        title.dispatchEvent(new Event('input', {bubbles:true}));
        return;
      }

      selectedLabel = label;
      detailLabel.textContent = preset.inputLabel;
      detail.placeholder = preset.placeholder;
      detail.value = '';
      detail.classList.remove('needs-value');
      actions.replaceChildren();

      preset.actions.forEach(action => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'smart-suggestion-action';
        button.textContent = action;
        button.addEventListener('click', () => applySuggestion(action));
        actions.append(button);
      });

      wrap.querySelectorAll('.quick-chip').forEach(button => button.classList.toggle('is-active', button === sourceButton));
      panel.hidden = false;
      detail.focus();
    }

    wrap.querySelectorAll('.quick-chip').forEach(button => {
      button.addEventListener('click', () => openComposer(button.textContent.trim(), button));
    });

    detail.addEventListener('input', () => detail.classList.remove('needs-value'));
    close.addEventListener('click', closeComposer);
    $('task-dialog')?.addEventListener('close', closeComposer);
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
        due.value = U.addDays(M.localDate(), days);
        due.dispatchEvent(new Event('change', {bubbles:true}));
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

  function ensureSearchEmpty(visible, totalRows) {
    let empty = $('search-empty');
    if (!empty) {
      empty = document.createElement('div');
      empty.id = 'search-empty';
      empty.className = 'search-empty';
      empty.innerHTML = '<strong>Илэрц олдсонгүй</strong><span>Өөр үгээр хайгаад үзээрэй.</span>';
      $('task-list')?.insertAdjacentElement('afterend', empty);
    }
    empty.hidden = !U.shouldShowSearchEmpty(totalRows, visible, searchQuery);
  }

  function applyEnhancements() {
    const tasks = readTasks();
    const byId = new Map(tasks.map(task => [task.id, task]));
    const today = M.localDate();
    const rows = [...document.querySelectorAll('#task-list .task-row')];
    let visible = 0;

    rows.forEach(row => {
      const task = byId.get(row.dataset.taskId);
      if (!task) return;

      const match = U.matchesTask(task, searchQuery);
      row.hidden = !match;
      if (match) visible++;

      const meta = row.querySelector('.task-meta');
      if (meta && !task.completed) {
        const info = U.smartDueLabel(today, task.due);
        const diff = M.daysBetween(today, task.due);
        let badge = meta.querySelector('.smart-due');

        if (diff >= 2) {
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'smart-due';
            meta.append(badge);
          }
          badge.textContent = info.label;
          badge.dataset.tone = info.tone;
        } else {
          badge?.remove();
        }
      } else if (meta) {
        meta.querySelector('.smart-due')?.remove();
      }
    });

    ensureSearchEmpty(visible, rows.length);
    $('list-count').textContent = visible;
  }

  function installNavLayoutGuard() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.style.position = 'relative';
    });
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
    ensureSmartSuggestionStyles();
    installQuickActions();
    installDateShortcuts();
    installSearch();
    installNavLayoutGuard();
    installKeyboardShortcut();
    applyEnhancements();
    watchRenders();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();