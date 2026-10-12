# PokéSamling — Pokémon Collection Tracker

En dansk, Pokémon-inspireret samlingsside, der kan hostes som en statisk hjemmeside på GitHub Pages.

## Funktioner i denne startversion
- Responsivt design til mobil og computer.
- Forside med antal kort og samlet beregnet værdi.
- Tilføj kort med billede, navn, kortnummer, sæt, sprog, stand og valgfri manuel EUR-pris.
- Søgning, sortering, redigering og sletning.
- Demo-tilstand gemmer lokalt i browseren.
- Supabase-login, database og billedlagring, når Supabase er konfigureret.

## Vigtigt om Cardmarket
Denne version **finder ikke automatisk kort fra billedet** og **henter ikke automatisk seneste solgte pris fra Cardmarket endnu**. Cardmarkets API-adgang er begrænset og kræver godkendelse. Der er ikke indbygget scraping eller falske prisdata. Når en godkendt datakilde er til rådighed, bør den tilsluttes en server-side funktion/Edge Function, som gemmer pris, valuta, kilde og tidspunkt for seneste handel.

Prisfeltet i denne startversion er manuelt og bliver mærket som manuel. Den samlede DKK-værdi bruger en fast, omtrentlig EUR/DKK-kurs på 7,46; den skal senere erstattes med en opdateret valutakilde.

## Lokal visning
Åbn `index.html` i en browser. Uden Supabase gemmes demo-kort kun i den browser, du bruger.

## Konfigurer Supabase
1. Opret/åbn et Supabase-projekt.
2. Gå til SQL Editor, og kør hele filen `supabase-setup.sql`.
3. I Supabase: Authentication → URL Configuration, tilføj din GitHub Pages-adresse som Site URL og Redirect URL.
4. Find Project URL og anon/publishable key i projektets API/Connect-indstillinger.
5. Åbn `app.js`, og indsæt dem i `SUPABASE_URL` og `SUPABASE_ANON_KEY`. Brug aldrig en `service_role`- eller secret key i browserkode.
6. Aktivér e-mailbekræftelse i Supabase Auth, hvis du ønsker det.

## Udgiv på GitHub Pages
1. Opret et repository, fx `pokemon-samling`.
2. Upload `index.html`, `style.css`, `app.js`, `supabase-setup.sql` og `README.md` til repositoryets rod.
3. I GitHub: Settings → Pages → Deploy from a branch → `main` / root.
4. Vent på publicering, og åbn den GitHub Pages-adresse, GitHub viser.
5. Tilføj adressen i Supabase Authentication URL Configuration.

## Næste trin for automatisk kortgenkendelse og værdi
- Tilføj en godkendt kortdatabase til identifikation af navn, sæt og kortnummer fra billedet.
- Tilføj en server-side/Edge Function til at hente verificerede prisdata fra en godkendt datakilde.
- Gem `last_sold_price`, `currency`, `sale_date`, `source_url`, `price_updated_at` og `price_source` for hvert kort.
- Planlæg prisopdatering med cron/scheduled function og beregn samlingens total ud fra de nyeste gyldige priser.
- Gør det tydeligt, hvis der ikke findes data for et kort, i stedet for at gætte en pris.

## Sikkerhed
Frontend bruger kun Supabase anon/publishable key. RLS-politikker begrænser kortdata til den bruger, der er logget ind. Hvis projektet skal være privat, må du ikke fjerne RLS-politikkerne.
