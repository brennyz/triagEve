import {
  $, store, db, esc, check, onLoad, onRealtime, fmtStamp, actions, toast,
} from './core.js';
import { renderHome } from './home.js';
import { loadDiary } from './diary.js';

export const MEASURE_KINDS = ['bloeddruk', 'gewicht', 'temperatuur', 'suiker', 'pijn 0-10', 'overig'];
export const STATUS = {
  goed: { label: 'Goed', cls: 'status-good' },
  matig: { label: 'Matig', cls: 'status-ok' },
  zorgelijk: { label: 'Zorgelijk', cls: 'status-bad' },
};

export async function loadCheckins() {
  if (!db) {
    store.checkins = store.checkins || [];
    store.measurements = store.measurements || [];
    renderMeasures();
    return;
  }
  const [c, m] = await Promise.all([
    db.from('triageve_checkins').select('*').order('created_at', { ascending: false }).limit(50),
    db.from('triageve_measurements').select('*').order('measured_at', { ascending: false }).limit(200),
  ]);
  if (check(c.error, 'Status laden') || check(m.error, 'Metingen laden')) return;
  store.checkins = c.data;
  store.measurements = m.data;
  renderMeasures();
  renderHome();
}

export function lastCheckin() {
  return (store.checkins || [])[0] || null;
}

export function renderMeasures() {
  const el = $('#measure-list');
  if (!el) return;
  const items = store.measurements || [];
  if (!items.length) {
    el.innerHTML = '<p class="empty">Nog geen metingen.</p>';
    return;
  }
  const groups = {};
  for (const k of MEASURE_KINDS) groups[k] = [];
  for (const row of items) (groups[row.kind] || (groups[row.kind] = [])).push(row);
  el.innerHTML = MEASURE_KINDS.map((k) => {
    const rows = groups[k] || [];
    if (!rows.length) return '';
    return `<h3 class="section-title">${esc(k)}</h3>` + rows.map((r) => `
      <article class="card">
        <div class="item-head">
          <strong>${esc(r.value)}</strong>
          <span class="item-date">${esc(fmtStamp(r.measured_at))}</span>
        </div>
        <p class="item-who">${esc(r.author)}${r.note ? ` · ${esc(r.note)}` : ''}</p>
      </article>`).join('');
  }).join('') || '<p class="empty">Nog geen metingen.</p>';
}

export async function submitStatus(status, note) {
  const row = { author: store.me, status, note: note || null };
  if (!db) {
    store.checkins.unshift({ ...row, id: Date.now(), created_at: new Date().toISOString() });
    if (status === 'zorgelijk') {
      store.diary.unshift({
        id: Date.now() + 1,
        author: store.me,
        body: `Status Eef: zorgelijk${note ? ` – ${note}` : ''}`,
        category: 'gezondheid',
        important: true,
        created_at: new Date().toISOString(),
      });
    }
    renderHome();
    toast('Status doorgegeven.');
    return;
  }
  const { error } = await db.from('triageve_checkins').insert(row);
  if (check(error, 'Status opslaan')) return;
  if (status === 'zorgelijk') {
    const { error: dErr } = await db.from('triageve_diary').insert({
      author: store.me,
      body: `Status Eef: zorgelijk${note ? ` – ${note}` : ''}`,
      category: 'gezondheid',
      important: true,
    });
    if (check(dErr, 'Dagboekregel')) return;
    loadDiary();
  }
  toast('Status doorgegeven.');
  loadCheckins();
}

$('#status-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = e.submitter?.dataset.status;
  if (!status) return;
  await submitStatus(status, $('#status-note').value.trim());
  $('#status-note').value = '';
  $('#status-dialog').close();
});
$('#status-cancel')?.addEventListener('click', () => $('#status-dialog').close());

$('#measure-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const kind = $('#ms-kind').value;
  const value = $('#ms-value').value.trim();
  if (!value) return;
  const row = {
    author: store.me,
    kind,
    value,
    note: $('#ms-note').value.trim(),
    measured_at: $('#ms-when').value ? new Date($('#ms-when').value).toISOString() : new Date().toISOString(),
  };
  if (!db) {
    store.measurements.unshift({ ...row, id: Date.now() });
    $('#ms-value').value = '';
    $('#ms-note').value = '';
    renderMeasures();
    toast('Meting opgeslagen.');
    return;
  }
  const { error } = await db.from('triageve_measurements').insert(row);
  if (check(error, 'Meting opslaan')) return;
  $('#ms-value').value = '';
  $('#ms-note').value = '';
  toast('Meting opgeslagen.');
  loadCheckins();
});

onLoad(loadCheckins);
onRealtime('triageve_checkins', () => loadCheckins());
onRealtime('triageve_measurements', () => loadCheckins());
actions.lastCheckin = lastCheckin;
actions.renderMeasures = renderMeasures;
actions.submitStatus = submitStatus;
actions.STATUS = STATUS;
