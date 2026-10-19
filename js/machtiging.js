import { $, store, localDate, toast, actions, alive, personName, onAfterLoad } from './core.js';
import { renderHome } from './home.js';
import { buildPdf, downloadPdf, sharePdf } from './pdfdoc.js';

const KEY = 'triageve.machtiging';
const FIELDS = [
  'principal', 'principalBirth', 'address', 'postcode', 'city',
  'rep', 'relation', 'repBirth', 'repPhone', 'repEmail',
  'alt', 'altRelation', 'altPhone', 'wishes', 'place', 'date',
  'doctor', 'practice', 'doctorDate',
];

let defaults = {};
let draft = {};

function stored() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
  catch { return {}; }
}

function blankDate(value) {
  return value || localDate();
}

function mergeDraft() {
  const saved = stored();
  draft = { ...defaults };
  for (const key of FIELDS) {
    if (saved[key]) draft[key] = saved[key];
  }
  if (!draft.date) draft.date = localDate();
  const people = alive(store.contacts);
  const ronald = people.find((c) => c.circle === 'familie' && personName(c.name) === 'Ronald');
  if (!draft.repPhone && ronald?.phone) draft.repPhone = String(ronald.phone);
  if (!draft.repEmail && ronald?.email) draft.repEmail = String(ronald.email);
  const arts = people.find((c) => /huisarts/i.test(c.role || ''));
  if (!draft.doctor && arts?.name) draft.doctor = arts.name;
  if (!draft.practice && arts?.organisation) draft.practice = arts.organisation || '';
}

export function addressLine() {
  const source = draft.address ? draft : defaults;
  if (!source.address) return '';
  const tail = [source.postcode, source.city].filter(Boolean).join(' ');
  return tail ? `${source.address}, ${tail}` : source.address;
}

function readForm() {
  const next = { ...draft };
  for (const key of FIELDS) {
    const el = document.getElementById(`mgt-${key}`);
    if (el) next[key] = el.value.trim();
  }
  return next;
}

function writeForm() {
  for (const key of FIELDS) {
    const el = document.getElementById(`mgt-${key}`);
    if (!el) continue;
    const value = key === 'date' || key === 'doctorDate' ? (draft[key] || '') : (draft[key] || '');
    el.value = key === 'date' ? blankDate(value) : value;
  }
  const mail = $('#mgt-mail-ronald');
  if (mail) {
    const email = String(draft.repEmail || '').trim();
    mail.hidden = !email;
    mail.href = email ? `mailto:${email}` : '#';
    mail.textContent = email ? `Mail ${email}` : 'Mailen';
  }
}

function saveDraft(showToast) {
  draft = readForm();
  localStorage.setItem(KEY, JSON.stringify(draft));
  if (store.activeTab === 'home') renderHome();
  if (showToast) toast('Bewaard op dit toestel.');
}

function nlDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formBlocks(data) {
  const address = [data.address, [data.postcode, data.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [
    { heading: 'Schriftelijke machtiging medische vertegenwoordiging', lines: ['(artikel 7:465 lid 3 Burgerlijk Wetboek, WGBO)'], size: 15 },
    { heading: 'Ondergetekende (volmachtgever)', lines: [
      `Naam: ${data.principal || '........................'}`,
      `Geboortedatum: ${nlDate(data.principalBirth) || '........................'}`,
      `Adres: ${address || '........................'}`,
    ] },
    { heading: 'wijst hierbij aan als gemachtigde', lines: [
      `Naam: ${data.rep || '........................'}`,
      `Relatie: ${data.relation || '........................'}`,
      `Geboortedatum: ${nlDate(data.repBirth) || '........................'}`,
      `Telefoon: ${data.repPhone || '........................'}`,
      `E-mail: ${data.repEmail || '........................'}`,
    ] },
    { heading: 'Eventueel als vervanger, als de gemachtigde niet bereikbaar is', lines: [
      `Naam: ${data.alt || '........................'}`,
      `Relatie: ${data.altRelation || '........................'}`,
      `Telefoon: ${data.altPhone || '........................'}`,
    ] },
    { heading: '1. Waarvoor deze machtiging geldt', lines: [
      'Ik machtig de gemachtigde om in mijn plaats op te treden, voor het geval ik zelf tijdelijk of blijvend niet in staat ben mijn belangen op het gebied van zorg te overzien. Dit is zo zodra een arts of behandelaar mij wilsonbekwaam vindt voor die beslissing. De machtiging geldt in ieder geval voor:',
      '- beslissingen over onderzoek, behandeling en medicatie, waaronder ggz-zorg;',
      '- instemmen met een vrijwillige opname of verblijf in een zorginstelling;',
      '- informatie krijgen van en overleggen met mijn huisarts, psychiater, psycholoog, ggz-instelling en andere behandelaars;',
      '- inzage in mijn medisch dossier, voor zover dat nodig is voor deze beslissingen.',
    ] },
    { heading: '2. Eerste contactpersoon', lines: [
      'Ik wil dat de gemachtigde in mijn dossier wordt genoteerd als mijn eerste contactpersoon en vertegenwoordiger.',
    ] },
    { heading: '3. Mijn wensen', lines: [data.wishes || ''] },
    { heading: '4. Intrekken', lines: [
      'Ik kan deze machtiging altijd intrekken, mondeling of schriftelijk, zolang ik wilsbekwaam ben.',
    ] },
    { heading: 'Ondertekening', lines: [
      `Plaats: ${data.place || '........................'}`,
      `Datum: ${nlDate(data.date) || '........................'}`,
      '',
      'Handtekening volmachtgever',
      '................................................',
      '',
      'Handtekening gemachtigde (voor akkoord)',
      '................................................',
    ] },
    { heading: 'Verklaring van de huisarts (optioneel, maar sterk aanbevolen)', lines: [
      'Ondergetekende, huisarts, verklaart dat de volmachtgever bij het tekenen van deze machtiging naar mijn oordeel in staat was te begrijpen wat zij tekende.',
      `Naam huisarts: ${data.doctor || '........................'}`,
      `Praktijk: ${data.practice || '........................'}`,
      `Datum: ${nlDate(data.doctorDate) || '........................'}`,
      '',
      'Handtekening huisarts',
      '................................................',
      '',
      'Graag een kopie scannen in het medisch dossier.',
    ] },
  ];
}

async function makePdf() {
  saveDraft(false);
  const bytes = await buildPdf(formBlocks(draft), 'Machtiging medische vertegenwoordiging');
  return bytes;
}

export function renderMachtiging() {
  mergeDraft();
  writeForm();
}

$('#mgt-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  saveDraft(true);
});

$('#mgt-pdf')?.addEventListener('click', async () => {
  const bytes = await makePdf();
  downloadPdf('Machtiging_medische_vertegenwoordiging.pdf', bytes);
  toast('Pdf staat in je downloads. Geen papierformaat kiezen.');
});

$('#mgt-mail')?.addEventListener('click', async () => {
  const bytes = await makePdf();
  const result = await sharePdf(
    'Machtiging_medische_vertegenwoordiging.pdf',
    bytes,
    'Machtiging medische vertegenwoordiging',
    'De pdf zit bij deze mail. Kies de ontvanger en tik op Versturen.',
  );
  if (result === 'shared') toast('Kies je mail en tik op Versturen. Dan komt de mail aan.');
  else if (result === 'downloaded') {
    toast('Delen lukt hier niet. De pdf is gedownload. Zet die zelf als bijlage. Een mail vanuit de app zelf heeft een e-mailservice met eigen afzender nodig.');
  }
});

import('./local-form.js').then((mod) => {
  defaults = mod.defaults || {};
  mergeDraft();
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(draft));
  if (store.activeTab === 'home') renderHome();
  if (store.activeTab === 'machtiging') writeForm();
}).catch(() => { mergeDraft(); });

onAfterLoad(() => {
  mergeDraft();
  if (store.activeTab === 'home') renderHome();
});

actions.addressLine = addressLine;
actions.renderMachtiging = renderMachtiging;
