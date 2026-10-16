import { $, store, esc, alive, onAfterLoad, actions } from './core.js';

export function renderHelp() {
  const el = $('#help-extra');
  if (!el) return;
  const people = alive(store.contacts).filter((c) => c.phone && /huisarts|post/i.test(`${c.role || ''} ${c.name || ''}`));
  el.innerHTML = people.length
    ? people.map((c) => `<a class="menu-item" href="tel:${esc(String(c.phone).replace(/[^\d+]/g, ''))}">${esc(c.name)}<span class="item-who">${esc(c.phone)}</span></a>`).join('')
    : '<p class="empty-inline">Zet het nummer van de huisarts of huisartsenpost bij Contacten. Gebruik in de rol het woord huisarts of post.</p>';
}

onAfterLoad(renderHelp);
actions.renderHelp = renderHelp;
