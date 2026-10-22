import { $, store, esc, localDate, fmtStamp, toast, actions, alive, personName } from './core.js';
import { blocksFrom, buildPdf, downloadPdf, sharePdf } from './pdfdoc.js';
import { KINDS } from './meet.js';
import { STATUS, traitPhrase, lastCheckin } from './checkins.js';
import { isZorg } from './contacts.js';
import { stayPhrase } from './zorgdag.js';

const FAMILY = [
  ['Ronald', 'Hoofdcontactpersoon'],
  ['Jacky', 'Secundair contactpersoon'],
  ['Bren', 'Secundair contactpersoon'],
];

const SLOT_LABEL = { ochtend: 'ochtend', middag: 'middag', avond: 'avond', nacht: 'nacht' };

function intakeToday(meds) {
  const doses = (store.doses || []).filter((d) => d.day === localDate());
  if (!meds.length) return '<p>Geen huidige medicatie in de app.</p>';
  return `<ul>${meds.map((m) => {
    const mine = doses.filter((d) => Number(d.medication_id) === Number(m.id));
    const given = mine.length
      ? mine.map((d) => `${SLOT_LABEL[d.slot] || d.slot} (${personName(d.author) || '?'})`).join(', ')
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
  const people = alive(store.contacts);
  const zorg = people.filter(isZorg)
    .sort((a, b) => `${a.role || ''} ${a.name}`.localeCompare(`${b.role || ''} ${b.name}`, 'nl'));
  const last = lastCheckin();
  const wishes = [p.wishes, p.sharing].filter(Boolean);
  const openTasks = alive(store.tasks).filter((t) => !t.done)
    .sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
  const measures = [...(store.measurements || [])]
    .sort((a, b) => String(b.measured_at).localeCompare(String(a.measured_at)))
    .slice(0, 12);

  const block = (title, inner) => `
    <section class="print-section">
      <h2>${esc(title)}</h2>
      ${inner}
    </section>`;

  const familyHtml = FAMILY.map(([name, label]) => {
    const c = people.find((x) => x.circle === 'familie' && personName(x.name) === name);
    const bits = [c?.phone, c?.email, c?.address].filter(Boolean);
    const extra = bits.length ? bits.join(' · ') : 'Telefoon en e-mail nog niet ingevuld.';
    return `<p><strong>${esc(name)}</strong> · ${esc(label)}<br>${esc(extra)}</p>`;
  }).join('');

  const zorgHtml = zorg.length
    ? `<ul>${zorg.map((c) => {
      const bits = [c.organisation, c.phone, c.email, c.address, c.hours].filter(Boolean);
      return `<li><strong>${esc(c.name)}</strong>${c.role ? ` · ${esc(c.role)}` : ''}${c.is_emergency ? ' · nood' : ''}${bits.length ? `<br>${esc(bits.join(' · '))}` : ''}${c.notes ? `<br>${esc(c.notes)}` : ''}</li>`;
    }).join('')}</ul>`
    : '<p>Nog geen zorgverlener ingevuld.</p>';

  const statusHtml = last
    ? `<p><strong>${esc(STATUS[last.status]?.label || last.status || '')}</strong> · ${esc(personName(last.author) || '')} · ${esc(fmtStamp(last.created_at))}<br>${esc([traitPhrase(last), last.note].filter(Boolean).join(' · ') || 'Geen extra kenmerken.')}</p>`
    : '<p>Nog geen status doorgegeven.</p>';

  el.innerHTML = `
    <header class="print-head">
      <h1>triagEve – overzicht voor de dienstverlener</h1>
      <p>Gemaakt op ${esc(fmtStamp(new Date().toISOString()))} door ${esc(store.me || '')}</p>
      <p>Ronald is hoofdcontactpersoon. Jacky en Bren zijn secundair. Chat zit niet in deze pdf.</p>
    </header>
    ${block('Contactpersonen', familyHtml)}
    ${block('Zorgverleners', zorgHtml)}
    ${block('Over Eef', `
      <h3>Waar</h3><p>${esc(stayPhrase(p))}</p>
      <h3>Situatie</h3><p>${esc(p.summary || 'Nog niet ingevuld.')}</p>
      <h3>Belangrijk om te weten</h3><p>${esc(p.important || 'Nog niet ingevuld.')}</p>
      <h3>In geval van nood</h3><p>${esc(p.emergency || 'Nog niet ingevuld.')}</p>
      ${wishes.length ? `<h3>Wat Eef zelf belangrijk vindt</h3><p>${esc(wishes.join('\n\n'))}</p>` : ''}
      ${p.representative ? `<h3>Aanspreekpunt voor artsen</h3><p>${esc(p.representative)}</p>` : ''}
      ${p.documents ? `<h3>Waar liggen belangrijke papieren</h3><p>${esc(p.documents)}</p>` : ''}
    `)}
    ${block('Laatste status', statusHtml)}
    ${block('Huidige medicatie', meds.length
      ? `<ul>${meds.map((m) => `<li><strong>${esc(m.name)}</strong> ${esc([m.dose, m.schedule, m.reason].filter(Boolean).join(' · '))}</li>`).join('')}</ul>`
      : '<p>Geen huidige medicatie in de app.</p>')}
    ${block('Inname vandaag', intakeToday(meds))}
    ${block('Belangrijke dagboekstukjes (30 dagen)', diary.length
      ? diary.map((d) => `<p><strong>${esc(personName(d.author))}</strong> · ${esc(fmtStamp(d.created_at))}<br>${esc(d.body)}${d.filed_by ? `<br>In het dagboek gezet door ${esc(personName(d.filed_by))}.` : ''}</p>`).join('')
      : '<p>Geen belangrijke stukjes in de laatste 30 dagen.</p>')}
    ${block('Open taken', openTasks.length
      ? `<ul>${openTasks.map((t) => `<li><strong>${esc(t.title)}</strong> · ${esc(personName(t.assignee) || 'niemand')}${t.due_date ? ` · uiterlijk ${esc(t.due_date)}` : ''}</li>`).join('')}</ul>`
      : '<p>Geen open taken.</p>')}
    ${block('Recente metingen', measures.length
      ? `<ul>${measures.map((m) => `<li><strong>${esc(m.kind)}</strong> · ${esc(m.value)}${m.note ? ` · ${esc(m.note)}` : ''} · ${esc(personName(m.author))} · ${esc(fmtStamp(m.measured_at))}</li>`).join('')}</ul>`
      : '<p>Nog geen metingen.</p>')}
    ${block('Komende afspraken', meets.length
      ? `<ul>${meets.map((m) => `<li>${esc(m.date)}${m.time ? ` ${esc(m.time)}` : ''} · ${esc(m.title)}${m.location ? ` (${esc(m.location)})` : ''}${m.who?.length ? ` · met ${esc((m.who || []).map(personName).join(', '))}` : ''}</li>`).join('')}</ul>`
      : '<p>Geen komende afspraken.</p>')}
  `;
}

function timelineEvents() {
  const rows = [];
  for (const d of alive(store.diary)) {
    rows.push({
      date: localDate(new Date(d.created_at)),
      sort: d.created_at,
      kind: 'Dagboek',
      title: `${personName(d.author) || '?'}${d.important ? ' · belangrijk' : ''}`,
      body: `${d.body || ''}${d.filed_by ? `\nIn het dagboek gezet door ${personName(d.filed_by)}.` : ''}`,
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
  for (const t of alive(store.tasks)) {
    if (!t.due_date) continue;
    rows.push({
      date: t.due_date,
      sort: `${t.due_date}T12:00:00`,
      kind: 'Taak',
      title: `${personName(t.assignee) || 'niemand'}${t.done ? ' · klaar' : ''}`,
      body: t.title || '',
    });
  }
  for (const m of store.measurements || []) {
    rows.push({
      date: localDate(new Date(m.measured_at)),
      sort: m.measured_at,
      kind: 'Meting',
      title: `${personName(m.author)} · ${m.kind}`,
      body: [m.value, m.note].filter(Boolean).join(' · '),
    });
  }
  for (const c of store.checkins || []) {
    const label = STATUS[c.status]?.label || c.status || '';
    rows.push({
      date: localDate(new Date(c.created_at)),
      sort: c.created_at,
      kind: 'Hoe gaat het',
      title: `${personName(c.author) || '?'} · ${label}`,
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
    : '<p>Nog niks om uit te draaien. Dagboek, agenda, status, taken met een datum en metingen verschijnen hier. Chat niet.</p>';

  el.innerHTML = `
    <header class="print-head">
      <h1>triagEve – tijdlijn</h1>
      <p>Uitdraai op ${esc(fmtStamp(new Date().toISOString()))}${store.me ? ` door ${esc(store.me)}` : ''}</p>
      <p class="notice">Let op: Jacky, Ronald en Bren zien deze gegevens en kunnen ze wijzigen. Dit is een momentopname. Chat zit er niet in.</p>
    </header>
    ${body}
  `;
}

async function saveOrShare(kind, share) {
  if (kind === 'print') renderPrint();
  else renderTimeline();
  const root = kind === 'print' ? $('#print-root') : $('#timeline-root');
  const name = kind === 'print' ? 'triageve-dienstverlener.pdf' : 'triageve-tijdlijn.pdf';
  const title = kind === 'print' ? 'Overzicht voor de dienstverlener' : 'Tijdlijn';
  const bytes = await buildPdf(blocksFrom(root), title);
  if (!share) {
    downloadPdf(name, bytes);
    toast('Pdf staat in je downloads.');
    return;
  }
  const result = await sharePdf(name, bytes, title, 'De pdf zit bij deze mail. Chat zit er niet in.');
  if (result === 'shared') toast('Kies je mail en tik op Versturen. Dan komt de mail aan.');
  else if (result === 'downloaded') toast('Delen lukt hier niet. De pdf is gedownload. Zet die zelf als bijlage.');
}

$('#print-btn')?.addEventListener('click', () => saveOrShare('print', false));
$('#print-mail')?.addEventListener('click', () => saveOrShare('print', true));
$('#timeline-print')?.addEventListener('click', () => saveOrShare('timeline', false));
$('#timeline-mail')?.addEventListener('click', () => saveOrShare('timeline', true));

actions.renderPrint = renderPrint;
actions.renderTimeline = renderTimeline;
