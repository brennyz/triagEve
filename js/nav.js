import { $, $$, store, actions } from './core.js';
import { renderHome } from './home.js';

const TITLES = {
  home: 'Home',
  chat: 'Chat',
  diary: 'Dagboek',
  meet: 'Agenda',
  more: 'Meer',
  eef: 'Over Eef',
  meds: 'Medicatie',
  tasks: 'Taken',
  contacts: 'Contacten',
  nood: 'Noodkaart',
};

const BOTTOM = ['home', 'chat', 'diary', 'meet', 'more'];

export function switchTab(tab) {
  store.activeTab = tab;
  const bottom = BOTTOM.includes(tab) ? tab : (tab === 'nood' ? 'home' : 'more');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === bottom));
  $$('.tab-panel').forEach((p) => { p.hidden = p.id !== `tab-${tab}`; });
  $('#page-title').textContent = TITLES[tab] || 'triagEve';
  if (tab === 'chat') {
    store.unread = 0;
    actions.updateBadge?.();
    actions.scrollChatToBottom?.();
  }
  if (tab === 'home') renderHome();
  if (tab === 'diary') actions.renderDiary?.();
  if (tab === 'meet') actions.renderMeetings?.();
}

$$('.nav-btn').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) {
    e.preventDefault();
    switchTab(go.dataset.go);
  }
});

actions.go = switchTab;
