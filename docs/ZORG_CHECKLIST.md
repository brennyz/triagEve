# Checklist: een app die over iemands welzijn gaat

Wat apps voor mantelzorg en "een oogje in het zeil houden" nodig hebben, en waar het in triagEve
geregeld wordt. Grok: vink in fase 16 elk punt af of schrijf erachter waarom niet.

## A. Regie, toestemming en waardigheid van Eef
- [ ] Eef weet van de app en bespreekt mee wat erin komt (tekstblok staat op Home; het gesprek doet de familie).
- [x] Haar eigen wensen staan centraal en zichtbaar ("Wensen van Eef", scherm staat).
- [x] Geen heimelijke monitoring: geen locatie, camera of verborgen tracking (niet gebouwd).
- [x] Duidelijk wie haar aanspreekpunt/vertegenwoordiger is (veld op Wensen van Eef).
- [x] Respectvolle, feitelijke taal in het dagboek (tip in docs/HANDLEIDING.md).

## B. Privacy en beveiliging (gezondheidsgegevens = bijzondere persoonsgegevens, AVG)
- [x] Gegevens niet in de openbare repo; alleen in Supabase achter inlog + RLS.
- [x] Automatische test dat niemand zonder inlog kan lezen (workflow `supabase.yml`).
- [ ] Sterk wachtwoord, alleen gedeeld met Jacky en Paps (Bren kiest; nog niet gezet).
- [x] Automatisch uitloggen na 14 dagen, CSP, niet vindbaar in Google (in de code).
- [x] Dataminimalisatie: geen BSN, DigiD, pincodes, bankgegevens, documenten (geen velden daarvoor; papieren alleen als vindplaats).
- [x] Meldingen zonder medische details op het vergrendelscherm (tekst in de functie; push-sleutel nog niet gezet).
- [ ] Regio van de database genoteerd, bij voorkeur EU (niet op te vragen zonder access token).
- [x] Back-ups alleen versleuteld (workflow weigert een onversleuteld bestand; secret nog leeg, dus nog geen echte back-up).
- [x] Alles kunnen exporteren en kunnen verwijderen als het niet meer nodig is (Meer → Alles downloaden; prullenbak).

## C. Veiligheid en escalatie
- [x] Noodkaart: 112, huisarts, noodcontacten in één tik (scherm staat; huisarts vult de familie in).
- [x] Dagstatus met "zorgelijk" die iedereen direct waarschuwt (status + dagboekregel; push wacht op VAPID-sleutel).
- [x] Duidelijke tekst: de app vervangt geen arts, alarmknop of 112 (handleiding + Medicatie + status).
- [x] Medicatie-overzicht met wie wat wanneer wijzigde (scherm + geschiedenis + dagboekregel).
- [x] Overzicht voor de arts printen (Meer → Overzicht voor arts).

## D. Betrouwbaarheid
- [x] Database wakker houden (gratis Supabase pauzeert na 7 dagen) – `keepalive.yml`.
- [ ] Meldingen zodat niemand iets mist (code staat; sleutel en deploy wachten op Bren).
- [x] Offline wachtrij: nooit tekst kwijt (outbox + concepten).
- [x] Zichtbare verbindingsstatus (groen/rood bolletje) en foutmeldingen bij mislukken.
- [x] Geschiedenis en prullenbak: niets verdwijnt stil (30 dagen, daarna de keepalive-opruiming).
- [x] Back-up + terugzet-instructie (README; de workflow is nog niet tegen Supabase gedraaid).

## E. Samenwerken en de zorgers zelf
- [x] Chat, dagboek, overleg met tijdstempels.
- [x] Taken met wie-doet-wat en deadlines.
- [x] Verdeling zichtbaar: bezoeken deze week, open taken per persoon.
- [x] Hulp & steun-nummers voor de mantelzorgers (113.nl en mantelzorg.nl, 2026-10-16).

## F. Toegankelijkheid
- [x] Grote tekst, grote knoppen, eenvoudige taal.
- [x] Handleiding voor Jacky en Paps (`docs/HANDLEIDING.md`).
