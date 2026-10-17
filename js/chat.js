import {
  $, $$, store, db, esc, check, onLoad, onRealtime, localDate, fmtTime, fmtStamp, dayLabel, actions,
} from './core.js';
import { renderHome } from './home.js';
import { pingNotify } from './push.js';
import { writeRow } from './offline.js';

export async function loadMessages() {
  if (!db) {
    store.messages = [];
    renderChat();
    return;
  }
  const { data, error } = await db.from('triageve_messages').select('*')
    .order('created_at', { ascending: false }).limit(300);
  if (check(error, 'Berichten laden')) return;
  store.messages = data.reverse();
  renderChat();
  renderHome();
}

function addMessage(m) {
  if (store.messages.some((x) => x.id === m.id)) return;
  store.messages.push(m);
  renderChat();
  renderHome();
  if (m.author !== store.me && (store.activeTab !== 'chat' || document.hidden)) {
    store.unread += 1;
    updateBadge();
  }
}

export function renderChat() {
  const el = $('#messages');
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  if (!store.messages.length) {
    el.innerHTML = '<p class="empty">Nog geen berichten. Zeg hallo!</p>';
    return;
  }
  let lastDay = null;
  el.innerHTML = store.messages.map((m) => {
    let html = '';
    const day = localDate(new Date(m.created_at));
    if (day !== lastDay) {
      html += `<div class="day-sep"><span>${esc(dayLabel(m.created_at))}</span></div>`;
      lastDay = day;
    }
    const mine = m.author === store.me;
    const who = { jacky: 'who-jacky', paps: 'who-paps', pap: 'who-paps', bren: 'who-bren', brendon: 'who-bren' }[String(m.author || '').toLowerCase()] || 'who-other';
    html += `
      <div class="bubble-row ${mine ? 'mine' : ''} ${who}">
        <div class="bubble" title="${esc(fmtStamp(m.created_at))}">
          <div class="bubble-author">${esc(m.author || 'Onbekend')}</div>
          <div class="bubble-body">${esc(m.body)}</div>
          <div class="bubble-time">${esc(fmtTime(m.created_at))}${m.pending ? ' · wacht op verbinding' : ''}</div>
        </div>
      </div>`;
    return html;
  }).join('');
  if (nearBottom || store.messages.at(-1)?.author === store.me) scrollChatToBottom();
}

function scrollChatToBottom() {
  const el = $('#messages');
  requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

function updateBadge() {
  const badge = $('#chat-badge');
  badge.hidden = store.unread === 0;
  badge.textContent = store.unread > 99 ? '99+' : store.unread;
  document.title = store.unread ? `(${store.unread}) triagEve` : 'triagEve';
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
  const { data, error, queued } = await writeRow('triageve_messages', { author: store.me, body });
  if (queued) {
    addMessage({ id: `pending-${Date.now()}`, author: store.me, body, created_at: new Date().toISOString(), pending: true });
    return;
  }
  if (check(error, 'Versturen')) {
    chatInput.value = body;
    autosize();
    return;
  }
  addMessage(data);
  pingNotify('chat');
});

onLoad(loadMessages);
onRealtime('triageve_messages', (p) => {
  if (p.eventType === 'INSERT') addMessage(p.new);
  else loadMessages();
});

actions.updateBadge = updateBadge;
actions.scrollChatToBottom = scrollChatToBottom;
actions.renderChat = renderChat;
