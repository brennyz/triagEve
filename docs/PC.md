# Nog op de pc

Dit is de lijst voor Bren. Afvinken zodra het gedaan is. Wachtwoorden komen niet in git.

Bijgewerkt: 2026-10-17.

## Nu

- [x] GitHub CLI staat erop en `gh auth login` is gedaan.
- [x] `scripts/setup.ps1` heeft de secrets gezet.
- [x] Database-workflow groen (run 39024235511): alle migraties gedraaid, accounts van Jacky, Paps en Bren aangemaakt, beveiligingstest geslaagd.
- [ ] Open https://brennyz.github.io/triagEve/ en ververs één keer.
- [ ] Log in als Jacky, als Paps en als Bren, elk met het eigen wachtwoord uit `.env.local`.

Regio van de database: eu-west-1 (Ierland). De workflow gebruikt de session pooler `aws-0-eu-west-1.pooler.supabase.com` op poort 5432, omdat GitHub geen IPv6 heeft. Daarvoor is geen access token nodig.

Geen gebruikers aanmaken in het Supabase-dashboard. De accounts heten `jacky@triageve.app`, `paps@triageve.app` en `bren@triageve.app`. Er is geen mailbox op die adressen, dus geen resetmail. Bestaat een account al, dan verandert de workflow het wachtwoord niet. Wijzigen doe je in Supabase → Authentication → Users → die persoon.

## Opnieuw draaien (alleen als het nodig is)

```powershell
git pull origin main
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
```

Het script vraagt alleen wat nog niet in `.env.local` staat. Typen is onzichtbaar.

| Naam | Waarde |
|---|---|
| `SUPABASE_DB_PASSWORD` | het database-wachtwoord van dit project |
| `SUPABASE_PROJECT_REF` | Enter bewaart `slddtxwbufoadmvdconz` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → secret key |
| `TRIAGEVE_JACKY_PASSWORD` | eigen wachtwoord voor Jacky, minstens 8 tekens |
| `TRIAGEVE_PAPS_PASSWORD` | eigen wachtwoord voor Paps |
| `TRIAGEVE_BREN_PASSWORD` | eigen wachtwoord voor Bren |
| `SUPABASE_ACCESS_TOKEN` | alleen voor meldingen (edge function). Het huidige token is ongeldig. Niet nodig om in te loggen. |

## In de app, geen pc-commando

- [ ] Over Eef, contacten en medicatie invullen. Geen echte proefgegevens in git.

## Later, niet nodig om in te loggen

- [ ] Meldingen: nieuw access token (begint met `sbp_`, project triagEve, Edge Functions en Edge Function Secrets lezen en schrijven) in `.env.local`. Dan `npx web-push generate-vapid-keys`. Publieke sleutel in `config.js` als `VAPID_PUBLIC_KEY`. Privé-sleutel als `VAPID_PRIVATE_KEY` in `.env.local`, en het setup-script nog eens. Op een iPhone alleen als de site op het beginscherm staat, iOS 16.4 of nieuwer.
- [ ] Weekbackup: kies `BACKUP_PASSPHRASE`, zet die als secret en bewaar hem in je wachtwoordmanager. Tot die tijd: in de app Meer → Alles downloaden.

## Al gedaan

- De site staat op GitHub Pages.
- De app heeft drie aparte logins. Het toestel onthoudt wie er inlogt, daarna alleen het eigen wachtwoord.
- Alle migraties tot en met `20261017240000_plek.sql` staan op Supabase.
- `20261017250000_log.sql` herstelt opslaan van de plek. Die draait mee bij de push. Geen extra stap.
