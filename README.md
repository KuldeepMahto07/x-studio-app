# X Studio

Autopilot for your X niche. Users sign in with X, describe their niche once, and X Studio writes posts with AI and publishes them at their scheduled times, using their approved queue first.

## Run it locally (no accounts needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without keys the app runs in **demo mode**:
- "Sign in with X" becomes a demo login (pick any handle).
- Posts are recorded in History instead of being sent to X.
- Drafts are placeholders until you add `GEMINI_API_KEY`.

To make autopilot fire while `npm run dev` is running, set `AUTOPILOT_TIMER=1` in `.env.local`, or call the worker yourself:

```bash
curl http://localhost:3000/api/cron/autopilot
```

## Features
- **Sign in with X** (OAuth 2.0 + PKCE); tokens encrypted at rest (AES-256-GCM), refreshed automatically.
- **Niche setup**: niche, audience, voice, topics, post formats.
- **Drafts**: AI writes posts in your niche; edit, discard, or add to the queue. Write your own too.
- **Queue**: reorder, edit, remove. Autopilot posts from the top.
- **Autopilot**: posts at your times in your timezone; writes a fresh post when the queue is empty. Each time slot can only post once, even if the worker runs twice.
- **Plans**: Free (1/day, 10/month), Pro (3/day), Creator (10/day). Limits are enforced; billing is not wired yet (demo mode lets you switch plans).
- **History**: everything posted or failed, with links to X.

## Going live

1. **X app:** at developer.x.com create an app → User authentication settings → OAuth 2.0, type *Web App*, permissions *Read and write*. Callback URL: `{APP_URL}/api/auth/x/callback`. Copy the OAuth 2.0 Client ID and Secret into `X_CLIENT_ID` / `X_CLIENT_SECRET`, and add credits (X charges about $0.015 per post).
2. **Gemini:** free key from https://aistudio.google.com/apikey → `GEMINI_API_KEY`.
3. **Secrets:** set `ENCRYPTION_KEY` and `CRON_SECRET` to long random strings.
4. **Hosting:** the database is a SQLite file, so host on something with a persistent disk (Railway, Render, Fly.io, or a VPS) and set `AUTOPILOT_TIMER=1`. For Vercel or other serverless hosts, swap `src/lib/db.ts` for Postgres (e.g. Supabase) and call `/api/cron/autopilot` every 5 minutes with `Authorization: Bearer $CRON_SECRET`.

All settings are listed in [.env.example](.env.example).

## Project map
| Path | What it does |
|---|---|
| `src/lib/db.ts` | SQLite schema and query helpers |
| `src/lib/auth.ts` | Sessions and the signed-in user |
| `src/lib/x.ts` | X OAuth, token refresh, posting |
| `src/lib/ai.ts` | Prompt and Gemini call |
| `src/lib/autopilot.ts` | Scheduler: due slots → queue or AI → X |
| `src/lib/posts.ts` | Niche, drafts, queue, schedule (always scoped to one user) |
| `src/app/actions.ts` | Server actions behind every button |
| `src/app/app/*` | Dashboard pages |
| `src/app/api/*` | X sign-in routes and the cron endpoint |

## Not built yet
Billing (Lemon Squeezy / Razorpay), voice matching from past posts, threads, analytics, multiple X accounts, email notifications.
