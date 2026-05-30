# 🌿 Hagehjelp

Hageappen din. Tegn opp hagen, logg planter, følg sesongen.

---

## Kom i gang — 4 steg

### 1. Supabase-prosjekt

1. Gå til [supabase.com](https://supabase.com) og opprett et nytt prosjekt (gratis).
2. Gå til **SQL Editor** og kjør hele `supabase/schema.sql`.
3. Gå til **Authentication → Providers → Google** og aktiver Google OAuth.
   - Du trenger en Google Cloud-app med OAuth-legitimasjon ([guide](https://supabase.com/docs/guides/auth/social-login/auth-google)).
   - Legg til `https://ditt-prosjekt.supabase.co/auth/v1/callback` som tillatt redirect-URL i Google Cloud Console.
4. Kopier **Project URL** og **anon public key** fra **Settings → API**.

### 2. Miljøvariabler

```bash
cp .env.example .env
```

Fyll inn `.env`:
```
VITE_SUPABASE_URL=https://ditt-prosjekt.supabase.co
VITE_SUPABASE_ANON_KEY=din-anon-nøkkel
```

### 3. Kjør lokalt

```bash
npm install
npm run dev
```

Åpne [http://localhost:5173](http://localhost:5173).

### 4. Deploy til Vercel

```bash
npm install -g vercel
vercel
```

Legg til miljøvariablene i Vercel-dashboardet under **Settings → Environment Variables**.

Husk å legge til din Vercel-URL som tillatt redirect i Supabase:
**Authentication → URL Configuration → Redirect URLs** → `https://din-app.vercel.app/**`

---

## Valgfritt: Plante-ID med Plant.id

1. Opprett konto på [plant.id](https://plant.id) (gratis tier: 100 identifiseringer/dag).
2. Legg til i `.env`:
```
VITE_PLANTID_KEY=din-api-nøkkel
```
3. Implementer kallet i `src/pages/PlantDetail.jsx` i `IdentifyTab`-funksjonen.

---

## Struktur

```
src/
  App.jsx                  # Ruting og layout
  contexts/
    AuthContext.jsx         # Google OAuth via Supabase
  lib/
    supabase.js             # Supabase-klient
    plantData.js            # Plantedatabase + sesongdata
  pages/
    Landing.jsx             # Forside / innlogging
    Dashboard.jsx           # Hagekart + planteoversikt
    PlantDetail.jsx         # Per plante: info, bilder, skadedyr, høst, ID
    SeasonalCalendar.jsx    # Måneds- og årskalender
    HarvestOverview.jsx     # Høstlogg med totalstatistikk
    Profile.jsx             # Bruker- og offentlig profil
  components/
    Navbar.jsx              # Sidenavigasjon
supabase/
  schema.sql               # Database-oppsett (kjøres én gang)
```

## Legg til flere planter

Rediger `src/lib/plantData.js` og legg til en ny nøkkel i `PLANTS`-objektet.
Følg samme struktur som eksisterende planter — feltet `seasonal` er det viktigste for kalenderintegrasjonen.
