import { $, db, store, toast, check } from './core.js';

const OUTBOX_KEY = 'triageve.outbox';
const DRAFT_CHAT = 'triageve.draft.chat';
const DRAFT_DIARY = 'triageve.draft.diary';
const LARGE_KEY = 'triageve.largeText';

function getOutbox() {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch { return []; }
}
function setOutbox(items) { localStorage.setItem(OUTBOX_KEY, JSON.stringify(items)); }

export function isNetError(error) {
  return !navigator.onLine || /failed to fetch|networkerror|offline|load failed/i.test(error?.message || '');
}

export function enqueue(table, payload, op = 'insert') {
  const box = getOutbox();
  box.push({ id: Date.now() + Math.random(), table, payload, op, at: new Date().toISOString() });
  setOutbox(box);
  toast('wacht op verbinding');
}

export async function flushOutbox() {
  if (!db || !navigator.onLine) return;
  const box = getOutbox();
  if (!box.length) return;
  const rest = [];
  for (const item of box) {
    const res = item.op === 'update'
      ? await db.from(item.table).update(item.payload.data).eq('id', item.payload.id)
      : await db.from(item.table).insert(item.payload);
    if (res.error) rest.push(item);
  }
  setOutbox(rest);
  if (box.length !== rest.length) toast('Verbinding er weer: berichten verzonden.');
}

export async function writeRow(table, payload, op = 'insert') {
  if (!db) {
    enqueue(table, payload, op);
    return { data: null, error: null, queued: true };
  }
  const res = op === 'update'
    ? await db.from(table).update(payload.data).eq('id', payload.id)
    : await db.from(table).insert(payload).select().single();
  if (res.error && isNetError(res.error)) {
    enqueue(table, payload, op);
    return { data: null, error: null, queued: true };
  }
  return res;
}

function restoreDrafts() {
  const chat = $('#chat-input');
  const diary = $('#diary-input');
  if (chat && localStorage.getItem(DRAFT_CHAT)) chat.value = localStorage.getItem(DRAFT_CHAT);
  if (diary && localStorage.getItem(DRAFT_DIARY)) diary.value = localStorage.getItem(DRAFT_DIARY);
}

$('#chat-input')?.addEventListener('input', () => localStorage.setItem(DRAFT_CHAT, $('#chat-input').value));
$('#diary-input')?.addEventListener('input', () => localStorage.setItem(DRAFT_DIARY, $('#diary-input').value));
$('#chat-form')?.addEventListener('submit', () => localStorage.removeItem(DRAFT_CHAT));
$('#diary-form')?.addEventListener('submit', () => localStorage.removeItem(DRAFT_DIARY));

function applyLarge(on) {
  document.documentElement.classList.toggle('large-text', on);
  localStorage.setItem(LARGE_KEY, on ? '1' : '0');
  const btn = $('#large-text-btn');
  if (btn) btn.textContent = on ? 'Grote tekst uit' : 'Grote tekst aan';
}

$('#large-text-btn')?.addEventListener('click', () => {
  applyLarge(!document.documentElement.classList.contains('large-text'));
});

const TABLES = [
  'triageve_messages', 'triageve_diary', 'triageve_meetings', 'triageve_profile',
  'triageve_contacts', 'triageve_medications', 'triageve_tasks', 'triageve_checkins',
  'triageve_measurements', 'triageve_doses',
];

async function exportAll() {
  if (!db) {
    const blob = new Blob([JSON.stringify({
      exported_at: new Date().toISOString(),
      preview: true,
      messages: store.messages,
      diary: store.diary,
      meetings: store.meetings,
      profile: store.profile,
      contacts: store.contacts,
      medications: store.medications,
      tasks: store.tasks,
      checkins: store.checkins,
      measurements: store.measurements,
      doses: store.doses,
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `triageve-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    return;
  }
  const out = { exported_at: new Date().toISOString(), by: store.me };
  for (const t of TABLES) {
    const { data, error } = await db.from(t).select('*');
    if (check(error, `Export ${t}`)) return;
    out[t] = data;
  }
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `triageve-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

$('#export-btn')?.addEventListener('click', exportAll);

window.addEventListener('online', flushOutbox);
restoreDrafts();
applyLarge(localStorage.getItem(LARGE_KEY) === '1');
flushOutbox();

export { exportAll, applyLarge };
