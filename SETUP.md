# triagEve klaarzetten

Eén commando op de Windows-pc van Bren. Het vraagt wat nog leeg is (wachtwoorden
onzichtbaar), schrijft `.env.local`, zet de GitHub-secrets en wacht tot de
database-workflow klaar is.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
```

Vooraf: [GitHub CLI](https://cli.github.com/) geïnstalleerd en `gh auth login` gedaan.
Het script vraagt alleen om wat nog niet in `.env.local` staat:

| Naam | Waarde |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → avatar → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | het database-wachtwoord van dit project |
| `SUPABASE_PROJECT_REF` | Enter bewaart `slddtxwbufoadmvdconz` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → secret key |
| `TRIAGEVE_TEAM_PASSWORD` | de zin waarmee Jacky, Paps en Bren inloggen |

Kies zelf een zin, bijvoorbeeld vier woorden. Diezelfde zin is het wachtwoord
van `team@triageve.app`. De workflow maakt dat account aan als het nog niet
bestaat. Bestaat het al, dan blijft het oude wachtwoord staan: verwijder de
gebruiker in Authentication → Users, of zet daar hetzelfde wachtwoord, en draai
het script opnieuw. Er is geen mailbox op dat adres, dus geen resetmail.

Daarna: open https://brennyz.github.io/triagEve/, kies je naam, typ de zin.
Ververs één keer als je een oude pagina ziet.

`.env.local` blijft buiten git. De publishable key in `config.js` mag openbaar zijn.
`scripts/set-github-secrets.ps1` doet alleen de secret-stap, als `.env.local` al af is.

## Later, niet nodig om in te loggen

- **Meldingen:** `npx web-push generate-vapid-keys`. Publieke sleutel in `config.js`
  (`VAPID_PUBLIC_KEY`), privé-sleutel als GitHub-secret `VAPID_PRIVATE_KEY`.
  Op een iPhone alleen als de site op het beginscherm staat (iOS 16.4 of nieuwer).
- **Versleutelde weekbackup:** kies `BACKUP_PASSPHRASE`, zet die als secret en
  bewaar hem in je wachtwoordmanager. Tot die tijd: in de app Meer → Alles downloaden.

## Bekende beperkingen

- **Eén gedeelde login.** "Wie ben je?" wordt bewaard bij chat, dagboek, agenda,
  metingen, inname, overdracht, aanwezigheid en in de geschiedenis. Iedereen kan
  elke naam kiezen. Dat is geen apart account en geen bewijs wie er geklikt heeft.
- **Noodkaart.** Op het inlogscherm staat alleen 112. Huisarts en bijzonderheden
  staan pas na inloggen, zodat ze niet in de openbare site staan.
- **Geen geheimen of medische gegevens in git.** De anon-sleutel in `config.js`
  is publiek en geeft zonder wachtwoord geen rijen. Elke `triageve_*`-tabel heeft
  RLS voor `team@triageve.app`. De service-role key, het database-wachtwoord en
  het teamwachtwoord horen alleen in GitHub-secrets.
- **Prullenbak.** Dagboek, agenda, contacten, medicatie en taken blijven 30 dagen
  terug te zetten. Chatberichten hebben geen prullenbak.
- **Tegelijk bewerken.** De laatste opslag wint. De app voegt twee versies niet samen.
- **Offline.** Concepten van chat en dagboek en een wachtrij voor nieuwe regels
  blijven op het apparaat. Zonder verbinding is bewerken van bestaande kaarten
  niet betrouwbaar.
- **Oude pagina na een deploy.** De service worker haalt de nieuwe schil op en
  herlaadt één keer. iPhone Safari kan een oude pagina vasthouden tot je ververst.
- **Meldingen en backup** wachten op de secrets hierboven. Zonder die secrets
  gebeurt er niets stilletjes fout: de jobs slaan die stap over.
- **Databaseregio** is nog niet gecontroleerd. Een EU-regio heeft de voorkeur.
- **Niet aangepast:** aanmelden van nieuwe Supabase-accounts staat aan, en de
  GitHub-koppeling naar Hoorspel is niet gewijzigd. Als dit project alleen voor
  triagEve is, kun je signups later uitzetten en `site_url` op
  `https://brennyz.github.io/triagEve/` zetten.
