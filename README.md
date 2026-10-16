# triagEve

Contact-app voor Jacky, Paps en Bren: chat, dagboek en overleg-agenda, alles met tijdstempels
en live gesynchroniseerd. Te openen in Chrome en te installeren als app (PWA).

**Website:** https://brennyz.github.io/triagEve/

## Onderdelen

- **Home** – status, eerstvolgende afspraken, open taken, dagboek, noodkaart
- **Chat** – live berichten met tijd en datum
- **Dagboek** – wat er gebeurd is, met categorie en "belangrijk"
- **Agenda** – overleg, afspraak, bezoek; verslag achteraf; bestand voor je eigen agenda
- **Meer** – Over Eef, wensen, medicatie, taken, contacten, metingen, hulp, prullenbak, printen

Inloggen: kies je naam en typ het gedeelde wachtwoord. Handleiding: `docs/HANDLEIDING.md`.
De database is pas klaar nadat de stappen in `SETUP.md` gedaan zijn.

## Beveiliging

- De code in deze repo is openbaar; de **gegevens staan niet in de repo** maar in Supabase.
- Inloggen gaat via één Supabase team-account (`TEAM_EMAIL` in `config.js`). Het wachtwoord
  staat nergens in de code; Supabase controleert het.
- Row Level Security zorgt dat alleen dat team-account de `triageve_*` tabellen kan lezen of
  schrijven. De publieke sleutel in `config.js` geeft zonder wachtwoord geen toegang.

## Privacy

De gegevens gaan over Eef en zijn gezondheidsinformatie. Ze staan in Supabase, niet in git.
Alleen wie het team-wachtwoord heeft (Jacky, Paps, Bren) kan ze zien. De pagina vraagt
zoekmachines om haar niet te indexeren. Na 14 dagen zonder gebruik logt de app uit op dat
toestel. Verwijderen zet een item 30 dagen in de prullenbak.

De regio van het project was zonder access token niet op te vragen. EU heeft de voorkeur;
controleer dat in het Supabase-dashboard (Project Settings → General).

## Back-up terugzetten

De wekelijkse workflow maakt een versleuteld artifact `triageve.sql.gpg` (90 dagen).
Op je pc, met de zin die je als `BACKUP_PASSPHRASE` bewaart:

```
gpg --decrypt --output triageve.sql triageve.sql.gpg
```

Dat bestand bevat alleen data van de `triageve_`-tabellen. Zet het terug in een project
waar de migraties al gedraaid zijn, via de SQL-editor of `psql`. Bewaar het wachtwoord
van de back-up zelf; het staat niet in de repo.

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
