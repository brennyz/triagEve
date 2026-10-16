const USERS = ['Jacky', 'Paps', 'Bren'];
const NAME_KEY = 'triageve.user';
const ACTIVITY_KEY = 'triageve.lastActivity';
const MAX_IDLE_MS = 14 * 24 * 60 * 60 * 1000;
const CFG = window.TRIAGEVE_CONFIG || {};
const configured = Boolean(CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes('JOUW-PROJECT'));
const preview = !configured && new URLSearchParams(location.search).has('preview');
const db = configured ? supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY) : null;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => root.querySelectorAll(sel);

const store = {
  me: localStorage.getItem(NAME_KEY),
  selectedUser: null,
  activeTab: 'home',
  channel: null,
  unread: 0,
  messages: [],
  diary: [],
  meetings: [],
  diaryWho: '',
  editingDiaryId: null,
  meetFilter: 'upcoming',
  editingMeetingId: null,
  profile: null,
  contacts: [],
  editingContactId: null,
  medications: [],
  editingMedId: null,
  tasks: [],
  editingTaskId: null,
  taskFilter: 'all',
};

const loaders = [];
const realtime = [];
const afterLoad = [];
const actions = {};

function onLoad(fn) { loaders.push(fn); }
function onAfterLoad(fn) { afterLoad.push(fn); }
function onRealtime(table, handler) { realtime.push({ table, handler }); }

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function localDate(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const fmtTime = (ts) => new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (ts) => new Date(ts).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtStamp = (ts) => `${fmtDay(ts)} · ${fmtTime(ts)}`;

function dayLabel(ts) {
  const key = localDate(new Date(ts));
  if (key === localDate()) return 'Vandaag';
  if (key === localDate(new Date(Date.now() - 86400000))) return 'Gisteren';
  return fmtDay(ts);
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

function check(error, what) {
  if (!error) return false;
  console.error(what, error);
  toast(`${what} mislukt: ${error.message}`);
  return true;
}

function alive(rows) {
  return (rows || []).filter((r) => !r.deleted_at);
}

export {
  USERS, NAME_KEY, ACTIVITY_KEY, MAX_IDLE_MS, CFG, configured, preview, db,
  $, $$, store, loaders, realtime, afterLoad, actions,
  onLoad, onAfterLoad, onRealtime, esc, localDate, fmtTime, fmtDay, fmtStamp,
  dayLabel, toast, check, alive,
};
