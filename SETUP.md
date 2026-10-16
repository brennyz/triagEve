# triagEve klaarzetten

De app staat live op https://brennyz.github.io/triagEve/ en `config.js` wijst al naar
project `slddtxwbufoadmvdconz`. De tabellen en het team-account bestaan nog niet in
Supabase: de GitHub Action slaat migraties over zolang de secrets leeg zijn.

Gecontroleerd op 16 oktober 2026:

- In deze omgeving staan geen `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN` of
  `TRIAGEVE_TEAM_PASSWORD`.
- De laatste workflow-run (`Supabase database`, 18:01 UTC) meldde dat álle vijf
  secrets leeg waren, ook `SUPABASE_DB_PASSWORD`.
- GitHub-secrets zijn vanuit deze agent niet te lezen (API 403). Als je het
  database-wachtwoord alleen in het Supabase-dashboard hebt gezet, ziet de
  workflow dat niet.
- Sleutels in andere projecten (`ajoitfflpmjemrrmbsew`) horen daar en zijn niet gebruikt.

## Wat jij nog doet

1. Maak op je pc `TriageEve/.env.local` (kopie van `.env.example`). Dat bestand
   blijft buiten git.
2. Vul deze vijf waarden in:

   | Naam | Waarde |
   |---|---|
   | `SUPABASE_PROJECT_REF` | `slddtxwbufoadmvdconz` |
   | `SUPABASE_DB_PASSWORD` | het database-wachtwoord van dit project |
   | `SUPABASE_ACCESS_TOKEN` | supabase.com → avatar → Account → Access Tokens |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → secret key |
   | `TRIAGEVE_TEAM_PASSWORD` | het wachtwoord voor Jacky, Paps en Bren |

3. Zet ze als GitHub-secrets:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/set-github-secrets.ps1
   ```

4. Start de database:

   ```powershell
   gh workflow run supabase.yml -R brennyz/triagEve
   gh run watch -R brennyz/triagEve
   ```

   De workflow maakt de tabellen, het account `team@triageve.app` (bevestigd, dus
   zonder mail) en test dat iemand zonder inlog niets ziet.

5. Open https://brennyz.github.io/triagEve/, kies je naam, typ het wachtwoord.
   Ververs één keer als je een oude pagina ziet.

De publishable key staat al in `config.js`. Die mag openbaar zijn.

## Later, niet nodig om te starten

- **Meldingen:** `npx web-push generate-vapid-keys`. Publieke sleutel in
  `config.js` als `VAPID_PUBLIC_KEY`, privé-sleutel in `.env.local` als
  `VAPID_PRIVATE_KEY`, daarna het script hierboven nog een keer.
- **Back-up:** kies zelf een lange `BACKUP_PASSPHRASE`, zet die als secret en
  bewaar hem in je wachtwoordmanager. Terugzetten staat in de README.
- **Sterker wachtwoord** (aanrader, jouw keuze): vier woorden, bijvoorbeeld
  `Eef-Thee-Tuin-2026`. Wijzigen: Supabase → Authentication → Users →
  `team@triageve.app`.

## Aanbevelingen, niet uitgevoerd

Auth-instellingen en koppelingen zijn niet gewijzigd.

- Zet signups uit en `site_url` op `https://brennyz.github.io/triagEve/` als dit
  project alleen voor triagEve is.
- De GitHub-koppeling naar `Hoorspel` mag je loskoppelen (Project Settings →
  Integrations). Eén migratieweg is genoeg: de workflow in deze repo.
