# Checklist: een app die over iemands welzijn gaat

Wat apps voor mantelzorg en "een oogje in het zeil houden" nodig hebben, en waar het in triagEve
geregeld wordt. Grok: vink in fase 16 elk punt af of schrijf erachter waarom niet.

## A. Regie, toestemming en waardigheid van Eef
- [x] Eef weet van de app en bespreekt mee wat erin komt (tekstblok op Home, fase 10). Familie moet het nog mét Eef nabespreken.
- [x] Haar eigen wensen staan centraal en zichtbaar ("Wensen van Eef", fase 10). Inhoud vult de familie in.
- [x] Geen heimelijke monitoring: geen locatie, camera of verborgen tracking (buiten scope).
- [x] Duidelijk wie haar aanspreekpunt/vertegenwoordiger is (fase 10, veld in Wensen).
- [x] Respectvolle, feitelijke taal in het dagboek (tip in de handleiding).

## B. Privacy en beveiliging (gezondheidsgegevens = bijzondere persoonsgegevens, AVG)
- [x] Gegevens niet in de openbare repo; alleen in Supabase achter inlog + RLS.
- [x] Automatische test dat niemand zonder inlog kan lezen (workflow `supabase.yml`). Draait pas met GitHub secrets.
- [ ] Sterk wachtwoord, alleen gedeeld met Jacky en Paps (fase 2) – Bren moet nog kiezen.
- [x] Automatisch uitloggen na 14 dagen, CSP, niet vindbaar in Google (fase 2).
- [x] Dataminimalisatie: geen BSN, DigiD, pincodes, bankgegevens, documenten (fase 10).
- [x] Meldingen zonder medische details op het vergrendelscherm (fase 12). Echte push wacht op VAPID-sleutels.
- [ ] Regio van de database genoteerd, bij voorkeur EU (fase 2) – onbekend tot fase 1.
- [x] Back-ups alleen versleuteld (fase 14, workflow). Draait pas met `BACKUP_PASSPHRASE`.
- [x] Alles kunnen exporteren (Meer → Alles downloaden). Definitief wissen in Supabase als het niet meer nodig is: Bren/fase 1.

## C. Veiligheid en escalatie
- [x] Noodkaart: 112, huisarts, noodcontacten in één tik (fase 5). Nummers vult de familie in.
- [x] Dagstatus met "zorgelijk" (fase 11) + push naar anderen (fase 12, wacht op VAPID).
- [x] Duidelijke tekst: de app vervangt geen arts, alarmknop of 112 (handleiding + Medicatie + status).
- [x] Medicatie-overzicht met wie wat wanneer wijzigde (fase 6 + 13).
- [x] Overzicht voor de arts printen (fase 9).

## D. Betrouwbaarheid
- [x] Database wakker houden (gratis Supabase pauzeert na 7 dagen) – `keepalive.yml`.
- [x] Meldingen zodat niemand iets mist (fase 12) – code klaar, VAPID nog nodig.
- [x] Offline wachtrij: nooit tekst kwijt (fase 14).
- [x] Zichtbare verbindingsstatus (groen/rood bolletje) en foutmeldingen bij mislukken.
- [x] Geschiedenis en prullenbak: niets verdwijnt stil (fase 13). Draait op de database na migraties.
- [x] Back-up-workflow + terugzet-instructie in README (fase 14). Decrypten niet live getest (geen passphrase).

## E. Samenwerken en de zorgers zelf
- [x] Chat, dagboek, overleg met tijdstempels.
- [x] Taken met wie-doet-wat en deadlines (fase 7).
- [x] Verdeling zichtbaar: bezoeken deze week, open taken per persoon (fase 15).
- [x] Hulp & steun-nummers voor de mantelzorgers (fase 15).

## F. Toegankelijkheid
- [x] Grote tekst, grote knoppen, eenvoudige taal (fase 14).
- [x] Handleiding voor Jacky en Paps (fase 16).
