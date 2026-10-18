import {
  $, store, db, esc, check, onLoad, onAfterLoad, onRealtime, fmtTime, fmtStamp, localDate, toast, actions, alive,
  personName, samePerson,
} from './core.js';
import { renderHome } from './home.js';
import { renderMeds } from './meds.js';

const SLOTS = [
  ['ochtend', 'Ochtend'],
  ['middag', 'Middag'],
  ['avond', 'Avond'],
  ['nacht', 'Nacht'],
];

function slotLabel(slot) {
  return SLOTS.find(([key]) => key === slot)?.[1] || slot;
}

function whenLabel(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  return localDate(date) === localDate() ? fmtTime(ts) : fmtStamp(ts);
}

function todayDoses(medId) {
  const day = localDate();
  return (store.doses || [])
    .filter((d) => d.day === day && (medId == null || Number(d.medication_id) === Number(medId)))
    .sort((a, b) => SLOTS.findIndex(([k]) => k === a.slot) - SLOTS.findIndex(([k]) => k === b.slot));
}

export async function loadDoses() {
  if (!db) {
    store.doses = store.doses || [];
    return;
  }
  const { data, error } = await db.from('triageve_doses').select('*').eq('day', localDate());
  if (check(error, 'Inname laden')) return;
  store.doses = data || [];
}

function refresh() {
  renderMeds();
  renderHome();
}

async function saveProfileBits(patch) {
  if (!db) {
    store.profile = { ...(store.profile || { id: 1 }), ...patch, id: 1 };
    renderHome();
    return;
  }
  const { error } = await db.from('triageve_profile').upsert({ id: 1, ...patch });
  if (check(error, 'Opslaan')) return;
  const { data, error: readError } = await db.from('triageve_profile').select('*').eq('id', 1).maybeSingle();
  if (check(readError, 'Opslaan')) return;
  store.profile = data;
  renderHome();
}

async function setPresent(here) {
  const current = store.profile?.present_by || '';
  if (here) {
    if (samePerson(current, store.me)) return;
    if (current && !confirm(`${personName(current)} staat al als aanwezig. Toch aangeven dat jij er bent?`)) return;
    await saveProfileBits({ present_by: store.me, present_since: new Date().toISOString() });
    return;
  }
  if (!current) return;
  if (!samePerson(current, store.me) && !confirm(`${personName(current)} staat als aanwezig. Toch aangeven dat diegene weg is?`)) return;
  await saveProfileBits({ present_by: null, present_since: null });
}

async function saveHandover() {
  const text = $('#handover-text')?.value.trim() || '';
  await saveProfileBits({
    handover: text,
    handover_by: store.me,
    handover_at: new Date().toISOString(),
  });
}

async function toggleDose(medId, slot) {
  if (!medId || !SLOTS.some(([key]) => key === slot)) return;
  const day = localDate();
  const existing = todayDoses(medId).find((d) => d.slot === slot);
  if (!db) {
    if (existing) store.doses = store.doses.filter((d) => d !== existing);
    else {
      const nextId = Math.max(0, ...(store.doses || []).map((d) => Number(d.id) || 0)) + 1;
      store.doses = [...(store.doses || []), {
        id: nextId,
        medication_id: medId,
        day,
        slot,
        author: store.me,
        created_at: new Date().toISOString(),
      }];
    }
    refresh();
    return;
  }
  if (existing) {
    const { error } = await db.from('triageve_doses').delete().eq('id', existing.id);
    if (check(error, 'Inname')) return;
  } else {
    const { error } = await db.from('triageve_doses').insert({
      medication_id: medId,
      day,
      slot,
      author: store.me,
    });
    if (error?.code === '23505') {
      toast('Dit moment is net aangevinkt. De lijst is ververst.');
    } else if (check(error, 'Inname')) return;
  }
  await loadDoses();
  refresh();
}

function shiftHtml() {
  const p = store.profile || {};
  const atHome = String(p.stay || '').trim() === 'thuis';
  const here = p.present_by
    ? `${personName(p.present_by)} is er${p.present_since ? ` sinds ${whenLabel(p.present_since)}` : ''}.`
    : 'Nu is er niemand aangegeven.';
  const handMeta = p.handover_at
    ? `Laatst door ${personName(p.handover_by) || '?'} · ${whenLabel(p.handover_at)}`
    : 'Nog niks achtergelaten.';
  const active = alive(store.medications).filter((m) => m.active);
  const lines = active.length
    ? active.map((m) => {
      const mine = todayDoses(m.id);
      const text = mine.length
        ? mine.map((d) => `${slotLabel(d.slot)} · ${personName(d.author)}`).join(', ')
        : 'nog niet';
      return `<button type="button" class="home-row" data-go="meds">
        <strong>${esc(m.name)}</strong><span>${esc(text)}</span>
      </button>`;
    }).join('')
    : '<p class="empty-inline">Nog geen huidige medicatie.</p>';

  const presence = atHome ? '' : `
    <article class="card home-card present-card${p.present_by ? ' is-here' : ''}">
      <h2>Wie is er bij Eef?</h2>
      <p class="present-now">${esc(here)}</p>
      <p class="notice">Jacky, Ronald en Bren zien dit en kunnen het wijzigen.</p>
      <div class="shift-actions">
        <button type="button" class="primary" id="present-here" ${samePerson(p.present_by, store.me) ? 'disabled' : ''}>Ik ben er</button>
        <button type="button" id="present-leave" ${p.present_by ? '' : 'disabled'}>Ik ga weg</button>
      </div>
    </article>
    <article class="card home-card">
      <h2>Voor de volgende</h2>
      <p class="notice">Jacky, Ronald en Bren zien dit en kunnen het wijzigen.</p>
      <textarea id="handover-text" rows="3" maxlength="2000" placeholder="Wat moet de volgende weten?">${esc(p.handover || '')}</textarea>
      <p class="item-meta">${esc(handMeta)}</p>
      <button type="button" class="primary" id="handover-save">Opslaan</button>
    </article>`;

  return `
    ${presence}
    <article class="card home-card">
      <h2>Inname vandaag</h2>
      ${lines}
      <p class="item-meta">Vink alleen aan wat je echt gegeven hebt.</p>
    </article>`;
}

function doseBlock(med) {
  const mine = todayDoses(med.id);
  const buttons = SLOTS.map(([key, label]) => {
    const hit = mine.find((d) => d.slot === key);
    return `<button type="button" class="dose-slot${hit ? ' on' : ''}" data-dose="1" data-med="${med.id}" data-slot="${key}" aria-pressed="${hit ? 'true' : 'false'}">${label}</button>`;
  }).join('');
  const meta = mine.length
    ? mine.map((d) => `${slotLabel(d.slot)} · ${personName(d.author)} · ${whenLabel(d.created_at)}`).join(' · ')
    : 'Vandaag nog niet aangevinkt.';
  return `<div class="dose-slots">${buttons}</div><p class="item-meta">${esc(meta)}</p>`;
}

document.addEventListener('click', (e) => {
  const slot = e.target.closest('[data-dose]');
  if (slot) {
    e.preventDefault();
    e.stopPropagation();
    toggleDose(Number(slot.dataset.med), slot.dataset.slot);
    return;
  }
  if (e.target.id === 'present-here') setPresent(true);
  if (e.target.id === 'present-leave') setPresent(false);
  if (e.target.id === 'handover-save') saveHandover();
}, true);

const BUILTIN_STAYS = [
  ['thuis', 'Eef is thuis', 'Thuis'],
  ['assen', 'Eef is in Assen (opvang)', 'Assen (opvang)'],
];

export function stayPhrase(profile = store.profile || {}) {
  const stay = String(profile.stay || '').trim();
  const known = BUILTIN_STAYS.find(([key]) => key === stay);
  if (known) return known[1];
  if (stay) return `Eef is in ${stay}`;
  return 'Plek nog niet gekozen';
}

function extraPlaces(profile = store.profile || {}) {
  const list = Array.isArray(profile.places) ? profile.places : [];
  return [...new Set(list.map((name) => String(name || '').trim()).filter(Boolean))];
}

function stayMark(home) {
  if (home) {
    return `<span class="house" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M8 30 32 10l24 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M16 28v22h32V28" fill="var(--card)" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg><span>Eef</span></span>`;
  }
  return `<span class="house pin" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M32 8a16 16 0 0 0-16 16c0 12 16 32 16 32s16-20 16-32A16 16 0 0 0 32 8z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="24" r="5" fill="none" stroke="currentColor" stroke-width="3"/></svg></span>`;
}

function stayHtml() {
  const stay = String(store.profile?.stay || '').trim();
  const home = stay === 'thuis';
  const title = home ? 'Thuis' : (stay ? stayPhrase().replace(/^Eef is (in |)/, '') : 'Plek kiezen');
  const sub = home ? 'Eef is thuis' : 'Tik om te wijzigen';
  return `<button type="button" class="stay-tile stay-edit" aria-label="Plek van Eef wijzigen">${stayMark(home)}<span class="stay-copy"><strong>${esc(title)}</strong><span>${esc(sub)}</span></span></button>`;
}

function renderStayChoices() {
  const box = $('#stay-choices');
  if (!box) return;
  const current = String(store.profile?.stay || '');
  const builtins = BUILTIN_STAYS.map(([key, , label]) => `
    <button type="button" class="stay-choice${current === key ? ' on' : ''}" data-stay="${key}">${esc(label)}</button>`).join('');
  const custom = extraPlaces().map((name) => `
    <div class="stay-row">
      <button type="button" class="stay-choice${current === name ? ' on' : ''}" data-stay="${esc(name)}">${esc(name)}</button>
      <button type="button" class="ghost stay-remove" data-stay-remove="${esc(name)}" aria-label="${esc(name)} weghalen">Weg</button>
    </div>`).join('');
  box.innerHTML = builtins + custom;
}

function openStay() {
  renderStayChoices();
  if ($('#stay-new')) $('#stay-new').value = '';
  $('#stay-dialog')?.showModal();
}

async function chooseStay(key, places) {
  const patch = {
    stay: key || null,
    stay_by: store.me,
    stay_at: new Date().toISOString(),
  };
  if (places) patch.places = places;
  await saveProfileBits(patch);
  $('#stay-dialog')?.close();
}

function mountStay() {
  const spot = $('#stay-on-eef');
  if (spot) spot.innerHTML = stayHtml();
}

$('#stay-choices')?.addEventListener('click', (e) => {
  const remove = e.target.closest('[data-stay-remove]');
  if (remove) {
    const name = remove.dataset.stayRemove;
    const places = extraPlaces().filter((item) => item !== name);
    const current = String(store.profile?.stay || '');
    if (current === name) chooseStay(null, places);
    else saveProfileBits({ places }).then(() => renderStayChoices());
    return;
  }
  const choice = e.target.closest('[data-stay]');
  if (choice) chooseStay(choice.dataset.stay);
});

$('#stay-add')?.addEventListener('click', () => {
  const name = $('#stay-new')?.value.trim() || '';
  if (!name || name.length > 60) return;
  const reserved = ['thuis', 'assen', 'assen (opvang)'];
  if (reserved.includes(name.toLowerCase())) {
    chooseStay(name.toLowerCase() === 'thuis' ? 'thuis' : 'assen');
    return;
  }
  const places = extraPlaces();
  const existing = places.find((item) => item.toLowerCase() === name.toLowerCase());
  const saved = existing || name;
  if (!existing) places.push(saved);
  chooseStay(saved, places);
});

$('#stay-cancel')?.addEventListener('click', () => $('#stay-dialog')?.close());
$('#stay-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  $('#stay-add')?.click();
});

document.addEventListener('click', (e) => {
  if (e.target.closest('.stay-edit')) openStay();
});

actions.stayHtml = stayHtml;
actions.shiftHtml = shiftHtml;
actions.stayPhrase = stayPhrase;
actions.mountStay = mountStay;
actions.doseBlock = doseBlock;
actions.loadDoses = loadDoses;

onLoad(loadDoses);
onAfterLoad(() => { renderMeds(); });
onRealtime('triageve_doses', async () => {
  await loadDoses();
  refresh();
});
