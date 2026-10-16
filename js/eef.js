import {
  $, store, db, esc, check, onLoad, onRealtime, fmtStamp, actions,
} from './core.js';
import { renderHome } from './home.js';

export async function loadProfile() {
  if (!db) {
    store.profile = store.profile || null;
    renderEef();
    renderNood();
    return;
  }
  const { data, error } = await db.from('triageve_profile').select('*').eq('id', 1).maybeSingle();
  if (check(error, 'Over Eef laden')) return;
  store.profile = data;
  renderEef();
  renderNood();
  renderHome();
}

export function renderEef() {
  const p = store.profile || {};
  if ($('#eef-summary')) {
    $('#eef-summary').value = p.summary || '';
    $('#eef-important').value = p.important || '';
    $('#eef-emergency').value = p.emergency || '';
  }
  const meta = $('#eef-meta');
  if (meta) {
    meta.textContent = p.updated_at
      ? `Laatst bijgewerkt door ${p.updated_by || '?'} op ${fmtStamp(p.updated_at)}`
      : 'Nog niet bijgewerkt.';
  }
}

export function renderNood() {
  const el = $('#nood-body');
  if (!el) return;
  const p = store.profile || {};
  const contacts = [...(store.contacts || [])].sort((a, b) => Number(b.is_emergency) - Number(a.is_emergency));
  const huisarts = contacts.filter((c) => /huisarts/i.test(c.role || ''));
  const nood = contacts.filter((c) => c.is_emergency);

  const telBtn = (c) => c.phone
    ? `<a class="emergency-call small" href="tel:${esc(c.phone.replace(/\s+/g, ''))}">${esc(c.name)} · ${esc(c.phone)}</a>`
    : `<p class="empty-inline">${esc(c.name)} (geen nummer)</p>`;

  el.innerHTML = `
    <a class="emergency-call" href="tel:112">112 bellen</a>
    ${huisarts.length ? `<h3>Huisarts</h3>${huisarts.map(telBtn).join('')}` : '<p class="empty-inline">Nog geen huisarts-nummer.</p>'}
    ${nood.length ? `<h3>Noodcontacten</h3>${nood.map(telBtn).join('')}` : ''}
    ${p.emergency ? `<div class="nood-block"><h3>In geval van nood</h3><p>${esc(p.emergency)}</p></div>` : ''}
    ${p.important ? `<div class="nood-block"><h3>Belangrijk om te weten</h3><p>${esc(p.important)}</p></div>` : ''}
  `;
}

$('#eef-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!db) return;
  const row = {
    id: 1,
    summary: $('#eef-summary').value.trim(),
    important: $('#eef-important').value.trim(),
    emergency: $('#eef-emergency').value.trim(),
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from('triageve_profile').upsert(row);
  if (check(error, 'Opslaan')) return;
  loadProfile();
});

onLoad(loadProfile);
onRealtime('triageve_profile', () => loadProfile());
actions.renderNood = renderNood;
actions.renderEef = renderEef;
