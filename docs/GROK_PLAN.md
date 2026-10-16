# triagEve – Bouwplan MVP "Samen voor Eef"

Opdrachtgever: **Bren** (bzijffers@gmail.com)
Uitvoerder: **Grok 4.7** (agent in Cursor), in losse stukken (fases).
Doel: een betrouwbare, veilige web-app (PWA, werkt in Chrome) waarmee **Jacky, Paps en Bren**
kunnen overleggen en alles bijhouden rond hun moeder/vrouw **Eveline (Eef)**.

> Dit is belangrijk voor de familie. Betrouwbaarheid gaat boven extra functies.
> Liever een kleine app die altijd werkt dan een grote die soms faalt.

---

## 0. Hoe je (Grok) werkt

### Werkwijze per sessie
1. Lees `AGENTS.md`, dit bestand en `docs/PROGRESS.md`.
2. Pak de **eerste fase die nog niet af is** in `docs/PROGRESS.md`. Doe één fase per keer.
3. Werk de fase af tot alle **acceptatiecriteria** kloppen.
4. Controleer: `node --check` op elk gewijzigd `.js` bestand, test in de browser (zie §6).
5. Commit met een duidelijke Nederlandse boodschap, `git push`, vink de fase af in `docs/PROGRESS.md`
   met datum + korte notitie, commit en push dat ook.
6. Ga door naar de volgende fase, of stop als de gebruiker dat vraagt.

### Commando's van de gebruiker
| Gebruiker typt | Wat jij doet |
|---|---|
| `GA DOOR` | Volgende open fase uitvoeren. |
| `STATUS` | Kort overzicht: welke fases af, wat er nu loopt, wat er van Bren nodig is. |
| `STOP EEF` | Huidige kleine stap netjes afmaken (of terugdraaien als hij half is), committen, pushen, `PROGRESS.md` bijwerken, **de e-mail sturen (§8) met de status tot nu toe**, en dan stoppen. Niets meer wijzigen. |

### Klaar = stoppen
Als **alle fases** in `docs/PROGRESS.md` zijn afgevinkt: voer fase 17 uit (e-mail), meld
`KLAAR – triagEve MVP opgeleverd` en **stop**. Geen extra functies toevoegen daarna.

### Harde regels
- **Nooit geheimen committen.** Wachtwoorden, service-role keys, access tokens horen alleen in
  `.env.local` (staat in `.gitignore`). De repo is **openbaar**. Controleer voor elke push met
  `git diff --cached` dat er geen geheimen in zitten.
- **Geen echte gegevens over Eef in de repo**, ook niet in testdata of screenshots. Testdata die je
  in Supabase aanmaakt verwijder je na het testen (prefix testteksten met `[TEST]`).
- **Elke nieuwe tabel**: naam begint met `triageve_`, RLS aan, policy met
  `public.triageve_secure()` (zie `supabase/migrations/20261016180000_init.sql`). Nooit een policy die `anon` toelaat.
- **Alle gebruikersinvoer escapen** met `esc()` voor het in HTML gaat. Nooit `innerHTML` met
  ruwe invoer.
- **Geen build-stap, geen frameworks.** Vanilla HTML/CSS/JS, zoals nu. Supabase-js staat in
  `vendor/supabase.js`. Hostingplatform is GitHub Pages (statisch).
- **UI-tekst in het Nederlands**, eenvoudig en vriendelijk (Paps moet het ook snappen).
- **Na elke wijziging aan bestanden die de app laadt:** verhoog `CACHE` in `sw.js`
  (`triageve-v3`, `-v4`, ...) en voeg nieuwe bestanden toe aan `ASSETS`.
- Niets wat al werkt kapot maken. Na elke fase: chat, dagboek en overleg nog steeds testen.
- Twijfel over iets dat alleen Bren kan beslissen of doen (wachtwoord, Supabase-dashboard,
  medische inhoud)? **Stop en vraag het**, raad niet.

---

## 1. Huidige stand (al gebouwd door de vorige agent)

- Live: **https://brennyz.github.io/triagEve/** (GitHub Pages, branch `main`, root)
- Repo: https://github.com/brennyz/triagEve (openbaar; alleen code, geen data)
- Bestanden:
  - `index.html` – login + app-shell met onderste navigatie (Chat / Dagboek / Overleg)
  - `app.js` – alle logica (login, chat realtime, dagboek, overleg-agenda)
  - `style.css` – stijl, licht/donker
  - `config.js` – Supabase URL + publishable key + `TEAM_EMAIL` (**nog placeholders**)
  - `sw.js` – service worker (alleen app-bestanden cachen, nooit Supabase-data)
  - `manifest.webmanifest`, `icons/` – PWA-installatie
  - `supabase/migrations/20261016180000_init.sql` – tabellen `triageve_messages`,
    `triageve_diary`, `triageve_meetings`, functies `triageve_is_team()` en `triageve_secure()`
  - `.github/workflows/supabase.yml` + `keepalive.yml`, `scripts/set-github-secrets.ps1`,
    `.env.example` – automatische database-setup (fase 1)
- Login-model: gebruiker kiest naam (Jacky/Paps/Bren) + typt het gedeelde wachtwoord.
  De app logt in op **één Supabase-account** `team@triageve.app`. Het wachtwoord staat nergens in
  de code; Supabase controleert het. RLS laat alleen dat account bij de `triageve_*` tabellen.
- **Nog niet getest tegen een echte Supabase** – dat is fase 1.

---

## 2. Fases

Elke fase heeft acceptatiecriteria (AC). Pas afvinken als alle AC kloppen.

### Fase 1 – Supabase koppelen (volledig automatisch) en end-to-end laten werken
**Bren hoeft nooit handmatig SQL te plakken.** Alles loopt via migraties + GitHub Actions:
- `supabase/migrations/*.sql` – alle database-wijzigingen (zie §4).
- `.github/workflows/supabase.yml` – bij elke push naar `main` die migraties wijzigt:
  `supabase db push`, team-account aanmaken als het niet bestaat, en een **beveiligingstest**
  (testrij plaatsen met de service key, controleren dat elke `triageve_*` tabel zonder inlog leeg
  terugkomt, testrij verwijderen). Faalt de test → workflow rood → **direct melden aan Bren**.
- `.github/workflows/keepalive.yml` – elke 3 dagen een ping, want gratis Supabase pauzeert na 7 dagen.
- `scripts/set-github-secrets.ps1` – zet de geheimen uit `.env.local` als GitHub secrets.

**Nodig van Bren (vraag dit eerst, in één bericht, met deze uitleg):**
Vraag Bren om op zijn pc `TriageEve\.env.local` te maken (kopie van `.env.example`) en te vullen.
Dat bestand staat niet in de repo. Jij leest het alleen als je op zijn pc draait. In de cloud
vraag je de waarden en zet je de publishable key in `config.js`. Vul in:
1. `SUPABASE_PROJECT_REF` – uit de project-URL `https://<ref>.supabase.co`.
2. `SUPABASE_DB_PASSWORD` – het database-wachtwoord van het project (Bren heeft dit al ingesteld).
3. `SUPABASE_ACCESS_TOKEN` – supabase.com → avatar rechtsboven → Account → Access Tokens → Generate.
4. `SUPABASE_SERVICE_ROLE_KEY` – Project Settings → API Keys → secret key.
5. `TRIAGEVE_TEAM_PASSWORD` – het app-wachtwoord (Bren weet het huidige wachtwoord; zie fase 2).
En noem de **publishable key** (mag gewoon in de chat, is openbaar).
Op deze computer staan géén access token of database-wachtwoord in andere projecten (gecontroleerd
2026-10-16); service-role keys in andere mappen horen bij **andere** projecten – niet gebruiken
voor triagEve.

**Werk (door jou, Grok):**
1. Vul `config.js` in: `SUPABASE_URL = https://<ref>.supabase.co`, `SUPABASE_KEY = <publishable>`.
2. Draai `powershell -ExecutionPolicy Bypass -File scripts/set-github-secrets.ps1`.
3. Commit + push → workflow start vanzelf (of `gh workflow run supabase.yml -R brennyz/triagEve`).
4. Volg met `gh run watch -R brennyz/triagEve` tot groen. Rood? Lees `gh run view --log-failed`,
   los op, opnieuw.
5. Is het project **alleen** voor triagEve: zet signups uit via de Management API
   (`PATCH https://api.supabase.com/v1/projects/<ref>/config/auth` met `{"disable_signup": true}`,
   header `Authorization: Bearer <ACCESS_TOKEN>`) en zet `site_url` op
   `https://brennyz.github.io/triagEve/`. Deelt het project met andere apps: **niet** doen, meld het.
6. Meld Bren dat hij de Supabase GitHub-koppeling naar de verkeerde repo (`Hoorspel`) kan
   loskoppelen (Project Settings → Integrations → GitHub). Een koppeling naar `triagEve` met
   "Deploy to production" mag blijven, maar dan **niet** ook de workflow laten migreren: kies één
   van de twee en noteer de keuze in `PROGRESS.md`.

**AC:**
- [ ] Inloggen met het juiste wachtwoord werkt, met een fout wachtwoord niet.
- [ ] Chatbericht in browser A verschijnt binnen 3 s in browser B (twee profielen/incognito).
- [ ] Dagboek: toevoegen, eigen stukje bewerken, verwijderen werkt; synchroniseert.
- [ ] Overleg: toevoegen, bewerken, verwijderen werkt; synchroniseert.
- [ ] **Beveiligingstest:** met alleen de publishable key (zonder login) geeft
      `GET https://<ref>.supabase.co/rest/v1/triageve_messages?select=*` met headers `apikey` en
      `Authorization: Bearer <publishable key>` een **lege lijst `[]`** of een fout – nooit data.
      Herhaal voor elke `triageve_*` tabel.
- [ ] Groen bolletje (verbinding) in de topbalk na inloggen.

### Fase 2 – Beveiliging en privacy aanscherpen
Het gaat om gezondheidsinformatie (bijzondere persoonsgegevens, AVG).
- Vraag Bren of het huidige korte wachtwoord blijft of een sterkere zin wordt (aanraden: 4+ woorden,
  bijv. `Eef-Thee-Tuin-2026`). Het is zijn keuze; leg het verschil kort uit.
- Voeg automatisch uitloggen toe na **14 dagen** zonder gebruik (sla laatste activiteit op in
  `localStorage`).
- Voeg een `<meta name="robots" content="noindex, nofollow">` toe en een `robots.txt` met
  `Disallow: /`.
- Voeg een Content-Security-Policy meta-tag toe die alleen `self` en het Supabase-domein
  (`https://<ref>.supabase.co` en `wss://<ref>.supabase.co`) toestaat. Test daarna alles opnieuw.
- Controleer in Supabase de regio van het project en noteer die in `README.md` (EU is het beste).
- Schrijf een korte sectie "Privacy" in `README.md`: wat waar staat, wie erbij kan.

**AC:**
- [ ] Alle tests uit fase 1 slagen nog, ook met de CSP.
- [ ] Geen fouten in de browserconsole.
- [ ] `git log -p | Select-String -Pattern "service_role|sb_secret|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.*service"`
      vindt niets.

### Fase 3 – Navigatie uitbreiden + Home-overzicht
Onderste navigatie wordt: **Home · Chat · Dagboek · Agenda · Meer**.
- "Overleg" heet voortaan **Agenda** (zie fase 4).
- **Meer** opent een lijst: Over Eef, Medicatie, Taken, Contacten, Uitloggen.
- **Home** toont in kaartjes:
  - Eerstvolgende 3 afspraken/overleggen (met datum, tijd, wie gaat).
  - Open taken (max 5), met wie het doet.
  - Laatste 3 dagboekstukjes (ingekort).
  - "X nieuwe berichten" met knop naar Chat.
  - Bovenaan een rode **Noodkaart**-knop (fase 5).
- Home is het startscherm na inloggen.
- `app.js` mag je opsplitsen in `js/*.js` (bijv. `js/core.js`, `js/chat.js`, ...). Gebruik dan gewone
  `<script>` tags in vaste volgorde of `type="module"`; update `sw.js` `ASSETS`.

**AC:**
- [ ] Alle tabs werken op telefoonformaat (390×844) en op desktop.
- [ ] Home werkt bij lege data (nette lege-teksten).

### Fase 4 – Agenda: afspraken + overleggen
Uitbreiding van `triageve_meetings` (migratie, geen nieuwe tabel):
```sql
alter table public.triageve_meetings
  add column if not exists kind text not null default 'overleg'
    check (kind in ('overleg','afspraak','bezoek','overig')),
  add column if not exists location text;
```
- In het formulier: soort (Overleg / Afspraak arts-ziekenhuis / Bezoek / Overig), locatie.
- Lijst toont een icoon/label per soort. Filter-knoppen blijven (Komend / Gebeurd / Alles).
- "Wat is er gebeurd" blijft het verslagveld; bij afspraken heet het label "Wat zei de arts / wat is
  er gebeurd?".
- Knop **"Zet in mijn agenda"**: download een `.ics` bestand (datum, tijd, titel, locatie), zodat
  het in Google Agenda / iPhone komt.

**AC:**
- [ ] Bestaande overleggen blijven zichtbaar als soort "overleg".
- [ ] `.ics` import werkt in Google Agenda (test met een `[TEST]` afspraak).

### Fase 5 – Over Eef + Noodkaart + Contacten
Nieuwe tabellen (migratie `supabase/migrations/20261017100000_eef.sql`, eindig met `select public.triageve_secure(...)` per tabel):
```sql
create table if not exists public.triageve_profile (
  id int primary key default 1 check (id = 1),
  summary text,          -- korte situatie / wat is er aan de hand
  important text,        -- allergieën, bijzonderheden, wensen
  emergency text,        -- wat te doen in nood
  updated_by text,
  updated_at timestamptz not null default now()
);
create table if not exists public.triageve_contacts (
  id bigint generated always as identity primary key,
  name text not null,
  role text,             -- huisarts, specialist, thuiszorg, buren, ...
  phone text,
  email text,
  notes text,
  is_emergency boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now()
);
```
- **Over Eef**: drie tekstvakken (Situatie, Belangrijk om te weten, In geval van nood), bewerkbaar,
  met "laatst bijgewerkt door X op ...".
- **Contacten**: lijst + toevoegen/bewerken/verwijderen. Telefoonnummer is een `tel:` link (één tik
  om te bellen). Contacten met `is_emergency` staan bovenaan.
- **Noodkaart** (rode knop op Home): groot scherm met **112** (`tel:112`), de huisarts-nummers en de
  noodcontacten, plus de tekst "In geval van nood" en "Belangrijk om te weten". Moet ook leesbaar zijn
  zonder scrollen op een telefoon.
- Voeg beide tabellen toe aan `subscribe()` in de app (realtime staat aan via `triageve_secure`).

**AC:**
- [ ] RLS-test uit fase 1 ook voor `triageve_profile` en `triageve_contacts`.
- [ ] Noodkaart opent in 1 tik vanaf Home en `tel:` links werken op Android.

### Fase 6 – Medicatie
Tabel `triageve_medications` (migratie `..._medicatie.sql`):
```sql
create table if not exists public.triageve_medications (
  id bigint generated always as identity primary key,
  name text not null,
  dose text,             -- bijv. "500 mg"
  schedule text,         -- bijv. "2x per dag, ochtend en avond"
  reason text,
  notes text,
  active boolean not null default true,
  started_on date,
  stopped_on date,
  updated_by text,
  updated_at timestamptz not null default now()
);
```
- Lijst "Huidige medicatie" en ingeklapt "Gestopt". Toevoegen, bewerken, stoppen (zet `active=false`,
  `stopped_on=vandaag`).
- Bij elke wijziging automatisch een dagboekregel: `"Medicatie gewijzigd: <naam> – <wat>"` met de
  naam van wie het deed (zodat de geschiedenis bewaard blijft).
- Duidelijke tekst bovenaan: "Dit is een overzicht voor de familie. Volg altijd het advies van de
  arts/apotheek."

**AC:**
- [ ] Wijziging verschijnt live bij de ander en geeft een dagboekregel.

### Fase 7 – Taken
Tabel `triageve_tasks` (migratie `..._taken.sql`):
```sql
create table if not exists public.triageve_tasks (
  id bigint generated always as identity primary key,
  title text not null,
  assignee text check (assignee in ('Jacky','Paps','Bren')),
  due_date date,
  done boolean not null default false,
  done_by text,
  done_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);
```
- Lijst met afvinken (één tik), filter "Alles / Van mij / Klaar". Te laat = rood.
- Vanuit een overleg: knop "Maak taken van actiepunten" die elke regel `Naam: taak` omzet naar een
  taak met die persoon (als de naam Jacky/Paps/Bren is).

**AC:**
- [ ] Afvinken synchroniseert live; Home toont open taken.

### Fase 8 – Dagboek verbeteren
Migratie op `triageve_diary`:
```sql
alter table public.triageve_diary
  add column if not exists category text not null default 'algemeen'
    check (category in ('algemeen','gezondheid','stemming','eten','slaap','medicatie','incident')),
  add column if not exists important boolean not null default false;
```
- Bij schrijven: categorie kiezen (knopjes) en "Belangrijk" vinkje. Belangrijk = gemarkeerd + bovenaan
  op Home.
- Filter op categorie naast filter op persoon.
- Tijdstempel van elk stukje blijft zichtbaar (dag + tijd), ook "bewerkt op".

**AC:**
- [ ] Oude stukjes blijven werken (categorie "algemeen").

### Fase 9 – Overzicht printen / delen met arts
- Knop in **Meer**: "Overzicht voor arts". Opent een printvriendelijke pagina (print-CSS) met:
  Over Eef, actuele medicatie, belangrijke dagboekstukjes van de laatste 30 dagen, komende afspraken,
  noodcontacten. Knop "Printen / Opslaan als PDF" (`window.print()`).

**AC:**
- [ ] Print-voorbeeld in Chrome is netjes op A4, zonder navigatie/knoppen.

### Fase 10 – Regie en wensen van Eef
Een app die over iemand gaat moet die persoon respecteren. Zie `docs/ZORG_CHECKLIST.md` §A.
- Nieuw scherm **"Wensen van Eef"** (onder Meer) in `triageve_profile` (migratie: kolommen
  `wishes text`, `sharing text`, `representative text`, `documents text`):
  - Wat Eef zelf belangrijk vindt / wat ze wel en niet wil (eten, bezoek, zorg, dagritme).
  - Wat ze goed vindt dat de familie bijhoudt en deelt (`sharing`).
  - Wie haar vertegenwoordigt / aanspreekpunt voor artsen (`representative`).
  - **Waar** belangrijke papieren liggen (wilsverklaring, levenstestament, verzekering) – alleen de
    vindplaats, nooit de documenten zelf, nooit BSN/DigiD/pincodes (`documents`).
- Vast tekstblok bovenaan Home (klein, inklapbaar): "We doen dit samen, mét Eef. Bespreek met haar
  wat hier komt te staan."
- **Niet bouwen:** locatie volgen, camera, heimelijke monitoring.

**AC:** velden opslaan/synchroniseren; tekstblok zichtbaar; geen invoervelden voor BSN of codes.

### Fase 11 – Dagstatus en metingen ("hoe gaat het met Eef?")
- Tabel `triageve_checkins`: `id`, `author`, `status` (`goed` / `matig` / `zorgelijk`), `note`,
  `created_at`. Home toont de laatste status groot met kleur (groen/oranje/rood) + wie en wanneer.
- Knop op Home: "Status doorgeven" (3 grote knoppen + optionele notitie).
- Tabel `triageve_measurements`: `id`, `author`, `kind` (`bloeddruk`, `gewicht`, `temperatuur`,
  `suiker`, `pijn 0-10`, `overig`), `value text`, `note`, `measured_at timestamptz default now()`.
  Scherm "Metingen" onder Meer: lijst per soort + toevoegen. Geen grafieken nodig in de MVP.
- `zorgelijk` maakt automatisch ook een dagboekstukje met `important = true` en categorie
  `gezondheid`, en (na fase 12) een melding naar iedereen.
- Tekst bij "zorgelijk": "Bij acuut gevaar: bel 112. Twijfel? Bel de huisarts of huisartsenpost."

**AC:** status zichtbaar op Home bij de ander binnen 3 s; metingen opslaan en tonen met tijdstempel.

### Fase 12 – Meldingen (push)
Zonder meldingen mist de familie dingen; dat is het grootste risico van zo'n app.
- Web Push: tabel `triageve_push_subscriptions` (`id`, `person`, `endpoint text unique`,
  `p256dh`, `auth`, `created_at`).
- Supabase Edge Function `supabase/functions/notify/index.ts` die bij een nieuwe rij een push stuurt
  naar **iedereen behalve de schrijver**. Trigger via een database-webhook of `pg_net` trigger op:
  chatbericht, belangrijk dagboekstukje, dagstatus `zorgelijk`, nieuwe/gewijzigde afspraak, taak
  toegewezen. Inhoud van de melding kort en **zonder medische details** (bijv. "Paps: nieuw bericht"
  / "Let op: status Eef is zorgelijk") – meldingen staan op het vergrendelscherm.
- VAPID-sleutels: genereer met `npx web-push generate-vapid-keys`; publieke sleutel in `config.js`,
  privé-sleutel als Supabase function secret (workflow: `supabase secrets set` met een GitHub secret
  `VAPID_PRIVATE_KEY`, toevoegen aan `set-github-secrets.ps1` en `.env.example`).
- Deploy de functie in `.github/workflows/supabase.yml` (`supabase functions deploy notify`).
- In de app: Meer → "Meldingen aan" (vraagt toestemming), per persoon opgeslagen. Werkt op Android
  Chrome, en op iPhone alleen als de app op het beginscherm is gezet (iOS 16.4+) – vermeld dat.
- In `sw.js`: `push` en `notificationclick` handlers (opent de app op het juiste tabblad).

**AC:** melding komt binnen op een Android-telefoon of desktop-Chrome binnen 10 s; schrijver krijgt
zelf geen melding; uitzetten werkt.

### Fase 13 – Geschiedenis, prullenbak en wie-deed-wat
Vertrouwen binnen de familie: niets verdwijnt stil.
- Tabel `triageve_history` (`id`, `table_name`, `row_id`, `action`, `old_data jsonb`,
  `new_data jsonb`, `changed_by text`, `changed_at timestamptz default now()`), gevuld door een
  trigger op alle `triageve_*` tabellen (behalve history, push_subscriptions, messages-inserts).
  `changed_by` = `coalesce(new.updated_by, new.author, new.created_by, old....)`.
- Verwijderen wordt **zacht**: kolom `deleted_at timestamptz` op diary, meetings, contacts,
  medications, tasks; de app filtert `deleted_at is null`. Meer → "Prullenbak": terugzetten binnen 30
  dagen. Een geplande opruiming (`pg_cron`, of de keepalive-workflow met service key) verwijdert
  definitief na 30 dagen.
- Bij Medicatie en Over Eef: knop "Geschiedenis" (lijst van wijzigingen met wie/wanneer).

**AC:** verwijderen → staat in prullenbak → terugzetten werkt; geschiedenis toont wijzigingen.

### Fase 14 – Betrouwbaarheid: offline, back-up, toegankelijkheid
- **Offline wachtrij:** lukt versturen/opslaan niet (geen netwerk), zet het in een outbox in
  `localStorage`, toon "wacht op verbinding" bij het item, en verstuur automatisch zodra `online`.
  Nooit tekst kwijtraken.
- **Concepten bewaren:** tekst in chat- en dagboekvak blijft bewaard als de app sluit.
- **Back-up:** workflow `.github/workflows/backup.yml`, wekelijks: `supabase db dump --data-only
  --schema public` (alleen `triageve_*`), versleutelen met
  `gpg --symmetric --batch --passphrase "$BACKUP_PASSPHRASE" --cipher-algo AES256`, uploaden als
  artifact (bewaartijd 90 dagen). **Nooit onversleuteld** (de repo is openbaar). `BACKUP_PASSPHRASE`
  als GitHub secret; Bren bewaart hem zelf (wachtwoordmanager). Schrijf in `README.md` hoe je
  terugzet.
- **Exporteren:** Meer → "Alles downloaden" (JSON van alle tabellen) voor eigen archief.
- **Toegankelijkheid:** Meer → "Grote tekst" aan/uit (schaal 125%), knoppen min. 44×44 px,
  voldoende contrast, alles bruikbaar met toetsenbord; `aria-label` op icoon-knoppen.

**AC:** chatbericht in vliegtuigmodus versturen → komt aan na weer online; back-up-workflow groen en
het bestand is te ontsleutelen; grote tekst werkt op alle schermen.

### Fase 15 – Zorg voor de zorgers
Mantelzorg is zwaar; de app moet ook helpen het vol te houden.
- Op de Agenda: soort `bezoek` heeft "wie gaat" – Home toont "deze week bij Eef: ..." zodat het
  verdeeld blijft.
- Taken: teller per persoon (open taken) op het Taken-scherm, zodat zichtbaar is als één persoon te
  veel doet.
- Meer → "Hulp & steun": vaste links/nummers: 112, huisartsenpost (in te vullen via Contacten),
  Mantelzorglijn (controleer actueel nummer op mantelzorg.nl), 113 Zelfmoordpreventie (0800-0113),
  en ruimte voor eigen nummers. **Controleer elk nummer op de officiële website voor je het zet.**

**AC:** overzicht zichtbaar; nummers gecontroleerd en de bron genoteerd in `PROGRESS.md`.

### Fase 16 – Eindtest, handleiding, oplevering
- Volledige test volgens §6 op telefoonformaat én desktop, in twee browsers tegelijk.
- Verwijder alle `[TEST]` data uit Supabase.
- Loop `docs/ZORG_CHECKLIST.md` na: elk punt staat op "gedaan" of "bewust niet (reden)".
- Schrijf `docs/HANDLEIDING.md` (Nederlands, voor Jacky en Paps): openen, installeren op Android en
  iPhone, inloggen, elke tab in 2–3 zinnen, wat te doen als iets niet werkt (pagina verversen,
  uit- en inloggen, Bren bellen).
- Werk `README.md` bij.
- Verhoog `CACHE` in `sw.js`, push, wacht tot GitHub Pages gebouwd is
  (`gh api repos/brennyz/triagEve/pages/builds/latest --jq .status` → `built`) en controleer de live
  site.

**AC:**
- [ ] Live site werkt met alle onderdelen; geen consolefouten.
- [ ] PWA installeerbaar (Chrome: installeer-icoon in adresbalk / "App installeren").

### Fase 17 – E-mail sturen en stoppen
Zie §8. Daarna `KLAAR – triagEve MVP opgeleverd` melden en stoppen.

---

## 3. Buiten scope voor de MVP (niet bouwen)
Foto's/bestanden uploaden, aparte accounts per persoon, native app, koppeling met zorgsystemen
(huisarts, apotheek, MedMij), locatie volgen, camera's, grafieken van metingen, AI-analyse van
gegevens over Eef. Noteer ideeën in `docs/IDEEEN.md` in plaats van ze te bouwen.

## 4. Datamodel-afspraken
- Tijden altijd `timestamptz` met `default now()`; tonen met `toLocaleString('nl-NL')`.
- Wie iets deed: `author` / `created_by` / `updated_by` = de gekozen naam (Jacky/Paps/Bren).
- Migraties in `supabase/migrations/<JJJJMMDDUUMMSS>_<naam>.sql` (bijv.
  `20261017100000_eef.sql`). Nieuw bestand per wijziging; **bestaande migraties nooit aanpassen**
  nadat ze gepusht zijn.
- **Idempotent**: `create table if not exists`, `add column if not exists`, `create or replace`.
- Elke nieuwe tabel eindigt met: `select public.triageve_secure('triageve_<naam>');`
  (zet RLS aan, team-policy, `anon` geen rechten, realtime aan – zie de init-migratie).
- Tabellen in de SQL van dit plan (fase 4–15) staan als `create table if not exists public.triageve_...`
  zodat de beveiligingstest in de workflow ze automatisch meetest.
- Uitvoeren = committen + pushen. De workflow doet de rest. Noteer in `PROGRESS.md` welke migraties
  groen zijn uitgevoerd.
- Lokaal testen van een migratie (optioneel, vereist Docker): `npx supabase start` en
  `npx supabase db reset`.

## 5. Code-afspraken
- Volg de stijl van de bestaande `app.js`: `$`/`$$` helpers, `esc()`, `check(error, 'Actie')` voor
  fouten met een toast, `load*()` + `render*()` per onderdeel, realtime via één `channel`.
- Na opslaan altijd opnieuw laden of de realtime-update gebruiken; nooit alleen lokaal tonen.
- Elke fout zichtbaar maken met `toast()`; nooit stil falen.
- Werkt als de verbinding even weg is: knoppen tonen een fout, niets gaat verloren in tekstvakken.

## 6. Testprocedure (elke fase)
1. Lokaal: `python -m http.server 8765` in de repo-map, open `http://localhost:8765`.
2. Browser A: log in als Bren. Browser B (incognito): log in als Jacky.
3. Test de AC van de fase + korte rooktest: chatbericht heen en weer, dagboekstukje, agenda-item.
4. Telefoonformaat: Chrome DevTools device mode 390×844.
5. Console: geen rode fouten.
6. Ruim `[TEST]` data op als de fase klaar is (of laat het staan tot fase 16, maar wel opruimen).

## 7. Wat alleen Bren kan doen (vraag het op tijd)
- Eenmalig `.env.local` invullen (fase 1). Daarna loopt de database volledig automatisch.
- Later eventueel `VAPID_PRIVATE_KEY` (fase 12, kun jij genereren) en `BACKUP_PASSPHRASE` (fase 14,
  laat Bren die kiezen en zelf bewaren).
- Wachtwoord kiezen.
- Gmail-koppeling goedkeuren (eenmalig inloggen, zie §8).
- Echte informatie over Eef invullen (doet de familie zelf in de app, niet jij).

## 8. De e-mail aan Bren (fase 17, en bij `STOP EEF`)
**Aan:** bzijffers@gmail.com
**Onderwerp:** `triagEve is klaar – zo gebruik je het` (bij `STOP EEF`: `triagEve – tussenstand`)

**Inhoud (Nederlands, vul de [..] in):**
```
Hoi Bren,

triagEve is [klaar / tot en met fase X af].

Openen: https://brennyz.github.io/triagEve/
Inloggen: kies je naam (Jacky, Paps of Bren) en typ het team-wachtwoord.

Installeren als app:
- Android/Chrome: open de link > menu (⋮) > "App installeren" of "Toevoegen aan startscherm".
- iPhone/Safari: open de link > Deel-knop > "Zet op beginscherm".
- Computer/Chrome: installeer-icoon rechts in de adresbalk.

Wat erin zit:
- Home: overzicht van afspraken, taken, belangrijke dagboekstukjes en nieuwe berichten.
- Noodkaart: 112, huisarts en noodcontacten in één tik.
- Chat: live berichten met tijd.
- Dagboek: wat is er gebeurd, met categorie en "belangrijk".
- Agenda: overleggen en doktersafspraken, verslag achteraf, in je eigen agenda zetten.
- Over Eef, Medicatie, Taken, Contacten.
- Overzicht voor de arts (printen / PDF).

Eerst doen:
1. [eventuele open punten voor Bren, bijv. Over Eef en contacten invullen]
2. Stuur de link + het wachtwoord naar Jacky en Paps (niet via een openbare groep).
3. Handleiding: https://github.com/brennyz/triagEve/blob/main/docs/HANDLEIDING.md

Veiligheid:
- De code is openbaar, de gegevens niet: die staan in Supabase en zijn alleen te zien na inloggen.
- Deel het wachtwoord alleen met Jacky en Paps. Wachtwoord wijzigen: Supabase > Authentication >
  Users > team@triageve.app > Reset/Change password.

Status per fase:
[lijst uit docs/PROGRESS.md]

Groet,
Grok (triagEve-bouwer)
```

**Zo verstuur je hem:**
1. `GetDynamicTools` met namespace `plugin-gmail-gmail`. Staat die op `needsAuth`: roep
   `mcp_auth` aan via `CallDynamicTool` en vraag Bren de Google-login goed te keuren. Zoek daarna de
   verstuur-tool (bijv. `send_email` / `create_draft`) en verstuur de mail.
2. Lukt Gmail niet: probeer `plugin-outlook-outlook` op dezelfde manier.
3. Lukt dat ook niet: maak een Gmail-concept als dat wel kan, of schrijf de mail naar
   `docs/EMAIL_VOOR_BREN.md` (die mag gecommit worden, er staan geen geheimen in – **zet het
   wachtwoord er nooit in**) en zeg tegen Bren precies: "De mail kon niet automatisch verstuurd worden,
   hij staat in docs/EMAIL_VOOR_BREN.md".
4. Noteer in `PROGRESS.md` of en hoe de mail verstuurd is.
