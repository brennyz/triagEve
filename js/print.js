import { $, store, esc, localDate, fmtStamp, actions } from './core.js';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function renderPrint() {
  const el = $('#print-root');
  if (!el) return;
  const p = store.profile || {};
  const meds = (store.medications || []).filter((m) => m.active);
  const since = daysAgo(30);
  const diary = (store.diary || []).filter((d) => d.important && new Date(d.created_at) >= since);
  const today = localDate();
  const meets = [...(store.meetings || [])]
    .filter((m) => m.date >= today)
    .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));
  const contacts = (store.contacts || []).filter((c) => c.is_emergency || /huisarts/i.test(c.role || ''));

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

$('#print-btn')?.addEventListener('click', () => window.print());

actions.renderPrint = renderPrint;
