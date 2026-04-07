# UteriFlow v2 — Setup Instructions

## Backend

```bash
cd Backend
npm install          # installs dotenv, express, supabase, etc.
cp .env.example .env # fill in your Supabase + SMTP values
npm run dev          # local dev
```

## Admin Frontend

```bash
cd uteriflow-admin
npm install
cp .env.example .env  # set VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

## Database

Run `Backend/supabase/migrations/v2_app_features.sql` in your Supabase SQL Editor **before** deploying the backend. This adds the new tables and columns needed for v2 features.
