# Beacon

A global help network. Hold SOS to broadcast your coordinates, battery, and what you need. Anyone nearby — or a coordinator anywhere — can call local services for you, in the right language.

Beacon is **not** a replacement for 112 / 911. Official emergency services come first.

## What it does

- **Hold-to-send SOS** — no account required. GPS, battery, language, and payment ability go out with the signal.
- **Specific help** — medical, accident, safety, stranded, breakdown, fuel, lost, medicine, water, shelter, food.
- **Live world map** — open incidents stay visible until they are resolved. Filter nearby, city, region, or worldwide.
- **Instant alerts** — toasts, sound, and browser notifications when someone in your range needs help.
- **Remote coordination** — local emergency numbers plus what to say in that country’s language (English underneath).
- **World chat** — incoming messages auto-translate into the language you read.
- **Nearby needs** — restrooms, showers, drinking water, food, pharmacies, and shelters (OpenStreetMap).
- **Aid wallet** — sign in to send credit to a signal or another person.

## Stack

React 19, TypeScript, Vite, TanStack Start / Router, Tailwind v4, Better Auth (Google, X, email), PGLite in preview / Postgres when deployed.

## Develop

```bash
npm install
npm run dev
```

The app listens on `0.0.0.0:8080`.

```bash
npm run typecheck
npm run build
npm test
```

`npm run build` emits the Nitro Vercel output only. It does **not** migrate a
live database. Local PGLite still applies `migrations/*.sql` on startup.
Remote schema is owned by `supabase/migrations` and the Supabase CLI.

```bash
npm run db:migrate   # explicit / legacy DATABASE_URL only
```

## Deploy

Vercel is the web host (Preview and Production). Nitro’s `vercel` preset is
enabled on `vite build`. Deep links such as `/incident/:id` are server routes.

See `.env.example` for the full matrix. Summary:

| Variable | Where | Notes |
| --- | --- | --- |
| `BEACON_DEMO` | server | **false** on Production. true on Preview only if you want labeled DEMO theater. |
| `DATABASE_URL` | server | Supabase pooler when cut over. Unset → PGLite. Never `VITE_`. |
| `BETTER_AUTH_SECRET` | server | Required in Production. |
| `BETTER_AUTH_URL` | server | Public origin. Preview also trusts `*.vercel.app`. |
| `GROK_AUTH_CLIENT_ID` / `SECRET` | server | Federated Google/X. |
| `XAI_API_KEY` | server | Optional translation. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Admin/seed only. Never ship to web or Capacitor. |
| `VITE_AUTH_ENABLED` | public | Do not set `false` in Production. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | public | Client Broadcast only; RLS must hold. |

Rollback: promote the previous Vercel deployment. Persistence rollback (later)
is unset `DATABASE_URL` or `BEACON_PERSISTENCE=pglite`.

## License

MIT

---

by ASTRA MATRIX
