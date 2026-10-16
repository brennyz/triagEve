import {
  $, $$, store, db, esc, check, onLoad, onRealtime, localDate, fmtTime, fmtStamp, dayLabel, actions, alive,
} from './core.js';
import { renderHome } from './home.js';

export async function loadDiary() {
  if (!db) {
    store.diary = [];
    renderDiary();
    return;
  }
  const { data, error } = await db.from('triageve_diary').select('*').order('created_at', { ascending: false });
  if (check(error, 'Dagboek laden')) return;
  store.diary = alive(data);
  renderDiary();
  renderHome();
}

export function renderDiary() {
  const q = $('#diary-search').value.trim().toLowerCase();
  const items = store.diary.filter((d) =>
    (!store.diaryWho || d.author === store.diaryWho) && (!q || d.body.toLowerCase().includes(q)));

  const list = $('#diary-list');
  if (!items.length) {
    list.innerHTML = `<p class="empty">${q || store.diaryWho ? 'Niks gevonden.' : 'Het dagboek is nog leeg.'}</p>`;
    return;
  }
  let lastDay = null;
  list.innerHTML = items.map((d) => {
    let html = '';
    const day = localDate(new Date(d.created_at));
    if (day !== lastDay) {
      html += `<h3 class="list-day">${esc(dayLabel(d.created_at))}</h3>`;
      lastDay = day;
    }
    const mine = d.author === store.me;
    html += `
      <article class="card entry ${mine ? 'editable' : ''}" data-id="${d.id}">
        <div class="item-head">
          <strong>${esc(d.author)}</strong>
          <span class="item-date">${esc(fmtTime(d.created_at))}</span>
        </div>
        <p class="entry-body">${esc(d.body)}</p>
        ${d.updated_at ? `<div class="item-meta">Bewerkt ${esc(fmtStamp(d.updated_at))}</div>` : ''}
      </article>`;
    return html;
  }).join('');

  $$('.entry.editable').forEach((el) => el.addEventListener('click', () => editDiary(Number(el.dataset.id))));
}

function resetDiaryForm() {
  store.editingDiaryId = null;
  $('#diary-input').value = '';
  $('#diary-label').textContent = 'Wat is er gebeurd?';
  $('#diary-save').textContent = 'Opslaan';
  $('#diary-cancel').hidden = true;
  $('#diary-delete').hidden = true;
}

function editDiary(id) {
  const d = store.diary.find((x) => x.id === id);
  if (!d) return;
  store.editingDiaryId = id;
  $('#diary-input').value = d.body;
  $('#diary-label').textContent = `Bewerken (${fmtStamp(d.created_at)})`;
  $('#diary-save').textContent = 'Bijwerken';
  $('#diary-cancel').hidden = false;
  $('#diary-delete').hidden = false;
  $('#tab-diary .scroll').scrollTop = 0;
  $('#diary-input').focus();
}

$('#diary-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = $('#diary-input').value.trim();
  if (!body) return;
  if (!db) return;
  const { error } = store.editingDiaryId
    ? await db.from('triageve_diary').update({ body, updated_at: new Date().toISOString() }).eq('id', store.editingDiaryId)
    : await db.from('triageve_diary').insert({ author: store.me, body });
  if (check(error, 'Opslaan')) return;
  resetDiaryForm();
  loadDiary();
});

$('#diary-cancel').addEventListener('click', resetDiaryForm);

$('#diary-delete').addEventListener('click', async () => {
  if (!store.editingDiaryId || !confirm('Dit stukje verwijderen?')) return;
  if (!db) return;
  const { error } = await db.from('triageve_diary').delete().eq('id', store.editingDiaryId);
  if (check(error, 'Verwijderen')) return;
  resetDiaryForm();
  loadDiary();
});

$$('#diary-chips .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    store.diaryWho = chip.dataset.who;
    $$('#diary-chips .chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderDiary();
  });
});

$('#diary-search').addEventListener('input', renderDiary);

onLoad(loadDiary);
onRealtime('triageve_diary', () => loadDiary());
actions.renderDiary = renderDiary;
