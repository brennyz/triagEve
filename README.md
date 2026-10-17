# triagEve

Contact-app voor Jacky, Paps en Bren: chat, dagboek en overleg-agenda, alles met tijdstempels
en live gesynchroniseerd. Te openen in Chrome en te installeren als app (PWA).

**Website:** https://brennyz.github.io/triagEve/

## Onderdelen

- **Home** – overzicht, status van Eef, wie er is, overdracht, inname vandaag, bezoek, noodkaart
- **Chat** – live berichten met tijd en datum
- **Dagboek** – wat is er gebeurd, met categorie en “belangrijk”
- **Agenda** – overleg, doktersafspraak, bezoek; meerdere mensen; verslag; `.ics` naar je eigen agenda
- **Meer** – Over Eef, medicatie met inname vandaag, taken, contacten, pdf voor de dienstverlener, wensen van Eef, metingen, meldingen, prullenbak, export, grote tekst, hulp & steun

Handleiding voor Jacky en Paps: [`docs/HANDLEIDING.md`](docs/HANDLEIDING.md).

## Beveiliging

- De code in deze repo is openbaar; de **gegevens staan niet in de repo** maar in Supabase.
- Inloggen gaat via drie accounts (`ACCOUNTS` in `config.js`): Jacky, Paps en Bren, elk met
  een eigen wachtwoord. De wachtwoorden staan nergens in de code.
- Row Level Security zorgt dat alleen die drie accounts de `triageve_*` tabellen kunnen lezen
  of schrijven. De publieke sleutel in `config.js` geeft zonder wachtwoord geen toegang.
- Na 14 dagen zonder gebruik logt de app automatisch uit.
- Zoekmachines: `noindex, nofollow` en `robots.txt` (`Disallow: /`).
- Content-Security-Policy staat alleen deze site en het Supabase-domein toe.

## Privacy

triagEve bewaart informatie over welzijn en zorg. Dat zijn bijzondere persoonsgegevens (AVG).

- **Wat waar staat:** de app-code is openbaar op GitHub. Chat, dagboek, agenda en andere
  gegevens staan in de Supabase-database, niet in deze repo.
- **Wie erbij kan:** alleen Jacky, Paps en Bren, elk met een eigen wachtwoord. De
  database laat via Row Level Security alleen `jacky@triageve.app`, `paps@triageve.app`
  en `bren@triageve.app` toe. De naam bij een wijziging komt uit het account.
- **Niet in de app:** BSN, DigiD, pincodes, bankgegevens of scans van documenten.
- **Regio van de database:** nog niet vastgelegd (wacht op de Supabase-koppeling in fase 1).
  Een regio in de EU heeft de voorkeur. Bren noteert de regio hier zodra het project
  gekoppeld is.

## Database (automatisch)

Database-wijzigingen staan in `supabase/migrations/`. De GitHub Action `supabase.yml` voert ze bij
elke push uit, maakt het team-account aan en test dat niemand zonder inlog bij de gegevens kan.
`keepalive.yml` voorkomt dat het gratis Supabase-project pauzeert.

Eenmalig, op de Windows-pc (zie `SETUP.md`):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
```

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
