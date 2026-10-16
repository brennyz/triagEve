# triagEve – Voortgang

Bijwerken na elke fase: `- [x] Fase N – naam (JJJJ-MM-DD) – korte notitie`.
Zie `docs/GROK_PLAN.md` voor wat elke fase inhoudt.

- [x] Fase 0 – Basis: PWA, login, chat, dagboek, overleg, migraties, workflows, GitHub Pages live (2026-10-16) – nog niet getest tegen echte Supabase
- [ ] Fase 1 – Supabase automatisch koppelen en end-to-end werkend (open, 2026-10-16) – wacht op GitHub secrets en publishable key; migratie `20261016180000_init.sql` mag draaien zodra secrets er zijn; signups blijven AAN (onbekend of het project alleen voor triagEve is); Hoorspel-koppeling koppelt Bren later zelf los. Geen geheimen in de repo.
- [x] Fase 2 – Beveiliging en privacy (2026-10-16) – auto-uitloggen na 14 dagen, robots/noindex, CSP (`*.supabase.co` tot project-ref bekend is), Privacy-sectie in README. Regio DB onbekend (wacht op fase 1). Wachtwoordkeuze nog open. E2e-inlog wacht op secrets; `node --check` + login-scherm + robots.txt gecontroleerd. `git log` bevat geen echte service-keys (wel het woord `service_role` in docs/vendor).
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
- [ ] `20261016180000_init.sql` – goedgekeurd om te draaien; wacht op GitHub secrets (fase 1)

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
