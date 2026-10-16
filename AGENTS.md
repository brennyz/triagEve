# Instructies voor AI-agents

Dit project is **triagEve**: een familie-app (PWA) voor Jacky, Paps en Bren om samen te overleggen
en bij te houden wat er gebeurt rond Eveline (Eef).

Lees voor je iets doet:
1. `docs/GROK_PLAN.md` – het volledige bouwplan, regels, fases en de e-mail aan het eind.
2. `docs/PROGRESS.md` – welke fases af zijn. Werk altijd aan de eerste open fase.
3. `docs/ZORG_CHECKLIST.md` – waar een zorg-app aan moet voldoen.

Belangrijkste regels:
- De repo is **openbaar**. Nooit wachtwoorden, keys of tokens committen (alleen in `.env.local`).
- Geen echte gegevens over Eef in de repo of testdata.
- Database alleen via nieuwe bestanden in `supabase/migrations/`; de GitHub Action voert ze uit.
  Elke nieuwe tabel `triageve_*` eindigt met `select public.triageve_secure('triageve_...');`.
- Vanilla HTML/CSS/JS, geen build-stap. UI in het Nederlands.
- Gebruikerscommando's: `GA DOOR`, `STATUS`, `STOP EEF` (zie plan §0).
