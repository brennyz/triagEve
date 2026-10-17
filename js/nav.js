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
  print: 'Overzicht voor arts',
  timeline: 'Tijdlijn',
  wishes: 'Wensen van Eef',
  measure: 'Metingen',
  push: 'Meldingen',
  trash: 'Prullenbak',
  history: 'Geschiedenis',
  support: 'Hulp & steun',
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
  if (tab === 'eef') actions.renderEef?.();
  if (tab === 'contacts') actions.renderContacts?.();
  if (tab === 'nood') actions.renderNood?.();
  if (tab === 'meds') actions.renderMeds?.();
  if (tab === 'tasks') actions.renderTasks?.();
  if (tab === 'print') actions.renderPrint?.();
  if (tab === 'timeline') actions.renderTimeline?.();
  if (tab === 'wishes') actions.renderEef?.();
  if (tab === 'measure') actions.renderMeasures?.();
  if (tab === 'trash') actions.loadTrash?.();
  if (tab === 'history') actions.renderHistory?.();
  if (tab === 'support') actions.renderSupport?.();
}

$$('.nav-btn').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) {
    e.preventDefault();
    if (go.dataset.history) actions.loadHistory?.(go.dataset.history);
    switchTab(go.dataset.go);
  }
});

actions.go = switchTab;
