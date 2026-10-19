import {
  $, $$, store, db, esc, check, onLoad, onRealtime, fmtStamp, actions, alive, softDelete, personName,
} from './core.js';
import { renderHome } from './home.js';
import { renderNood } from './eef.js';

export const ROLES = [
  'Huisarts', 'Psychiater', 'Psycholoog', 'Apotheek', 'Thuiszorg',
  'Fysiotherapeut', 'Specialist', 'Familie', 'Overig',
];
const QUICK_ROLES = ['Huisarts', 'Psychiater', 'Psycholoog', 'Apotheek', 'Thuiszorg'];
const FAMILY = [
  ['Ronald', 'hoofd', 'Hoofdcontact'],
  ['Jacky', 'secundair', 'Secundair'],
  ['Bren', 'secundair', 'Secundair'],
];

function familyOf(name) {
  const want = personName(name);
  return alive(store.contacts).find((c) => c.circle === 'familie' && personName(c.name) === want) || null;
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

function phoneLink(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  return `<a class="contact-call" href="tel:${esc(raw.replace(/\s+/g, ''))}">Bellen</a>`;
}

function mailLink(email) {
  const raw = String(email || '').trim();
  if (!raw) return '';
  return `<a class="contact-call" href="mailto:${esc(raw)}">Mailen</a>`;
}

function familyCard(name, rank, label) {
  const c = familyOf(name);
  const phone = c?.phone ? String(c.phone) : '';
  const email = c?.email ? String(c.email) : '';
  return `
    <article class="card contact-row" data-family="${esc(name)}" data-rank="${rank}">
      <div class="contact-copy">
        <strong>${esc(name)} · ${esc(label)}</strong>
        <span class="${phone ? 'contact-phone' : ''}">${phone ? esc(phone) : 'Nog geen nummer'}</span>
        ${email ? `<span class="contact-phone">${esc(email)}</span>` : ''}
      </div>
      <div class="contact-actions">
        ${phoneLink(phone)}
        ${mailLink(email)}
        <button type="button" class="${phone || email ? 'ghost' : 'primary'}">${phone || email ? 'Wijzigen' : 'Nummer invullen'}</button>
      </div>
    </article>`;
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
      <article class="card item contact-row" data-id="${c.id}">
        <div class="contact-copy">
          <strong>${esc(c.name)}${c.is_emergency ? '<span class="badge danger-badge">nood</span>' : ''}</strong>
          <span>${esc([c.role, c.organisation].filter(Boolean).join(' · '))}</span>
          <span class="${c.phone ? 'contact-phone' : ''}">${c.phone ? esc(c.phone) : 'Nog geen nummer'}</span>
          ${c.email ? `<span class="contact-phone">${esc(c.email)}</span>` : ''}
        </div>
        <div class="contact-actions">
          ${phoneLink(c.phone)}
          ${mailLink(c.email)}
          <button type="button" class="${c.phone ? 'ghost' : 'primary'}">${c.phone ? 'Wijzigen' : 'Nummer invullen'}</button>
        </div>
      </article>`).join('')
    : '<p class="empty">Nog geen zorgverlener. Tik op een rol hierboven.</p>';
  $$('#contact-list .item').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    openContact(Number(el.dataset.id));
  }));
}

function syncPhoneNote() {
  const note = $('#c-phone-note');
  if (!note) return;
  const role = $('#c-role')?.value || '';
  const emergency = $('#c-emergency')?.checked;
  const family = store.draftCircle === 'familie';
  if (family) note.textContent = 'Dit nummer staat bij Eerst bellen op de noodkaart.';
  else if (/huisarts|psychiater/i.test(role) || emergency) note.textContent = 'Dit nummer komt op de noodkaart.';
  else note.textContent = 'Vink onderaan aan als dit nummer ook op de noodkaart moet.';
}

function openContact(id = null, preset = {}) {
  const c = id ? (store.contacts || []).find((x) => x.id === id) : null;
  store.editingContactId = c?.id || null;
  store.draftCircle = c?.circle || preset.circle || 'zorg';
  store.draftRank = c?.rank || preset.rank || null;
  const raw = c?.name || preset.name || '';
  const familyName = c?.circle === 'familie' || preset.circle === 'familie';
  const who = familyName ? (personName(raw) || raw) : raw;
  $('#contact-title').textContent = familyName
    ? `Nummer van ${who || 'ons'}`
    : (c ? 'Contact wijzigen' : (who || 'Nieuw contact'));
  $('#c-name').value = who;
  $('#c-name').readOnly = familyName && FAMILY.some(([name]) => name === personName(who));
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
  const emergencyLabel = document.querySelector('#contact-form .check-line');
  if (emergencyLabel) emergencyLabel.hidden = family;
  syncPhoneNote();
  $('#contact-editor').showModal();
  setTimeout(() => $('#c-phone')?.focus(), 40);
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
  if (e.target.closest('a')) return;
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

$('#add-contact-inline')?.addEventListener('click', () => openContact(null, { circle: 'zorg', role: 'Overig' }));
$('#c-role')?.addEventListener('change', syncPhoneNote);
$('#c-emergency')?.addEventListener('change', syncPhoneNote);
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
  const familyRanks = { Ronald: 'hoofd', Jacky: 'secundair', Bren: 'secundair' };
  const named = personName(data.name);
  const canonical = familyRanks[named] ? named : '';
  if (canonical && (store.draftCircle === 'familie' || !store.editingContactId)) {
    data.name = canonical;
    const existing = familyOf(canonical);
    if (existing) {
      store.editingContactId = existing.id;
      for (const key of ['phone', 'email', 'address', 'notes', 'organisation', 'hours']) {
        if (!data[key]) data[key] = existing[key] || '';
      }
      data.is_emergency = data.is_emergency || Boolean(existing.is_emergency);
    }
    data.circle = 'familie';
    data.rank = familyRanks[canonical];
    data.role = 'Familie';
  }
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
