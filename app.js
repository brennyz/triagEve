const USERS = ['Jacky', 'Paps', 'Bren'];
const NAME_KEY = 'triageve.user';
const CFG = window.TRIAGEVE_CONFIG || {};
const configured = Boolean(CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes('JOUW-PROJECT'));
const db = configured ? supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY) : null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let me = localStorage.getItem(NAME_KEY);
let selectedUser = null;
let activeTab = 'chat';
let channel = null;
let unread = 0;

let messages = [];
let diary = [];
let meetings = [];
let diaryWho = '';
let editingDiaryId = null;
let meetFilter = 'upcoming';
let editingMeetingId = null;

/* ---------- Helpers ---------- */

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

/* ---------- Login ---------- */

function showLogin() {
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  $('#password').value = '';
  $('#config-warning').hidden = configured;
}

$$('.user-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedUser = btn.dataset.user;
    $$('.user-btn').forEach((b) => b.classList.toggle('selected', b === btn));
    $('#password').focus();
  });
});

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const error = $('#login-error');
  const fail = (msg) => { error.textContent = msg; error.hidden = false; };
  if (!configured) return fail('De app is nog niet gekoppeld aan Supabase.');
  if (!USERS.includes(selectedUser)) return fail('Kies eerst wie je bent.');

  $('#login-btn').disabled = true;
  const { error: authError } = await db.auth.signInWithPassword({
    email: CFG.TEAM_EMAIL,
    password: $('#password').value,
  });
  $('#login-btn').disabled = false;
  if (authError) return fail('Wachtwoord klopt niet.');

  error.hidden = true;
  me = selectedUser;
  localStorage.setItem(NAME_KEY, me);
  start();
});

$('#logout-btn').addEventListener('click', async () => {
  if (channel) await db.removeChannel(channel);
  channel = null;
  await db.auth.signOut();
  localStorage.removeItem(NAME_KEY);
  showLogin();
});

/* ---------- App shell ---------- */

async function start() {
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#current-user').textContent = me;
  switchTab(activeTab);
  await Promise.all([loadMessages(), loadDiary(), loadMeetings()]);
  subscribe();
}

const TITLES = { chat: 'Chat', diary: 'Dagboek', meet: 'Overleg' };

function switchTab(tab) {
  activeTab = tab;
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab-panel').forEach((p) => { p.hidden = p.id !== `tab-${tab}`; });
  $('#page-title').textContent = TITLES[tab];
  if (tab === 'chat') {
    unread = 0;
    updateBadge();
    scrollChatToBottom();
  }
}

$$('.nav-btn').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

function updateBadge() {
  const badge = $('#chat-badge');
  badge.hidden = unread === 0;
  badge.textContent = unread > 99 ? '99+' : unread;
  document.title = unread ? `(${unread}) triagEve` : 'triagEve';
}

function subscribe() {
  if (channel) db.removeChannel(channel);
  channel = db.channel('triageve')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'triageve_messages' }, (p) => {
      if (p.eventType === 'INSERT') addMessage(p.new);
      else loadMessages();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'triageve_diary' }, () => loadDiary())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'triageve_meetings' }, () => loadMeetings())
    .subscribe((status) => {
      $('#conn').classList.toggle('online', status === 'SUBSCRIBED');
    });
}

// Phones pause background tabs, so catch up when the app comes back.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && me && !$('#app-view').hidden) {
    loadMessages();
    loadDiary();
    loadMeetings();
  }
});

/* ---------- Chat ---------- */

async function loadMessages() {
  const { data, error } = await db.from('triageve_messages').select('*')
    .order('created_at', { ascending: false }).limit(300);
  if (check(error, 'Berichten laden')) return;
  messages = data.reverse();
  renderChat();
}

function addMessage(m) {
  if (messages.some((x) => x.id === m.id)) return;
  messages.push(m);
  renderChat();
  if (m.author !== me && (activeTab !== 'chat' || document.hidden)) {
    unread += 1;
    updateBadge();
  }
}

function renderChat() {
  const el = $('#messages');
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  if (!messages.length) {
    el.innerHTML = '<p class="empty">Nog geen berichten. Zeg hallo!</p>';
    return;
  }
  let lastDay = null;
  let lastAuthor = null;
  el.innerHTML = messages.map((m) => {
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
    html += `
      <div class="bubble-row ${mine ? 'mine' : ''}">
        <div class="bubble" title="${esc(fmtStamp(m.created_at))}">
          ${showName ? `<div class="bubble-author">${esc(m.author)}</div>` : ''}
          <div class="bubble-body">${esc(m.body)}</div>
          <div class="bubble-time">${esc(fmtTime(m.created_at))}</div>
        </div>
      </div>`;
    return html;
  }).join('');
  if (nearBottom || messages.at(-1)?.author === me) scrollChatToBottom();
}

function scrollChatToBottom() {
  const el = $('#messages');
  requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

const chatInput = $('#chat-input');

function autosize() {
  chatInput.style.height = 'auto';
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
}

chatInput.addEventListener('input', autosize);
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
  chatInput.value = '';
  autosize();
  const { data, error } = await db.from('triageve_messages').insert({ author: me, body }).select().single();
  if (check(error, 'Versturen')) {
    chatInput.value = body;
    autosize();
    return;
  }
  addMessage(data);
});

/* ---------- Dagboek ---------- */

async function loadDiary() {
  const { data, error } = await db.from('triageve_diary').select('*').order('created_at', { ascending: false });
  if (check(error, 'Dagboek laden')) return;
  diary = data;
  renderDiary();
}

function renderDiary() {
  const q = $('#diary-search').value.trim().toLowerCase();
  const items = diary.filter((d) =>
    (!diaryWho || d.author === diaryWho) && (!q || d.body.toLowerCase().includes(q)));

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
  editingDiaryId = null;
  $('#diary-input').value = '';
  $('#diary-label').textContent = 'Wat is er gebeurd?';
  $('#diary-save').textContent = 'Opslaan';
  $('#diary-cancel').hidden = true;
  $('#diary-delete').hidden = true;
}

function editDiary(id) {
  const d = diary.find((x) => x.id === id);
  if (!d) return;
  editingDiaryId = id;
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
  const { error } = editingDiaryId
    ? await db.from('triageve_diary').update({ body, updated_at: new Date().toISOString() }).eq('id', editingDiaryId)
    : await db.from('triageve_diary').insert({ author: me, body });
  if (check(error, 'Opslaan')) return;
  resetDiaryForm();
  loadDiary();
});

$('#diary-cancel').addEventListener('click', resetDiaryForm);

$('#diary-delete').addEventListener('click', async () => {
  if (!editingDiaryId || !confirm('Dit stukje verwijderen?')) return;
  const { error } = await db.from('triageve_diary').delete().eq('id', editingDiaryId);
  if (check(error, 'Verwijderen')) return;
  resetDiaryForm();
  loadDiary();
});

$$('#diary-chips .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    diaryWho = chip.dataset.who;
    $$('#diary-chips .chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderDiary();
  });
});

$('#diary-search').addEventListener('input', renderDiary);

/* ---------- Overleg ---------- */

async function loadMeetings() {
  const { data, error } = await db.from('triageve_meetings').select('*');
  if (check(error, 'Overleggen laden')) return;
  meetings = data;
  renderMeetings();
}

function formatMeetingDate(date, time) {
  const d = new Date(`${date}T${time || '00:00'}`);
  const label = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return time ? `${label} · ${time}` : label;
}

function renderMeetings() {
  const today = localDate();
  const q = $('#meet-search').value.trim().toLowerCase();
  let items = meetings;

  if (meetFilter === 'upcoming') items = items.filter((m) => m.date >= today);
  if (meetFilter === 'past') items = items.filter((m) => m.date < today);
  if (q) {
    items = items.filter((m) =>
      [m.title, m.agenda, m.happened, m.actions, (m.who || []).join(' ')]
        .join(' ').toLowerCase().includes(q));
  }

  const asc = meetFilter === 'upcoming';
  items = [...items].sort((a, b) => {
    const ka = `${a.date}T${a.time || '00:00'}`;
    const kb = `${b.date}T${b.time || '00:00'}`;
    return asc ? ka.localeCompare(kb) : kb.localeCompare(ka);
  });

  const list = $('#meet-list');
  if (!items.length) {
    const msg = {
      upcoming: 'Geen komende overleggen. Tik op + om er een te plannen.',
      past: 'Nog niks gebeurd.',
      all: 'Nog geen overleggen. Tik op + om te beginnen.',
    }[meetFilter];
    list.innerHTML = `<p class="empty">${q ? 'Niks gevonden.' : msg}</p>`;
    return;
  }

  list.innerHTML = items.map((m) => {
    const actions = (m.actions || '').split('\n').map((s) => s.trim()).filter(Boolean);
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
        ${actions.length ? `<div class="item-section"><h4>Actiepunten</h4><ul>${actions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
        <div class="item-meta">Laatst bewerkt door ${esc(m.updated_by || m.created_by || '?')} · ${esc(fmtStamp(m.updated_at))}</div>
      </article>`;
  }).join('');

  $$('#meet-list .item').forEach((el) => el.addEventListener('click', () => openEditor(Number(el.dataset.id))));
}

$$('#tab-meet .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    meetFilter = tab.dataset.filter;
    $$('#tab-meet .tab').forEach((t) => t.classList.toggle('active', t === tab));
    renderMeetings();
  });
});

$('#meet-search').addEventListener('input', renderMeetings);

const editor = $('#editor');

function openEditor(id = null) {
  editingMeetingId = id;
  const m = id ? meetings.find((x) => x.id === id) : null;
  $('#editor-title').textContent = m ? 'Overleg bewerken' : 'Nieuw overleg';
  $('#f-title').value = m?.title || '';
  $('#f-date').value = m?.date || localDate();
  $('#f-time').value = m?.time || '';
  $('#f-agenda').value = m?.agenda || '';
  $('#f-happened').value = m?.happened || '';
  $('#f-actions').value = m?.actions || '';
  const who = m?.who || [me];
  $$('input[name="who"]').forEach((cb) => { cb.checked = who.includes(cb.value); });
  $('#delete-btn').hidden = !m;
  editor.showModal();
}

$('#add-btn').addEventListener('click', () => openEditor());
$('#cancel-btn').addEventListener('click', () => editor.close());

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
    updated_by: me,
    updated_at: new Date().toISOString(),
  };
  if (!data.title || !data.date) return;

  const { error } = editingMeetingId
    ? await db.from('triageve_meetings').update(data).eq('id', editingMeetingId)
    : await db.from('triageve_meetings').insert({ ...data, created_by: me });
  if (check(error, 'Opslaan')) return;
  editor.close();
  loadMeetings();
});

$('#delete-btn').addEventListener('click', async () => {
  if (!editingMeetingId || !confirm('Dit overleg verwijderen?')) return;
  const { error } = await db.from('triageve_meetings').delete().eq('id', editingMeetingId);
  if (check(error, 'Verwijderen')) return;
  editor.close();
  loadMeetings();
});

/* ---------- Start ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

(async () => {
  if (!configured) return showLogin();
  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') showLogin();
  });
  const { data: { session } } = await db.auth.getSession();
  if (session && USERS.includes(me)) start();
  else showLogin();
})();
