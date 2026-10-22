import {
  $, $$, store, db, esc, check, onLoad, onRealtime, localDate, fmtStamp, dayLabel, actions, alive, softDelete,
  personName, samePerson,
} from './core.js';
import { renderHome } from './home.js';
import { pingNotify } from './push.js';

export const DIARY_CATEGORIES = [
  ['algemeen', 'Algemeen'],
  ['gezondheid', 'Gezondheid'],
  ['stemming', 'Stemming'],
  ['eten', 'Eten'],
  ['slaap', 'Slaap'],
  ['medicatie', 'Medicatie'],
  ['incident', 'Incident'],
];

const catLabel = (c) => (DIARY_CATEGORIES.find(([k]) => k === c) || ['algemeen', 'Algemeen'])[1];

function whoClass(author) {
  const name = personName(author).toLowerCase();
  if (name === 'jacky' || name === 'ronald' || name === 'bren') return `who-${name}`;
  return '';
}

export async function loadDiary() {
  if (!db) {
    store.diary = store.diary || [];
    renderDiary();
    actions.renderChat?.({ followMine: false });
    return;
  }
  const { data, error } = await db.from('triageve_diary').select('*').order('created_at', { ascending: false });
  if (check(error, 'Dagboek laden')) return;
  store.diary = alive(data);
  renderDiary();
  renderHome();
  actions.renderChat?.({ followMine: false });
}

function formCategory() {
  return $('#diary-cat-chips .chip.active')?.dataset.cat || 'algemeen';
}

export function renderDiary() {
  const q = ($('#diary-search')?.value || '').trim().toLowerCase();
  const items = alive(store.diary).filter((d) => {
    const blob = `${d.author || ''} ${d.filed_by || ''} ${d.body || ''} ${catLabel(d.category)}`.toLowerCase();
    return (!store.diaryWho || samePerson(d.author, store.diaryWho))
      && (!store.diaryCategory || (d.category || 'algemeen') === store.diaryCategory)
      && (!q || blob.includes(q));
  });
  const note = $('#diary-search-note');
  if (note) note.textContent = q ? `${items.length} gevonden` : '';

  const list = $('#diary-list');
  if (!items.length) {
    list.innerHTML = `<p class="empty">${q || store.diaryWho || store.diaryCategory ? 'Niks gevonden.' : 'Het dagboek is nog leeg.'}</p>`;
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
    const canEdit = samePerson(d.author, store.me) || samePerson(d.filed_by, store.me);
    const cat = d.category || 'algemeen';
    html += `
      <article class="card entry ${canEdit ? 'editable' : ''} ${d.important ? 'important' : ''}" data-id="${d.id}">
        <div class="item-head">
          <strong class="entry-author ${whoClass(d.author)}">${esc(personName(d.author))}</strong>
          <span class="item-date">${esc(fmtStamp(d.created_at))}</span>
        </div>
        <p class="entry-body">${esc(d.body)}</p>
        <p class="entry-meta"><span class="entry-cat">${esc(catLabel(cat))}</span>${d.important ? '<span class="entry-flag">Belangrijk</span>' : ''}</p>
        ${viaHtml(d)}
        ${d.updated_at ? `<div class="item-meta">Bewerkt op ${esc(fmtStamp(d.updated_at))}</div>` : ''}
      </article>`;
    return html;
  }).join('');

  $$('#diary-list .entry.editable').forEach((el) => el.addEventListener('click', () => editDiary(Number(el.dataset.id))));
  $$('#diary-list .entry-chat').forEach((btn) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    actions.showMessage?.(btn.dataset.chat);
  }));
}

function viaHtml(d) {
  const who = personName(d.filed_by);
  const line = d.source_message_id
    ? `Uit de chat${who ? `, gezet door ${who}` : ''}.`
    : (who ? `In het dagboek gezet door ${who}.` : '');
  if (!line && !d.source_message_id) return '';
  return `${line ? `<p class="entry-via">${esc(line)}</p>` : ''}
    ${d.source_message_id ? `<button type="button" class="ghost entry-chat" data-chat="${esc(d.source_message_id)}">Naar de chat</button>` : ''}`;
}

function setCatChip(cat) {
  $$('#diary-cat-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === cat));
}

function resetDiaryForm() {
  store.editingDiaryId = null;
  $('#diary-input').value = '';
  $('#diary-important').checked = false;
  setCatChip('algemeen');
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
  $('#diary-important').checked = Boolean(d.important);
  setCatChip(d.category || 'algemeen');
  $('#diary-label').textContent = d.source_message_id
    ? `Bewerken, uit de chat (${fmtStamp(d.created_at)})`
    : `Bewerken (${fmtStamp(d.created_at)})`;
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
  const payload = {
    body,
    category: formCategory(),
    important: $('#diary-important').checked,
  };
  if (!db) {
    if (store.editingDiaryId) {
      const d = store.diary.find((x) => x.id === store.editingDiaryId);
      if (d) Object.assign(d, payload, { updated_at: new Date().toISOString() });
    } else {
      store.diary.unshift({
        id: Date.now(),
        author: store.me,
        created_at: new Date().toISOString(),
        ...payload,
      });
    }
    resetDiaryForm();
    renderDiary();
    renderHome();
    actions.renderChat?.({ followMine: false });
    return;
  }
  const { error } = store.editingDiaryId
    ? await db.from('triageve_diary').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', store.editingDiaryId)
    : await db.from('triageve_diary').insert({ author: store.me, ...payload });
  if (check(error, 'Opslaan')) return;
  if (payload.important) pingNotify('diary');
  resetDiaryForm();
  loadDiary();
});

$('#diary-cancel').addEventListener('click', resetDiaryForm);

$('#diary-delete').addEventListener('click', async () => {
  if (!store.editingDiaryId || !confirm('Dit stukje verwijderen?')) return;
  if (!db) {
    const d = store.diary.find((x) => x.id === store.editingDiaryId);
    if (d) d.deleted_at = new Date().toISOString();
    resetDiaryForm();
    renderDiary();
    renderHome();
    actions.renderChat?.({ followMine: false });
    return;
  }
  const { error } = await softDelete('triageve_diary', store.editingDiaryId);
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

$$('#diary-filter-cats .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    store.diaryCategory = chip.dataset.cat;
    $$('#diary-filter-cats .chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderDiary();
  });
});

$$('#diary-cat-chips .chip').forEach((chip) => {
  chip.addEventListener('click', (e) => {
    e.preventDefault();
    setCatChip(chip.dataset.cat);
  });
});

$('#diary-search').addEventListener('input', renderDiary);

onLoad(loadDiary);
onRealtime('triageve_diary', () => loadDiary());
actions.renderDiary = renderDiary;
actions.editDiary = editDiary;
actions.DIARY_CATEGORIES = DIARY_CATEGORIES;
