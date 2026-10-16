import {
  $, $$, store, db, esc, check, onLoad, onRealtime, fmtStamp, actions, alive, localDate, USERS, toast,
} from './core.js';
import { renderHome } from './home.js';
import { pingNotify } from './push.js';

export async function loadTasks() {
  if (!db) {
    store.tasks = store.tasks || [];
    renderTasks();
    return;
  }
  const { data, error } = await db.from('triageve_tasks').select('*').order('created_at', { ascending: false });
  if (check(error, 'Taken laden')) return;
  store.tasks = alive(data);
  renderTasks();
  renderHome();
}

function isLate(t) {
  return !t.done && t.due_date && t.due_date < localDate();
}

export function renderTasks() {
  const list = $('#task-list');
  if (!list) return;
  const f = store.taskFilter || 'all';
  let items = store.tasks || [];
  if (f === 'mine') items = items.filter((t) => t.assignee === store.me);
  if (f === 'done') items = items.filter((t) => t.done);
  items = [...items].sort((a, b) => Number(a.done) - Number(b.done) || String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));

  const counts = USERS.map((u) => {
    const n = (store.tasks || []).filter((t) => !t.done && t.assignee === u).length;
    return `${u}: ${n}`;
  });

  const tally = $('#task-tally');
  if (tally) tally.textContent = `Open: ${counts.join(' · ')}`;

  if (!items.length) {
    list.innerHTML = '<p class="empty">Geen taken in deze lijst.</p>';
    return;
  }
  list.innerHTML = items.map((t) => `
    <article class="card task-card ${t.done ? 'done' : ''} ${isLate(t) ? 'late' : ''}" data-id="${t.id}">
      <label class="task-check">
        <input type="checkbox" data-toggle="${t.id}" ${t.done ? 'checked' : ''}>
        <span>
          <strong>${esc(t.title)}</strong>
          <span class="item-who">${esc(t.assignee || 'niemand')}${t.due_date ? ` · ${esc(t.due_date)}` : ''}${isLate(t) ? ' · te laat' : ''}</span>
          ${t.done ? `<span class="item-meta">Klaar door ${esc(t.done_by || '?')} · ${esc(fmtStamp(t.done_at))}</span>` : ''}
        </span>
      </label>
      <button type="button" class="ghost task-edit" data-edit="${t.id}" aria-label="Taak bewerken">Bewerken</button>
    </article>
  `).join('');
}

async function toggleTask(id, done) {
  if (!db) {
    const t = store.tasks.find((x) => x.id === id);
    if (t) {
      t.done = done;
      t.done_by = done ? store.me : null;
      t.done_at = done ? new Date().toISOString() : null;
      renderTasks();
      renderHome();
    }
    return;
  }
  const patch = done
    ? { done: true, done_by: store.me, done_at: new Date().toISOString() }
    : { done: false, done_by: null, done_at: null };
  const { error } = await db.from('triageve_tasks').update(patch).eq('id', id);
  if (check(error, 'Afvinken')) return;
  loadTasks();
}

function openTask(id = null) {
  store.editingTaskId = id;
  const t = id ? store.tasks.find((x) => x.id === id) : null;
  $('#task-title').textContent = t ? 'Taak bewerken' : 'Nieuwe taak';
  $('#t-title').value = t?.title || '';
  $('#t-assignee').value = t?.assignee || store.me;
  $('#t-due').value = t?.due_date || '';
  $('#task-delete').hidden = !t;
  $('#task-editor').showModal();
}

$('#tab-tasks')?.addEventListener('click', (e) => {
  const tog = e.target.closest('[data-toggle]');
  if (tog) {
    e.stopPropagation();
    toggleTask(Number(tog.dataset.toggle), tog.checked);
    return;
  }
  const edit = e.target.closest('[data-edit]');
  if (edit) openTask(Number(edit.dataset.edit));
});

$$('#task-chips .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    store.taskFilter = chip.dataset.filter;
    $$('#task-chips .chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderTasks();
  });
});

$('#add-task')?.addEventListener('click', () => openTask());
$('#task-cancel')?.addEventListener('click', () => $('#task-editor').close());

$('#task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    title: $('#t-title').value.trim(),
    assignee: $('#t-assignee').value || null,
    due_date: $('#t-due').value || null,
  };
  if (!data.title) return;
  if (!db) {
    store.tasks.unshift({
      id: Date.now(),
      ...data,
      done: false,
      created_by: store.me,
      created_at: new Date().toISOString(),
    });
    $('#task-editor').close();
    renderTasks();
    renderHome();
    return;
  }
  const { error } = store.editingTaskId
    ? await db.from('triageve_tasks').update(data).eq('id', store.editingTaskId)
    : await db.from('triageve_tasks').insert({ ...data, created_by: store.me });
  if (check(error, 'Opslaan')) return;
  $('#task-editor').close();
  pingNotify('task');
  loadTasks();
});

$('#task-delete')?.addEventListener('click', async () => {
  if (!store.editingTaskId || !confirm('Deze taak verwijderen?')) return;
  if (!db) {
    store.tasks = store.tasks.filter((t) => t.id !== store.editingTaskId);
    $('#task-editor').close();
    renderTasks();
    renderHome();
    return;
  }
  const { error } = await db.from('triageve_tasks').delete().eq('id', store.editingTaskId);
  if (check(error, 'Verwijderen')) return;
  $('#task-editor').close();
  loadTasks();
});

export function parseActionLines(text) {
  return String(text || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const m = line.match(/^(Jacky|Paps|Bren)\s*[:\-–]\s*(.+)$/i);
    if (m) {
      const who = USERS.find((u) => u.toLowerCase() === m[1].toLowerCase());
      return { assignee: who, title: m[2].trim() };
    }
    return { assignee: null, title: line };
  });
}

export async function tasksFromActions(text) {
  const rows = parseActionLines(text);
  if (!rows.length) {
    toast('Geen actiepunten om om te zetten.');
    return 0;
  }
  if (!db) {
    rows.forEach((r) => store.tasks.unshift({
      id: Date.now() + Math.random(),
      title: r.title,
      assignee: r.assignee,
      done: false,
      created_by: store.me,
      created_at: new Date().toISOString(),
    }));
    renderTasks();
    renderHome();
    toast(`${rows.length} taak/taken gemaakt.`);
    return rows.length;
  }
  const { error } = await db.from('triageve_tasks').insert(rows.map((r) => ({
    title: r.title,
    assignee: r.assignee,
    created_by: store.me,
  })));
  if (check(error, 'Taken maken')) return 0;
  toast(`${rows.length} taak/taken gemaakt.`);
  pingNotify('task');
  loadTasks();
  return rows.length;
}

$('#make-tasks')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await tasksFromActions($('#f-actions').value);
});

onLoad(loadTasks);
onRealtime('triageve_tasks', () => loadTasks());
actions.renderTasks = renderTasks;
actions.tasksFromActions = tasksFromActions;
actions.parseActionLines = parseActionLines;
actions.toggleTask = toggleTask;
