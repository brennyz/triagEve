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

## Eenmalige setup in Supabase

1. **SQL Editor → New query**: plak `supabase/setup.sql` en klik **Run**.
2. **Authentication → Users → Add user → Create new user**
   - E-mail: `team@triageve.app` · Wachtwoord: het team-wachtwoord · vink **Auto Confirm User** aan.
3. **Project Settings → API**: zet de Project URL en de publishable (anon) key in `config.js`.

## Lokaal draaien

```
npx serve .
```
