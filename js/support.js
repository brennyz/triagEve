import { $, store, esc, actions, alive } from './core.js';

export function renderSupport() {
  const el = $('#support-extra');
  if (!el) return;
  const post = alive(store.contacts).filter((c) => /huisartsenpost|hap/i.test(c.role || '') || /huisartsenpost/i.test(c.name || ''));
  const own = alive(store.contacts).filter((c) => !post.includes(c));
  el.innerHTML = `
    <h3>Huisartsenpost</h3>
    ${post.length
      ? post.map((c) => c.phone
        ? `<a class="menu-item" href="tel:${esc(c.phone.replace(/\s+/g, ''))}">${esc(c.name)} · ${esc(c.phone)}</a>`
        : `<p>${esc(c.name)} (nog geen nummer)</p>`).join('')
      : '<p class="empty-inline">Nog niet ingevuld. Zet de huisartsenpost bij Contacten (rol: huisartsenpost).</p>'}
    <h3>Jullie eigen nummers</h3>
    ${own.length
      ? own.map((c) => c.phone
        ? `<a class="menu-item" href="tel:${esc(c.phone.replace(/\s+/g, ''))}">${esc(c.name)}${c.role ? ` (${esc(c.role)})` : ''} · ${esc(c.phone)}</a>`
        : `<p>${esc(c.name)}</p>`).join('')
      : '<p class="empty-inline">Voeg nummers toe via Contacten.</p>'}
  `;
}

actions.renderSupport = renderSupport;
