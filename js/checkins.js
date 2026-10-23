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

export const CONTEXT = [
  ['place', 'Waar', [['thuis', 'thuis'], ['bed', 'in bed'], ['tuin', 'in de tuin'], ['onderweg', 'onderweg'], ['arts', 'bij de arts'], ['anders', 'ergens anders']], 'thuis'],
  ['activity', 'Bezig met', [['', 'niet gezegd'], ['rusten', 'rusten'], ['eten', 'eten of drinken'], ['bezoek', 'bezoek'], ['lopen', 'lopen'], ['toilet', 'naar het toilet'], ['slapen', 'slapen']], ''],
];

export const TRAITS = [
  ['sleep', 'Nacht', [['', 'niet gezegd'], ['goed', 'goed geslapen'], ['onrustig', 'onrustige nacht'], ['slecht', 'slechte nacht']], ''],
  ['mood', 'Stemming', [['', 'niet gezegd'], ['rustig', 'rustig'], ['somber', 'somber'], ['onrustig', 'onrustig']], ''],
  ['food', 'Eten', [['', 'niet gezegd'], ['goed', 'goed gegeten'], ['weinig', 'weinig gegeten'], ['niet', 'niet gegeten']], ''],
  ['pain', 'Pijn', [['', 'niet gezegd'], ['geen', 'geen pijn'], ['beetje', 'een beetje pijn'], ['duidelijk', 'duidelijke pijn']], ''],
  ['clarity', 'Helder', [['', 'niet gezegd'], ['helder', 'helder'], ['verward', 'verward'], ['suf', 'suf']], ''],
];

const STATUS_FIELDS = [...CONTEXT, ...TRAITS];

export function traitPhrase(row) {
  if (!row) return '';
  return STATUS_FIELDS.map(([key, , options]) => {
    const hit = options.find(([value]) => value && value === row[key]);
    return hit ? hit[1] : '';
  }).filter(Boolean).join(' · ');
}

function fieldHtml([key, label, options]) {
  return `
    <label for="status-${key}">${esc(label)}</label>
    <select id="status-${key}">
      ${options.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('')}
    </select>`;
}

function mountTraits() {
  const context = $('#status-context');
  const traits = $('#status-traits');
  if (!context || !traits || context.dataset.ready) return;
  context.innerHTML = CONTEXT.map(fieldHtml).join('');
  traits.innerHTML = TRAITS.map(fieldHtml).join('');
  context.dataset.ready = '1';
  $('#status-place')?.addEventListener('change', () => { $('#status-place').dataset.touched = '1'; });
  $('#status-moment')?.addEventListener('change', () => {
    const place = $('#status-place');
    if (!place || place.dataset.touched) return;
    place.value = guessPlace(selectedMeeting());
  });
}

function selectedMeeting() {
  const id = $('#status-moment')?.value;
  if (!id) return null;
  return alive(store.meetings).find((m) => String(m.id) === String(id)) || null;
}

function guessPlace(meeting) {
  const blob = `${meeting?.location || ''} ${meeting?.title || ''}`.toLowerCase();
  if (/bed/.test(blob)) return 'bed';
  if (/tuin/.test(blob)) return 'tuin';
  if (/arts|ziekenhuis|praktijk/.test(blob)) return 'arts';
  if (/onderweg|rit|taxi|auto/.test(blob)) return 'onderweg';
  return 'thuis';
}

export function openStatus(meetingId = null) {
  mountTraits();
  const note = $('#status-note');
  if (note) note.value = '';
  const place = $('#status-place');
  if (place) place.dataset.touched = '';
  for (const [key, , , fallback] of STATUS_FIELDS) {
    const field = $(`#status-${key}`);
    if (field) field.value = fallback;
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
  if (place) place.value = guessPlace(selectedMeeting());
  const more = $('#status-more');
  if (more) more.open = Boolean(meetingId);
  const scroll = document.querySelector('#status-dialog .status-scroll');
  if (scroll) scroll.scrollTop = 0;
  const dialog = $('#status-dialog');
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
  const focusHeading = () => $('#status-heading')?.focus({ preventScroll: true });
  focusHeading();
  requestAnimationFrame(focusHeading);
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
  for (const [key, , options, fallback] of STATUS_FIELDS) {
    const value = $(`#status-${key}`)?.value || '';
    const known = options.some(([code]) => code === value);
    extra[key] = known && value ? value : (key === 'place' ? fallback : null);
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
    place: extra.place || null,
    activity: extra.activity || null,
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
    return true;
  }
  const { error } = await db.from('triageve_checkins').insert(row);
  if (check(error, 'Status opslaan')) return false;
  if (status === 'zorgelijk') {
    const { error: dErr } = await db.from('triageve_diary').insert({
      author: store.me,
      body: worryLine(note, row),
      category: 'gezondheid',
      important: true,
    });
    if (!check(dErr, 'Dagboekregel')) {
      loadDiary();
      pingNotify('status');
    }
  }
  toast('Status doorgegeven.');
  loadCheckins();
  actions.renderMeetings?.();
  return true;
}

let statusBusy = false;

async function chooseStatus(status) {
  if (statusBusy || !STATUS[status]) return;
  statusBusy = true;
  const buttons = document.querySelectorAll('#status-dialog .status-btns button');
  buttons.forEach((btn) => { btn.disabled = true; });
  try {
    const ok = await submitStatus(status, $('#status-note').value.trim(), readTraits());
    if (ok) $('#status-dialog')?.close();
  } finally {
    statusBusy = false;
    buttons.forEach((btn) => { btn.disabled = false; });
  }
}

$('#status-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
});
document.querySelector('#status-dialog .status-btns')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-status]');
  if (!btn || btn.disabled) return;
  chooseStatus(btn.dataset.status);
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
