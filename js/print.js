import { $, store, esc, localDate, fmtStamp, actions, alive } from './core.js';
import { KINDS } from './meet.js';
import { STATUS, traitPhrase } from './checkins.js';

const SLOT_LABEL = { ochtend: 'ochtend', middag: 'middag', avond: 'avond', nacht: 'nacht' };

function intakeToday(meds) {
  const doses = (store.doses || []).filter((d) => d.day === localDate());
  if (!meds.length) return '<p>Geen huidige medicatie in de app.</p>';
  return `<ul>${meds.map((m) => {
    const mine = doses.filter((d) => Number(d.medication_id) === Number(m.id));
    const given = mine.length
      ? mine.map((d) => `${SLOT_LABEL[d.slot] || d.slot} (${d.author || '?'})`).join(', ')
      : 'nog niet aangevinkt';
    return `<li><strong>${esc(m.name)}</strong> · ${esc(given)}</li>`;
  }).join('')}</ul>`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function renderPrint() {
  const el = $('#print-root');
  if (!el) return;
  const p = store.profile || {};
  const meds = alive(store.medications).filter((m) => m.active);
  const since = daysAgo(30);
  const diary = alive(store.diary).filter((d) => d.important && new Date(d.created_at) >= since);
  const today = localDate();
  const meets = alive(store.meetings)
    .filter((m) => m.date >= today)
    .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));
  const contacts = alive(store.contacts).filter((c) => c.is_emergency || /huisarts/i.test(c.role || ''));

  const block = (title, inner) => `
    <section class="print-section">
      <h2>${esc(title)}</h2>
      ${inner}
    </section>`;

  el.innerHTML = `
    <header class="print-head">
      <h1>triagEve – overzicht voor de arts</h1>
      <p>Gemaakt op ${esc(fmtStamp(new Date().toISOString()))} door ${esc(store.me || '')}</p>
    </header>
    ${block('Over Eef', `
      <h3>Situatie</h3><p>${esc(p.summary || 'Nog niet ingevuld.')}</p>
      <h3>Belangrijk om te weten</h3><p>${esc(p.important || 'Nog niet ingevuld.')}</p>
      <h3>In geval van nood</h3><p>${esc(p.emergency || 'Nog niet ingevuld.')}</p>
    `)}
    ${block('Huidige medicatie', meds.length
      ? `<ul>${meds.map((m) => `<li><strong>${esc(m.name)}</strong> ${esc([m.dose, m.schedule, m.reason].filter(Boolean).join(' · '))}</li>`).join('')}</ul>`
      : '<p>Geen huidige medicatie in de app.</p>')}
    ${block('Inname vandaag', intakeToday(meds))}
    ${block('Belangrijke dagboekstukjes (30 dagen)', diary.length
      ? diary.map((d) => `<p><strong>${esc(d.author)}</strong> · ${esc(fmtStamp(d.created_at))}<br>${esc(d.body)}</p>`).join('')
      : '<p>Geen belangrijke stukjes in de laatste 30 dagen.</p>')}
    ${block('Komende afspraken', meets.length
      ? `<ul>${meets.map((m) => `<li>${esc(m.date)}${m.time ? ` ${esc(m.time)}` : ''} · ${esc(m.title)}${m.location ? ` (${esc(m.location)})` : ''}</li>`).join('')}</ul>`
      : '<p>Geen komende afspraken.</p>')}
    ${block('Noodcontacten', contacts.length
      ? `<ul>${contacts.map((c) => `<li>${esc(c.name)}${c.role ? ` (${esc(c.role)})` : ''}${c.phone ? ` · ${esc(c.phone)}` : ''}</li>`).join('')}</ul>`
      : '<p>Nog geen noodcontacten.</p>')}
  `;
}

function timelineEvents() {
  const rows = [];
  for (const d of alive(store.diary)) {
    rows.push({
      date: localDate(new Date(d.created_at)),
      sort: d.created_at,
      kind: 'Dagboek',
      title: `${d.author || '?'}${d.important ? ' · belangrijk' : ''}`,
      body: d.body || '',
    });
  }
  for (const m of alive(store.meetings)) {
    const kind = (KINDS[m.kind] || KINDS.overleg).label;
    const bits = [m.time, m.location, m.agenda, m.happened].filter(Boolean);
    rows.push({
      date: m.date,
      sort: `${m.date}T${m.time || '00:00'}:00`,
      kind,
      title: m.title || 'Afspraak',
      body: bits.join('\n'),
    });
  }
  for (const c of store.checkins || []) {
    const label = STATUS[c.status]?.label || c.status || '';
    rows.push({
      date: localDate(new Date(c.created_at)),
      sort: c.created_at,
      kind: 'Hoe gaat het',
      title: `${c.author || '?'} · ${label}`,
      body: [traitPhrase(c), c.note].filter(Boolean).join('\n'),
    });
  }
  return rows.sort((a, b) => String(a.sort).localeCompare(String(b.sort)));
}

export function renderTimeline() {
  const el = $('#timeline-root');
  if (!el) return;
  const rows = timelineEvents();
  const days = [];
  for (const row of rows) {
    let day = days.find((d) => d.date === row.date);
    if (!day) {
      day = { date: row.date, rows: [] };
      days.push(day);
    }
    day.rows.push(row);
  }
  const body = days.length
    ? days.map((day) => `
      <section class="print-section">
        <h2>${esc(new Date(`${day.date}T12:00:00`).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</h2>
        ${day.rows.map((row) => `
          <h3>${esc(row.kind)} · ${esc(row.title)}</h3>
          ${row.body ? `<p>${esc(row.body)}</p>` : ''}
        `).join('')}
      </section>`).join('')
    : '<p>Nog niks om uit te draaien. Dagboek, agenda en status verschijnen hier.</p>';

  el.innerHTML = `
    <header class="print-head">
      <h1>triagEve – tijdlijn</h1>
      <p>Uitdraai op ${esc(fmtStamp(new Date().toISOString()))}${store.me ? ` door ${esc(store.me)}` : ''}</p>
      <p class="notice">Let op: Jacky, Paps en Bren zien deze gegevens en kunnen ze wijzigen. Dit is een momentopname.</p>
    </header>
    ${body}
  `;
}

$('#print-btn')?.addEventListener('click', () => window.print());
$('#timeline-print')?.addEventListener('click', () => window.print());

actions.renderPrint = renderPrint;
actions.renderTimeline = renderTimeline;
