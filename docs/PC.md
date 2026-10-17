# Nog op de pc

Dit is de lijst voor Bren. Afvinken zodra het gedaan is. Wachtwoorden komen niet in git.

Bijgewerkt: 2026-10-17.

## Nu, één keer

- [ ] GitHub CLI staat erop en `gh auth login` is gedaan.
- [ ] In de map van triagEve:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
```

Het script vraagt alleen wat nog niet in `.env.local` staat. Typen is onzichtbaar.

| Naam | Waarde |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → avatar → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | het database-wachtwoord van dit project |
| `SUPABASE_PROJECT_REF` | Enter bewaart `slddtxwbufoadmvdconz` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → secret key |
| `TRIAGEVE_JACKY_PASSWORD` | eigen wachtwoord voor Jacky, minstens 8 tekens |
| `TRIAGEVE_PAPS_PASSWORD` | eigen wachtwoord voor Paps |
| `TRIAGEVE_BREN_PASSWORD` | eigen wachtwoord voor Bren |

Het script zet de GitHub-secrets en wacht tot de database-workflow klaar is. Die workflow draait de migraties en maakt de drie accounts aan (`jacky@triageve.app`, `paps@triageve.app`, `bren@triageve.app`). Er is geen mailbox op die adressen, dus geen resetmail.

Bestaat een account al, dan blijft het oude wachtwoord staan. Wijzigen doe je in Supabase → Authentication → Users → die persoon.

- [ ] Open https://brennyz.github.io/triagEve/ en ververs één keer.
- [ ] Log in als Jacky, als Paps en als Bren, elk met het eigen wachtwoord.
- [ ] Noteer hier de regio van de database (liefst EU):

Regio: …

## In de app, geen pc-commando

- [ ] Over Eef, contacten en medicatie invullen. Geen echte proefgegevens in git.

## Later, niet nodig om in te loggen

- [ ] Meldingen: `npx web-push generate-vapid-keys`. Publieke sleutel in `config.js` als `VAPID_PUBLIC_KEY`. Privé-sleutel als GitHub-secret `VAPID_PRIVATE_KEY` (of in `.env.local` en het setup-script nog eens). Op een iPhone alleen als de site op het beginscherm staat, iOS 16.4 of nieuwer.
- [ ] Weekbackup: kies `BACKUP_PASSPHRASE`, zet die als secret en bewaar hem in je wachtwoordmanager. Tot die tijd: in de app Meer → Alles downloaden.

## Al gedaan

- De site staat op GitHub Pages.
- De app heeft drie aparte logins. De naam bij een wijziging komt uit het account, niet uit een vrije keuze.
- Migratie `20261017200000_accounts.sql` staat in de repo en draait mee met het script hierboven.
- Status-dropdowns (slechte nacht, waar, en waarmee bezig) zitten in de app. Migraties `20261017210000_statusmoment.sql` en `20261017220000_statusplek.sql` draaien mee met hetzelfde commando. Geen extra stap.
- Contacten (praktijk, adres, bereikbaarheid, hoofd en secundair) zitten in de app. Migratie `20261017230000_contacten.sql` draait mee met hetzelfde commando. Geen extra stap. Daarna in de app: telefoon van Paps, Jacky en Bren, en de zorgverleners.
