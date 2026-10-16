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
- Na 14 dagen zonder gebruik logt de app automatisch uit.
- Zoekmachines: `noindex, nofollow` en `robots.txt` (`Disallow: /`).
- Content-Security-Policy staat alleen deze site en het Supabase-domein toe.

## Privacy

triagEve bewaart informatie over welzijn en zorg. Dat zijn bijzondere persoonsgegevens (AVG).

- **Wat waar staat:** de app-code is openbaar op GitHub. Chat, dagboek, agenda en andere
  gegevens staan in de Supabase-database, niet in deze repo.
- **Wie erbij kan:** alleen Jacky, Paps en Bren, met het gedeelde team-wachtwoord. De
  database laat via Row Level Security alleen het account `team@triageve.app` toe.
- **Niet in de app:** BSN, DigiD, pincodes, bankgegevens of scans van documenten.
- **Regio van de database:** nog niet vastgelegd (wacht op de Supabase-koppeling in fase 1).
  Een regio in de EU heeft de voorkeur. Bren noteert de regio hier zodra het project
  gekoppeld is.

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

## Back-up en terugzetten

Elke zondag maakt GitHub Actions een **versleutelde** dump van de `triageve_*` tabellen
(`.github/workflows/backup.yml`). Het bestand `triageve-backup.sql.gpg` staat 90 dagen
als workflow-artifact. Zonder `BACKUP_PASSPHRASE` (GitHub secret) slaat de job over.

Terugzetten (op de pc van Bren, passphrase uit de wachtwoordmanager):

```
gpg --decrypt --batch --passphrase "DEZE-ZIN" triageve-backup.sql.gpg > triageve-data.sql
# Daarna in het Supabase SQL-editor plakken, of:
psql "postgresql://postgres:<DB-WACHTWOORD>@db.<PROJECT-REF>.supabase.co:5432/postgres" -f triageve-data.sql
```

Nooit een onversleutelde dump in deze repo of in een openbare artifact zetten.

In de app: Meer → **Alles downloaden** geeft een JSON-archief voor jezelf.

## Lokaal draaien

```
npx serve .
```
