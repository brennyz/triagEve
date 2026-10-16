# triagEve – Voortgang

Bijwerken na elke fase: `- [x] Fase N – naam (JJJJ-MM-DD) – korte notitie`.
Zie `docs/GROK_PLAN.md` voor wat elke fase inhoudt.

- [x] Fase 0 – Basis: PWA, login, chat, dagboek, overleg, migraties, workflows, GitHub Pages live (2026-10-16) – nog niet getest tegen echte Supabase
- [ ] Fase 1 – Supabase automatisch koppelen en end-to-end werkend (2026-10-16) – code en config.js klaar; workflow draait nog niet want GitHub-secrets zijn leeg. Zie SETUP.md.
- [ ] Fase 2 – Beveiliging en privacy
- [ ] Fase 3 – Navigatie + Home-overzicht
- [ ] Fase 4 – Agenda: afspraken + overleggen (+ .ics)
- [ ] Fase 5 – Over Eef + Noodkaart + Contacten
- [ ] Fase 6 – Medicatie
- [ ] Fase 7 – Taken
- [ ] Fase 8 – Dagboek verbeteren
- [ ] Fase 9 – Overzicht voor arts (print/PDF)
- [ ] Fase 10 – Regie en wensen van Eef
- [ ] Fase 11 – Dagstatus en metingen
- [ ] Fase 12 – Meldingen (push)
- [ ] Fase 13 – Geschiedenis, prullenbak, wie-deed-wat
- [ ] Fase 14 – Offline, back-up, toegankelijkheid
- [ ] Fase 15 – Zorg voor de zorgers
- [ ] Fase 16 – Eindtest, handleiding, oplevering
- [ ] Fase 17 – E-mail naar bzijffers@gmail.com en stoppen

## Database-migraties (uitgevoerd door workflow `supabase.yml`)
- [ ] `20261016180000_init.sql` en de migraties van 2026-10-17 – lokaal twee keer groen op PostgreSQL 16; op Supabase nog niet, wacht op GitHub-secrets

## Open vragen voor Bren
- De vijf GitHub-secrets uit SETUP.md. De publishable key staat al in `config.js`.
- Is het Supabase-project alleen voor triagEve? (dan signups uit en site_url zetten – niet gedaan)
- Supabase GitHub-koppeling naar `Hoorspel` loskoppelen (niet gedaan)
- Wachtwoord: huidige houden of een zin van 4+ woorden? Aanrader: iets als `Eef-Thee-Tuin-2026`. Jouw keuze.
- Later: `VAPID_PRIVATE_KEY` en `BACKUP_PASSPHRASE` (niet nodig om te starten)

## Notities
- 2026-10-16: Geen Supabase access token of DB-wachtwoord gevonden in andere projectmappen.
  Service-role keys daar horen bij andere projecten (`ajoitfflpmjemrrmbsew`, `vdkwomhhqvdpnkfvhvkz`).
- 2026-10-16: Workflow-run 38944109052 sloeg migraties over: secrets leeg. Fase 2 t/m 16
  staan in de code (schermen, migraties, push-functie, back-up-workflow) maar zijn niet
  afgevinkt: inloggen en synchronisatie zijn niet tegen de echte database getest.
- 2026-10-16: Fase 17 (e-mail "klaar") niet verstuurd. De app is nog niet end-to-end live.
- 2026-10-16: Hulpnummers gecontroleerd. 113 en 0800-0113, gratis, dag en nacht (113.nl).
  Mantelzorglijn 030 760 60 55, ma–do 10–16, vr 10–13 (mantelzorg.nl/onderwerpen/ondersteuning/waar-kun-je-terecht/mantelzorglijn).
- Auth-instellingen en de Hoorspel-koppeling zijn niet gewijzigd.
