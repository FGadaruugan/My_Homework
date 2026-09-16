(() => {
  'use strict';

  const M = window.HomeworkModel;
  const $ = id => document.getElementById(id);
  const state = {tasks: [], view: 'all', subject: 'all', deleting: null, undo: null, today: M.localDate()};
  const weekdays = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
  const colors = [
    ['#edf1ff', '#4963ae'],
    ['#edf7f3', '#2a7f60'],
    ['#fff3e4', '#916622'],
    ['#f3edff', '#815aa9'],
    ['#fceef4', '#a45d7c']
  ];
  const icons = new Set(['book', 'clock', 'check', 'edit', 'trash', 'flag', 'circle-check', 'calendar']);
  let toastTimer;

  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + (icons.has(name) ? name : 'book'));
    svg.append(use);
    return svg;
  }

  function installAssignedField() {
    if ($('task-assigned')) return;
    const dueRow = $('task-due')?.closest('.form-row');
    if (!dueRow) return;

    const label = node('label', 'field');
    label.append('Хэзээний даалгавар вэ?');
    const input = document.createElement('input');
    input.id = 'task-assigned';
    input.name = 'assigned';
    input.type = 'date';
    input.min = '2000-01-01';
    input.max = '2100-12-31';
    input.required = true;
    label.append(input);
    dueRow.parentNode.insertBefore(label, dueRow);
  }

  function readSaved() {
    return M.decode(localStorage.getItem(M.KEY));
  }

  function reportStorage(error) {
    $('storage-error').textContent = 'Мэдээллийг унших эсвэл хадгалах боломжгүй байна. Хөтчийн хадгалах тохиргоо, сул зайг шалгаарай. Өмнөх мэдээллийг дарж бичээгүй.';
    $('storage-error').hidden = false;
    console.warn('My Homework storage:', error instanceof Error ? error.message : 'unavailable');
  }

  function load() {
    try {
      state.tasks = readSaved();
      $('storage-error').hidden = true;
    } catch (error) {
      reportStorage(error);
    }
  }

  function commit(transform) {
    const current = readSaved();
    const updated = transform(current);
    localStorage.setItem(M.KEY, M.encode(updated));
    state.tasks = updated;
    $('storage-error').hidden = true;
    render();
  }

  function dateText(value) {
    const [year, month, day] = value.split('-').map(Number);
    return (year === Number(state.today.slice(0, 4)) ? '' : year + '. ') + month + ' сарын ' + day;
  }

  function dueInfo(task) {
    if (task.completed) return {label: 'Дууссан', className: 'is-complete', icon: 'circle-check'};
    const diff = M.daysBetween(state.today, task.due);
    if (diff < 0) return {label: Math.abs(diff) + ' хоног хэтэрсэн', className: 'is-late', icon: 'clock'};
    if (diff === 0) return {label: 'Өнөөдөр', className: 'is-today', icon: 'clock'};
    if (diff === 1) return {label: 'Маргааш', className: '', icon: 'clock'};
    return {label: dateText(task.due), className: '', icon: 'clock'};
  }

  function notify(message, undo = null) {
    clearTimeout(toastTimer);
    state.undo = undo;
    $('toast-message').textContent = message;
    $('undo-button').hidden = !undo;
    $('toast').hidden = false;
    if (!undo) toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000);
  }

  function actionButton(name, label, callback, danger = false) {
    const button = node('button', 'icon-button' + (danger ? ' danger' : ''));
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(icon(name));
    button.addEventListener('click', callback);
    return button;
  }

  function renderTask(task) {
    const row = node('article', 'task-row' + (task.completed ? ' is-done' : ''));
    row.dataset.taskId = task.id;

    const checkbox = node('input', 'task-checkbox');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', task.title + (task.completed ? ' — хийгдээгүй болгох' : ' — хийж дууссаныг тэмдэглэх'));
    checkbox.addEventListener('change', () => {
      try {
        const desired = checkbox.checked;
        commit(tasks => {
          if (!tasks.some(t => t.id === task.id)) throw new Error('Энэ даалгавар өөр цонхонд устсан байна.');
          return tasks.map(t => t.id === task.id ? {...t, completed: desired, completedAt: desired ? Date.now() : null} : t);
        });
        notify(desired ? 'Хийж дууссаныг тэмдэглэлээ.' : 'Хийх даалгаварт буцаалаа.');
      } catch (error) {
        checkbox.checked = task.completed;
        showError(error);
      }
    });

    const content = node('div', 'task-content');
    content.append(node('h3', 'task-title', task.title));

    const meta = node('div', 'task-meta');
    const subject = node('span', 'subject-tag', task.subject);
    const subjectIndex = Math.max(0, M.SUBJECTS.indexOf(task.subject));
    const palette = colors[subjectIndex % colors.length];
    subject.style.setProperty('--subject-bg', palette[0]);
    subject.style.setProperty('--subject-color', palette[1]);

    const assignedEl = node('span', 'due-tag');
    assignedEl.title = 'Хэзээний даалгавар: ' + task.assigned;
    assignedEl.append(icon('calendar'), node('span', '', 'Хэзээний: ' + dateText(task.assigned)));

    const due = dueInfo(task);
    const dueEl = node('span', 'due-tag ' + due.className);
    dueEl.title = 'Дуусгах өдөр: ' + task.due;
    dueEl.append(icon(due.icon), node('span', '', due.label));

    meta.append(subject, assignedEl, dueEl);
    if (task.priority === 'high') {
      const priority = node('span', 'priority-tag');
      priority.append(icon('flag'), node('span', '', 'Чухал'));
      meta.append(priority);
    }
    content.append(meta);

    if (task.notes) content.append(node('p', 'task-notes', task.notes));

    const actions = node('div', 'task-actions');
    actions.append(
      actionButton('edit', task.title + ' — засах', () => openTask(task.id)),
      actionButton('trash', task.title + ' — устгах', () => openDelete(task.id), true)
    );

    row.append(checkbox, content, actions);
    return row;
  }

  function renderCalendar() {
    const date = new Date();
    state.today = M.localDate(date);
    const weekday = weekdays[date.getDay()];
    $('top-date').textContent = date.getFullYear() + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + String(date.getDate()).padStart(2, '0');
    $('calendar-month').textContent = (date.getMonth() + 1) + ' сар, ' + date.getFullYear();
    $('calendar-day').textContent = String(date.getDate()).padStart(2, '0');
    $('calendar-weekday').textContent = weekday + ' гараг';

    const hour = date.getHours();
    $('greeting').textContent = (hour < 12 ? 'ӨГЛӨӨНИЙ МЭНД' : hour < 18 ? 'ӨДРИЙН МЭНД' : 'ОРОЙН МЭНД') + ' · ' + weekday.toLocaleUpperCase('mn');

    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7), 12);
    const strip = document.createDocumentFragment();
    ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'].forEach((label, index) => {
      const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index, 12);
      const current = M.localDate(day) === state.today;
      const cell = node('div', 'week-day' + (current ? ' is-current' : ''));
      cell.setAttribute('aria-label', M.localDate(day) + (current ? ' — өнөөдөр' : ''));
      if (current) cell.setAttribute('aria-current', 'date');
      cell.append(node('span', '', label), node('strong', '', day.getDate()));
      strip.append(cell);
    });
    $('week-strip').replaceChildren(strip);
  }

  function render() {
    renderCalendar();
    const stats = M.stats(state.tasks, state.today);
    $('nav-all').textContent = $('stat-active').textContent = stats.active;
    $('nav-today').textContent = stats.today + stats.overdue;
    $('stat-today').textContent = stats.today;
    $('nav-done').textContent = $('stat-done').textContent = stats.done;
    $('today-caption').textContent = stats.overdue ? stats.overdue + ' даалгавар хэтэрсэн' : 'Өнөөдрийн хугацаатай';

    const percent = state.tasks.length ? Math.round(stats.done / state.tasks.length * 100) : 0;
    $('progress-percent').textContent = percent + '%';
    $('progress-bar').value = percent;
    $('progress-caption').textContent = state.tasks.length ? stats.done + ' / ' + state.tasks.length + ' даалгаврыг дуусгасан' : 'Эхний даалгавраа нэмээрэй.';

    const titles = {all: 'Хийх даалгаврууд', today: 'Өнөөдөр анхаарах', done: 'Дууссан даалгаврууд'};
    $('list-title').textContent = titles[state.view];
    $('breadcrumb-current').textContent = {all: 'Даалгаврууд', today: 'Өнөөдөр', done: 'Дууссан'}[state.view];

    document.querySelectorAll('.main-nav [data-view]').forEach(button => {
      const active = button.dataset.view === state.view;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

    const selected = M.select(state.tasks, state.view, state.subject, state.today);
    $('list-count').textContent = selected.length;
    $('task-list').replaceChildren(...selected.map(renderTask));

    const overdue = selected.filter(t => !t.completed && t.due < state.today).length;
    $('list-notice').hidden = !overdue;
    $('list-notice').textContent = overdue + ' даалгаврын хугацаа хэтэрсэн байна. Хийж дууссанаа тэмдэглээрэй.';
    $('empty-state').hidden = selected.length > 0;
    $('empty-add').hidden = state.view === 'done' || state.subject !== 'all';
    $('clear-filter').hidden = state.subject === 'all';

    if (state.subject !== 'all') {
      $('empty-title').textContent = 'Энэ хичээлд даалгавар алга';
      $('empty-description').textContent = 'Өөр хичээл сонгох эсвэл бүх хичээлээ хараарай.';
    } else if (state.view === 'done') {
      $('empty-title').textContent = 'Дууссан даалгаврууд энд харагдана';
      $('empty-description').textContent = 'Хийж дууссан даалгаврынхаа урд чагт тавиарай.';
    } else if (state.view === 'today') {
      $('empty-title').textContent = 'Өнөөдрийн хийх зүйлс дууссан';
      $('empty-description').textContent = 'Өнөөдөр өгөх болон хугацаа хэтэрсэн даалгавар алга.';
    } else if (state.tasks.length) {
      $('empty-title').textContent = 'Бүх даалгавраа дуусгалаа!';
      $('empty-description').textContent = 'Дууссан хэсгээс өмнөх даалгавруудаа харж болно.';
    } else {
      $('empty-title').textContent = 'Эхний даалгавраа нэмээрэй';
      $('empty-description').textContent = 'Хичээл, хэзээний даалгавар, дуусгах өдрөө оруулаад эхлээрэй.';
    }

    const next = M.select(state.tasks, 'all', 'all', state.today)[0];
    const nextContainer = $('next-task');
    nextContainer.replaceChildren();
    if (next) {
      const info = dueInfo(next);
      const due = node('div', 'next-due ' + info.className);
      due.append(icon('clock'), node('span', '', info.label));
      nextContainer.append(
        node('p', 'next-subject', next.subject),
        node('h3', '', next.title),
        node('p', '', 'Хэзээний: ' + dateText(next.assigned)),
        due
      );
    } else {
      nextContainer.append(node('h3', '', 'Одоогоор төлөвлөөгүй'), node('p', '', 'Даалгавар нэмэхэд хамгийн ойр хугацаа энд харагдана.'));
    }
  }

  function setView(view) {
    state.view = view;
    state.subject = 'all';
    $('subject-filter').value = 'all';
    render();
  }

  function ensureLegacySubjectOption(subject) {
    if (!subject || [...$('task-subject').options].some(option => option.value === subject)) return;
    const option = node('option', '', subject + ' (хуучин)');
    option.value = subject;
    $('task-subject').append(option);
  }

  function openTask(id = null) {
    load();
    const task = state.tasks.find(t => t.id === id);
    if (id && !task) {
      render();
      notify('Энэ даалгавар өөр цонхонд устсан байна.');
      return;
    }

    $('task-form').reset();
    $('form-error').hidden = true;
    $('task-id').value = task ? task.id : '';
    $('dialog-title').textContent = task ? 'Даалгавар засах' : 'Даалгавар нэмэх';

    if (task) {
      ensureLegacySubjectOption(task.subject);
      for (const key of ['subject', 'title', 'assigned', 'due', 'priority', 'notes']) $('task-' + key).value = task[key];
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      $('task-assigned').value = state.today;
      $('task-due').value = M.localDate(tomorrow);
      if (state.subject !== 'all') $('task-subject').value = state.subject;
    }

    $('task-dialog').showModal();
    (task ? $('task-title') : $('task-subject')).focus();
  }

  function showError(error) {
    if (error && ['QuotaExceededError', 'SecurityError', 'SyntaxError'].includes(error.name)) reportStorage(error);
    notify(error instanceof Error ? error.message : 'Үйлдлийг гүйцэтгэж чадсангүй.');
  }

  function openDelete(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    state.deleting = id;
    $('delete-description').textContent = task.subject + ' · ' + task.title;
    $('delete-dialog').showModal();
  }

  function saveFromForm(event) {
    event.preventDefault();
    const saveButton = $('save-task');
    saveButton.disabled = true;

    try {
      const input = {};
      for (const key of ['subject', 'title', 'assigned', 'due', 'priority', 'notes']) input[key] = $('task-' + key).value;
      const fields = M.validate(input);
      const id = $('task-id').value;

      commit(tasks => {
        if (id) {
          if (!tasks.some(t => t.id === id)) throw new Error('Энэ даалгавар өөр цонхонд устсан байна. Шинээр нэмээрэй.');
          return tasks.map(t => t.id === id ? {...t, ...fields} : t);
        }
        if (tasks.length >= 500) throw new Error('500 даалгавар хадгалсан байна. Хэрэггүй болсон даалгавраа устгаарай.');
        const newId = window.crypto && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        return [...tasks, {...fields, id: newId, completed: false, createdAt: Date.now(), completedAt: null}];
      });

      $('task-dialog').close();
      if (!id) setView('all');
      notify(id ? 'Өөрчлөлтийг хадгаллаа.' : 'Шинэ даалгавар нэмлээ.');
    } catch (error) {
      $('form-error').textContent = error instanceof Error ? error.message : 'Хадгалах боломжгүй байна.';
      $('form-error').hidden = false;
      if (error && ['QuotaExceededError', 'SecurityError', 'SyntaxError'].includes(error.name)) reportStorage(error);
    } finally {
      saveButton.disabled = false;
    }
  }

  installAssignedField();

  M.SUBJECTS.forEach(subject => {
    for (const id of ['task-subject', 'subject-filter']) {
      const option = node('option', '', subject);
      option.value = subject;
      $(id).append(option);
    }
  });

  document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => openTask()));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  $('task-form').addEventListener('submit', saveFromForm);
  $('subject-filter').addEventListener('change', event => { state.subject = event.target.value; render(); });
  $('clear-filter').addEventListener('click', () => { state.subject = 'all'; $('subject-filter').value = 'all'; render(); });

  $('confirm-delete').addEventListener('click', () => {
    try {
      let removed;
      commit(tasks => {
        removed = tasks.find(t => t.id === state.deleting);
        return tasks.filter(t => t.id !== state.deleting);
      });
      $('delete-dialog').close();
      state.deleting = null;
      notify(removed ? 'Даалгаврыг устгалаа.' : 'Даалгавар аль хэдийн устсан байна.', removed || null);
    } catch (error) {
      $('delete-dialog').close();
      showError(error);
    }
  });

  $('undo-button').addEventListener('click', () => {
    if (!state.undo) return;
    const task = state.undo;
    try {
      commit(tasks => {
        if (tasks.some(t => t.id === task.id)) return tasks;
        if (tasks.length >= 500) throw new Error('500 даалгаврын хязгаарт хүрсэн байна.');
        return [...tasks, task];
      });
      setView(task.completed ? 'done' : 'all');
      notify('Даалгаврыг сэргээв.');
    } catch (error) {
      showError(error);
    }
  });

  $('dismiss-toast').addEventListener('click', () => {
    clearTimeout(toastTimer);
    $('toast').hidden = true;
    state.undo = null;
  });

  window.addEventListener('storage', event => {
    if (event.key === M.KEY || event.key === null) {
      load();
      render();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      load();
      render();
    }
  });
  setInterval(() => {
    if (M.localDate() !== state.today) render();
  }, 60000);

  load();
  render();

  // Optional, feature-detected WebMCP surface. Mutations use the existing form.
  const context = document.modelContext;
  if (context && typeof context.registerTool === 'function') {
    const lifecycle = new AbortController();
    const register = tool => {
      try { Promise.resolve(context.registerTool(tool, {signal: lifecycle.signal})).catch(() => {}); }
      catch (_) { /* Optional standard; the visible app stays available. */ }
    };

    register({
      name: 'list_homework',
      title: 'Даалгавруудыг харах',
      description: 'Read homework stored in this browser. Returns the current list without making changes.',
      inputSchema: {type: 'object', properties: {}, additionalProperties: false},
      annotations: {readOnlyHint: true, untrustedContentHint: true},
      execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
        load();
        render();
        return {tasks: state.tasks.map(t => ({...t})), storageReadable: $('storage-error').hidden};
      }
    });

    register({
      name: 'start_homework_creation',
      title: 'Даалгавар нэмэх цонх нээх',
      description: 'Open the homework creation form. This does not save a task; the user completes and saves the visible form.',
      inputSchema: {type: 'object', properties: {}, additionalProperties: false},
      annotations: {readOnlyHint: false, untrustedContentHint: false},
      execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
        if ($('delete-dialog').open) $('delete-dialog').close();
        if (!$('task-dialog').open) openTask();
        return {formOpen: true, saved: false};
      }
    });

    window.addEventListener('pagehide', event => {
      if (!event.persisted) lifecycle.abort();
    });
  }
})();
