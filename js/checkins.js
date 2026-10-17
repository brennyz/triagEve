import {
  $, store, db, esc, check, onLoad, onRealtime, fmtStamp, actions, toast, alive, localDate,
} from './core.js';
import { renderHome } from './home.js';
import { loadDiary } from './diary.js';
import { pingNotify } from './push.js';

export const MEASURE_KINDS = ['bloeddruk', 'gewicht', 'temperatuur', 'suiker', 'pijn 0-10', 'overig'];
export const STATUS = {
  goed: { label: 'Goed', cls: 'status-good' },
  matig: { label: 'Matig', cls: 'status-ok' },
  zorgelijk: { label: 'Zorgelijk', cls: 'status-bad' },
};

export const TRAITS = [
  ['sleep', 'Nacht', [['', 'niet gezegd'], ['goed', 'goed geslapen'], ['onrustig', 'onrustige nacht'], ['slecht', 'slechte nacht']]],
  ['mood', 'Stemming', [['', 'niet gezegd'], ['rustig', 'rustig'], ['somber', 'somber'], ['onrustig', 'onrustig']]],
  ['food', 'Eten', [['', 'niet gezegd'], ['goed', 'goed gegeten'], ['weinig', 'weinig gegeten'], ['niet', 'niet gegeten']]],
  ['pain', 'Pijn', [['', 'niet gezegd'], ['geen', 'geen pijn'], ['beetje', 'een beetje pijn'], ['duidelijk', 'duidelijke pijn']]],
  ['clarity', 'Helder', [['', 'niet gezegd'], ['helder', 'helder'], ['verward', 'verward'], ['suf', 'suf']]],
];

export function traitPhrase(row) {
  if (!row) return '';
  return TRAITS.map(([key, , options]) => {
    const hit = options.find(([value]) => value && value === row[key]);
    return hit ? hit[1] : '';
  }).filter(Boolean).join(' · ');
}

function mountTraits() {
  const el = $('#status-traits');
  if (!el || el.dataset.ready) return;
  el.innerHTML = TRAITS.map(([key, label, options]) => `
    <label for="status-${key}">${esc(label)}</label>
    <select id="status-${key}">
      ${options.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('')}
    </select>`).join('');
  el.dataset.ready = '1';
}

export function openStatus(meetingId = null) {
  mountTraits();
  const note = $('#status-note');
  if (note) note.value = '';
  for (const [key] of TRAITS) {
    const field = $(`#status-${key}`);
    if (field) field.value = '';
  }
  const today = localDate();
  const items = alive(store.meetings)
    .filter((m) => m.date === today)
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  const moment = $('#status-moment');
  if (moment) {
    moment.innerHTML = `<option value="">Nu</option>${items.map((m) => {
      const time = m.time ? ` · ${String(m.time).slice(0, 5)}` : '';
      return `<option value="${m.id}">${esc(m.title)}${esc(time)}</option>`;
    }).join('')}`;
    const wanted = meetingId && items.some((m) => Number(m.id) === Number(meetingId)) ? String(meetingId) : '';
    moment.value = wanted;
  }
  $('#status-dialog')?.showModal();
}

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

function readTraits() {
  const extra = {
    meeting_id: $('#status-moment')?.value ? Number($('#status-moment').value) : null,
  };
  for (const [key, , options] of TRAITS) {
    const value = $(`#status-${key}`)?.value || '';
    extra[key] = options.some(([code]) => code && code === value) ? value : null;
  }
  return extra;
}

function worryLine(note, extra) {
  const phrase = traitPhrase(extra);
  return `Status Eef: zorgelijk${phrase ? ` – ${phrase}` : ''}${note ? ` – ${note}` : ''}`;
}

export async function submitStatus(status, note, extra = {}) {
  const row = {
    author: store.me,
    status,
    note: note || null,
    meeting_id: extra.meeting_id || null,
    sleep: extra.sleep || null,
    mood: extra.mood || null,
    food: extra.food || null,
    pain: extra.pain || null,
    clarity: extra.clarity || null,
  };
  if (!db) {
    store.checkins.unshift({ ...row, id: Date.now(), created_at: new Date().toISOString() });
    if (status === 'zorgelijk') {
      store.diary.unshift({
        id: Date.now() + 1,
        author: store.me,
        body: worryLine(note, row),
        category: 'gezondheid',
        important: true,
        created_at: new Date().toISOString(),
      });
      actions.renderDiary?.();
    }
    renderHome();
    actions.renderMeetings?.();
    toast('Status doorgegeven.');
    return;
  }
  const { error } = await db.from('triageve_checkins').insert(row);
  if (check(error, 'Status opslaan')) return;
  if (status === 'zorgelijk') {
    const { error: dErr } = await db.from('triageve_diary').insert({
      author: store.me,
      body: worryLine(note, row),
      category: 'gezondheid',
      important: true,
    });
    if (check(dErr, 'Dagboekregel')) return;
    loadDiary();
    pingNotify('status');
  }
  toast('Status doorgegeven.');
  loadCheckins();
  actions.renderMeetings?.();
}

$('#status-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = e.submitter?.dataset.status;
  if (!status) return;
  await submitStatus(status, $('#status-note').value.trim(), readTraits());
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
actions.openStatus = openStatus;
actions.traitPhrase = traitPhrase;
actions.STATUS = STATUS;
mountTraits();
