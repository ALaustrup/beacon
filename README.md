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
```

## Deploy

Built for Vercel (`npm run build` emits the Nitro Vercel preset). When deployed, set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres |
| `BETTER_AUTH_SECRET` | Session signing |
| `BETTER_AUTH_URL` | Public origin |
| `GROK_AUTH_CLIENT_ID` / `GROK_AUTH_CLIENT_SECRET` | Sign-in via the Grok auth broker |
| `XAI_API_KEY` | Optional higher-quality translation (MyMemory is the default fallback) |

## License

MIT

---

by ASTRA MATRIX
