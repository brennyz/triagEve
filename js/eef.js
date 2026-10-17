import {
  $, store, db, esc, check, onLoad, onRealtime, fmtStamp, actions, alive,
} from './core.js';
import { renderHome } from './home.js';
import { stayPhrase } from './zorgdag.js';

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
  if ($('#w-wishes')) {
    $('#w-wishes').value = p.wishes || '';
    $('#w-sharing').value = p.sharing || '';
    $('#w-rep').value = p.representative || '';
    $('#w-docs').value = p.documents || '';
  }
  actions.mountStay?.();
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
  const contacts = alive(store.contacts).sort((a, b) => Number(b.is_emergency) - Number(a.is_emergency));
  const familyOrder = [['Paps', 'hoofd'], ['Jacky', 'secundair'], ['Bren', 'secundair']];
  const family = familyOrder.map(([name, rank]) => {
    const c = contacts.find((x) => x.circle === 'familie' && x.name === name && x.phone);
    return c ? { ...c, rank } : null;
  }).filter(Boolean);
  const familyIds = new Set(family.map((c) => c.id));
  const huisarts = contacts.filter((c) => c.circle !== 'familie' && /huisarts/i.test(c.role || ''));
  const huisIds = new Set(huisarts.map((c) => c.id));
  const nood = contacts.filter((c) => c.is_emergency && !familyIds.has(c.id) && !huisIds.has(c.id));

  const telBtn = (c, extra) => c.phone
    ? `<a class="emergency-call small" href="tel:${esc(String(c.phone).replace(/\s+/g, ''))}">${esc(c.name)}${extra ? ` · ${esc(extra)}` : ''} · ${esc(c.phone)}</a>`
    : `<p class="empty-inline">${esc(c.name)} (geen nummer)</p>`;

  el.innerHTML = `
    <a class="emergency-call" href="tel:112">112 bellen</a>
    <p class="stay-nood">${esc(stayPhrase(p))}</p>
    ${family.length ? `<h3>Eerst bellen</h3>${family.map((c) => telBtn(c, c.rank === 'hoofd' ? 'hoofd' : 'secundair')).join('')}` : ''}
    ${huisarts.length ? `<h3>Huisarts</h3>${huisarts.map((c) => telBtn(c)).join('')}` : '<p class="empty-inline">Nog geen huisarts-nummer.</p>'}
    ${nood.length ? `<h3>Noodcontacten</h3>${nood.map((c) => telBtn(c)).join('')}` : ''}
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
    wishes: $('#w-wishes')?.value.trim() || '',
    sharing: $('#w-sharing')?.value.trim() || '',
    representative: $('#w-rep')?.value.trim() || '',
    documents: $('#w-docs')?.value.trim() || '',
    // Overdracht, aanwezigheid en plek horen bij de dienst, niet bij dit formulier.
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from('triageve_profile').upsert(row);
  if (check(error, 'Opslaan')) return;
  loadProfile();
});

onLoad(loadProfile);
$('#wishes-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#eef-form')?.requestSubmit();
});

onRealtime('triageve_profile', () => loadProfile());
actions.renderNood = renderNood;
actions.renderEef = renderEef;
