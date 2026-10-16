# Checklist: een app die over iemands welzijn gaat

Wat apps voor mantelzorg en "een oogje in het zeil houden" nodig hebben, en waar het in triagEve
geregeld wordt. Grok: vink in fase 16 elk punt af of schrijf erachter waarom niet.

## A. Regie, toestemming en waardigheid van Eef
- [ ] Eef weet van de app en bespreekt mee wat erin komt (tekstblok op Home, fase 10).
- [ ] Haar eigen wensen staan centraal en zichtbaar ("Wensen van Eef", fase 10).
- [ ] Geen heimelijke monitoring: geen locatie, camera of verborgen tracking (buiten scope).
- [ ] Duidelijk wie haar aanspreekpunt/vertegenwoordiger is (fase 10).
- [ ] Respectvolle, feitelijke taal in het dagboek (tip in de handleiding).

## B. Privacy en beveiliging (gezondheidsgegevens = bijzondere persoonsgegevens, AVG)
- [x] Gegevens niet in de openbare repo; alleen in Supabase achter inlog + RLS.
- [x] Automatische test dat niemand zonder inlog kan lezen (workflow `supabase.yml`).
- [ ] Sterk wachtwoord, alleen gedeeld met Jacky en Paps (fase 2).
- [ ] Automatisch uitloggen na 14 dagen, CSP, niet vindbaar in Google (fase 2).
- [ ] Dataminimalisatie: geen BSN, DigiD, pincodes, bankgegevens, documenten (fase 10).
- [ ] Meldingen zonder medische details op het vergrendelscherm (fase 12).
- [ ] Regio van de database genoteerd, bij voorkeur EU (fase 2).
- [ ] Back-ups alleen versleuteld (fase 14).
- [ ] Alles kunnen exporteren en kunnen verwijderen als het niet meer nodig is (fase 14, handleiding).

## C. Veiligheid en escalatie
- [ ] Noodkaart: 112, huisarts, noodcontacten in één tik (fase 5).
- [ ] Dagstatus met "zorgelijk" die iedereen direct waarschuwt (fase 11 + 12).
- [ ] Duidelijke tekst: de app vervangt geen arts, alarmknop of 112 (handleiding + Medicatie + status).
- [ ] Medicatie-overzicht met wie wat wanneer wijzigde (fase 6 + 13).
- [ ] Overzicht voor de arts printen (fase 9).

## D. Betrouwbaarheid
- [x] Database wakker houden (gratis Supabase pauzeert na 7 dagen) – `keepalive.yml`.
- [ ] Meldingen zodat niemand iets mist (fase 12).
- [ ] Offline wachtrij: nooit tekst kwijt (fase 14).
- [ ] Zichtbare verbindingsstatus (groen/rood bolletje – bestaat al) en foutmeldingen bij mislukken.
- [ ] Geschiedenis en prullenbak: niets verdwijnt stil (fase 13).
- [ ] Back-up + uitgeteste terugzet-instructie (fase 14).

## E. Samenwerken en de zorgers zelf
- [x] Chat, dagboek, overleg met tijdstempels.
- [ ] Taken met wie-doet-wat en deadlines (fase 7).
- [x] Verdeling zichtbaar: bezoeken deze week, open taken per persoon (fase 15).
- [x] Hulp & steun-nummers voor de mantelzorgers (fase 15; 113.nl en mantelzorg.nl, 2026-10-16).

## F. Toegankelijkheid
- [ ] Grote tekst, grote knoppen, eenvoudige taal (fase 14).
- [x] Handleiding voor Jacky en Paps (`docs/HANDLEIDING.md`).
