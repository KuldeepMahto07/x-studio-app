# X Studio

Autopilot for your X niche. Users sign in with X, describe their niche once, and X Studio writes posts with AI and publishes them at their scheduled times, using their approved queue first.

## Run it locally (no accounts needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000 and **create an account** (email + password). Without X API keys the app runs in **free one-click mode**:
- At each scheduled time, a post is prepared (from your queue, or written by Gemini) and you get a browser notification.
- **Post on X** opens X's composer with the post already typed; you press Post. Uses X's free share link, so it costs nothing and is safe for your account.
- Drafts are placeholders until you add `GEMINI_API_KEY` (free at https://aistudio.google.com/apikey).

Add `X_CLIENT_ID` / `X_CLIENT_SECRET` to switch to **full autopilot** (posts through the X API, about $0.015 per post).

To make autopilot fire while `npm run dev` is running, set `AUTOPILOT_TIMER=1` in `.env.local`, or call the worker yourself:

```bash
curl http://localhost:3000/api/cron/autopilot
```

## Features
- **Accounts**: email + password sign-up and sign-in (scrypt hashes), password reset by email (one-time links, 30 minutes, signs out other devices), rate-limited sign-in.
- **Sign in with X / Connect X** (OAuth 2.0 + PKCE) when X API keys are set; tokens encrypted at rest (AES-256-GCM), refreshed automatically.
- **Subscriptions** with Lemon Squeezy: checkout, signed webhooks, cancel-at-period-end, customer portal. Local development uses a test checkout that runs the same code path.
- **Niche setup**: niche, audience, voice, topics, post formats.
- **Drafts**: AI writes posts in your niche; edit, discard, or add to the queue. Write your own too.
- **Queue**: reorder, edit, remove. Autopilot posts from the top.
- **Autopilot**: posts at your times in your timezone; writes a fresh post when the queue is empty. Each time slot can only post once, even if the worker runs twice.
- **Two posting modes**: free one-click (X share link + reminder) or full autopilot (X API).
- **Plans**: Free (1/day, 10/month), Pro $9 (3/day), Creator $19 (10/day). Limits are enforced on every post.
- **History**: everything posted or failed, with links to X.

## Going live

1. **X app:** at developer.x.com create an app → User authentication settings → OAuth 2.0, type *Web App*, permissions *Read and write*. Callback URL: `{APP_URL}/api/auth/x/callback`. Copy the OAuth 2.0 Client ID and Secret into `X_CLIENT_ID` / `X_CLIENT_SECRET`, and add credits (X charges about $0.015 per post).
2. **Gemini:** free key from https://aistudio.google.com/apikey → `GEMINI_API_KEY`.
3. **Secrets:** set `ENCRYPTION_KEY` and `CRON_SECRET` to long random strings.
4. **Email:** create a free Resend account, verify your domain, set `RESEND_API_KEY` and `MAIL_FROM`.
5. **Payments:** in Lemon Squeezy create a product "X Studio" with two monthly variants (Pro $9, Creator $19). Set `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, and the two variant IDs. Add a webhook to `{APP_URL}/api/billing/webhook` with the `subscription_*` events and put its signing secret in `LEMONSQUEEZY_WEBHOOK_SECRET`. Use Lemon Squeezy's test mode first.
6. **Hosting:** the database is a SQLite file, so host on something with a persistent disk (Railway, Render, Fly.io, or a VPS) and set `AUTOPILOT_TIMER=1`. For Vercel or other serverless hosts, swap `src/lib/db.ts` for Postgres (e.g. Supabase) and call `/api/cron/autopilot` every 5 minutes with `Authorization: Bearer $CRON_SECRET`.

All settings are listed in [.env.example](.env.example).

## Tests

```bash
npm test
```

37 tests cover passwords, sign-up/sign-in, password reset, rate limiting, webhook signatures, subscription events (including the real webhook route), plan limits, the queue, scheduling, and autopilot. They run against a throwaway database, never `data/app.db`.

## Project map
| Path | What it does |
|---|---|
| `src/lib/db.ts` | SQLite schema and query helpers |
| `src/lib/auth.ts` | Sessions and the signed-in user |
| `src/lib/accounts.ts` | Passwords, sign-up, sign-in, reset tokens, rate limits |
| `src/lib/billing.ts` | Lemon Squeezy checkout, webhook verification, plan changes |
| `src/lib/mail.ts` | Email through Resend (or the server log locally) |
| `src/lib/x.ts` | X OAuth, token refresh, posting |
| `src/lib/ai.ts` | Prompt and Gemini call |
| `src/lib/autopilot.ts` | Scheduler: due slots → queue or AI → X |
| `src/lib/posts.ts` | Niche, drafts, queue, schedule (always scoped to one user) |
| `src/app/actions.ts` | Server actions behind every button |
| `src/app/app/*` | Dashboard pages |
| `src/app/api/*` | X sign-in routes and the cron endpoint |

## Not built yet
Email verification on sign-up, voice matching from past posts, threads, analytics, multiple X accounts, notification emails.
