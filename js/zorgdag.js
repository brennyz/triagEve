import {
  $, store, db, esc, check, onLoad, onAfterLoad, onRealtime, fmtTime, fmtStamp, localDate, toast, actions, alive,
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
    if (current === store.me) return;
    if (current && !confirm(`${current} staat al als aanwezig. Toch aangeven dat jij er bent?`)) return;
    await saveProfileBits({ present_by: store.me, present_since: new Date().toISOString() });
    return;
  }
  if (!current) return;
  if (current !== store.me && !confirm(`${current} staat als aanwezig. Toch aangeven dat diegene weg is?`)) return;
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
  const here = p.present_by
    ? `${p.present_by} is er${p.present_since ? ` sinds ${whenLabel(p.present_since)}` : ''}.`
    : 'Nu is er niemand aangegeven.';
  const handMeta = p.handover_at
    ? `Laatst door ${p.handover_by || '?'} · ${whenLabel(p.handover_at)}`
    : 'Nog niks achtergelaten.';
  const active = alive(store.medications).filter((m) => m.active);
  const lines = active.length
    ? active.map((m) => {
      const mine = todayDoses(m.id);
      const text = mine.length
        ? mine.map((d) => `${slotLabel(d.slot)} · ${d.author}`).join(', ')
        : 'nog niet';
      return `<button type="button" class="home-row" data-go="meds">
        <strong>${esc(m.name)}</strong><span>${esc(text)}</span>
      </button>`;
    }).join('')
    : '<p class="empty-inline">Nog geen huidige medicatie.</p>';

  return `
    <article class="card home-card present-card${p.present_by ? ' is-here' : ''}">
      <h2>Wie is er bij Eef?</h2>
      <p class="present-now">${esc(here)}</p>
      <p class="notice">Jacky, Paps en Bren zien dit en kunnen het wijzigen.</p>
      <div class="shift-actions">
        <button type="button" class="primary" id="present-here" ${p.present_by === store.me ? 'disabled' : ''}>Ik ben er</button>
        <button type="button" id="present-leave" ${p.present_by ? '' : 'disabled'}>Ik ga weg</button>
      </div>
    </article>
    <article class="card home-card">
      <h2>Voor de volgende</h2>
      <p class="notice">Jacky, Paps en Bren zien dit en kunnen het wijzigen.</p>
      <textarea id="handover-text" rows="3" maxlength="2000" placeholder="Wat moet de volgende weten?">${esc(p.handover || '')}</textarea>
      <p class="item-meta">${esc(handMeta)}</p>
      <button type="button" class="primary" id="handover-save">Opslaan</button>
    </article>
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
    ? mine.map((d) => `${slotLabel(d.slot)} · ${d.author} · ${whenLabel(d.created_at)}`).join(' · ')
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

actions.shiftHtml = shiftHtml;
actions.doseBlock = doseBlock;
actions.loadDoses = loadDoses;

onLoad(loadDoses);
onAfterLoad(() => { renderMeds(); });
onRealtime('triageve_doses', async () => {
  await loadDoses();
  refresh();
});
