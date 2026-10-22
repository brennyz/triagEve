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
  if (editingId && $('#bubble-editor')) {
    editDraft = $('#bubble-editor-body')?.value ?? editDraft;
    editCat = $('#bubble-editor-cats .chip.active')?.dataset.cat || 'algemeen';
    editImportant = Boolean($('#bubble-editor-important')?.checked);
  }
  const top = el.scrollTop;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  if (!store.messages.length) {
    el.innerHTML = '<p class="empty">Nog geen berichten. Zeg hallo!</p>';
    closeEditor();
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
  if (editingId) {
    const draft = editDraft;
    const cat = editCat;
    const important = editImportant;
    openEditor(editingId);
    const body = $('#bubble-editor-body');
    if (draft != null && body && !body.hidden) {
      body.value = draft;
      $$('#bubble-editor-cats .chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === cat));
      const box = $('#bubble-editor-important');
      if (box) box.checked = important;
    }
  }
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

function detachHold() {
  if (!hold) return;
  clearTimeout(hold.timer);
  clearTimeout(hold.hint);
  hold.bubble?.classList.remove('is-holding');
  try {
    if (hold.bubble?.hasPointerCapture?.(hold.pointerId)) hold.bubble.releasePointerCapture(hold.pointerId);
  } catch { /* al los */ }
  window.removeEventListener('pointerup', endHold);
  window.removeEventListener('pointercancel', endHold);
  window.removeEventListener('pointermove', moveHold);
  hold = null;
}

function endHold(e) {
  if (!hold || e.pointerId !== hold.pointerId) return;
  const openId = hold.ready ? hold.id : null;
  const tell = hold.armed && !hold.ready && hold.pointerType === 'mouse';
  try {
    if (hold.bubble?.hasPointerCapture?.(hold.pointerId)) hold.bubble.releasePointerCapture(hold.pointerId);
  } catch { /* al los */ }
  detachHold();
  if (openId) setTimeout(() => openEditor(openId), 0);
  else if (tell) toast('Houd nog iets langer vast.');
}

function moveHold(e) {
  if (!hold || e.pointerId !== hold.pointerId) return;
  const slop = hold.pointerType === 'mouse' ? 48 : 14;
  if (Math.hypot(e.clientX - hold.startX, e.clientY - hold.startY) > slop) detachHold();
}

let editingId = null;
let editDraft = null;
let editCat = 'algemeen';
let editImportant = false;
let hoverTimer = null;
let hoverId = null;

function closeEditor() {
  editingId = null;
  editDraft = null;
  editCat = 'algemeen';
  editImportant = false;
  $('#bubble-editor')?.remove();
}

function ensureEditor() {
  let form = $('#bubble-editor');
  if (form) return form;
  form = document.createElement('form');
  form.id = 'bubble-editor';
  form.className = 'bubble-editor';
  form.innerHTML = `
    <p class="bubble-editor-when"></p>
    <label for="bubble-editor-body">Pas aan voor het dagboek</label>
    <textarea id="bubble-editor-body" rows="3" maxlength="20000"></textarea>
    <div class="chips chip-row" id="bubble-editor-cats">
      <button type="button" class="chip active" data-cat="algemeen">Algemeen</button>
      <button type="button" class="chip" data-cat="gezondheid">Gezondheid</button>
      <button type="button" class="chip" data-cat="stemming">Stemming</button>
      <button type="button" class="chip" data-cat="eten">Eten</button>
      <button type="button" class="chip" data-cat="slaap">Slaap</button>
      <button type="button" class="chip" data-cat="medicatie">Medicatie</button>
      <button type="button" class="chip" data-cat="incident">Incident</button>
    </div>
    <label class="check-line"><input id="bubble-editor-important" type="checkbox"> Belangrijk</label>
    <p class="bubble-editor-pdf">Belangrijk komt in de pdf. De chat zelf niet.</p>
    <p class="bubble-editor-already" hidden></p>
    <div class="bubble-editor-actions">
      <button type="button" data-edit-cancel>Annuleren</button>
      <button type="button" data-edit-open hidden>Naar dagboek</button>
      <button type="submit" class="primary">Zet in dagboek</button>
    </div>
  `;
  form.addEventListener('pointerdown', (e) => e.stopPropagation());
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    closeEditor();
  });
  form.addEventListener('click', (e) => {
    const chip = e.target.closest('#bubble-editor-cats .chip');
    if (chip) {
      e.preventDefault();
      $$('#bubble-editor-cats .chip').forEach((c) => c.classList.toggle('active', c === chip));
      return;
    }
    if (e.target.closest('[data-edit-cancel]')) {
      e.preventDefault();
      closeEditor();
      return;
    }
    if (e.target.closest('[data-edit-open]')) {
      e.preventDefault();
      const existing = filedFor(form.dataset.id);
      closeEditor();
      if (!existing) return;
      actions.go?.('diary');
      const can = samePerson(existing.author, store.me) || samePerson(existing.filed_by, store.me);
      if (can) actions.editDiary?.(existing.id);
    }
  });
  form.addEventListener('submit', saveFromEditor);
  return form;
}

function openEditor(id) {
  const m = (store.messages || []).find((x) => String(x.id) === String(id));
  if (!m) {
    closeEditor();
    return;
  }
  if (m.pending) {
    toast('Dit bericht is nog niet verstuurd.');
    return;
  }
  const bubble = document.querySelector(`.bubble[data-id="${CSS.escape(String(m.id))}"]`);
  if (!bubble) return;
  clearTimeout(hoverTimer);
  hoverId = null;
  const form = ensureEditor();
  const same = editingId === String(m.id) && form.isConnected;
  editingId = String(m.id);
  form.dataset.id = editingId;
  bubble.appendChild(form);
  const existing = filedFor(m.id);
  const already = Boolean(existing);
  form.querySelector('.bubble-editor-when').textContent = `Tijd van het bericht: ${fmtStamp(m.created_at)}. Die tijd blijft.`;
  form.querySelector('label[for="bubble-editor-body"]').hidden = already;
  $('#bubble-editor-body').hidden = already;
  $('#bubble-editor-cats').hidden = already;
  $('#bubble-editor-important').closest('label').hidden = already;
  form.querySelector('[type="submit"]').hidden = already;
  form.querySelector('[data-edit-open]').hidden = !already;
  form.querySelector('.bubble-editor-pdf').hidden = already;
  const note = form.querySelector('.bubble-editor-already');
  note.hidden = !already;
  if (already) {
    note.textContent = `Staat al in het dagboek, gezet door ${personName(existing.filed_by) || 'iemand'}.`;
  } else if (!same) {
    $('#bubble-editor-body').value = m.body || '';
    $('#bubble-editor-important').checked = false;
    $$('#bubble-editor-cats .chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === 'algemeen'));
  }
  if (!already) $('#bubble-editor-body').focus();
}

const messages = $('#messages');
messages?.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.bubble-file, .bubble-editor')) return;
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
    if (!hold) return;
    hold.ready = true;
    try {
      if (hold.bubble.hasPointerCapture?.(hold.pointerId)) hold.bubble.releasePointerCapture(hold.pointerId);
    } catch { /* al los */ }
    if (navigator.vibrate) navigator.vibrate(12);
  }, 500);
  window.addEventListener('pointerup', endHold);
  window.addEventListener('pointercancel', endHold);
  window.addEventListener('pointermove', moveHold);
});
messages?.addEventListener('pointerover', (e) => {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  if (e.buttons || document.activeElement === chatInput || $('#bubble-editor')) return;
  const bubble = e.target.closest('.bubble[data-id]');
  if (!bubble || bubble.dataset.pending) return;
  if (hoverId === bubble.dataset.id) return;
  clearTimeout(hoverTimer);
  hoverId = bubble.dataset.id;
  hoverTimer = setTimeout(() => {
    if ($('#bubble-editor') || document.activeElement === chatInput) return;
    if (!bubble.isConnected || !bubble.matches(':hover')) return;
    openEditor(bubble.dataset.id);
  }, 450);
});
messages?.addEventListener('pointerout', (e) => {
  const bubble = e.target.closest('.bubble[data-id]');
  if (!bubble || bubble.contains(e.relatedTarget)) return;
  if (hoverId !== bubble.dataset.id) return;
  clearTimeout(hoverTimer);
  hoverId = null;
});
messages?.addEventListener('click', (e) => {
  const btn = e.target.closest('.bubble-file');
  if (!btn) return;
  e.preventDefault();
  openEditor(btn.dataset.file);
});
messages?.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.bubble-editor')) return;
  const bubble = e.target.closest('.bubble[data-id]');
  if (!bubble) return;
  e.preventDefault();
  detachHold();
  if (bubble.dataset.pending) {
    toast('Dit bericht is nog niet verstuurd.');
    return;
  }
  openEditor(bubble.dataset.id);
});

async function saveFromEditor(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const submit = form.querySelector('[type="submit"]');
  if (submit?.disabled) return;
  const m = (store.messages || []).find((x) => String(x.id) === form.dataset.id);
  const body = $('#bubble-editor-body').value.trim();
  if (!m || !body) {
    toast('De tekst is leeg.');
    return;
  }
  if (submit) submit.disabled = true;
  try {
    if (filedFor(m.id)) {
      toast('Dit staat al in het dagboek.');
      closeEditor();
      return;
    }
    const row = {
      author: personName(m.author) || m.author || 'Onbekend',
      body,
      category: $('#bubble-editor-cats .chip.active')?.dataset.cat || 'algemeen',
      important: $('#bubble-editor-important').checked,
      created_at: m.created_at,
      source_message_id: Number(m.id),
      filed_by: store.me,
    };
    if (!db) {
      store.diary = store.diary || [];
      store.diary.unshift({ id: Date.now(), ...row });
      closeEditor();
      toast('In het dagboek gezet.');
      actions.renderDiary?.();
      renderHome();
      renderChat({ followMine: false });
      return;
    }
    const { error } = await db.from('triageve_diary').insert(row);
    if (error?.code === '23505') {
      toast('Dit staat al in het dagboek.');
      closeEditor();
      loadDiary();
      return;
    }
    if (check(error, 'Dagboek')) return;
    if (row.important) pingNotify('diary');
    closeEditor();
    toast('In het dagboek gezet.');
    loadDiary();
  } finally {
    if (submit?.isConnected) submit.disabled = false;
  }
}

onLoad(loadMessages);
onRealtime('triageve_messages', (p) => {
  if (p.eventType === 'INSERT') addMessage(p.new);
  else loadMessages();
});

actions.updateBadge = updateBadge;
actions.scrollChatToBottom = scrollChatToBottom;
actions.renderChat = renderChat;
