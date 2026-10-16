import {
  $, store, db, esc, check, onLoad, fmtStamp, actions, restoreRow, toast,
} from './core.js';
import { loadDiary } from './diary.js';
import { loadMeetings } from './meet.js';
import { loadContacts } from './contacts.js';
import { loadMeds } from './meds.js';
import { loadTasks } from './tasks.js';

const TRASH_TABLES = [
  ['triageve_diary', 'Dagboek', loadDiary],
  ['triageve_meetings', 'Agenda', loadMeetings],
  ['triageve_contacts', 'Contacten', loadContacts],
  ['triageve_medications', 'Medicatie', loadMeds],
  ['triageve_tasks', 'Taken', loadTasks],
];

function labelOf(table, row) {
  return row.title || row.name || row.body || row.summary || `#${row.id}`;
}

export async function loadTrash() {
  store.trash = [];
  if (!db) {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const local = [
      ['triageve_diary', 'Dagboek', store.diary],
      ['triageve_meetings', 'Agenda', store.meetings],
      ['triageve_contacts', 'Contacten', store.contacts],
      ['triageve_medications', 'Medicatie', store.medications],
      ['triageve_tasks', 'Taken', store.tasks],
    ];
    store.trash = local.flatMap(([table, kind, rows]) =>
      (rows || []).filter((r) => r.deleted_at && new Date(r.deleted_at).getTime() >= since)
        .map((row) => ({ table, kind, row })));
    renderTrash();
    return;
  }
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const packs = await Promise.all(TRASH_TABLES.map(async ([table, kind]) => {
    const { data, error } = await db.from(table).select('*').not('deleted_at', 'is', null).gte('deleted_at', since);
    if (check(error, 'Prullenbak laden')) return [];
    return (data || []).map((row) => ({ table, kind, row }));
  }));
  store.trash = packs.flat().sort((a, b) => String(b.row.deleted_at).localeCompare(String(a.row.deleted_at)));
  renderTrash();
}

export function renderTrash() {
  const el = $('#trash-list');
  if (!el) return;
  const items = store.trash || [];
  if (!items.length) {
    el.innerHTML = '<p class="empty">De prullenbak is leeg. Verwijderde dingen blijven 30 dagen staan.</p>';
    return;
  }
  el.innerHTML = items.map((it, i) => `
    <article class="card">
      <div class="item-head">
        <strong>${esc(it.kind)}</strong>
        <span class="item-date">${esc(fmtStamp(it.row.deleted_at))}</span>
      </div>
      <p>${esc(labelOf(it.table, it.row))}</p>
      <button type="button" class="primary" data-restore="${i}">Terugzetten</button>
    </article>
  `).join('');
}

$('#trash-list')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-restore]');
  if (!btn) return;
  const it = store.trash[Number(btn.dataset.restore)];
  if (!it) return;
  if (!db) {
    it.row.deleted_at = null;
    toast('Teruggezet.');
    loadTrash();
    return;
  }
  const { error } = await restoreRow(it.table, it.row.id);
  if (check(error, 'Terugzetten')) return;
  toast('Teruggezet.');
  const reload = TRASH_TABLES.find((t) => t[0] === it.table)?.[2];
  if (reload) await reload();
  loadTrash();
});

export async function loadHistory(table) {
  store.historyTable = table;
  if (!db) {
    store.historyRows = [];
    renderHistory();
    return;
  }
  const { data, error } = await db.from('triageve_history')
    .select('*')
    .eq('table_name', table)
    .order('changed_at', { ascending: false })
    .limit(80);
  if (check(error, 'Geschiedenis laden')) return;
  store.historyRows = data;
  renderHistory();
}

export function renderHistory() {
  const el = $('#history-list');
  if (!el) return;
  const rows = store.historyRows || [];
  if (!rows.length) {
    el.innerHTML = '<p class="empty">Nog geen geschiedenis (verschijnt na wijzigingen in de database).</p>';
    return;
  }
  el.innerHTML = rows.map((h) => `
    <article class="card">
      <div class="item-head">
        <strong>${esc(h.action)}</strong>
        <span class="item-date">${esc(fmtStamp(h.changed_at))}</span>
      </div>
      <p class="item-who">${esc(h.changed_by || '?')} · ${esc(h.table_name)} #${esc(h.row_id)}</p>
    </article>
  `).join('');
}

onLoad(loadTrash);
actions.renderTrash = renderTrash;
actions.loadHistory = loadHistory;
actions.renderHistory = renderHistory;
actions.loadTrash = loadTrash;
