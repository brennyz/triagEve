# triagEve

Contact-app voor Jacky, Paps en Bren: chat, dagboek en overleg-agenda, alles met tijdstempels
en live gesynchroniseerd. Te openen in Chrome en te installeren als app (PWA).

**Website:** https://brennyz.github.io/triagEve/

## Onderdelen

- **Chat** – live berichten met tijd en datum
- **Dagboek** – "wat is er gebeurd", per persoon te filteren en doorzoekbaar
- **Overleg** – overleggen plannen, achteraf invullen wat er besproken is + actiepunten

## Beveiliging

- De code in deze repo is openbaar; de **gegevens staan niet in de repo** maar in Supabase.
- Inloggen gaat via één Supabase team-account (`TEAM_EMAIL` in `config.js`). Het wachtwoord
  staat nergens in de code; Supabase controleert het.
- Row Level Security zorgt dat alleen dat team-account de `triageve_*` tabellen kan lezen of
  schrijven. De publieke sleutel in `config.js` geeft zonder wachtwoord geen toegang.

## Database (automatisch)

Database-wijzigingen staan in `supabase/migrations/`. De GitHub Action `supabase.yml` voert ze bij
elke push uit, maakt het team-account aan en test dat niemand zonder inlog bij de gegevens kan.
`keepalive.yml` voorkomt dat het gratis Supabase-project pauzeert.

Eenmalig:
1. Kopieer `.env.example` naar `.env.local` en vul de 5 waarden in (wordt nooit gecommit).
2. `powershell -ExecutionPolicy Bypass -File scripts/set-github-secrets.ps1`
3. Zet de Project URL en publishable key in `config.js` en push.

## Voor AI-agents

Zie `AGENTS.md` en `docs/GROK_PLAN.md`.

## Lokaal draaien

```
npx serve .
```
