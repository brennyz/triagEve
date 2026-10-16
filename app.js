const USERS = ['Jacky', 'Paps', 'Bren'];
const NAME_KEY = 'triageve.user';
const ACTIVE_KEY = 'triageve.lastActive';
const OUTBOX_KEY = 'triageve.outbox';
const IDLE_MS = 14 * 24 * 60 * 60 * 1000;
const CATS = ['algemeen', 'gezondheid', 'stemming', 'eten', 'slaap', 'medicatie', 'incident'];
const CAT_LABEL = {
  algemeen: 'Algemeen', gezondheid: 'Gezondheid', stemming: 'Stemming', eten: 'Eten',
  slaap: 'Slaap', medicatie: 'Medicatie', incident: 'Incident',
};
const KIND_LABEL = { overleg: 'Overleg', afspraak: 'Afspraak', bezoek: 'Bezoek', overig: 'Overig' };
const TITLES = {
  home: 'Home', chat: 'Chat', diary: 'Dagboek', agenda: 'Agenda', more: 'Meer',
  eef: 'Over Eef', wishes: 'Wensen van Eef', meds: 'Medicatie', tasks: 'Taken',
  contacts: 'Contacten', measures: 'Metingen', emergency: 'Noodkaart', help: 'Hulp & steun',
  trash: 'Prullenbak', print: 'Overzicht voor arts',
};
const MAIN = ['home', 'chat', 'diary', 'agenda', 'more'];
const SOFT = ['triageve_diary', 'triageve_meetings', 'triageve_contacts', 'triageve_medications', 'triageve_tasks'];
const TABLES = [
  'triageve_messages', 'triageve_diary', 'triageve_meetings', 'triageve_tasks',
  'triageve_contacts', 'triageve_medications', 'triageve_profile', 'triageve_checkins',
  'triageve_measurements', 'triageve_history',
];

const CFG = window.TRIAGEVE_CONFIG || {};
function looksConfigured(cfg) {
  const url = String(cfg.SUPABASE_URL || '');
  const key = String(cfg.SUPABASE_KEY || '');
  return Boolean(url && key && !url.includes('JOUW-') && !key.includes('JOUW-'));
}
const configured = looksConfigured(CFG);
let db = null;
if (configured && window.supabase) {
  try { db = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY); }
  catch (err) { console.error('Supabase starten mislukt', err); }
}
const ready = Boolean(db);

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let me = localStorage.getItem(NAME_KEY);
let selectedUser = null;
let active = 'home';
let channel = null;
let unread = 0;
let started = false;
let dbMissing = false;
let diaryWho = '';
let diaryCat = 'algemeen';
let editingDiaryId = null;
let meetFilter = 'upcoming';
let editingMeetingId = null;
let taskFilter = 'open';
let offlineTold = false;

const data = {
  messages: [], diary: [], meetings: [], tasks: [], contacts: [], medications: [],
  profile: null, checkins: [], measurements: [], history: [],
};

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function localDate(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (ts) => new Date(ts).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtStamp = (ts) => ts ? `${fmtDay(ts)} · ${fmtTime(ts)}` : '';
function dayLabel(ts) {
  const key = localDate(new Date(ts));
  if (key === localDate()) return 'Vandaag';
  if (key === localDate(new Date(Date.now() - 86400000))) return 'Gisteren';
  return fmtDay(ts);
}
function formatMeetingDate(date, time) {
  const d = new Date(`${date}T${time || '00:00'}`);
  const label = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
  return time ? `${label} · ${time.slice(0, 5)}` : label;
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
  const missing = error.code === 'PGRST205' || error.code === '42P01' || /schema cache/i.test(error.message || '');
  if (missing) {
    dbMissing = true;
    const banner = $('#setup-banner');
    if (banner) banner.hidden = false;
    return true;
  }
  console.error(what, error);
  toast(`${what} mislukt. Probeer het opnieuw.`);
  return true;
}
function readOutbox() {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); }
  catch { return []; }
}
function writeOutbox(items) { localStorage.setItem(OUTBOX_KEY, JSON.stringify(items)); }
function touch() { localStorage.setItem(ACTIVE_KEY, String(Date.now())); }
function idleTooLong() {
  const t = Number(localStorage.getItem(ACTIVE_KEY) || 0);
  return Boolean(t) && Date.now() - t > IDLE_MS;
}
function alive(rows) { return (rows || []).filter((r) => !r.deleted_at); }
function byId(list, id) { return list.find((r) => Number(r.id) === Number(id)); }

/* ---------- Navigatie ---------- */

function showPanel(name) {
  if (!TITLES[name]) name = 'home';
  active = name;
  $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== name; });
  const main = MAIN.includes(name) ? name : 'more';
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === main));
  $('#page-title').textContent = TITLES[name];
  $('#back-btn').hidden = MAIN.includes(name);
  if (name === 'chat') {
    unread = 0;
    updateBadge();
    scrollChat();
  }
  if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
  if (name === 'print') fillPrint();
  if (name === 'eef' || name === 'wishes') fillProfileForms();
  fitApp();
}

function updateBadge() {
  const badge = $('#chat-badge');
  const n = unread;
  badge.hidden = n === 0;
  badge.textContent = n > 99 ? '99+' : n;
  const home = $('#home-chat');
  if (home) home.textContent = n ? `${n} nieuwe berichten` : 'Naar de chat';
  document.title = n ? `(${n}) triagEve` : 'triagEve';
}

/* ---------- Login ---------- */

function showLogin() {
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  $('#password').value = '';
  const saved = localStorage.getItem(NAME_KEY);
  if (USERS.includes(saved)) {
    me = saved;
    selectedUser = saved;
    $$('.user-btn').forEach((b) => b.classList.toggle('selected', b.dataset.user === saved));
  }
  const warn = $('#config-warning');
  const hint = $('#login-hint');
  if (!ready) {
    warn.hidden = false;
    warn.textContent = 'De app is nog niet gekoppeld aan Supabase.';
    hint.hidden = true;
    return;
  }
  warn.hidden = true;
  hint.hidden = false;
  probe();
}

async function probe() {
  try {
    const { error } = await db.from('triageve_messages').select('id').limit(1);
    const warn = $('#config-warning');
    if (!error || error.code === '42501' || /permission/i.test(error.message || '')) {
      warn.hidden = true;
      return;
    }
    if (error.code === 'PGRST205') {
      warn.hidden = false;
      warn.textContent = 'De app is bijna klaar. Vraag Bren even, daarna kun je hier inloggen.';
    }
  } catch (err) {
    console.error(err);
  }
}

$$('.user-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedUser = btn.dataset.user;
    $$('.user-btn').forEach((b) => b.classList.toggle('selected', b === btn));
    $('#password').focus();
  });
});

$('#show-password').addEventListener('click', () => {
  const input = $('#password');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  $('#show-password').textContent = show ? 'Verberg' : 'Toon';
});

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const error = $('#login-error');
  const fail = (msg) => { error.textContent = msg; error.hidden = false; };
  if (!ready) return fail('De app is nog niet gekoppeld.');
  if (!USERS.includes(selectedUser)) return fail('Kies eerst wie je bent.');
  $('#login-btn').disabled = true;
  try {
    const { error: authError } = await db.auth.signInWithPassword({
      email: CFG.TEAM_EMAIL,
      password: $('#password').value,
    });
    if (authError) {
      const wrong = /invalid login|invalid_credentials/i.test(`${authError.message || ''} ${authError.code || ''}`);
      return fail(wrong ? 'Wachtwoord klopt niet.' : 'Inloggen lukt niet. Controleer je internet, of vraag Bren.');
    }
    error.hidden = true;
    me = selectedUser;
    localStorage.setItem(NAME_KEY, me);
    touch();
    start();
  } catch (err) {
    console.error(err);
    fail('Inloggen lukt niet. Controleer je internet.');
  } finally {
    $('#login-btn').disabled = false;
  }
});

async function logout() {
  started = false;
  try {
    if (channel) await db.removeChannel(channel);
    channel = null;
    await db.auth.signOut();
  } catch (err) { console.error(err); }
  showLogin();
}
$('#logout-btn').addEventListener('click', logout);
$('#more-logout').addEventListener('click', logout);

async function start() {
  started = true;
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#current-user').textContent = me;
  const hash = location.hash.replace('#', '');
  showPanel(TITLES[hash] ? hash : 'home');
  $('#chat-input').value = localStorage.getItem('triageve.draft.chat') || '';
  $('#diary-input').value = localStorage.getItem('triageve.draft.diary') || '';
  autosize();
  document.documentElement.classList.toggle('large-text', localStorage.getItem('triageve.large') === '1');
  $('#large-btn').textContent = document.documentElement.classList.contains('large-text') ? 'Normale tekst' : 'Grote tekst';
  await loadAll();
  subscribe();
  flushOutbox();
}

function fitApp() {
  const app = $('#app-view');
  const vv = window.visualViewport;
  if (!vv || app.hidden) {
    app.style.height = '';
    return;
  }
  app.style.height = `${vv.height}px`;
}
window.visualViewport?.addEventListener('resize', fitApp);
window.visualViewport?.addEventListener('scroll', fitApp);

/* ---------- Data ---------- */

async function loadAll() {
  offlineTold = false;
  const jobs = TABLES.map(async (table) => {
    try {
      let q = db.from(table).select('*');
      if (table === 'triageve_history') q = q.order('changed_at', { ascending: false }).limit(300);
      const { data: rows, error } = await q;
      if (check(error, 'Laden')) return [table, []];
      return [table, rows || []];
    } catch (err) {
      if (!offlineTold) { offlineTold = true; toast('Geen verbinding. Opgeslagen tekst blijft staan.'); }
      console.error(err);
      return [table, []];
    }
  });
  const pairs = await Promise.all(jobs);
  const bag = Object.fromEntries(pairs);
  data.messages = bag.triageve_messages || [];
  data.diary = bag.triageve_diary || [];
  data.meetings = bag.triageve_meetings || [];
  data.tasks = bag.triageve_tasks || [];
  data.contacts = bag.triageve_contacts || [];
  data.medications = bag.triageve_medications || [];
  data.checkins = bag.triageve_checkins || [];
  data.measurements = bag.triageve_measurements || [];
  data.history = bag.triageve_history || [];
  data.profile = (bag.triageve_profile || []).find((p) => Number(p.id) === 1) || null;
  $('#setup-banner').hidden = !dbMissing;
  render();
}

function subscribe() {
  if (!db) return;
  if (channel) db.removeChannel(channel);
  let ch = db.channel('triageve');
  TABLES.forEach((table) => {
    ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => loadAll());
  });
  channel = ch.subscribe((status) => {
    $('#conn').classList.toggle('online', status === 'SUBSCRIBED');
  });
}

async function commit(table, op, payload, id) {
  const run = async () => {
    if (op === 'insert') return db.from(table).insert(payload).select().single();
    if (op === 'upsert') return db.from(table).upsert(payload).select().single();
    return db.from(table).update(payload).eq('id', id);
  };
  const queue = () => {
    const box = readOutbox();
    box.push({ table, op, payload, id: id ?? null });
    writeOutbox(box);
    toast('Bewaard op dit toestel. Wordt verstuurd als je weer online bent.');
    render();
    return { queued: true };
  };
  if (!navigator.onLine) return queue();
  try {
    const res = await run();
    if (res.error && /fetch|network|failed/i.test(res.error.message || '')) return queue();
    if (check(res.error, 'Opslaan')) return null;
    return res.data;
  } catch (err) {
    console.error(err);
    return queue();
  }
}

async function flushOutbox() {
  if (!navigator.onLine || !db) return;
  const items = readOutbox();
  if (!items.length) return;
  const left = [];
  for (const item of items) {
    try {
      const res = item.op === 'insert'
        ? await db.from(item.table).insert(item.payload).select().single()
        : item.op === 'upsert'
          ? await db.from(item.table).upsert(item.payload).select().single()
          : await db.from(item.table).update(item.payload).eq('id', item.id);
      if (res.error) left.push(item);
    } catch { left.push(item); }
  }
  writeOutbox(left);
  if (left.length !== items.length) loadAll();
}
window.addEventListener('online', flushOutbox);

async function softDelete(table, id) {
  const patch = { deleted_at: new Date().toISOString() };
  if (table !== 'triageve_diary' && table !== 'triageve_tasks') {
    patch.updated_by = me;
    patch.updated_at = new Date().toISOString();
  }
  const ok = await commit(table, 'update', patch, id);
  if (ok) loadAll();
}

async function notify(kind) {
  if (!CFG.VAPID_PUBLIC_KEY || !db.functions) return;
  try { await db.functions.invoke('notify', { body: { kind, person: me } }); }
  catch (err) { console.error(err); }
}

function render() {
  renderHome();
  renderChat();
  renderDiary();
  renderMeetings();
  renderTasks();
  renderMeds();
  renderContacts();
  renderMeasures();
  renderEmergency();
  renderHelp();
  renderTrash();
  if (active === 'print') fillPrint();
  if (active === 'eef' || active === 'wishes') fillProfileForms();
}

/* ---------- Home ---------- */

function renderHome() {
  const checks = [...data.checkins].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const last = checks[0];
  const line = $('#status-line');
  line.className = last ? `status-line ${last.status}` : 'muted';
  line.textContent = last
    ? `${last.status} · ${last.author} · ${fmtStamp(last.created_at)}${last.note ? ` · ${last.note}` : ''}`
    : 'Nog geen status.';

  const today = localDate();
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const visits = alive(data.meetings).filter((m) => m.kind === 'bezoek' && m.date >= localDate(weekStart) && m.date < localDate(weekEnd));
  $('#visits').innerHTML = visits.length
    ? visits.map((m) => `<p>${esc(formatMeetingDate(m.date, m.time))} · ${esc(m.title)} · ${esc((m.who || []).join(', ') || 'nog niemand')}</p>`).join('')
    : '<p class="empty">Deze week staat er nog geen bezoek.</p>';

  const upcoming = alive(data.meetings).filter((m) => m.date >= today)
    .sort((a, b) => `${a.date}T${a.time || ''}`.localeCompare(`${b.date}T${b.time || ''}`)).slice(0, 3);
  $('#next-meetings').innerHTML = upcoming.length
    ? upcoming.map((m) => `<p><strong>${esc(m.title)}</strong><br>${esc(KIND_LABEL[m.kind] || 'Overleg')} · ${esc(formatMeetingDate(m.date, m.time))}${m.who?.length ? ` · ${esc(m.who.join(', '))}` : ''}</p>`).join('')
    : '<p class="empty">Geen komende afspraken.</p>';

  const openTasks = alive(data.tasks).filter((t) => !t.done).slice(0, 5);
  $('#home-tasks').innerHTML = openTasks.length
    ? openTasks.map((t) => `<p>${esc(t.title)}${t.assignee ? ` · ${esc(t.assignee)}` : ''}${t.due_date ? ` · ${esc(t.due_date)}` : ''}</p>`).join('')
    : '<p class="empty">Geen open taken.</p>';

  const notes = alive(data.diary);
  const important = notes.filter((d) => d.important).slice(0, 3);
  const rest = notes.filter((d) => !important.includes(d)).slice(0, 3);
  const shown = [...important, ...rest];
  $('#home-diary').innerHTML = shown.length
    ? shown.map((d) => `<p>${d.important ? '<span class="badge">belangrijk</span> ' : ''}<strong>${esc(d.author)}</strong> · ${esc(fmtTime(d.created_at))}<br>${esc(String(d.body).slice(0, 140))}</p>`).join('')
    : '<p class="empty">Het dagboek is nog leeg.</p>';
  updateBadge();
}

$$('.status-btn').forEach((btn) => btn.addEventListener('click', async () => {
  const status = btn.dataset.status;
  const note = $('#status-note').value.trim();
  const saved = await commit('triageve_checkins', 'insert', { author: me, status, note });
  if (!saved) return;
  $('#status-note').value = '';
  if (status === 'zorgelijk') {
    await commit('triageve_diary', 'insert', {
      author: me,
      body: `Status: zorgelijk.${note ? ` ${note}` : ''}`,
      category: 'gezondheid',
      important: true,
    });
    notify('status');
  }
  loadAll();
}));

/* ---------- Chat ---------- */

function pending(table) {
  return readOutbox().filter((item) => item.table === table && item.op === 'insert').map((item) => ({
    ...item.payload,
    id: `wacht-${item.payload.body || item.payload.title}`,
    created_at: new Date().toISOString(),
    pending: true,
  }));
}

function renderChat() {
  const rows = [...data.messages].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).concat(pending('triageve_messages'));
  const el = $('#messages');
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  if (!rows.length) { el.innerHTML = '<p class="empty">Nog geen berichten. Zeg hallo.</p>'; return; }
  let lastDay = null;
  let lastAuthor = null;
  el.innerHTML = rows.map((m) => {
    let html = '';
    const day = localDate(new Date(m.created_at));
    if (day !== lastDay) {
      html += `<div class="day-sep"><span>${esc(dayLabel(m.created_at))}</span></div>`;
      lastDay = day;
      lastAuthor = null;
    }
    const mine = m.author === me;
    const showName = !mine && m.author !== lastAuthor;
    lastAuthor = m.author;
    html += `<div class="bubble-row ${mine ? 'mine' : ''}"><div class="bubble">
      ${showName ? `<div class="bubble-author">${esc(m.author)}</div>` : ''}
      <div class="bubble-body">${esc(m.body)}</div>
      <div class="bubble-time">${m.pending ? 'wacht op verbinding' : esc(fmtTime(m.created_at))}</div>
    </div></div>`;
    return html;
  }).join('');
  if (nearBottom) scrollChat();
}
function scrollChat() {
  const el = $('#messages');
  requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}
const chatInput = $('#chat-input');
function autosize() {
  chatInput.style.height = 'auto';
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
}
chatInput.addEventListener('input', () => {
  autosize();
  localStorage.setItem('triageve.draft.chat', chatInput.value);
  touch();
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $('#chat-form').requestSubmit();
  }
});
$('#chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = chatInput.value.trim();
  if (!body) return;
  const saved = await commit('triageve_messages', 'insert', { author: me, body });
  if (!saved) return;
  chatInput.value = '';
  localStorage.removeItem('triageve.draft.chat');
  autosize();
  if (!saved.queued) {
    notify('chat');
    loadAll();
  }
});

/* ---------- Dagboek ---------- */

function renderDiary() {
  const q = $('#diary-search').value.trim().toLowerCase();
  const items = alive(data.diary).filter((d) =>
    (!diaryWho || d.author === diaryWho) && (!q || String(d.body).toLowerCase().includes(q)));
  const list = $('#diary-list');
  if (!items.length) {
    list.innerHTML = `<p class="empty">${q || diaryWho ? 'Niks gevonden.' : 'Het dagboek is nog leeg.'}</p>`;
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
    const mine = d.author === me;
    html += `<article class="card entry ${mine ? 'editable' : ''}" data-action="edit-diary" data-id="${d.id}">
      <div class="item-head"><strong>${esc(d.author)}</strong><span class="item-date">${esc(fmtTime(d.created_at))}</span></div>
      <p class="fine">${esc(CAT_LABEL[d.category] || 'Algemeen')}${d.important ? ' · belangrijk' : ''}</p>
      <p class="entry-body">${esc(d.body)}</p>
      ${d.updated_at ? `<div class="item-meta">Bewerkt ${esc(fmtStamp(d.updated_at))}</div>` : ''}
    </article>`;
    return html;
  }).join('');
}

$('#cat-chips').innerHTML = CATS.map((c) =>
  `<button type="button" class="chip ${c === 'algemeen' ? 'active' : ''}" data-cat="${c}">${CAT_LABEL[c]}</button>`).join('');

function resetDiaryForm() {
  editingDiaryId = null;
  $('#diary-input').value = '';
  localStorage.removeItem('triageve.draft.diary');
  $('#diary-label').textContent = 'Wat is er gebeurd?';
  $('#diary-save').textContent = 'Opslaan';
  $('#diary-cancel').hidden = true;
  $('#diary-delete').hidden = true;
  $('#diary-important').checked = false;
  diaryCat = 'algemeen';
  $$('#cat-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === 'algemeen'));
}
$('#diary-input').addEventListener('input', () => {
  localStorage.setItem('triageve.draft.diary', $('#diary-input').value);
  touch();
});
$('#diary-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = $('#diary-input').value.trim();
  if (!body) return;
  const important = $('#diary-important').checked;
  const saved = editingDiaryId
    ? await commit('triageve_diary', 'update', {
      body, category: diaryCat, important, updated_at: new Date().toISOString(),
    }, editingDiaryId)
    : await commit('triageve_diary', 'insert', { author: me, body, category: diaryCat, important });
  if (!saved) return;
  if (important && !editingDiaryId) notify('diary');
  resetDiaryForm();
  if (!saved.queued) loadAll();
});
$('#diary-cancel').addEventListener('click', resetDiaryForm);
$('#diary-delete').addEventListener('click', async () => {
  if (!editingDiaryId || !confirm('Dit stukje verwijderen?')) return;
  await softDelete('triageve_diary', editingDiaryId);
  resetDiaryForm();
});

/* ---------- Agenda ---------- */

function renderMeetings() {
  const today = localDate();
  const q = $('#meet-search').value.trim().toLowerCase();
  let items = alive(data.meetings);
  if (meetFilter === 'upcoming') items = items.filter((m) => m.date >= today);
  if (meetFilter === 'past') items = items.filter((m) => m.date < today);
  if (q) {
    items = items.filter((m) => [m.title, m.agenda, m.happened, m.actions, m.location, (m.who || []).join(' ')]
      .join(' ').toLowerCase().includes(q));
  }
  const asc = meetFilter === 'upcoming';
  items = [...items].sort((a, b) => {
    const ka = `${a.date}T${a.time || ''}`;
    const kb = `${b.date}T${b.time || ''}`;
    return asc ? ka.localeCompare(kb) : kb.localeCompare(ka);
  });
  const list = $('#meet-list');
  if (!items.length) {
    list.innerHTML = `<p class="empty">${q ? 'Niks gevonden.' : 'Nog niks in de agenda. Tik op +.'}</p>`;
    return;
  }
  list.innerHTML = items.map((m) => {
    const needs = m.date < today && !m.happened;
    return `<article class="card item" data-action="edit-meet" data-id="${m.id}">
      <div class="item-head"><h3 class="item-title">${esc(m.title)}${needs ? '<span class="badge">nog invullen</span>' : ''}</h3>
      <span class="item-date">${esc(formatMeetingDate(m.date, m.time))}</span></div>
      <p class="fine">${esc(KIND_LABEL[m.kind] || 'Overleg')}${m.location ? ` · ${esc(m.location)}` : ''}</p>
      ${m.who?.length ? `<p class="item-who">Met: ${esc(m.who.join(', '))}</p>` : ''}
      ${m.agenda ? `<p>${esc(m.agenda)}</p>` : ''}
      ${m.happened ? `<p>${esc(m.happened)}</p>` : ''}
    </article>`;
  }).join('');
}

const editor = $('#editor');
function openEditor(id = null) {
  editingMeetingId = id;
  const m = id ? byId(alive(data.meetings), id) : null;
  $('#editor-title').textContent = m ? 'Bewerken' : 'Nieuw item';
  $('#f-title').value = m?.title || '';
  $('#f-kind').value = m?.kind || 'overleg';
  $('#f-date').value = m?.date || localDate();
  $('#f-time').value = (m?.time || '').slice(0, 5);
  $('#f-location').value = m?.location || '';
  $('#f-agenda').value = m?.agenda || '';
  $('#f-happened').value = m?.happened || '';
  $('#f-actions').value = m?.actions || '';
  const who = m?.who || [me];
  $$('input[name="who"]').forEach((cb) => { cb.checked = who.includes(cb.value); });
  $('#delete-btn').hidden = !m;
  $('#ics-btn').hidden = !m;
  $('#tasks-from-btn').hidden = !m;
  updateHappenedLabel();
  editor.showModal();
}
function updateHappenedLabel() {
  $('#happened-label').textContent = $('#f-kind').value === 'afspraak'
    ? 'Wat zei de arts / wat is er gebeurd?'
    : 'Wat is er gebeurd?';
}
$('#f-kind').addEventListener('change', updateHappenedLabel);
$('#add-meet').addEventListener('click', () => openEditor());
$('#cancel-btn').addEventListener('click', () => editor.close());
$('#editor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const row = {
    title: $('#f-title').value.trim(),
    kind: $('#f-kind').value,
    date: $('#f-date').value,
    time: $('#f-time').value || null,
    location: $('#f-location').value.trim(),
    agenda: $('#f-agenda').value.trim(),
    happened: $('#f-happened').value.trim(),
    actions: $('#f-actions').value.trim(),
    who: [...$$('input[name="who"]:checked')].map((cb) => cb.value),
    updated_by: me,
    updated_at: new Date().toISOString(),
  };
  if (!row.title || !row.date) return;
  const saved = editingMeetingId
    ? await commit('triageve_meetings', 'update', row, editingMeetingId)
    : await commit('triageve_meetings', 'insert', { ...row, created_by: me });
  if (!saved) return;
  editor.close();
  notify('agenda');
  if (!saved.queued) loadAll();
});
$('#delete-btn').addEventListener('click', async () => {
  if (!editingMeetingId || !confirm('Dit item verwijderen?')) return;
  await softDelete('triageve_meetings', editingMeetingId);
  editor.close();
});
function icsText(m) {
  const fold = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const day = String(m.date).replace(/-/g, '');
  const start = m.time ? `DTSTART:${day}T${String(m.time).slice(0, 5).replace(':', '')}00` : `DTSTART;VALUE=DATE:${day}`;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//triagEve//NL', 'BEGIN:VEVENT', start,
    `SUMMARY:${fold(m.title)}`, `LOCATION:${fold(m.location)}`,
    `DESCRIPTION:${fold([m.agenda, m.happened].filter(Boolean).join('\n'))}`,
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
function download(filename, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#ics-btn').addEventListener('click', () => {
  const m = byId(alive(data.meetings), editingMeetingId);
  if (m) download('triageve.ics', icsText(m), 'text/calendar');
});
$('#tasks-from-btn').addEventListener('click', async () => {
  const lines = $('#f-actions').value.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return toast('Geen actiepunten.');
  for (const line of lines) {
    const match = line.match(/^(Jacky|Paps|Bren)\s*:\s*(.+)$/i);
    const assignee = match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : null;
    const title = match ? match[2] : line;
    await commit('triageve_tasks', 'insert', { title, assignee, created_by: me });
  }
  toast('Taken gemaakt.');
  notify('task');
  loadAll();
});

/* ---------- Taken, medicatie, contacten, metingen ---------- */

function renderTasks() {
  const open = alive(data.tasks).filter((t) => !t.done);
  const counts = USERS.map((name) => `${name}: ${open.filter((t) => t.assignee === name).length}`).join(' · ');
  $('#task-counts').textContent = `Open per persoon: ${counts}`;
  let items = alive(data.tasks);
  if (taskFilter === 'open') items = items.filter((t) => !t.done);
  if (taskFilter === 'mine') items = items.filter((t) => !t.done && t.assignee === me);
  if (taskFilter === 'done') items = items.filter((t) => t.done);
  const today = localDate();
  $('#task-list').innerHTML = items.length ? items.map((t) => {
    const late = !t.done && t.due_date && t.due_date < today;
    return `<article class="card item ${late ? 'late' : ''}">
      <label class="checkline"><input type="checkbox" data-action="toggle-task" data-id="${t.id}" ${t.done ? 'checked' : ''}> ${esc(t.title)}</label>
      <p class="fine">${esc(t.assignee || 'niemand')}${t.due_date ? ` · ${esc(t.due_date)}` : ''}${late ? ' · te laat' : ''}</p>
      <button type="button" class="ghost" data-action="delete-task" data-id="${t.id}">Verwijderen</button>
    </article>`;
  }).join('') : '<p class="empty">Geen taken.</p>';
}
$('#task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('#task-title').value.trim();
  if (!title) return;
  const saved = await commit('triageve_tasks', 'insert', {
    title,
    assignee: $('#task-who').value || null,
    due_date: $('#task-due').value || null,
    created_by: me,
  });
  if (!saved) return;
  $('#task-title').value = '';
  if (saved && !saved.queued) { notify('task'); loadAll(); }
});

function renderMeds() {
  const rows = alive(data.medications);
  const card = (m) => `<article class="card item">
    <strong>${esc(m.name)}</strong>
    <p>${esc([m.dose, m.schedule, m.reason].filter(Boolean).join(' · '))}</p>
    ${m.notes ? `<p>${esc(m.notes)}</p>` : ''}
    <p class="fine">${esc(m.updated_by || '')} · ${esc(fmtStamp(m.updated_at))}</p>
    <button type="button" class="ghost" data-action="edit-med" data-id="${m.id}">Bewerken</button>
    ${m.active ? `<button type="button" class="ghost" data-action="stop-med" data-id="${m.id}">Stoppen</button>` : ''}
    <button type="button" class="ghost" data-action="hist-med" data-id="${m.id}">Geschiedenis</button>
    <button type="button" class="danger" data-action="delete-med" data-id="${m.id}">Verwijderen</button>
  </article>`;
  $('#med-current').innerHTML = rows.filter((m) => m.active).map(card).join('') || '<p class="empty">Nog geen medicatie.</p>';
  $('#med-stopped').innerHTML = rows.filter((m) => !m.active).map(card).join('') || '<p class="empty">Niks gestopt.</p>';
}
function resetMedForm() {
  $('#med-id').value = '';
  ['med-name', 'med-dose', 'med-schedule', 'med-reason', 'med-notes'].forEach((id) => { $(`#${id}`).value = ''; });
  $('#med-cancel').hidden = true;
}
$('#med-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#med-name').value.trim();
  if (!name) return;
  const row = {
    name,
    dose: $('#med-dose').value.trim(),
    schedule: $('#med-schedule').value.trim(),
    reason: $('#med-reason').value.trim(),
    notes: $('#med-notes').value.trim(),
    updated_by: me,
    updated_at: new Date().toISOString(),
  };
  const id = $('#med-id').value;
  const saved = id
    ? await commit('triageve_medications', 'update', row, Number(id))
    : await commit('triageve_medications', 'insert', { ...row, active: true, started_on: localDate() });
  if (!saved) return;
  await commit('triageve_diary', 'insert', {
    author: me,
    category: 'medicatie',
    important: false,
    body: `Medicatie gewijzigd: ${name} – ${id ? 'bijgewerkt' : 'toegevoegd'}`,
  });
  resetMedForm();
  if (!saved.queued) loadAll();
});
$('#med-cancel').addEventListener('click', resetMedForm);

function renderContacts() {
  const rows = alive(data.contacts).slice().sort((a, b) => Number(b.is_emergency) - Number(a.is_emergency) || a.name.localeCompare(b.name, 'nl'));
  $('#contact-list').innerHTML = rows.length ? rows.map((c) => `<article class="card item">
    <strong>${esc(c.name)}</strong> ${c.is_emergency ? '<span class="badge">nood</span>' : ''}
    <p class="fine">${esc(c.role || '')}</p>
    ${c.phone ? `<p><a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a></p>` : ''}
    ${c.notes ? `<p>${esc(c.notes)}</p>` : ''}
    <button type="button" class="ghost" data-action="edit-contact" data-id="${c.id}">Bewerken</button>
    <button type="button" class="danger" data-action="delete-contact" data-id="${c.id}">Verwijderen</button>
  </article>`).join('') : '<p class="empty">Nog geen contacten.</p>';
}
function resetContactForm() {
  $('#contact-id').value = '';
  ['contact-name', 'contact-role', 'contact-phone', 'contact-email', 'contact-notes'].forEach((id) => { $(`#${id}`).value = ''; });
  $('#contact-emergency').checked = false;
  $('#contact-cancel').hidden = true;
}
$('#contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#contact-name').value.trim();
  if (!name) return;
  const row = {
    name,
    role: $('#contact-role').value.trim(),
    phone: $('#contact-phone').value.trim(),
    email: $('#contact-email').value.trim(),
    notes: $('#contact-notes').value.trim(),
    is_emergency: $('#contact-emergency').checked,
    updated_by: me,
    updated_at: new Date().toISOString(),
  };
  const id = $('#contact-id').value;
  const saved = id
    ? await commit('triageve_contacts', 'update', row, Number(id))
    : await commit('triageve_contacts', 'insert', row);
  if (!saved) return;
  resetContactForm();
  if (!saved.queued) loadAll();
});
$('#contact-cancel').addEventListener('click', resetContactForm);

function renderMeasures() {
  const rows = [...data.measurements].sort((a, b) => String(b.measured_at).localeCompare(String(a.measured_at)));
  $('#measure-list').innerHTML = rows.length ? rows.map((m) => `<article class="card item">
    <strong>${esc(m.kind)}</strong> ${esc(m.value)}
    <p class="fine">${esc(m.author)} · ${esc(fmtStamp(m.measured_at))}${m.note ? ` · ${esc(m.note)}` : ''}</p>
  </article>`).join('') : '<p class="empty">Nog geen metingen.</p>';
}
$('#measure-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = $('#measure-value').value.trim();
  if (!value) return;
  const saved = await commit('triageve_measurements', 'insert', {
    author: me, kind: $('#measure-kind').value, value, note: $('#measure-note').value.trim(),
  });
  if (!saved) return;
  $('#measure-value').value = '';
  $('#measure-note').value = '';
  if (!saved.queued) loadAll();
});

/* ---------- Profiel, nood, hulp, prullenbak, print ---------- */

function fillProfileForms() {
  const formId = document.activeElement?.form?.id;
  if (formId === 'eef-form' || formId === 'wishes-form') return;
  const p = data.profile || {};
  $('#eef-summary').value = p.summary || '';
  $('#eef-important').value = p.important || '';
  $('#eef-emergency').value = p.emergency || '';
  $('#wishes').value = p.wishes || '';
  $('#sharing').value = p.sharing || '';
  $('#representative').value = p.representative || '';
  $('#documents').value = p.documents || '';
  $('#eef-meta').textContent = p.updated_at ? `Laatst bijgewerkt door ${p.updated_by || '?'} op ${fmtStamp(p.updated_at)}` : '';
}
function profileBase() {
  const p = data.profile || {};
  return {
    id: 1,
    summary: p.summary || '',
    important: p.important || '',
    emergency: p.emergency || '',
    wishes: p.wishes || '',
    sharing: p.sharing || '',
    representative: p.representative || '',
    documents: p.documents || '',
    updated_by: me,
    updated_at: new Date().toISOString(),
  };
}
$('#eef-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const saved = await commit('triageve_profile', 'upsert', {
    ...profileBase(),
    summary: $('#eef-summary').value.trim(),
    important: $('#eef-important').value.trim(),
    emergency: $('#eef-emergency').value.trim(),
  });
  if (saved && !saved.queued) loadAll();
});
$('#wishes-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const saved = await commit('triageve_profile', 'upsert', {
    ...profileBase(),
    wishes: $('#wishes').value.trim(),
    sharing: $('#sharing').value.trim(),
    representative: $('#representative').value.trim(),
    documents: $('#documents').value.trim(),
  });
  if (saved && !saved.queued) { toast('Opgeslagen.'); loadAll(); }
});

function phoneLink(phone, label) {
  const href = `tel:${String(phone).replace(/[^\d+]/g, '')}`;
  return `<a class="card link-card" href="${esc(href)}"><strong>${esc(label)}</strong><span>${esc(phone)}</span></a>`;
}
function renderEmergency() {
  const p = data.profile || {};
  $('#emergency-text').textContent = p.emergency || 'Nog niks ingevuld bij Over Eef.';
  $('#emergency-important').textContent = p.important || 'Nog niks ingevuld.';
  const people = alive(data.contacts).filter((c) => c.is_emergency || /huisarts/i.test(c.role || ''));
  $('#emergency-contacts').innerHTML = people.map((c) => c.phone ? phoneLink(c.phone, `${c.name}${c.role ? ` (${c.role})` : ''}`) : `<p>${esc(c.name)}</p>`).join('')
    || '<p class="empty">Zet contacten op noodcontact, of geef de huisarts die rol.</p>';
}
function renderHelp() {
  const extra = alive(data.contacts).filter((c) => c.phone && /huisarts|post/i.test(`${c.role} ${c.name}`));
  $('#help-contacts').innerHTML = extra.map((c) => phoneLink(c.phone, c.name)).join('');
}

function renderTrash() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const bags = [
    ['triageve_diary', 'Dagboek', data.diary],
    ['triageve_meetings', 'Agenda', data.meetings],
    ['triageve_contacts', 'Contact', data.contacts],
    ['triageve_medications', 'Medicatie', data.medications],
    ['triageve_tasks', 'Taak', data.tasks],
  ];
  const rows = bags.flatMap(([table, label, list]) => (list || [])
    .filter((r) => r.deleted_at && new Date(r.deleted_at).getTime() >= cutoff)
    .map((r) => ({ ...r, table, label, title: r.title || r.name || String(r.body || '').slice(0, 80) })));
  $('#trash-list').innerHTML = rows.length ? rows.map((r) => `<article class="card item">
    <p class="fine">${esc(r.label)} · ${esc(fmtStamp(r.deleted_at))}</p>
    <p>${esc(r.title)}</p>
    <button type="button" class="primary" data-action="restore" data-table="${esc(r.table)}" data-id="${r.id}">Terugzetten</button>
  </article>`).join('') : '<p class="empty">De prullenbak is leeg.</p>';
}

function fillPrint() {
  const p = data.profile || {};
  const meds = alive(data.medications).filter((m) => m.active);
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const notes = alive(data.diary).filter((d) => d.important && new Date(d.created_at).getTime() >= since);
  const upcoming = alive(data.meetings).filter((m) => m.date >= localDate()).slice(0, 8);
  const people = alive(data.contacts).filter((c) => c.is_emergency);
  const block = (title, html) => `<h2>${esc(title)}</h2>${html || '<p>—</p>'}`;
  $('#print-sheet').innerHTML = `<h1>triagEve – overzicht</h1><p>${esc(fmtStamp(new Date().toISOString()))}</p>
    ${block('Situatie', `<p class="pre">${esc(p.summary || '')}</p>`)}
    ${block('Belangrijk', `<p class="pre">${esc(p.important || '')}</p>`)}
    ${block('In geval van nood', `<p class="pre">${esc(p.emergency || '')}</p>`)}
    ${block('Medicatie', meds.map((m) => `<p>${esc(m.name)} · ${esc(m.dose || '')} · ${esc(m.schedule || '')}</p>`).join(''))}
    ${block('Belangrijk dagboek (30 dagen)', notes.map((d) => `<p>${esc(fmtStamp(d.created_at))} · ${esc(d.author)}<br>${esc(d.body)}</p>`).join(''))}
    ${block('Komende afspraken', upcoming.map((m) => `<p>${esc(formatMeetingDate(m.date, m.time))} · ${esc(m.title)} · ${esc(m.location || '')}</p>`).join(''))}
    ${block('Noodcontacten', people.map((c) => `<p>${esc(c.name)} · ${esc(c.phone || '')} · ${esc(c.role || '')}</p>`).join(''))}
    <p class="fine">De app vervangt geen arts. Bij acuut gevaar: 112.</p>`;
}
$('#do-print').addEventListener('click', () => { fillPrint(); window.print(); });

function showHistory(table, id) {
  const rows = data.history.filter((h) => h.table_name === table && String(h.row_id) === String(id));
  const html = rows.length ? rows.map((h) => `<p class="fine">${esc(h.action)} · ${esc(h.changed_by || '?')} · ${esc(fmtStamp(h.changed_at))}</p>`).join('') : '<p class="empty">Nog geen geschiedenis.</p>';
  if (table === 'triageve_profile') $('#eef-history').innerHTML = html;
  else $('#med-history').innerHTML = html;
}

/* ---------- Klikken ---------- */

document.body.addEventListener('click', async (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { showPanel(go.dataset.go); return; }
  const tab = e.target.closest('.nav-btn');
  if (tab) { showPanel(tab.dataset.tab); return; }
  const chip = e.target.closest('#diary-chips .chip');
  if (chip) {
    diaryWho = chip.dataset.who;
    $$('#diary-chips .chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderDiary();
    return;
  }
  const cat = e.target.closest('#cat-chips .chip');
  if (cat) {
    diaryCat = cat.dataset.cat;
    $$('#cat-chips .chip').forEach((c) => c.classList.toggle('active', c === cat));
    return;
  }
  const filter = e.target.closest('#tab-meet .tab, #panel-agenda .tab');
  if (filter?.dataset.filter) {
    meetFilter = filter.dataset.filter;
    $$('#panel-agenda .tab').forEach((t) => t.classList.toggle('active', t === filter));
    renderMeetings();
    return;
  }
  const tf = e.target.closest('#task-filters .chip');
  if (tf) {
    taskFilter = tf.dataset.taskfilter;
    $$('#task-filters .chip').forEach((c) => c.classList.toggle('active', c === tf));
    renderTasks();
    return;
  }
  const histBtn = e.target.closest('[data-history]');
  if (histBtn) { showHistory(histBtn.dataset.history, 1); return; }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === 'edit-diary') {
    const d = byId(alive(data.diary), id);
    if (!d || d.author !== me) return;
    editingDiaryId = id;
    $('#diary-input').value = d.body;
    $('#diary-important').checked = Boolean(d.important);
    diaryCat = d.category || 'algemeen';
    $$('#cat-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === diaryCat));
    $('#diary-label').textContent = `Bewerken (${fmtStamp(d.created_at)})`;
    $('#diary-save').textContent = 'Bijwerken';
    $('#diary-cancel').hidden = false;
    $('#diary-delete').hidden = false;
    $('#panel-diary .scroll').scrollTop = 0;
  } else if (action === 'edit-meet') openEditor(id);
  else if (action === 'toggle-task') {
    const t = byId(alive(data.tasks), id);
    if (!t) return;
    const done = btn.querySelector('input') ? btn.querySelector('input').checked : !t.done;
    await commit('triageve_tasks', 'update', {
      done, done_by: done ? me : null, done_at: done ? new Date().toISOString() : null,
    }, id);
    loadAll();
  } else if (action === 'delete-task') {
    if (confirm('Taak verwijderen?')) softDelete('triageve_tasks', id);
  } else if (action === 'edit-med') {
    const m = byId(alive(data.medications), id);
    if (!m) return;
    $('#med-id').value = m.id;
    $('#med-name').value = m.name || '';
    $('#med-dose').value = m.dose || '';
    $('#med-schedule').value = m.schedule || '';
    $('#med-reason').value = m.reason || '';
    $('#med-notes').value = m.notes || '';
    $('#med-cancel').hidden = false;
  } else if (action === 'stop-med') {
    const m = byId(alive(data.medications), id);
    if (!m) return;
    await commit('triageve_medications', 'update', {
      active: false, stopped_on: localDate(), updated_by: me, updated_at: new Date().toISOString(),
    }, id);
    await commit('triageve_diary', 'insert', {
      author: me, category: 'medicatie', important: false, body: `Medicatie gewijzigd: ${m.name} – gestopt`,
    });
    loadAll();
  } else if (action === 'delete-med') {
    if (confirm('Medicatie verwijderen?')) softDelete('triageve_medications', id);
  } else if (action === 'hist-med') showHistory('triageve_medications', id);
  else if (action === 'edit-contact') {
    const c = byId(alive(data.contacts), id);
    if (!c) return;
    $('#contact-id').value = c.id;
    $('#contact-name').value = c.name || '';
    $('#contact-role').value = c.role || '';
    $('#contact-phone').value = c.phone || '';
    $('#contact-email').value = c.email || '';
    $('#contact-notes').value = c.notes || '';
    $('#contact-emergency').checked = Boolean(c.is_emergency);
    $('#contact-cancel').hidden = false;
  } else if (action === 'delete-contact') {
    if (confirm('Contact verwijderen?')) softDelete('triageve_contacts', id);
  } else if (action === 'restore') {
    const saved = await commit(btn.dataset.table, 'update', { deleted_at: null }, id);
    if (saved && !saved.queued) loadAll();
  }
});

$('#diary-search').addEventListener('input', renderDiary);
$('#meet-search').addEventListener('input', renderMeetings);
$('#back-btn').addEventListener('click', () => showPanel(active === 'emergency' ? 'home' : 'more'));

$('#large-btn').addEventListener('click', () => {
  const on = !document.documentElement.classList.contains('large-text');
  document.documentElement.classList.toggle('large-text', on);
  localStorage.setItem('triageve.large', on ? '1' : '0');
  $('#large-btn').textContent = on ? 'Normale tekst' : 'Grote tekst';
});

$('#export-btn').addEventListener('click', () => {
  download('triageve.json', JSON.stringify(data, null, 2), 'application/json');
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
$('#push-btn').addEventListener('click', async () => {
  if (!CFG.VAPID_PUBLIC_KEY) return toast('Meldingen zijn nog niet klaargezet. Vraag Bren.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return toast('Deze browser kan geen meldingen.');
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await existing.unsubscribe();
    toast('Meldingen uit.');
    return;
  }
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(CFG.VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    await commit('triageve_push_subscriptions', 'insert', {
      person: me, endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth,
    });
    toast('Meldingen aan. Op een iPhone werkt dit alleen vanuit het beginscherm (iOS 16.4+).');
  } catch (err) {
    console.error(err);
    toast('Meldingen lukken niet. Kijk bij de browser of ze mogen.');
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && started) {
    touch();
    loadAll();
    flushOutbox();
  }
});
document.addEventListener('click', touch);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

(async () => {
  showLogin();
  if (!ready) return;
  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && started) showLogin();
  });
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session && idleTooLong()) {
      await db.auth.signOut();
      toast('Je bent uitgelogd na 14 dagen niet gebruiken.');
      return;
    }
    if (session && USERS.includes(localStorage.getItem(NAME_KEY))) {
      me = localStorage.getItem(NAME_KEY);
      touch();
      start();
    }
  } catch (err) { console.error(err); }
})();
