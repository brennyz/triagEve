import {
  $, $$, store, db, esc, check, onLoad, onRealtime, localDate, fmtTime, fmtStamp, dayLabel, actions,
  personName, samePerson, alive, toast,
} from './core.js';
import { renderHome } from './home.js';
import { loadDiary } from './diary.js';
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
  if (!samePerson(m.author, store.me) && (store.activeTab !== 'chat' || document.hidden)) {
    store.unread += 1;
    updateBadge();
  }
}

function filedFor(id) {
  return alive(store.diary).find((d) => d.source_message_id != null && Number(d.source_message_id) === Number(id));
}

export function renderChat({ followMine = true } = {}) {
  const el = $('#messages');
  if (!el) return;
  const top = el.scrollTop;
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
    const mine = samePerson(m.author, store.me);
    const who = { jacky: 'who-jacky', ronald: 'who-ronald', paps: 'who-ronald', pap: 'who-ronald', bren: 'who-bren', brendon: 'who-bren' }[String(m.author || '').toLowerCase()] || 'who-other';
    const filed = !m.pending && filedFor(m.id);
    html += `
      <div class="bubble-row ${mine ? 'mine' : ''} ${who}">
        <div class="bubble" data-id="${esc(m.id)}" ${m.pending ? 'data-pending="1"' : ''}>
          <div class="bubble-author">${esc(personName(m.author) || 'Onbekend')}</div>
          <div class="bubble-body">${esc(m.body)}</div>
          <div class="bubble-time">${esc(fmtTime(m.created_at))}${m.pending ? ' · wacht op verbinding' : ''}${filed ? ' · in dagboek' : ''}</div>
          ${m.pending ? '' : `<button type="button" class="bubble-file" data-file="${esc(m.id)}">${filed ? 'Staat in dagboek' : 'In dagboek'}</button>`}
        </div>
      </div>`;
    return html;
  }).join('');
  const follow = nearBottom || (followMine && samePerson(store.messages.at(-1)?.author, store.me));
  if (follow) scrollChatToBottom();
  else el.scrollTop = top;
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

let hold = null;
let openedAt = 0;

function detachHold() {
  if (!hold) return;
  clearTimeout(hold.timer);
  clearTimeout(hold.hint);
  hold.bubble?.classList.remove('is-holding');
  window.removeEventListener('pointerup', endHold);
  window.removeEventListener('pointercancel', endHold);
  window.removeEventListener('pointermove', moveHold);
  hold = null;
}

function finishHold() {
  if (!hold) return;
  const id = hold.id;
  detachHold();
  openFile(id);
}

function endHold(e) {
  if (!hold || e.pointerId !== hold.pointerId) return;
  const tell = hold.armed && hold.pointerType === 'mouse';
  detachHold();
  if (tell) toast('Houd nog iets langer vast.');
}

function moveHold(e) {
  if (!hold || e.pointerId !== hold.pointerId) return;
  const slop = hold.pointerType === 'mouse' ? 48 : 14;
  if (Math.hypot(e.clientX - hold.startX, e.clientY - hold.startY) > slop) detachHold();
}

function openFile(id) {
  if ($('#file-dialog')?.open || Date.now() - openedAt < 600) return;
  openedAt = Date.now();
  const m = (store.messages || []).find((x) => String(x.id) === String(id));
  if (!m || m.pending) {
    toast('Dit bericht is nog niet verstuurd.');
    return;
  }
  const existing = filedFor(m.id);
  const already = Boolean(existing);
  $('#file-title').textContent = already ? 'Staat al in het dagboek' : 'In het dagboek';
  $('#file-when').textContent = `Tijd van het bericht: ${fmtStamp(m.created_at)}`;
  $('#file-who').textContent = `Geschreven door ${personName(m.author) || 'onbekend'}`;
  $('#file-fields').hidden = already;
  $('#file-already').hidden = !already;
  $('#file-save').hidden = already;
  $('#file-open').hidden = !already;
  $('#file-dialog').dataset.id = String(m.id);
  if (already) {
    $('#file-already').textContent = `In het dagboek gezet door ${personName(existing.filed_by) || 'iemand'}.`;
  } else {
    $('#file-body').value = m.body || '';
    $('#file-important').checked = false;
    $$('#file-cats .chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === 'algemeen'));
  }
  $('#file-dialog').showModal();
  if (!already) $('#file-body').focus();
}

const messages = $('#messages');
messages?.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.bubble-file')) return;
  const bubble = e.target.closest('.bubble[data-id]');
  if (!bubble || bubble.dataset.pending) return;
  if (e.pointerType === 'mouse') e.preventDefault();
  detachHold();
  try { bubble.setPointerCapture(e.pointerId); } catch { /* de bel kan het gebaar ook zonder vangst volgen */ }
  hold = {
    id: bubble.dataset.id,
    bubble,
    startX: e.clientX,
    startY: e.clientY,
    pointerId: e.pointerId,
    pointerType: e.pointerType,
    armed: false,
    hint: null,
    timer: null,
  };
  hold.hint = setTimeout(() => {
    if (!hold || hold.bubble !== bubble) return;
    hold.armed = true;
    bubble.classList.add('is-holding');
    window.getSelection()?.removeAllRanges();
  }, 160);
  hold.timer = setTimeout(() => {
    if (navigator.vibrate) navigator.vibrate(12);
    finishHold();
  }, 500);
  window.addEventListener('pointerup', endHold);
  window.addEventListener('pointercancel', endHold);
  window.addEventListener('pointermove', moveHold);
});
messages?.addEventListener('click', (e) => {
  const btn = e.target.closest('.bubble-file');
  if (!btn) return;
  e.preventDefault();
  openFile(btn.dataset.file);
});
messages?.addEventListener('contextmenu', (e) => {
  const bubble = e.target.closest('.bubble[data-id]');
  if (!bubble) return;
  e.preventDefault();
  detachHold();
  if (bubble.dataset.pending) {
    toast('Dit bericht is nog niet verstuurd.');
    return;
  }
  openFile(bubble.dataset.id);
});
$('#file-dialog')?.addEventListener('close', () => {
  const id = $('#file-dialog').dataset.id;
  if (!id) return;
  document.querySelector(`.bubble-file[data-file="${CSS.escape(id)}"]`)?.focus();
});

$$('#file-cats .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    $$('#file-cats .chip').forEach((c) => c.classList.toggle('active', c === chip));
  });
});

$('#file-cancel')?.addEventListener('click', () => $('#file-dialog').close());
$('#file-open')?.addEventListener('click', () => {
  const existing = filedFor($('#file-dialog').dataset.id);
  $('#file-dialog').close();
  if (!existing) return;
  actions.go?.('diary');
  const can = samePerson(existing.author, store.me) || samePerson(existing.filed_by, store.me);
  if (can) actions.editDiary?.(existing.id);
});

$('#file-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const m = (store.messages || []).find((x) => String(x.id) === $('#file-dialog').dataset.id);
  const body = $('#file-body').value.trim();
  if (!m || !body) {
    toast('De tekst is leeg.');
    return;
  }
  if (filedFor(m.id)) {
    toast('Dit staat al in het dagboek.');
    $('#file-dialog').close();
    return;
  }
  const row = {
    author: personName(m.author) || m.author || 'Onbekend',
    body,
    category: $('#file-cats .chip.active')?.dataset.cat || 'algemeen',
    important: $('#file-important').checked,
    created_at: m.created_at,
    source_message_id: Number(m.id),
    filed_by: store.me,
  };
  if (!db) {
    store.diary = store.diary || [];
    store.diary.unshift({ id: Date.now(), ...row });
    $('#file-dialog').close();
    toast('In het dagboek gezet.');
    actions.renderDiary?.();
    renderHome();
    renderChat({ followMine: false });
    return;
  }
  const { error } = await db.from('triageve_diary').insert(row);
  if (error?.code === '23505') {
    toast('Dit staat al in het dagboek.');
    $('#file-dialog').close();
    loadDiary();
    return;
  }
  if (check(error, 'Dagboek')) return;
  if (row.important) pingNotify('diary');
  $('#file-dialog').close();
  toast('In het dagboek gezet.');
  loadDiary();
});

onLoad(loadMessages);
onRealtime('triageve_messages', (p) => {
  if (p.eventType === 'INSERT') addMessage(p.new);
  else loadMessages();
});

actions.updateBadge = updateBadge;
actions.scrollChatToBottom = scrollChatToBottom;
actions.renderChat = renderChat;
