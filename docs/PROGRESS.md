# triagEve – Voortgang

Bijwerken na elke fase: `- [x] Fase N – naam (JJJJ-MM-DD) – korte notitie`.
Zie `docs/GROK_PLAN.md` voor wat elke fase inhoudt.

- [x] Fase 0 – Basis: PWA, login, chat, dagboek, overleg, migraties, workflows, GitHub Pages live (2026-10-16) – nog niet getest tegen echte Supabase
- [ ] Fase 1 – Supabase automatisch koppelen en end-to-end werkend
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
- [ ] `20261016180000_init.sql` – wacht op GitHub secrets (fase 1)

## Open vragen voor Bren
- `.env.local` invullen (5 waarden, zie `.env.example`) + publishable key noemen
- Is het Supabase-project alleen voor triagEve? (dan signups uit)
- Supabase GitHub-koppeling naar `Hoorspel` loskoppelen
- Wachtwoord: huidige houden of sterker? (fase 2)

## Notities
- 2026-10-16: Geen Supabase access token of DB-wachtwoord gevonden in andere projectmappen.
  Service-role keys daar horen bij andere projecten (`ajoitfflpmjemrrmbsew`, `vdkwomhhqvdpnkfvhvkz`).
