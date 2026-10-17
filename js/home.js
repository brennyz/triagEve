import { $, store, esc, localDate, actions, onAfterLoad, alive } from './core.js';

function statusCard() {
  const c = (store.checkins || [])[0];
  const meta = actions.STATUS?.[c?.status] || { label: 'Nog geen status', cls: 'status-none' };
  const meet = c?.meeting_id
    ? alive(store.meetings).find((m) => Number(m.id) === Number(c.meeting_id))
    : null;
  const when = c
    ? `${c.author}${meet ? ` · ${meet.title}` : ''} · ${new Date(c.created_at).toLocaleString('nl-NL')}`
    : 'Nog niet doorgegeven';
  const traits = actions.traitPhrase?.(c) || '';
  return `
    <article class="card status-card ${meta.cls}">
      <p class="status-kicker">Hoe gaat het met Eef?</p>
      <p class="status-big">${esc(meta.label)}</p>
      ${traits ? `<p class="status-traits">${esc(traits)}</p>` : ''}
      <p class="item-who">${esc(when)}</p>
      <button type="button" class="primary" id="status-open">Status doorgeven</button>
    </article>`;
}

function weekBounds() {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: localDate(start), end: localDate(end) };
}

function visitCard() {
  const { start, end } = weekBounds();
  const visits = alive(store.meetings).filter((m) => m.kind === 'bezoek' && m.date >= start && m.date <= end);
  const names = [...new Set(visits.flatMap((m) => m.who || []))];
  const text = names.length
    ? `Deze week bij Eef: ${names.join(', ')}`
    : 'Deze week bij Eef: nog niemand ingepland.';
  return `<article class="card home-card"><h2>Bezoek</h2><p class="empty-inline">${esc(text)}</p></article>`;
}

function clip(text, n = 140) {
  const t = String(text || '').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

export function renderHome() {
  const el = $('#home-scroll');
  if (!el) return;
  const today = localDate();

  const upcoming = alive(store.meetings)
    .filter((m) => m.date >= today)
    .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`))
    .slice(0, 3);

  const openTasks = alive(store.tasks).filter((t) => !t.done).slice(0, 5);
  const importantDiary = alive(store.diary).filter((d) => d.important);
  const otherDiary = alive(store.diary).filter((d) => !d.important);
  const diaryBits = [...importantDiary, ...otherDiary].slice(0, 3);
  const unread = store.unread || 0;

  const meetHtml = upcoming.length
    ? upcoming.map((m) => {
      const when = actions.formatMeetingDate
        ? actions.formatMeetingDate(m.date, m.time)
        : `${m.date}${m.time ? ` · ${m.time}` : ''}`;
      const who = (m.who || []).length ? ` · ${m.who.join(', ')}` : '';
      return `<button type="button" class="home-row" data-go="meet">
        <strong>${esc(m.title)}</strong>
        <span>${esc((actions.KINDS?.[m.kind] || {}).label || 'Overleg')} · ${esc(when)}${esc(who)}</span>
      </button>`;
    }).join('')
    : '<p class="empty-inline">Geen komende afspraken.</p>';

  const taskHtml = openTasks.length
    ? openTasks.map((t) => `<button type="button" class="home-row" data-go="tasks">
        <strong>${esc(t.title)}</strong>
        <span>${esc(t.assignee || 'niemand')} ${t.due_date ? `· ${esc(t.due_date)}` : ''}</span>
      </button>`).join('')
    : '<p class="empty-inline">Geen open taken.</p>';

  const diaryHtml = diaryBits.length
    ? diaryBits.map((d) => `<button type="button" class="home-row" data-go="diary">
        <strong>${esc(d.author)}${d.important ? ' · belangrijk' : ''}</strong>
        <span>${esc(clip(d.body))}</span>
      </button>`).join('')
    : '<p class="empty-inline">Nog geen dagboekstukjes.</p>';

  const msgLabel = unread
    ? `${unread} nieuw${unread === 1 ? ' bericht' : 'e berichten'}`
    : 'Geen nieuwe berichten';

  el.innerHTML = `
    ${actions.stayHtml ? actions.stayHtml() : ''}
    ${statusCard()}
    ${actions.shiftHtml ? actions.shiftHtml() : ''}
    ${visitCard()}
    <button type="button" class="emergency-btn" data-go="nood" aria-label="Noodkaart">Noodkaart</button>
    <article class="card home-card">
      <h2>Komende afspraken</h2>
      ${meetHtml}
    </article>
    <article class="card home-card">
      <div class="card-head">
        <h2>Open taken</h2>
        <button type="button" class="plus-btn" id="home-add-task" aria-label="Nieuwe taak">+</button>
      </div>
      ${taskHtml}
    </article>
    <article class="card home-card">
      <h2>Laatste dagboek</h2>
      ${diaryHtml}
    </article>
    <article class="card home-card">
      <h2>Chat</h2>
      <p class="empty-inline">${esc(msgLabel)}</p>
      <button type="button" class="primary" data-go="chat">Naar chat</button>
    </article>
  `;
}

document.addEventListener('click', (e) => {
  if (e.target.id === 'status-open') actions.openStatus?.();
  if (e.target.closest('#home-add-task')) actions.openTask?.();
});

onAfterLoad(renderHome);
