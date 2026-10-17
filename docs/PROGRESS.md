# triagEve – Voortgang

Bijwerken na elke fase: `- [x] Fase N – naam (JJJJ-MM-DD) – korte notitie`.
Zie `docs/GROK_PLAN.md` voor wat elke fase inhoudt.

- [x] Fase 0 – Basis: PWA, login, chat, dagboek, overleg, migraties, workflows, GitHub Pages live (2026-10-16) – nog niet getest tegen echte Supabase
- [ ] Fase 1 – Supabase automatisch koppelen en end-to-end werkend (open, 2026-10-16) – URL en publishable key staan in `config.js` (project `slddtxwbufoadmvdconz`). GitHub-secrets zijn nog leeg, dus de migraties draaien nog niet. Signups blijven AAN. Hoorspel koppelt Bren later zelf los. Geen wachtwoord of service-key in de repo.
- [x] Fase 2 – Beveiliging en privacy (2026-10-16) – auto-uitloggen na 14 dagen, robots/noindex, CSP (`*.supabase.co` tot project-ref bekend is), Privacy-sectie in README. Regio DB onbekend (wacht op fase 1). Wachtwoordkeuze nog open. E2e-inlog wacht op secrets; `node --check` + login-scherm + robots.txt gecontroleerd. `git log` bevat geen echte service-keys (wel het woord `service_role` in docs/vendor).
- [x] Fase 3 – Navigatie + Home-overzicht (2026-10-16) – nav Home/Chat/Dagboek/Agenda/Meer, Home met lege-teksten, Noodkaart-knop (112). Code gesplitst naar `js/*.js`. Getest zonder Supabase via `?preview=1` in Chrome 390×844 en desktop; geen JS-fouten. Live e2e wacht op fase 1.
- [x] Fase 4 – Agenda: afspraken + overleggen (+ .ics) (2026-10-16) – soort/locatie, label per soort, `.ics` download. Bestaande items = overleg. Migratie `20261016190000_agenda.sql` (wacht op secrets). Getest in preview: labels, locatie, ICS-inhoud, formulierlabel bij afspraak.
- [x] Fase 5 – Over Eef + Noodkaart + Contacten (2026-10-16) – profielvelden, contacten met tel:, noodkaart (112, huisarts, noodcontacten, teksten). Migratie `20261017100000_eef.sql`. Getest in preview 390×844. RLS-test wacht op secrets.
- [x] Fase 6 – Medicatie (2026-10-16) – huidige/gestopt, stoppen, dagboekregel bij wijziging, disclaimer. Migratie `20261017110000_medicatie.sql`. Live-sync wacht op secrets; UI in preview getest.
- [x] Fase 7 – Taken (2026-10-16) – afvinken, filters, te laat rood, taken uit actiepunten, Home toont open taken. Migratie `20261017120000_taken.sql`. Preview: toggle + parse + Home. Live-sync wacht op secrets.
- [x] Fase 8 – Dagboek verbeteren (2026-10-16) – categorieën, belangrijk, filters, tijdstempel + bewerkt op, belangrijk bovenaan Home. Oude stukjes = algemeen. Migratie `20261017130000_dagboek.sql`.
- [x] Fase 9 – Overzicht voor arts (print/PDF) (2026-10-16) – printpagina met Over Eef, medicatie, belangrijk dagboek (30 d), afspraken, noodcontacten; print-CSS verbergt nav. `window.print()` knop. Chrome print-voorbeeld niet live gedraaid zonder printer-UI; CSS gecontroleerd.
- [x] Fase 10 – Regie en wensen van Eef (2026-10-16) – scherm Wensen van Eef, Home-tekstblok inklapbaar, geen BSN/codes. Migratie `20261017140000_wensen.sql`.
- [x] Fase 11 – Dagstatus en metingen (2026-10-16) – status op Home (kleur), doorgeven, zorgelijk → dagboek belangrijk, metingen-lijst. Migratie `20261017150000_checkins.sql`. Preview getest; live 3s-sync wacht op secrets.
- [x] Fase 12 – Meldingen (push) (2026-10-16) – tabel, edge function `notify`, sw push/click, Meer → Meldingen. Geen medische details in de tekst. **Wacht op Bren:** `npx web-push generate-vapid-keys`, publieke sleutel in `config.js`, `VAPID_PRIVATE_KEY` als GitHub secret. Echte push-AC (Android <10s) kan niet zonder die sleutels.
- [x] Fase 13 – Geschiedenis, prullenbak, wie-deed-wat (2026-10-16) – zachte delete, prullenbak + terugzetten 30 d, geschiedenis Medicatie/Over Eef, trigger `triageve_log`, purge in keepalive. Migratie `20261017170000_history.sql`. Preview: verwijderen → prullenbak → terugzetten.
- [x] Fase 14 – Offline, back-up, toegankelijkheid (2026-10-16) – outbox + "wacht op verbinding", concepten chat/dagboek, `backup.yml` (wacht op `BACKUP_PASSPHRASE`), JSON-export, grote tekst 125%, aria-labels, focus. Preview: draft, offline-queue, grote tekst. Back-up-workflow groen vereist secret.
- [x] Fase 15 – Zorg voor de zorgers (2026-10-16) – Home “deze week bij Eef”, opentaken-teller per persoon, Hulp & steun. Nummers: 112; Mantelzorglijn 030-7606055 (mantelzorg.nl, 2026-10-16); 113 en 0800-0113 (113.nl, 2026-10-16). Huisartsenpost via Contacten.
- [x] Fase 16 – Eindtest, handleiding, oplevering (2026-10-16) – `docs/HANDLEIDING.md`, README bijgewerkt, `ZORG_CHECKLIST` nagelopen, CACHE v17. Lokale UI-rooktest (preview) zonder consolefouten. Live e2e + PWA-op-telefoon + `[TEST]`-opruim in Supabase wachten op fase 1 (geen secrets). GitHub Pages na push controleren.
- [ ] Fase 17 – E-mail naar bzijffers@gmail.com en stoppen

## Database-migraties (uitgevoerd door workflow `supabase.yml`)
- [ ] `20261016180000_init.sql` – goedgekeurd om te draaien; wacht op GitHub secrets (fase 1)
- [ ] `20261016190000_agenda.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017100000_eef.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017110000_medicatie.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017120000_taken.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017130000_dagboek.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017140000_wensen.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017150000_checkins.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017160000_push.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017170000_history.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017180000_grants.sql` – lees/schrijfrechten voor het ingelogde team; anon blijft buiten. Lokaal gedraaid, op Supabase nog niet.
- [ ] `20261017190000_zorgdag.sql` – inname per dagdeel, overdracht en aanwezigheid op het profiel. Wacht op GitHub secrets.
- [ ] `20261017200000_accounts.sql` – alleen Jacky, Paps en Bren. Wacht op GitHub secrets.
- [ ] `20261017210000_statusmoment.sql` – status aan een moment en kenmerken zoals slechte nacht. Wacht op hetzelfde pc-commando in `docs/PC.md`.

## Open vragen voor Bren
- GitHub secrets en de drie wachtwoorden: zie `docs/PC.md`. Zonder die secrets blijft inloggen dicht.
- Drie eigen wachtwoorden kiezen (minstens 8 tekens, liever een paar woorden).
- Fase 12: VAPID-sleutels genereren en `VAPID_PRIVATE_KEY` als GitHub secret zetten (publieke sleutel in `config.js`)
- Fase 14: `BACKUP_PASSPHRASE` kiezen, in wachtwoordmanager bewaren, en als GitHub secret zetten

## Beantwoord door Bren (2026-10-16)
- Geheimen en publishable key zijn nu niet beschikbaar; nooit in de repo zetten
- Signups blijven AAN (niet uitzetten; onbekend of het project alleen voor triagEve is)
- Hoorspel GitHub-koppeling: Bren koppelt later zelf los
- Geen echte gegevens over Eef in de repo of testdata

## Notities
- 2026-10-17: Status doorgeven blijft één tik. Dropdowns voor nacht, stemming, eten, pijn en helderheid, en een moment (nu of een afspraak van vandaag). Migratie `20261017210000_statusmoment.sql`.
- 2026-10-17: Aparte login voor Jacky, Paps en Bren. De naam bij een wijziging komt uit het account. Wat Bren nog op de pc draait staat in `docs/PC.md`. Migratie `20261017200000_accounts.sql`.
- 2026-10-17: Home toont wie er bij Eef is, een briefje voor de volgende, en de inname van vandaag. Op Medicatie vink je ochtend, middag, avond of nacht aan, met naam en tijd. Iedereen kan dat wijzigen. Migratie `20261017190000_zorgdag.sql`.
- 2026-10-17: Agenda heeft een dagweergave. Events zijn dezelfde gedeelde afspraken: iedereen ziet ze en kan ze wijzigen, met een waarschuwing op het scherm en in het formulier. Meer → Tijdlijn uitdraaien maakt een print/pdf van dagboek, agenda en status. Geen nieuwe tabel.
- 2026-10-16: Geen Supabase access token of DB-wachtwoord gevonden in andere projectmappen.
  Service-role keys daar horen bij andere projecten (`ajoitfflpmjemrrmbsew`, `vdkwomhhqvdpnkfvhvkz`).
- 2026-10-16: De publishable key uit de opdracht staat in `config.js`. Dat is geen geheim.
  Workflow-run 38944109052 sloeg de migraties over omdat de vijf secrets leeg waren.
  Auth-instellingen zijn niet gewijzigd. CSP wijst nu alleen naar dit Supabase-project.
