# triagEve klaarzetten

De site https://brennyz.github.io/triagEve/ staat online. `config.js` wijst naar
project `slddtxwbufoadmvdconz`. De tabellen en het account `team@triageve.app`
bestaan pas nadat de GitHub Action de migraties heeft gedraaid.

Gecontroleerd op 16 oktober 2026:

- In deze omgeving staan geen `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN` of
  `TRIAGEVE_TEAM_PASSWORD`.
- Workflow-run 38944109052 (18:01 UTC) sloeg de migraties over: de vijf secrets
  waren leeg, ook `SUPABASE_DB_PASSWORD`.
- Deze agent kan de secret-lijst niet uitlezen (GitHub API 403). Een wachtwoord
  dat alleen in het Supabase-dashboard staat, ziet de workflow niet.
- Sleutels van andere projecten zijn niet gebruikt.

## Wat jij nog doet

1. Maak `TriageEve/.env.local` (kopie van `.env.example`). Dat bestand blijft buiten git.
2. Vul in:

   | Naam | Waarde |
   |---|---|
   | `SUPABASE_PROJECT_REF` | `slddtxwbufoadmvdconz` |
   | `SUPABASE_DB_PASSWORD` | het database-wachtwoord van dit project |
   | `SUPABASE_ACCESS_TOKEN` | supabase.com → avatar → Account → Access Tokens |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → secret key |
   | `TRIAGEVE_TEAM_PASSWORD` | het wachtwoord voor Jacky, Paps en Bren |

3. Zet ze als GitHub-secrets en start de workflow:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/set-github-secrets.ps1
   gh workflow run supabase.yml -R brennyz/triagEve
   gh run watch -R brennyz/triagEve
   ```

4. Open de site, kies je naam, typ het wachtwoord. Ververs één keer als je een oude pagina ziet.

De publishable key staat in `config.js`. Die mag openbaar zijn.

## Later

- **Meldingen:** `npx web-push generate-vapid-keys`. Publieke sleutel in `config.js`
  (`VAPID_PUBLIC_KEY`), privé-sleutel als GitHub secret `VAPID_PRIVATE_KEY`.
- **Back-up:** kies zelf `BACKUP_PASSPHRASE`, zet die als secret en bewaar hem
  in je wachtwoordmanager. Terugzetten staat in de README.
- **Wachtwoord:** een zin van vier woorden is fijner dan een kort woord, bijvoorbeeld
  `Eef-Thee-Tuin-2026`. Dat is jouw keuze. Wijzigen kan later bij
  Authentication → Users → `team@triageve.app`.

## Niet gewijzigd

Signups staan aan. `site_url` en de GitHub-koppeling naar Hoorspel zijn niet
aangepast. Als dit project alleen voor triagEve is, kun je signups later uitzetten
en `site_url` op `https://brennyz.github.io/triagEve/` zetten.
