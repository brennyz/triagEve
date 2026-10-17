import {
  $, $$, store, db, esc, check, onLoad, onRealtime, fmtStamp, actions, alive, softDelete,
} from './core.js';
import { renderHome } from './home.js';
import { renderNood } from './eef.js';

export const ROLES = [
  'Huisarts', 'Psychiater', 'Psycholoog', 'Apotheek', 'Thuiszorg',
  'Fysiotherapeut', 'Specialist', 'Familie', 'Overig',
];
const QUICK_ROLES = ['Huisarts', 'Psychiater', 'Psycholoog', 'Apotheek', 'Thuiszorg'];
const FAMILY = [
  ['Paps', 'hoofd', 'Hoofdcontact'],
  ['Jacky', 'secundair', 'Secundair'],
  ['Bren', 'secundair', 'Secundair'],
];

function familyOf(name) {
  return alive(store.contacts).find((c) => c.circle === 'familie' && c.name === name) || null;
}

export function isZorg(c) {
  if (!c || c.circle === 'familie' || c.rank) return false;
  return true;
}

function fillRoles(current) {
  const sel = $('#c-role');
  if (!sel) return;
  const values = ROLES.includes(current) || !current ? ROLES : [current, ...ROLES];
  sel.innerHTML = values.map((role) => `<option value="${esc(role)}">${esc(role)}</option>`).join('');
  sel.value = current && values.includes(current) ? current : 'Huisarts';
}

export async function loadContacts() {
  if (!db) {
    store.contacts = store.contacts || [];
    renderContacts();
    renderNood();
    return;
  }
  const { data, error } = await db.from('triageve_contacts').select('*').order('name');
  if (check(error, 'Contacten laden')) return;
  store.contacts = alive(data);
  renderContacts();
  renderNood();
  renderHome();
}

function familyCard(name, rank, label) {
  const c = familyOf(name);
  const bits = [c?.phone, c?.email].filter(Boolean).join(' · ');
  return `
    <button type="button" class="home-row family-card" data-family="${esc(name)}" data-rank="${rank}">
      <strong>${esc(name)} · ${esc(label)}</strong>
      <span>${esc(bits || 'Telefoon en e-mail nog invullen')}</span>
    </button>`;
}

export function renderContacts() {
  const family = $('#family-cards');
  const chips = $('#role-chips');
  const list = $('#contact-list');
  if (family) family.innerHTML = FAMILY.map(([name, rank, label]) => familyCard(name, rank, label)).join('');
  if (chips && !chips.dataset.ready) {
    chips.innerHTML = QUICK_ROLES.map((role) => `<button type="button" class="chip" data-role="${esc(role)}">${esc(role)}</button>`).join('');
    chips.dataset.ready = '1';
  }
  if (!list) return;
  const items = alive(store.contacts).filter(isZorg)
    .sort((a, b) => `${a.role || ''} ${a.name}`.localeCompare(`${b.role || ''} ${b.name}`, 'nl'));
  list.innerHTML = items.length
    ? items.map((c) => `
      <article class="card item contact-card" data-id="${c.id}">
        <div class="item-head">
          <h3 class="item-title">${esc(c.name)}${c.is_emergency ? '<span class="badge danger-badge">nood</span>' : ''}</h3>
          <span class="item-date">${esc(c.role || '')}</span>
        </div>
        ${c.organisation ? `<p class="item-who">${esc(c.organisation)}</p>` : ''}
        ${c.phone ? `<p><a href="tel:${esc(String(c.phone).replace(/\s+/g, ''))}">${esc(c.phone)}</a></p>` : ''}
        ${c.email ? `<p class="item-who">${esc(c.email)}</p>` : ''}
        ${c.address ? `<p class="item-who">${esc(c.address)}</p>` : ''}
        ${c.hours ? `<p class="item-who">${esc(c.hours)}</p>` : ''}
        ${c.notes ? `<p class="entry-body">${esc(c.notes)}</p>` : ''}
        <div class="item-meta">Bewerkt door ${esc(c.updated_by || '?')} · ${esc(fmtStamp(c.updated_at))}</div>
      </article>`).join('')
    : '<p class="empty">Nog geen zorgverlener. Tik op een rol hierboven.</p>';
  $$('#contact-list .item').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    openContact(Number(el.dataset.id));
  }));
}

function openContact(id = null, preset = {}) {
  const c = id ? (store.contacts || []).find((x) => x.id === id) : null;
  store.editingContactId = c?.id || null;
  store.draftCircle = c?.circle || preset.circle || 'zorg';
  store.draftRank = c?.rank || preset.rank || null;
  $('#contact-title').textContent = c ? 'Contact bewerken' : (preset.name ? preset.name : 'Nieuw contact');
  $('#c-name').value = c?.name || preset.name || '';
  fillRoles(c?.role || preset.role || (store.draftCircle === 'familie' ? 'Familie' : 'Huisarts'));
  $('#c-org').value = c?.organisation || '';
  $('#c-phone').value = c?.phone || '';
  $('#c-email').value = c?.email || '';
  $('#c-address').value = c?.address || '';
  $('#c-hours').value = c?.hours || '';
  $('#c-notes').value = c?.notes || '';
  $('#c-emergency').checked = Boolean(c?.is_emergency);
  const family = store.draftCircle === 'familie';
  for (const id of ['c-org', 'c-hours']) {
    const input = $(`#${id}`);
    const label = document.querySelector(`label[for="${id}"]`);
    if (input) input.hidden = family;
    if (label) label.hidden = family;
  }
  $('#contact-delete').hidden = !c;
  $('#contact-editor').showModal();
}

function rememberLocal(data) {
  store.contacts = store.contacts || [];
  if (store.editingContactId) {
    const i = store.contacts.findIndex((c) => c.id === store.editingContactId);
    if (i >= 0) store.contacts[i] = { ...store.contacts[i], ...data };
    return store.contacts[i];
  }
  const row = { ...data, id: Date.now(), deleted_at: null };
  store.contacts.push(row);
  return row;
}

$('#family-cards')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-family]');
  if (!btn) return;
  const name = btn.dataset.family;
  const existing = familyOf(name);
  if (existing) openContact(existing.id);
  else openContact(null, { name, role: 'Familie', circle: 'familie', rank: btn.dataset.rank });
});

$('#role-chips')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-role]');
  if (!btn) return;
  openContact(null, { role: btn.dataset.role, circle: 'zorg' });
});

$('#add-contact')?.addEventListener('click', () => openContact(null, { circle: 'zorg', role: 'Overig' }));
$('#contact-cancel')?.addEventListener('click', () => {
  store.attachWho = false;
  $('#contact-editor').close();
});

$('#contact-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    name: $('#c-name').value.trim(),
    role: $('#c-role').value,
    organisation: $('#c-org').value.trim(),
    phone: $('#c-phone').value.trim(),
    email: $('#c-email').value.trim(),
    address: $('#c-address').value.trim(),
    hours: $('#c-hours').value.trim(),
    notes: $('#c-notes').value.trim(),
    is_emergency: $('#c-emergency').checked,
    circle: store.draftCircle || 'zorg',
    rank: store.draftRank || null,
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  };
  if (!data.name) return;
  if (!db) {
    rememberLocal(data);
    $('#contact-editor').close();
    renderContacts();
    renderNood();
    if (store.attachWho) actions.refreshWho?.(data.name);
    store.attachWho = false;
    return;
  }
  const { error } = store.editingContactId
    ? await db.from('triageve_contacts').update(data).eq('id', store.editingContactId)
    : await db.from('triageve_contacts').insert(data);
  if (check(error, 'Opslaan')) return;
  $('#contact-editor').close();
  if (store.attachWho) actions.refreshWho?.(data.name);
  store.attachWho = false;
  loadContacts();
});

$('#contact-delete')?.addEventListener('click', async () => {
  if (!store.editingContactId || !confirm('Dit contact verwijderen?')) return;
  if (!db) {
    store.contacts = (store.contacts || []).filter((c) => c.id !== store.editingContactId);
    $('#contact-editor').close();
    renderContacts();
    renderNood();
    return;
  }
  const { error } = await softDelete('triageve_contacts', store.editingContactId);
  if (check(error, 'Verwijderen')) return;
  $('#contact-editor').close();
  loadContacts();
});

onLoad(loadContacts);
onRealtime('triageve_contacts', () => loadContacts());
actions.renderContacts = renderContacts;
actions.openContact = openContact;
actions.isZorg = isZorg;
