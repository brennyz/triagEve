import {
  $, $$, store, db, esc, check, onLoad, onRealtime, fmtStamp, actions, alive,
} from './core.js';
import { renderHome } from './home.js';
import { renderNood } from './eef.js';

export async function loadContacts() {
  if (!db) {
    store.contacts = store.contacts || [];
    renderContacts();
    renderNood();
    return;
  }
  const { data, error } = await db.from('triageve_contacts').select('*').order('name');
  if (check(error, 'Contacten laden')) return;
  store.contacts = alive(data).sort((a, b) => Number(b.is_emergency) - Number(a.is_emergency) || a.name.localeCompare(b.name, 'nl'));
  renderContacts();
  renderNood();
  renderHome();
}

export function renderContacts() {
  const list = $('#contact-list');
  if (!list) return;
  const items = [...(store.contacts || [])].sort((a, b) => Number(b.is_emergency) - Number(a.is_emergency) || a.name.localeCompare(b.name, 'nl'));
  if (!items.length) {
    list.innerHTML = '<p class="empty">Nog geen contacten. Tik op + om er een toe te voegen.</p>';
    return;
  }
  list.innerHTML = items.map((c) => `
    <article class="card item contact-card" data-id="${c.id}">
      <div class="item-head">
        <h3 class="item-title">${esc(c.name)}${c.is_emergency ? '<span class="badge danger-badge">nood</span>' : ''}</h3>
        <span class="item-date">${esc(c.role || '')}</span>
      </div>
      ${c.phone ? `<p><a href="tel:${esc(c.phone.replace(/\s+/g, ''))}">${esc(c.phone)}</a></p>` : ''}
      ${c.email ? `<p class="item-who">${esc(c.email)}</p>` : ''}
      ${c.notes ? `<p class="entry-body">${esc(c.notes)}</p>` : ''}
      <div class="item-meta">Bewerkt door ${esc(c.updated_by || '?')} · ${esc(fmtStamp(c.updated_at))}</div>
    </article>
  `).join('');
  $$('#contact-list .item').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    openContact(Number(el.dataset.id));
  }));
}

function openContact(id = null) {
  store.editingContactId = id;
  const c = id ? store.contacts.find((x) => x.id === id) : null;
  $('#contact-title').textContent = c ? 'Contact bewerken' : 'Nieuw contact';
  $('#c-name').value = c?.name || '';
  $('#c-role').value = c?.role || '';
  $('#c-phone').value = c?.phone || '';
  $('#c-email').value = c?.email || '';
  $('#c-notes').value = c?.notes || '';
  $('#c-emergency').checked = Boolean(c?.is_emergency);
  $('#contact-delete').hidden = !c;
  $('#contact-editor').showModal();
}

$('#add-contact')?.addEventListener('click', () => openContact());
$('#contact-cancel')?.addEventListener('click', () => $('#contact-editor').close());

$('#contact-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!db) return;
  const data = {
    name: $('#c-name').value.trim(),
    role: $('#c-role').value.trim(),
    phone: $('#c-phone').value.trim(),
    email: $('#c-email').value.trim(),
    notes: $('#c-notes').value.trim(),
    is_emergency: $('#c-emergency').checked,
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  };
  if (!data.name) return;
  const { error } = store.editingContactId
    ? await db.from('triageve_contacts').update(data).eq('id', store.editingContactId)
    : await db.from('triageve_contacts').insert(data);
  if (check(error, 'Opslaan')) return;
  $('#contact-editor').close();
  loadContacts();
});

$('#contact-delete')?.addEventListener('click', async () => {
  if (!store.editingContactId || !confirm('Dit contact verwijderen?')) return;
  if (!db) return;
  const { error } = await db.from('triageve_contacts').delete().eq('id', store.editingContactId);
  if (check(error, 'Verwijderen')) return;
  $('#contact-editor').close();
  loadContacts();
});

onLoad(loadContacts);
onRealtime('triageve_contacts', () => loadContacts());
actions.renderContacts = renderContacts;
actions.openContact = openContact;
