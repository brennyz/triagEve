import {
  $, $$, store, db, esc, check, onLoad, onRealtime, localDate, fmtStamp, actions, alive,
} from './core.js';
import { renderHome } from './home.js';

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

export function renderMeetings() {
  const today = localDate();
  const q = $('#meet-search').value.trim().toLowerCase();
  let items = store.meetings;

  if (store.meetFilter === 'upcoming') items = items.filter((m) => m.date >= today);
  if (store.meetFilter === 'past') items = items.filter((m) => m.date < today);
  if (q) {
    items = items.filter((m) =>
      [m.title, m.agenda, m.happened, m.actions, (m.who || []).join(' ')]
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
    }[store.meetFilter];
    list.innerHTML = `<p class="empty">${q ? 'Niks gevonden.' : msg}</p>`;
    return;
  }

  list.innerHTML = items.map((m) => {
    const actionLines = (m.actions || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const needsReport = m.date < today && !m.happened;
    return `
      <article class="card item" data-id="${m.id}">
        <div class="item-head">
          <h3 class="item-title">${esc(m.title)}${needsReport ? '<span class="badge">nog invullen</span>' : ''}</h3>
          <span class="item-date">${esc(formatMeetingDate(m.date, m.time))}</span>
        </div>
        ${m.who?.length ? `<p class="item-who">Met: ${esc(m.who.join(', '))}</p>` : ''}
        ${m.agenda ? `<div class="item-section"><h4>Agenda</h4><p>${esc(m.agenda)}</p></div>` : ''}
        ${m.happened ? `<div class="item-section"><h4>Wat is er gebeurd</h4><p>${esc(m.happened)}</p></div>` : ''}
        ${actionLines.length ? `<div class="item-section"><h4>Actiepunten</h4><ul>${actionLines.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
        <div class="item-meta">Laatst bewerkt door ${esc(m.updated_by || m.created_by || '?')} · ${esc(fmtStamp(m.updated_at))}</div>
      </article>`;
  }).join('');

  $$('#meet-list .item').forEach((el) => el.addEventListener('click', () => openEditor(Number(el.dataset.id))));
}

function openEditor(id = null) {
  store.editingMeetingId = id;
  const m = id ? store.meetings.find((x) => x.id === id) : null;
  $('#editor-title').textContent = m ? 'Afspraak bewerken' : 'Nieuwe afspraak';
  $('#f-title').value = m?.title || '';
  $('#f-date').value = m?.date || localDate();
  $('#f-time').value = m?.time || '';
  $('#f-agenda').value = m?.agenda || '';
  $('#f-happened').value = m?.happened || '';
  $('#f-actions').value = m?.actions || '';
  const who = m?.who || [store.me];
  $$('input[name="who"]').forEach((cb) => { cb.checked = who.includes(cb.value); });
  $('#delete-btn').hidden = !m;
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
$('#add-btn').addEventListener('click', () => openEditor());
$('#cancel-btn').addEventListener('click', () => $('#editor').close());

$('#editor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    title: $('#f-title').value.trim(),
    date: $('#f-date').value,
    time: $('#f-time').value || null,
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
  loadMeetings();
});

$('#delete-btn').addEventListener('click', async () => {
  if (!store.editingMeetingId || !confirm('Dit item verwijderen?')) return;
  if (!db) return;
  const { error } = await db.from('triageve_meetings').delete().eq('id', store.editingMeetingId);
  if (check(error, 'Verwijderen')) return;
  $('#editor').close();
  loadMeetings();
});

onLoad(loadMeetings);
onRealtime('triageve_meetings', () => loadMeetings());
actions.renderMeetings = renderMeetings;
actions.openEditor = openEditor;
actions.formatMeetingDate = formatMeetingDate;
