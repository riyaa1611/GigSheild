# PWA-worker

Standalone worker PWA implementation created parallel to existing services.

## Included

- Modular React app (Vite) under `src/`
- Supabase client and local `gs_*` cache wrapper
- Onboarding flow: phone -> OTP -> signup -> plan activation
- App shell with tabs: Home, Policy, Payouts, Support, Profile
- Realtime payouts modal + trigger alerts
- Supabase SQL schema in `supabase/sql/schema.sql`
- Edge functions in `supabase/functions/*`

## Run locally

1. Copy `.env.example` to `.env` and set frontend values:

```
VITE_SUPABASE_URL=https://qbigrhdoaoyrclbiebpt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

2. Copy `supabase/.env.example` to `supabase/.env` and set server-side values:

```
SUPABASE_URL=https://qbigrhdoaoyrclbiebpt.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OTP_SECRET=your-otp-secret
DEV_MODE=true
ANTHROPIC_API_KEY=optional-anthropic-key
```

3. Install and run:

```
npm install
npm run dev
```

App runs on `http://localhost:5175`.

## Supabase setup summary

1. Run SQL from `supabase/sql/schema.sql`.
2. Enable realtime on `payouts`, `triggers`, `claims`.
3. Deploy functions:

```
supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase functions deploy subscribe-plan
supabase functions deploy fire-trigger
supabase functions deploy support-chat
```

4. Add secrets in Supabase dashboard (for deployed edge functions):
- `SUPABASE_SERVICE_ROLE_KEY`
- `OTP_SECRET`
- `DEV_MODE=true`
- `ANTHROPIC_API_KEY` (optional for support AI)
