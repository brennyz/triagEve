# triagEve – Voortgang

Bijwerken na elke fase: `- [x] Fase N – naam (JJJJ-MM-DD) – korte notitie`.
Zie `docs/GROK_PLAN.md` voor wat elke fase inhoudt.

- [x] Fase 0 – Basis: PWA, login, chat, dagboek, overleg, migraties, workflows, GitHub Pages live (2026-10-16) – nog niet getest tegen echte Supabase
- [ ] Fase 1 – Supabase automatisch koppelen en end-to-end werkend (open, 2026-10-16) – wacht op GitHub secrets en publishable key; migratie `20261016180000_init.sql` mag draaien zodra secrets er zijn; signups blijven AAN (onbekend of het project alleen voor triagEve is); Hoorspel-koppeling koppelt Bren later zelf los. Geen geheimen in de repo.
- [x] Fase 2 – Beveiliging en privacy (2026-10-16) – auto-uitloggen na 14 dagen, robots/noindex, CSP (`*.supabase.co` tot project-ref bekend is), Privacy-sectie in README. Regio DB onbekend (wacht op fase 1). Wachtwoordkeuze nog open. E2e-inlog wacht op secrets; `node --check` + login-scherm + robots.txt gecontroleerd. `git log` bevat geen echte service-keys (wel het woord `service_role` in docs/vendor).
- [x] Fase 3 – Navigatie + Home-overzicht (2026-10-16) – nav Home/Chat/Dagboek/Agenda/Meer, Home met lege-teksten, Noodkaart-knop (112). Code gesplitst naar `js/*.js`. Getest zonder Supabase via `?preview=1` in Chrome 390×844 en desktop; geen JS-fouten. Live e2e wacht op fase 1.
- [x] Fase 4 – Agenda: afspraken + overleggen (+ .ics) (2026-10-16) – soort/locatie, label per soort, `.ics` download. Bestaande items = overleg. Migratie `20261016190000_agenda.sql` (wacht op secrets). Getest in preview: labels, locatie, ICS-inhoud, formulierlabel bij afspraak.
- [x] Fase 5 – Over Eef + Noodkaart + Contacten (2026-10-16) – profielvelden, contacten met tel:, noodkaart (112, huisarts, noodcontacten, teksten). Migratie `20261017100000_eef.sql`. Getest in preview 390×844. RLS-test wacht op secrets.
- [x] Fase 6 – Medicatie (2026-10-16) – huidige/gestopt, stoppen, dagboekregel bij wijziging, disclaimer. Migratie `20261017110000_medicatie.sql`. Live-sync wacht op secrets; UI in preview getest.
- [x] Fase 7 – Taken (2026-10-16) – afvinken, filters, te laat rood, taken uit actiepunten, Home toont open taken. Migratie `20261017120000_taken.sql`. Preview: toggle + parse + Home. Live-sync wacht op secrets.
- [x] Fase 8 – Dagboek verbeteren (2026-10-16) – categorieën, belangrijk, filters, tijdstempel + bewerkt op, belangrijk bovenaan Home. Oude stukjes = algemeen. Migratie `20261017130000_dagboek.sql`.
- [x] Fase 9 – Overzicht voor arts (print/PDF) (2026-10-16) – printpagina met Over Eef, medicatie, belangrijk dagboek (30 d), afspraken, noodcontacten; print-CSS verbergt nav. `window.print()` knop. Chrome print-voorbeeld niet live gedraaid zonder printer-UI; CSS gecontroleerd.
- [x] Fase 10 – Regie en wensen van Eef (2026-10-16) – scherm Wensen van Eef, Home-tekstblok inklapbaar, geen BSN/codes. Migratie `20261017140000_wensen.sql`.
- [ ] Fase 11 – Dagstatus en metingen
- [ ] Fase 12 – Meldingen (push)
- [ ] Fase 13 – Geschiedenis, prullenbak, wie-deed-wat
- [ ] Fase 14 – Offline, back-up, toegankelijkheid
- [ ] Fase 15 – Zorg voor de zorgers
- [ ] Fase 16 – Eindtest, handleiding, oplevering
- [ ] Fase 17 – E-mail naar bzijffers@gmail.com en stoppen

## Database-migraties (uitgevoerd door workflow `supabase.yml`)
- [ ] `20261016180000_init.sql` – goedgekeurd om te draaien; wacht op GitHub secrets (fase 1)
- [ ] `20261016190000_agenda.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017100000_eef.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017110000_medicatie.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017120000_taken.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017130000_dagboek.sql` – klaar in repo; wacht op GitHub secrets
- [ ] `20261017140000_wensen.sql` – klaar in repo; wacht op GitHub secrets

## Open vragen voor Bren
- GitHub secrets (5 waarden uit `.env.example`) + publishable key noemen – zonder dit blijven fase 1 en inloggen open
- Wachtwoord: huidige houden of sterker? (fase 2; aanrader: 4+ woorden, bijv. `Eef-Thee-Tuin-2026`)

## Beantwoord door Bren (2026-10-16)
- Geheimen en publishable key zijn nu niet beschikbaar; nooit in de repo zetten
- Signups blijven AAN (niet uitzetten; onbekend of het project alleen voor triagEve is)
- Hoorspel GitHub-koppeling: Bren koppelt later zelf los
- Geen echte gegevens over Eef in de repo of testdata

## Notities
- 2026-10-16: Geen Supabase access token of DB-wachtwoord gevonden in andere projectmappen.
  Service-role keys daar horen bij andere projecten (`ajoitfflpmjemrrmbsew`, `vdkwomhhqvdpnkfvhvkz`).
