import {
  $, $$, store, db, esc, check, onLoad, onRealtime, fmtStamp, actions, alive, localDate,
} from './core.js';
import { loadDiary } from './diary.js';

export async function loadMeds() {
  if (!db) {
    store.medications = store.medications || [];
    renderMeds();
    return;
  }
  const { data, error } = await db.from('triageve_medications').select('*').order('name');
  if (check(error, 'Medicatie laden')) return;
  store.medications = alive(data);
  renderMeds();
}

function medLine(m) {
  return [m.dose, m.schedule].filter(Boolean).join(' · ');
}

export function renderMeds() {
  const current = $('#meds-current');
  const stopped = $('#meds-stopped');
  if (!current) return;
  const all = store.medications || [];
  const active = all.filter((m) => m.active);
  const done = all.filter((m) => !m.active);

  current.innerHTML = active.length
    ? active.map(card).join('')
    : '<p class="empty-inline">Nog geen huidige medicatie.</p>';
  stopped.innerHTML = done.length
    ? done.map(card).join('')
    : '<p class="empty-inline">Nog niets gestopt.</p>';

  $$('#tab-meds .med-card').forEach((el) => el.addEventListener('click', () => openMed(Number(el.dataset.id))));
}

function card(m) {
  return `
    <article class="card item med-card" data-id="${m.id}">
      <div class="item-head">
        <h3 class="item-title">${esc(m.name)}</h3>
        <span class="item-date">${esc(medLine(m))}</span>
      </div>
      ${m.reason ? `<p class="item-who">${esc(m.reason)}</p>` : ''}
      ${m.notes ? `<p class="entry-body">${esc(m.notes)}</p>` : ''}
      <div class="item-meta">${m.active ? 'Gestart' : 'Gestopt'} ${esc(m.active ? (m.started_on || '') : (m.stopped_on || ''))}
        · ${esc(m.updated_by || '?')} · ${esc(fmtStamp(m.updated_at))}</div>
    </article>`;
}

function openMed(id = null) {
  store.editingMedId = id;
  const m = id ? store.medications.find((x) => x.id === id) : null;
  $('#med-title').textContent = m ? 'Medicatie bewerken' : 'Nieuwe medicatie';
  $('#m-name').value = m?.name || '';
  $('#m-dose').value = m?.dose || '';
  $('#m-schedule').value = m?.schedule || '';
  $('#m-reason').value = m?.reason || '';
  $('#m-notes').value = m?.notes || '';
  $('#m-started').value = m?.started_on || localDate();
  $('#med-delete').hidden = !m;
  $('#med-stop').hidden = !m || !m.active;
  $('#med-editor').showModal();
}

async function diaryNote(name, what) {
  if (!db) return;
  const { error } = await db.from('triageve_diary').insert({
    author: store.me,
    body: `Medicatie gewijzigd: ${name} – ${what}`,
    category: 'medicatie',
  });
  if (check(error, 'Dagboekregel')) return;
  loadDiary();
}

$('#add-med')?.addEventListener('click', () => openMed());
$('#med-cancel')?.addEventListener('click', () => $('#med-editor').close());

$('#med-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!db) return;
  const data = {
    name: $('#m-name').value.trim(),
    dose: $('#m-dose').value.trim(),
    schedule: $('#m-schedule').value.trim(),
    reason: $('#m-reason').value.trim(),
    notes: $('#m-notes').value.trim(),
    started_on: $('#m-started').value || null,
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  };
  if (!data.name) return;
  const { error } = store.editingMedId
    ? await db.from('triageve_medications').update(data).eq('id', store.editingMedId)
    : await db.from('triageve_medications').insert({ ...data, active: true });
  if (check(error, 'Opslaan')) return;
  $('#med-editor').close();
  await diaryNote(data.name, store.editingMedId ? 'bijgewerkt' : `toegevoegd (${[data.dose, data.schedule].filter(Boolean).join(', ') || 'nieuw'})`);
  loadMeds();
});

$('#med-stop')?.addEventListener('click', async () => {
  if (!store.editingMedId || !confirm('Deze medicatie stoppen?')) return;
  if (!db) return;
  const m = store.medications.find((x) => x.id === store.editingMedId);
  const { error } = await db.from('triageve_medications').update({
    active: false,
    stopped_on: localDate(),
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  }).eq('id', store.editingMedId);
  if (check(error, 'Stoppen')) return;
  $('#med-editor').close();
  await diaryNote(m?.name || 'medicatie', 'gestopt');
  loadMeds();
});

$('#med-delete')?.addEventListener('click', async () => {
  if (!store.editingMedId || !confirm('Deze medicatie verwijderen?')) return;
  if (!db) return;
  const m = store.medications.find((x) => x.id === store.editingMedId);
  const { error } = await db.from('triageve_medications').delete().eq('id', store.editingMedId);
  if (check(error, 'Verwijderen')) return;
  $('#med-editor').close();
  await diaryNote(m?.name || 'medicatie', 'verwijderd');
  loadMeds();
});

onLoad(loadMeds);
onRealtime('triageve_medications', () => loadMeds());
actions.renderMeds = renderMeds;
actions.openMed = openMed;
