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
    store.meetings = [];
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

export function renderMeetings() {
  const today = localDate();
  const q = $('#meet-search').value.trim().toLowerCase();
  let items = alive(store.meetings);

  const dayTools = $('#day-tools');
  if (dayTools) dayTools.hidden = store.meetFilter !== 'day';
  if (store.meetFilter === 'day') renderDayPicks();
  if (store.meetFilter === 'upcoming') items = items.filter((m) => m.date >= today);
  if (store.meetFilter === 'past') items = items.filter((m) => m.date < today);
  if (store.meetFilter === 'day') items = items.filter((m) => m.date === store.meetDay);
  if (q) {
    items = items.filter((m) =>
      [m.title, m.kind, kindMeta(m.kind).label, m.location, m.agenda, m.happened, m.actions, (m.who || []).join(' ')]
        .join(' ').toLowerCase().includes(q));
  }

  const asc = store.meetFilter === 'upcoming';
  items = [...items].sort((a, b) => {
    const ka = `${a.date}T${a.time || '00:00'}`;
    const kb = `${b.date}T${b.time || '00:00'}`;
    return asc ? ka.localeCompare(kb) : kb.localeCompare(ka);
  });

  const list = $('#meet-list');
  if (!items.length) {
    const msg = {
      upcoming: 'Geen komende afspraken. Tik op + om er een te plannen.',
      past: 'Nog niks gebeurd.',
      all: 'Nog geen afspraken. Tik op + om te beginnen.',
      day: 'Nog niks op deze dag. Tik op + om een event te zetten.',
    }[store.meetFilter];
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

function openEditor(id = null) {
  store.editingMeetingId = id;
  const m = id ? store.meetings.find((x) => x.id === id) : null;
  $('#editor-title').textContent = m ? 'Afspraak bewerken' : 'Nieuwe afspraak';
  $('#f-title').value = m?.title || '';
  $('#f-date').value = m?.date || (store.meetFilter === 'day' ? store.meetDay : localDate());
  $('#f-time').value = m?.time || '';
  $('#f-kind').value = m?.kind || (store.meetFilter === 'day' && !m ? 'overig' : 'overleg');
  $('#f-location').value = m?.location || '';
  $('#f-agenda').value = m?.agenda || '';
  $('#f-happened').value = m?.happened || '';
  $('#f-actions').value = m?.actions || '';
  const who = m?.who || [store.me];
  $$('input[name="who"]').forEach((cb) => { cb.checked = who.includes(cb.value); });
  $('#delete-btn').hidden = !m;
  syncHappenedLabel();
  $('#editor').showModal();
}

$$('#tab-meet .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    store.meetFilter = tab.dataset.filter;
    $$('#tab-meet .tab').forEach((t) => t.classList.toggle('active', t === tab));
    renderMeetings();
  });
});

$('#meet-search').addEventListener('input', renderMeetings);
function shiftDay(days) {
  const d = new Date(`${store.meetDay}T12:00:00`);
  d.setDate(d.getDate() + days);
  store.meetDay = localDate(d);
  renderMeetings();
}

function renderDayPicks() {
  const box = $('#day-picks');
  const jump = $('#day-jump');
  if (!box) return;
  if (jump) jump.value = store.meetDay;
  const start = new Date(`${store.meetDay}T12:00:00`);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  box.innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = localDate(d);
    const name = d.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '');
    return `<button type="button" class="day-pick ${key === store.meetDay ? 'active' : ''}" data-day="${key}"><span>${esc(name)}</span>${d.getDate()}</button>`;
  }).join('');
}

$('#day-picks')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-day]');
  if (!btn) return;
  store.meetDay = btn.dataset.day;
  renderMeetings();
});
$('#day-prev')?.addEventListener('click', () => shiftDay(-7));
$('#day-next')?.addEventListener('click', () => shiftDay(7));
$('#day-jump')?.addEventListener('change', () => {
  if (!$('#day-jump').value) return;
  store.meetDay = $('#day-jump').value;
  renderMeetings();
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
    who: [...$$('input[name="who"]:checked')].map((cb) => cb.value),
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  };
  if (!data.title || !data.date) return;
  if (!db) return;

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
actions.openEditor = openEditor;
actions.formatMeetingDate = formatMeetingDate;
actions.meetingToIcs = meetingToIcs;
actions.downloadIcs = downloadIcs;
actions.KINDS = KINDS;
