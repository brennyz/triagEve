import { $, store, esc, localDate, actions, onAfterLoad } from './core.js';

function clip(text, n = 140) {
  const t = String(text || '').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

export function renderHome() {
  const el = $('#home-scroll');
  if (!el) return;
  const today = localDate();

  const upcoming = [...store.meetings]
    .filter((m) => m.date >= today)
    .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`))
    .slice(0, 3);

  const openTasks = (store.tasks || []).filter((t) => !t.done).slice(0, 5);
  const importantDiary = store.diary.filter((d) => d.important);
  const otherDiary = store.diary.filter((d) => !d.important);
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
    <button type="button" class="emergency-btn" data-go="nood" aria-label="Noodkaart">Noodkaart</button>
    <article class="card home-card">
      <h2>Komende afspraken</h2>
      ${meetHtml}
    </article>
    <article class="card home-card">
      <h2>Open taken</h2>
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

onAfterLoad(renderHome);
