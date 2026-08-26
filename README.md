# Wardrobe Assistant

Mood-based outfit picker. Photograph your closet, answer a short style quiz once, then pick a mood and get outfit suggestions built from your own clothes.

## Setup (once you have a Supabase account)

1. Create a new Supabase project.
2. Open the SQL editor and run `supabase/schema.sql` to create the tables.
3. Go to **Storage** and create a new **public** bucket named `item-photos` (this is where clothing photos are stored).
4. Go to **Project Settings → API** and copy the **Project URL** and **anon public key**.
5. Copy `.env.example` to `.env` and paste those two values in.
6. Install dependencies and run:
   ```
   npm install
   npx expo start
   ```
   Scan the QR code with the Expo Go app on your phone.

## How it's organized

- `supabase/schema.sql` — the database schema (profiles, items, outfits).
- `src/data/moodRules.ts` — the moods and the rules mapping each mood to formality/warmth/tags. Tune this by feel.
- `src/lib/matchOutfit.ts` — the matching logic: scores each closet item against the chosen mood + style profile, then combines top/bottom/dress + shoes into outfit suggestions.
- `src/screens/` — the three main screens: Closet (browse), Add Item (camera + tagging), Mood (pick a mood, see outfits). Plus a one-time StyleSetupScreen quiz on first launch.

## Where to take it next

- Auto-tag photos (category/color/pattern) with a vision model instead of typing them in by hand.
- Pull local weather and filter warmth by the forecast.
- Track `last_worn_at` when an outfit is actually worn, so suggestions naturally rotate.
