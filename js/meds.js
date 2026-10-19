import {
  $, $$, store, db, esc, check, onLoad, onRealtime, fmtStamp, actions, alive, localDate, softDelete, toast, personName,
} from './core.js';
import { loadDiary } from './diary.js';
import { renderHome } from './home.js';

export async function loadMeds() {
  if (!db) {
    store.medications = store.medications || [];
    renderMeds();
    renderHome();
    return;
  }
  const { data, error } = await db.from('triageve_medications').select('*').order('name');
  if (check(error, 'Medicatie laden')) return;
  store.medications = alive(data);
  renderMeds();
  renderHome();
}

function medLine(m) {
  return [m.dose, m.schedule].filter(Boolean).join(' · ');
}

function addDays(iso, days) {
  const date = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function dayDiff(from, to) {
  const a = new Date(`${String(from).slice(0, 10)}T12:00:00`);
  const b = new Date(`${String(to).slice(0, 10)}T12:00:00`);
  return Math.round((b - a) / 86400000);
}

function nlDay(iso) {
  if (!iso) return '';
  return new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function numOrNull(value) {
  if (value == null || String(value).trim() === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function stockInfo(m, today = localDate()) {
  if (m.stock_count == null || m.stock_count === '') return null;
  const count = Number(m.stock_count);
  if (!Number.isFinite(count)) return null;
  const per = numOrNull(m.per_day);
  const warn = Number(m.warn_days ?? 7) || 7;
  const status = m.refill_status || 'geen';
  const since = m.refill_status_at ? dayDiff(localDate(new Date(m.refill_status_at)), today) : 0;
  const base = {
    id: m.id,
    name: m.name,
    count,
    status,
    since,
    by: personName(m.refill_status_by) || m.refill_status_by || '',
    at: m.refill_status_at,
  };
  if (!per) return { ...base, kind: 'manual', level: 'manual' };
  const start = m.stock_date || today;
  const supply = Math.floor(count / per);
  const runsOut = addDays(start, Math.max(supply, 0) - 1);
  const left = dayDiff(today, runsOut);
  let level = 'ok';
  if (status === 'besteld' && since >= 7) level = 'late';
  else if (status === 'besteld') level = 'ordered';
  else if (status === 'nog_niet_op' && since < 3) level = 'snoozed';
  else if (left <= warn) level = 'warn';
  return { ...base, kind: 'plan', runsOut, left, level };
}

function leftLabel(left) {
  if (left < 0) return `al ${-left} ${-left === 1 ? 'dag' : 'dagen'} op`;
  if (left === 1) return 'nog 1 dag';
  return `nog ${left} dagen`;
}

function stockButtons(info, { late = false } = {}) {
  const id = info.id;
  return `
    <div class="stock-actions">
      <button type="button" class="ghost" data-stock="still" data-id="${id}">Nog niet op</button>
      ${late
        ? `<button type="button" class="primary" data-stock="picked" data-id="${id}">Opgehaald</button>`
        : `<button type="button" class="primary" data-stock="ordered" data-id="${id}">Is weer besteld</button>`}
    </div>`;
}

function stockHtml(m, { home = false } = {}) {
  const info = stockInfo(m);
  if (!info || !m.active) return '';
  if (info.kind === 'manual') {
    if (home) return '';
    return `
      <div class="stock-line">
        <p>voorraad: ${esc(String(info.count))} (handmatig bijwerken)</p>
        <button type="button" class="ghost" data-stock="take" data-id="${m.id}">1 ingenomen</button>
      </div>`;
  }
  const forecast = `<p class="stock-forecast">Op rond ${esc(nlDay(info.runsOut))} · ${esc(leftLabel(info.left))}</p>`;
  const who = home ? `<strong>${esc(m.name)}</strong>` : '';
  if (info.level === 'ordered') {
    if (home) return '';
    const when = info.at ? nlDay(localDate(new Date(info.at))) : '';
    return `
      <div class="stock-box stock-ordered">
        <p>Besteld door ${esc(info.by || 'iemand')}${when ? ` op ${esc(when)}` : ''}</p>
        ${forecast}
        <div class="stock-actions">
          <button type="button" class="primary" data-stock="picked" data-id="${m.id}">Opgehaald</button>
        </div>
      </div>`;
  }
  if (info.level === 'late') {
    return `
      <div class="stock-box stock-warn">
        <p>${who}Besteld, maar nog niet opgehaald?</p>
        ${forecast}
        ${stockButtons(info, { late: true })}
      </div>`;
  }
  if (info.level === 'warn') {
    return `
      <div class="stock-box stock-warn">
        <p>${who}Bijna op, recept/apotheek regelen</p>
        ${forecast}
        ${stockButtons(info)}
      </div>`;
  }
  if (info.level === 'snoozed' && !home) {
    return `${forecast}<p class="stock-note">Nog niet op. De waarschuwing komt over een paar dagen terug.</p>`;
  }
  if (home) return '';
  return forecast;
}

function stockBanner() {
  const items = alive(store.medications).filter((m) => m.active && stockHtml(m, { home: true }));
  if (!items.length) return '';
  return `<div class="stock-home">${items.map((m) => stockHtml(m, { home: true })).join('')}</div>`;
}

export function renderMeds() {
  const current = $('#meds-current');
  const stopped = $('#meds-stopped');
  if (!current) return;
  const all = alive(store.medications);
  const active = all.filter((m) => m.active);
  const done = all.filter((m) => !m.active);

  current.innerHTML = active.length
    ? active.map(card).join('')
    : '<p class="empty-inline">Nog geen huidige medicatie.</p>';
  stopped.innerHTML = done.length
    ? done.map(card).join('')
    : '<p class="empty-inline">Nog niets gestopt.</p>';

  $$('#tab-meds .med-card').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    openMed(Number(el.dataset.id));
  }));
}

function card(m) {
  return `
    <article class="card item med-card" data-id="${m.id}">
      <div class="item-head">
        <h3 class="item-title">${esc(m.name)}</h3>
        <span class="item-date">${esc(medLine(m))}</span>
      </div>
      ${m.reason ? `<p class="item-who">${esc(m.reason)}</p>` : ''}
      ${m.active ? (actions.doseBlock?.(m) || '') : ''}
      ${stockHtml(m)}
      ${m.notes ? `<p class="entry-body">${esc(m.notes)}</p>` : ''}
      <div class="item-meta">${m.active ? 'Gestart' : 'Gestopt'} ${esc(m.active ? (m.started_on || '') : (m.stopped_on || ''))}
        · ${esc(m.updated_by || '?')} · ${esc(fmtStamp(m.updated_at))}</div>
    </article>`;
}

function openMed(id = null) {
  store.editingMedId = id;
  const m = id ? store.medications.find((x) => x.id === id) : null;
  $('#med-title').textContent = m ? 'Medicatie bewerken' : 'Nieuwe medicatie';
  $('#m-name').value = m?.name || '';
  $('#m-dose').value = m?.dose || '';
  $('#m-schedule').value = m?.schedule || '';
  $('#m-reason').value = m?.reason || '';
  $('#m-notes').value = m?.notes || '';
  $('#m-started').value = m?.started_on || localDate();
  $('#m-stock').value = m?.stock_count ?? '';
  $('#m-stock-date').value = m?.stock_date || '';
  $('#m-per-day').value = m?.per_day ?? '';
  $('#m-warn-days').value = m?.warn_days ?? '';
  $('#med-delete').hidden = !m;
  $('#med-stop').hidden = !m || !m.active;
  $('#med-editor').showModal();
}

async function diaryNote(name, what) {
  if (!db) return;
  const { error } = await db.from('triageve_diary').insert({
    author: store.me,
    body: `Medicatie gewijzigd: ${name} – ${what}`,
    category: 'medicatie',
  });
  if (check(error, 'Dagboekregel')) return;
  loadDiary();
}

$('#add-med')?.addEventListener('click', () => openMed());
$('#med-cancel')?.addEventListener('click', () => $('#med-editor').close());

$('#med-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!db) return;
  const data = {
    name: $('#m-name').value.trim(),
    dose: $('#m-dose').value.trim(),
    schedule: $('#m-schedule').value.trim(),
    reason: $('#m-reason').value.trim(),
    notes: $('#m-notes').value.trim(),
    started_on: $('#m-started').value || null,
    stock_count: (() => { const n = numOrNull($('#m-stock').value); return n == null ? null : Math.round(n); })(),
    stock_date: $('#m-stock-date').value || null,
    per_day: numOrNull($('#m-per-day').value),
    warn_days: (() => { const n = numOrNull($('#m-warn-days').value); return n == null ? 7 : Math.round(n); })(),
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  };
  if (!data.name) return;
  const { error } = store.editingMedId
    ? await db.from('triageve_medications').update(data).eq('id', store.editingMedId)
    : await db.from('triageve_medications').insert({ ...data, active: true });
  if (check(error, 'Opslaan')) return;
  $('#med-editor').close();
  await diaryNote(data.name, store.editingMedId ? 'bijgewerkt' : `toegevoegd (${[data.dose, data.schedule].filter(Boolean).join(', ') || 'nieuw'})`);
  loadMeds();
});

$('#med-stop')?.addEventListener('click', async () => {
  if (!store.editingMedId || !confirm('Deze medicatie stoppen?')) return;
  if (!db) return;
  const m = store.medications.find((x) => x.id === store.editingMedId);
  const { error } = await db.from('triageve_medications').update({
    active: false,
    stopped_on: localDate(),
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  }).eq('id', store.editingMedId);
  if (check(error, 'Stoppen')) return;
  $('#med-editor').close();
  await diaryNote(m?.name || 'medicatie', 'gestopt');
  loadMeds();
});

$('#med-delete')?.addEventListener('click', async () => {
  if (!store.editingMedId || !confirm('Deze medicatie verwijderen?')) return;
  if (!db) return;
  const m = store.medications.find((x) => x.id === store.editingMedId);
  const { error } = await softDelete('triageve_medications', store.editingMedId);
  if (check(error, 'Verwijderen')) return;
  $('#med-editor').close();
  await diaryNote(m?.name || 'medicatie', 'verwijderd');
  loadMeds();
});

async function patchStock(id, patch, note) {
  const m = (store.medications || []).find((x) => Number(x.id) === Number(id));
  if (!m) return;
  const row = {
    ...patch,
    updated_by: store.me,
    updated_at: new Date().toISOString(),
  };
  if (patch.refill_status) {
    row.refill_status_at = new Date().toISOString();
    row.refill_status_by = store.me;
  }
  if (!db) {
    Object.assign(m, row);
    renderMeds();
    renderHome();
    toast('Bewaard op dit toestel.');
    return;
  }
  const { error } = await db.from('triageve_medications').update(row).eq('id', id);
  if (check(error, 'Voorraad')) return;
  await diaryNote(m.name, note);
  loadMeds();
}

function askCount(question) {
  const raw = prompt(question);
  if (raw == null) return { cancel: true };
  const text = raw.trim();
  if (!text) return { empty: true };
  const n = Number(text.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) {
    toast('Vul een aantal in, of laat het leeg.');
    return { cancel: true };
  }
  return { n: Math.round(n) };
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-stock]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const id = Number(btn.dataset.id);
  const m = (store.medications || []).find((x) => Number(x.id) === id);
  if (!m) return;
  const action = btn.dataset.stock;
  if (action === 'take') {
    const next = Math.max(0, Number(m.stock_count || 0) - 1);
    await patchStock(id, { stock_count: next }, `1 ingenomen, voorraad nu ${next}`);
    return;
  }
  if (action === 'ordered') {
    await patchStock(id, { refill_status: 'besteld' }, 'besteld');
    return;
  }
  if (action === 'still') {
    const answer = askCount('Hoeveel tabletten zijn er nog? Laat leeg als je het niet weet.');
    if (answer.cancel) return;
    if (answer.empty) {
      await patchStock(id, { refill_status: 'nog_niet_op' }, 'nog niet op, aantal niet ingevuld');
      return;
    }
    await patchStock(id, {
      stock_count: answer.n,
      stock_date: localDate(),
      refill_status: 'geen',
    }, `nog ${answer.n} tabletten, voorraad bijgewerkt`);
    return;
  }
  if (action === 'picked') {
    const answer = askCount('Hoeveel tabletten heb je opgehaald?');
    if (answer.cancel || answer.empty) {
      if (answer.empty) toast('Vul het opgehaalde aantal in.');
      return;
    }
    const next = Number(m.stock_count || 0) + answer.n;
    await patchStock(id, {
      stock_count: next,
      stock_date: localDate(),
      refill_status: 'geen',
    }, `opgehaald, ${answer.n} erbij, voorraad nu ${next}`);
  }
}, true);

onLoad(loadMeds);
onRealtime('triageve_medications', () => loadMeds());
actions.renderMeds = renderMeds;
actions.openMed = openMed;
actions.stockInfo = stockInfo;
actions.stockBanner = stockBanner;
