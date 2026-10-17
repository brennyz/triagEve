import {
  $, $$, store, db, esc, check, onLoad, onRealtime, localDate, fmtStamp, actions, alive, softDelete,
} from './core.js';
import { renderHome } from './home.js';
import { pingNotify } from './push.js';
import { STATUS, traitPhrase } from './checkins.js';

export const KINDS = {
  overleg: { label: 'Overleg', icon: '💬' },
  afspraak: { label: 'Afspraak arts / ziekenhuis', icon: '🏥' },
  bezoek: { label: 'Bezoek', icon: '🏠' },
  overig: { label: 'Overig', icon: '📌' },
};

export async function loadMeetings() {
  if (!db) {
    store.meetings = store.meetings || [];
    renderMeetings();
    return;
  }
  const { data, error } = await db.from('triageve_meetings').select('*');
  if (check(error, 'Agenda laden')) return;
  store.meetings = alive(data);
  renderMeetings();
  renderHome();
}

function formatMeetingDate(date, time) {
  const d = new Date(`${date}T${time || '00:00'}`);
  const label = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return time ? `${label} · ${time}` : label;
}

function kindMeta(kind) {
  return KINDS[kind] || KINDS.overleg;
}

function happenedHeading(kind) {
  return kind === 'afspraak' ? 'Wat zei de arts / wat is er gebeurd?' : 'Wat is er gebeurd?';
}

function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function ymd(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export function meetingToIcs(m) {
  const uid = `triageve-${m.id || 'nieuw'}@triageve.app`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//triagEve//NL',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
  ];
  if (m.time) {
    const start = new Date(`${m.date}T${m.time}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const stamp = (d) => `${ymd(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    lines.push(`DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`);
  } else {
    const start = new Date(`${m.date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(end)}`);
  }
  lines.push(`SUMMARY:${icsEscape(m.title)}`);
  if (m.location) lines.push(`LOCATION:${icsEscape(m.location)}`);
  const desc = [m.agenda, m.happened].filter(Boolean).join('\n');
  if (desc) lines.push(`DESCRIPTION:${icsEscape(desc)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function downloadIcs(m) {
  const blob = new Blob([meetingToIcs(m)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const slug = String(m.title || 'afspraak').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'afspraak';
  a.download = `${slug}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function syncHappenedLabel() {
  const kind = $('#f-kind')?.value || 'overleg';
  $('#f-happened-label').textContent = happenedHeading(kind);
}

function monthLabel(day) {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
}

function renderCalendar() {
  const grid = $('#cal-grid');
  if (!grid || !store.meetDay) return;
  const ym = store.meetDay.slice(0, 7);
  if ($('#cal-title')) $('#cal-title').textContent = monthLabel(store.meetDay);
  if ($('#day-jump')) $('#day-jump').value = store.meetDay;
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const padCount = (first.getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const counts = {};
  for (const ev of alive(store.meetings)) {
    if (String(ev.date || '').startsWith(ym)) counts[ev.date] = (counts[ev.date] || 0) + 1;
  }
  const today = localDate();
  let cells = '';
  for (let i = 0; i < padCount; i += 1) cells += '<span class="cal-empty"></span>';
  for (let d = 1; d <= days; d += 1) {
    const key = `${ym}-${pad(d)}`;
    const cls = [
      'cal-day',
      key === store.meetDay && store.meetScope !== 'month' ? 'on' : '',
      key === today ? 'today' : '',
      counts[key] ? 'has' : '',
    ].filter(Boolean).join(' ');
    cells += `<button type="button" class="${cls}" data-day="${key}" aria-label="${key}${counts[key] ? `, ${counts[key]} afspraken` : ''}">${d}${counts[key] ? `<i>${counts[key]}</i>` : ''}</button>`;
  }
  grid.innerHTML = cells;
  const scope = $('#meet-scope');
  if (scope) scope.textContent = store.meetScope === 'month' ? 'Alleen deze dag' : 'Hele maand';
  const heading = $('#meet-heading');
  if (heading) {
    heading.textContent = store.meetScope === 'month'
      ? monthLabel(store.meetDay)
      : new Date(`${store.meetDay}T12:00:00`).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}

function shiftMonth(delta) {
  const [y, m, day] = store.meetDay.split('-').map(Number);
  const target = new Date(y, m - 1 + delta, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const next = new Date(target.getFullYear(), target.getMonth(), Math.min(day, last), 12);
  store.meetDay = localDate(next);
  renderMeetings();
}

export function renderMeetings() {
  const today = localDate();
  const q = ($('#meet-search')?.value || '').trim().toLowerCase();
  let items = alive(store.meetings);
  renderCalendar();
  const ym = (store.meetDay || today).slice(0, 7);
  if (store.meetScope === 'month') items = items.filter((m) => String(m.date || '').startsWith(ym));
  else items = items.filter((m) => m.date === store.meetDay);
  if (q) {
    items = items.filter((m) =>
      [m.title, m.kind, kindMeta(m.kind).label, m.location, m.agenda, m.happened, m.actions, (m.who || []).join(' ')]
        .join(' ').toLowerCase().includes(q));
  }

  items = [...items].sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));

  const list = $('#meet-list');
  if (!items.length) {
    const msg = store.meetScope === 'month'
      ? 'Nog niks deze maand. Tik op Nieuwe afspraak.'
      : 'Nog niks op deze dag. Tik op Nieuwe afspraak.';
    list.innerHTML = `<p class="empty">${q ? 'Niks gevonden.' : msg}</p>`;
    return;
  }

  list.innerHTML = items.map((m) => {
    const actionLines = (m.actions || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const needsReport = m.date < today && !m.happened;
    const k = kindMeta(m.kind);
    const linked = (store.checkins || []).find((c) => Number(c.meeting_id) === Number(m.id));
    const eefLine = linked
      ? `Eef: ${(STATUS[linked.status] || {}).label || linked.status}${traitPhrase(linked) ? ` · ${traitPhrase(linked)}` : ''}`
      : '';
    return `
      <article class="card item" data-id="${m.id}">
        <div class="item-head">
          <h3 class="item-title">${esc(m.title)}${needsReport ? '<span class="badge">nog invullen</span>' : ''}</h3>
          <span class="item-date">${esc(formatMeetingDate(m.date, m.time))}</span>
        </div>
        <p class="kind-label">${esc(k.icon)} ${esc(k.label)}</p>
        ${eefLine ? `<p class="status-traits">${esc(eefLine)}</p>` : ''}
        ${m.location ? `<p class="item-who">Locatie: ${esc(m.location)}</p>` : ''}
        ${m.who?.length ? `<p class="item-who">Met: ${esc(m.who.join(', '))}</p>` : ''}
        ${m.agenda ? `<div class="item-section"><h4>Agenda</h4><p>${esc(m.agenda)}</p></div>` : ''}
        ${m.happened ? `<div class="item-section"><h4>${esc(happenedHeading(m.kind))}</h4><p>${esc(m.happened)}</p></div>` : ''}
        ${actionLines.length ? `<div class="item-section"><h4>Actiepunten</h4><ul>${actionLines.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
        <div class="item-meta">Laatst bewerkt door ${esc(m.updated_by || m.created_by || '?')} · ${esc(fmtStamp(m.updated_at))}</div>
        <button type="button" class="ghost status-for" data-status-for="${m.id}">Hoe was Eef?</button>
        <button type="button" class="ghost ics-btn" data-ics="${m.id}">Zet in mijn agenda</button>
      </article>`;
  }).join('');

  $$('#meet-list .item').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('[data-ics], [data-status-for]')) return;
    openEditor(Number(el.dataset.id));
  }));
  $$('#meet-list [data-status-for]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    actions.openStatus?.(Number(btn.dataset.statusFor));
  }));
  $$('#meet-list [data-ics]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const m = store.meetings.find((x) => String(x.id) === String(btn.dataset.ics));
    if (m) downloadIcs(m);
  }));
}

function whoNames(selected) {
  const names = ['Jacky', 'Paps', 'Bren'];
  for (const c of alive(store.contacts)) {
    if (!c.name || c.circle === 'familie' || names.includes(c.name)) continue;
    if (actions.isZorg?.(c) || c.circle === 'zorg') names.push(c.name);
  }
  for (const name of selected || []) {
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

export function refreshWho(extraName, preset) {
  const box = $('#who-box');
  if (!box) return;
  const selected = preset || [...$$('#who-box input[name="who"]:checked')].map((cb) => cb.value);
  if (extraName && !selected.includes(extraName)) selected.push(extraName);
  box.innerHTML = whoNames(selected).map((name) => `
    <label><input type="checkbox" name="who" value="${esc(name)}"> ${esc(name)}</label>`).join('');
  $$('#who-box input[name="who"]').forEach((cb) => { cb.checked = selected.includes(cb.value); });
}

function openEditor(id = null) {
  store.editingMeetingId = id;
  const m = id ? store.meetings.find((x) => x.id === id) : null;
  $('#editor-title').textContent = m ? 'Afspraak bewerken' : 'Nieuwe afspraak';
  $('#f-title').value = m?.title || '';
  $('#f-date').value = m?.date || store.meetDay || localDate();
  $('#f-time').value = m?.time || '';
  $('#f-kind').value = m?.kind || (store.meetFilter === 'day' && !m ? 'overig' : 'overleg');
  $('#f-location').value = m?.location || '';
  $('#f-agenda').value = m?.agenda || '';
  $('#f-happened').value = m?.happened || '';
  $('#f-actions').value = m?.actions || '';
  refreshWho(null, m?.who || [store.me]);
  $('#delete-btn').hidden = !m;
  syncHappenedLabel();
  $('#editor').showModal();
}

$('#meet-search')?.addEventListener('input', renderMeetings);
$('#cal-grid')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-day]');
  if (!btn) return;
  store.meetDay = btn.dataset.day;
  store.meetScope = 'day';
  store.meetFilter = 'day';
  renderMeetings();
});
$('#cal-prev')?.addEventListener('click', () => shiftMonth(-1));
$('#cal-next')?.addEventListener('click', () => shiftMonth(1));
$('#day-jump')?.addEventListener('change', () => {
  if (!$('#day-jump').value) return;
  store.meetDay = $('#day-jump').value;
  store.meetScope = 'day';
  store.meetFilter = 'day';
  renderMeetings();
});
$('#meet-scope')?.addEventListener('click', () => {
  store.meetScope = store.meetScope === 'month' ? 'day' : 'month';
  renderMeetings();
});

function addWhoName() {
  const input = $('#who-new');
  const name = input?.value.trim() || '';
  if (!name) return '';
  refreshWho(name);
  input.value = '';
  return name;
}

$('#who-add')?.addEventListener('click', () => addWhoName());
$('#who-new')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addWhoName();
  }
});
$('#who-save-contact')?.addEventListener('click', () => {
  const name = addWhoName() || $('#who-box input:checked')?.value || '';
  store.attachWho = true;
  actions.openContact?.(null, { name, circle: 'zorg', role: 'Overig' });
});
$('#add-btn').addEventListener('click', () => openEditor());
$('#cancel-btn').addEventListener('click', () => $('#editor').close());
$('#f-kind').addEventListener('change', syncHappenedLabel);

$('#editor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    title: $('#f-title').value.trim(),
    date: $('#f-date').value,
    time: $('#f-time').value || null,
    kind: $('#f-kind').value || 'overleg',
    location: $('#f-location').value.trim(),
    agenda: $('#f-agenda').value.trim(),
    happened: $('#f-happened').value.trim(),
    actions: $('#f-actions').value.trim(),
    who: [...$$('#who-box input[name="who"]:checked')].map((cb) => cb.value),
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  };
  if (!data.title || !data.date) return;
  if (!db) {
    store.meetings = store.meetings || [];
    if (store.editingMeetingId) {
      const i = store.meetings.findIndex((m) => m.id === store.editingMeetingId);
      if (i >= 0) store.meetings[i] = { ...store.meetings[i], ...data };
    } else {
      store.meetings.push({ ...data, id: Date.now(), created_by: store.me, deleted_at: null });
    }
    $('#editor').close();
    renderMeetings();
    renderHome();
    return;
  }

  const { error } = store.editingMeetingId
    ? await db.from('triageve_meetings').update(data).eq('id', store.editingMeetingId)
    : await db.from('triageve_meetings').insert({ ...data, created_by: store.me });
  if (check(error, 'Opslaan')) return;
  $('#editor').close();
  pingNotify('meeting');
  loadMeetings();
});

$('#delete-btn').addEventListener('click', async () => {
  if (!store.editingMeetingId || !confirm('Dit item verwijderen?')) return;
  if (!db) return;
  const { error } = await softDelete('triageve_meetings', store.editingMeetingId);
  if (check(error, 'Verwijderen')) return;
  $('#editor').close();
  loadMeetings();
});

onLoad(loadMeetings);
onRealtime('triageve_meetings', () => loadMeetings());
actions.renderMeetings = renderMeetings;
actions.refreshWho = refreshWho;
actions.openEditor = openEditor;
actions.formatMeetingDate = formatMeetingDate;
actions.meetingToIcs = meetingToIcs;
actions.downloadIcs = downloadIcs;
actions.KINDS = KINDS;
