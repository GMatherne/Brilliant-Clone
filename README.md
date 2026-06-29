# Calculus Lab — Learn by Doing

**Live:** https://calculus-lab.web.app
**Subject:** AP Calculus BC — derivatives **and** integrals
**Audience:** High-school AP Calculus BC students
**Stack:** React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS 4 · Firebase 11 · Cloudflare Workers · KaTeX · math.js

A Brilliant-style, **learn-by-doing** web app for the foundations of calculus. Instead of
watching videos, you work through short interactive steps — drag a slider on a live graph,
tap a point on a curve, build a derivative term-by-term, drag tiles to assemble an answer,
rotate a tangent, paint the intervals where a curve rises — and get **instant, hand-written
feedback** on every attempt, with a per-question **assistance dial** that ranges from a
guided walkthrough to no help at all. All grading happens in the browser; the only
server-side code the app talks to is a small Cloudflare Worker that powers the optional AI
tutor (keeping the OpenAI key off the client).

> For a full tour of how everything works internally, see **[OVERVIEW.md](./OVERVIEW.md)**.

## Quick start

```bash
npm install

# Optional: real auth + cross-device persistence.
# Without it, the app runs in demo mode (localStorage, auto-login).
cp .env.sample .env.local   # then fill in your Firebase web config

npm run dev                 # http://localhost:5173  (demo user, no login)
```

## Run modes

| Mode | When | Auth | Storage |
|------|------|------|---------|
| **Demo / dev** | `npm run dev` (port **5173**) | Auto "Demo Student", no login | `localStorage` |
| **Production** | `npm run build` / `preview` (port **5174**) / deployed | Real Firebase login | Firestore |

If the Firebase env vars are missing (or `VITE_FIREBASE_API_KEY=demo`), the app also falls
back to demo mode, so it runs with zero configuration.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on **5173** (demo user, no login) |
| `npm run build` | Type-check (`tsc -b`) + production bundle to `dist/` |
| `npm run preview` | Preview the production build on **5174** (real login) |
| `npm run lint` | ESLint |
| `npm run test` | Run unit tests once (Vitest) |
| `npm run test:watch` | Watch-mode tests |
| `npm run test:coverage` | Tests with V8 coverage (`src/lib/**`) |
| `npm run validate:lessons` | Validate every lesson JSON (6–10 steps, ≥1 slider graph, etc.) + the reference deck |
| `npm run kill-ports` | Free the dev/preview ports (5173 / 5174) if a server is stuck |

## Question types

Eighteen step types fit the concept being taught:

| Type | Learner action | Graded |
|------|----------------|:------:|
| `read` | Tap **Continue** | No |
| `multiple_choice` | Pick one option (≥ 4 choices) | Yes |
| `multi_choice` | Answer several classification rows at once (e.g. max/min/neither) | Yes |
| `numeric` | Type a number (tolerance-based) | Yes |
| `slider_graph` | Move a slider on a live SVG graph | Yes |
| `power_term` | Build a term `a·xⁿ` with steppers (power rule / reverse power rule) | Yes |
| `drag_drop` | Drag tiles into ordered blanks to assemble an expression | Yes |
| `match` | Pair each prompt with its match (e.g. function ↔ antiderivative) | Yes |
| `sign_chart` | Label each interval of a number line (e.g. increasing vs. decreasing) | Yes |
| `order_list` | Drag shuffled items into their correct order | Yes |
| `riemann` | Drag a slider to pile up rectangles until a Riemann sum converges | Yes |
| `predict` | Drag a marker along the curve to predict a feature, then lock it in to reveal the truth | Yes |
| `construct_graph` | Drag a row of points (fixed in x, free in y) to build a curve, e.g. plot `f'` | Yes |
| `paint_intervals` | Brush on the segments where a condition holds (e.g. where `f` is increasing) | Yes |
| `select_region` | Tap the region(s) of the plot that satisfy a property (steepest, concave up, …) | Yes |
| `tangent_line` | Rotate a line pinned to the curve until its slope matches the curve's | Yes |
| `integral_bounds` | Drag two handles to set the limits `a, b` of a definite integral | Yes |
| `simulate` | Drive a value over time (e.g. a throttle) to trace a target curve, its integral, or its derivative | Yes |

Graph-backed steps can also carry a **slider** answer (drag to a target) or a **graph_point**
answer (tap the correct point on the curve).

Any distance-based step (`slider`, `numeric`, `power_term`) can opt into **live feedback** with
`"liveCheck": true`: it is graded continuously as the learner manipulates and locks in the
instant it's right — no separate **Check Answer** press, with a warmer/colder proximity meter
along the way.

Every question also carries a three-way **assistance toggle** — a sticky per-learner
preference (default **Hints**):

- **Solve it** — a guided "Work through it" walkthrough animates the widget to the answer
  while a step-by-step worked **solution** reveals the reasoning (lesson questions only; it's a
  worked example, so it never counts toward mastery).
- **Hints** — warmer/colder live feedback while tuning, the authored hint offered proactively,
  an optional **concept sandbox** (an ungraded explorer on a *different* example), and the AI tutor.
- **No help** — hints and the proactive sandbox are hidden; the AI tutor stays available on demand.

## The course

**Introduction to Calculus** — 10 lessons across 5 sequential levels (each lesson unlocks the
next):

1. **What Is a Derivative?** — What Is a Derivative? · Slope of a Curve (introduces the limit definition)
2. **Finding Derivatives** — The Power Rule · Differentiating Polynomials
3. **Using Derivatives** — Derivatives and Graph Shape · Finding Maxima and Minima
4. **What Is an Integral?** — What Is an Integral? · Area Under a Curve
5. **The Big Picture** — The Fundamental Theorem of Calculus · Integrating Polynomials

Each lesson is ~6–8 minutes, has 6–10 steps, and includes at least one slider-graph
interaction. Finished lessons unlock per-lesson **Practice**; the roadmap also offers a
cross-lesson **Targeted review** (weakest/stalest concepts first) and **Custom practice**
(pick your own concepts), and completed levels unlock a **Level review**. Confident learners
can **test out** of a level to skip ahead — pass a short mixed challenge at ≥ 80% first-try
accuracy and the bypassed lessons are marked complete. A **Reference** cheat sheet of key
formulas and definitions — grouped by level and unlocking a level at a time as you advance
(each level's facts open once the previous level is complete) — is one tap from the header
on any page.

## Architecture

A layered, mostly server-free design — version-controlled JSON content, browser logic, React
state, Firebase for identity + per-user storage, and a small Cloudflare Worker proxy for the
optional AI tutor.

```text
content/                 # course.json + 10 lesson JSON files + reference.json (course + cheat sheet)
scripts/                 # validate-lessons.ts (CLI lesson + reference validator)
src/
  lib/                   # contentLoader · feedbackEngine · progressService · masteryService ·
                         #   reviewPlanner · learnerInsights · aiTutor · answerFormat ·
                         #   solutionService · sandbox · sound · inlineMarkup · referenceService ·
                         #   validateLesson · validateReference · lessonStatus · stepHelpers ·
                         #   constants · milestones · shuffle · reducedMotion · firebase  (+ *.test.ts)
  contexts/              # Auth · Progress · SessionInsights · Sound (Context + Provider each)
  hooks/                 # useQuizSession · useSessionExitGuard · useActionLock ·
                         #   useAssistancePreference · useSoundPreference · useCountUp
  components/
    auth/ common/ layout/ lesson/ widgets/ tutor/ reference/ roadmap/ habit/ profile/ dev/
  pages/                 # Landing, Login, Signup, Roadmap, Lesson, Practice, CustomPractice,
                         #   Review, LevelReview, TestOut, Profile, Settings
  types/                 # content.ts (domain types) + icons.ts (icon-name vocabulary)
tutor-proxy/             # Cloudflare Worker proxy for the AI tutor — holds the OpenAI
                         #   key server-side + verifies the Firebase ID token
firebase.json            # Hosting (SPA rewrite + security headers) + Firestore + Auth
firestore.rules          # per-user access rules + server-only aiUsage/config
vite.config.ts           # Vite + Tailwind + Vitest (+ manualChunks code-splitting)
```

Key features: instant client-side grading (math.js), interactive SVG graphs (secant/tangent,
area shading) plus a family of dedicated question widgets (construct-graph, paint-intervals,
select-region, tangent-line, integral-bounds, simulate, Riemann), a per-question **assistance
toggle** (solve-it walkthrough / hints / no help) with hand-authored worked solutions and
optional concept sandboxes, sequential unlock with a **test-out** path to skip levels,
per-lesson practice, **targeted review** (weakness + recency) and custom practice plus level
review, a level-gated **reference cheat sheet**, XP, streaks, **12 achievement milestones**,
**per-concept mastery** (which keeps moving with practice/review) shown on a profile dashboard
(stats, activity heatmap, weak areas), optional sound effects, account management, and a
hardened deploy (CSP + security headers). All **grading is deterministic and AI-free** — every
problem, hint, and answer key is hand-authored and checked in the browser. An **optional AI
concept tutor** (OpenAI, behind a secure Cloudflare Worker proxy) can layer on top to _explain_
a graded step or answer free-form questions from the roadmap — personalized with the learner's
concept mastery and recent activity; it never grades, and the app runs unchanged when it is
disabled (see **AI concept tutor** below).

## Firebase setup

1. Create a project at https://console.firebase.google.com
2. Enable **Authentication** → Email/Password and Google sign-in
3. Create a **Firestore** database (production mode)
4. Copy the web app config into `.env.local`:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
# Optional — App Check (Firestore hardening) + the AI tutor proxy URL (see below):
VITE_FIREBASE_APPCHECK_SITE_KEY=...
VITE_TUTOR_PROXY_URL=...
```

## AI concept tutor (optional)

After a step is graded, learners can optionally ask an AI tutor to _explain_ why their answer
was right or wrong and walk through the concept. The deterministic engine stays the only judge:
the model is handed the verdict and the correct answer and is asked only to explain.
Explanations are personalized with PII-free **learner-history** signals — the concept's mastery,
how long since it was last practiced, and the concepts missed earlier in the session. A
free-form **tutor chat** is also available from the roadmap (a floating button) for general
questions; the per-step explainer and the roadmap chat share one per-user rate limit. When the
tutor proxy URL isn't configured (including the zero-config demo and offline use), the tutor
simply stays hidden and nothing else changes.

The tutor talks to **OpenAI through a Cloudflare Worker proxy** (`tutor-proxy/`), never directly.
The OpenAI key lives only as a Worker secret, and every call is gated by CORS, a verified
Firebase ID token (only your signed-in users), and an optional per-user rate limit — so the key
can't leak and the public endpoint can't be used by strangers. The Worker runs on Cloudflare's
**free** plan, so the app can deploy publicly while staying on Firebase's free **Spark** plan (no
Cloud Functions / Blaze required).

To enable it, deploy the Worker and point the app at it (full walkthrough in
[`tutor-proxy/README.md`](./tutor-proxy/README.md)):

```bash
cd tutor-proxy
npm install
npx wrangler login
npx wrangler secret put OPENAI_API_KEY     # paste your key — stored only on Cloudflare
npx wrangler deploy                        # prints the Worker URL
```

Then put the Worker URL in the app's `.env.local` and rebuild + redeploy hosting:

```bash
# repo root .env.local
VITE_TUTOR_PROXY_URL=https://calculus-lab-tutor.<your-subdomain>.workers.dev
```

**Defense-in-depth.** OpenAI key as a Worker secret (off the client) → CORS locked to your
origins → a verified Firebase ID token (only your signed-in users) → an optional per-user daily +
burst cap in Workers KV → server-enforced follow-up/input caps. The hard financial backstop is a
monthly **usage limit set on the OpenAI key** in the OpenAI dashboard.

The OpenAI model id and limits live **server-side** in `tutor-proxy/`: `TUTOR_MODEL` and the
per-user caps (`TUTOR_DAILY_LIMIT` / `TUTOR_BURST_LIMIT`) in `wrangler.toml`, and the grounded
prompt in `src/prompt.ts`. Follow-up questions are capped per step (`MAX_FOLLOWUPS`, enforced on
both the client and the Worker).

For local end-to-end testing, run the Worker locally (`npm run dev` in `tutor-proxy/`, which
serves it at `http://localhost:8787`) with the `ALLOW_UNAUTHENTICATED` dev toggle so demo mode
can reach it, then set `VITE_TUTOR_PROXY_URL=http://localhost:8787` in `.env.local`. See
[`tutor-proxy/README.md`](./tutor-proxy/README.md) for details.

## Deploy

This project deploys to **Firebase Hosting** (project `calculus-lab`, see `.firebaserc`) as a
static SPA, with Firestore rules. The AI tutor proxy deploys separately to Cloudflare (see
[`tutor-proxy/README.md`](./tutor-proxy/README.md)).

```bash
npm run build
npx -y firebase-tools@latest deploy --only hosting,firestore:rules
# or scope it:
npx -y firebase-tools@latest deploy --only hosting
npx -y firebase-tools@latest deploy --only firestore:rules
```

Live at **https://calculus-lab.web.app**. Auth providers (Email/Password, Google) are enabled
in the Firebase Console; the deployed domains are authorized there by default.

## Security

Hosting serves a strict **Content-Security-Policy** plus `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and HSTS (all in
`firebase.json`). Per-user **Firestore rules** let signed-in users touch only their own
documents, while the AI tutor's usage counters/config are server-write-only. The OpenAI key
never reaches the browser (it lives only as a Cloudflare Worker secret), and `mathjs` is pinned
to a patched line. The full security review — findings, fixes, and accepted risks — is in
[`SECURITY.md`](./SECURITY.md).

## Testing

Unit tests (Vitest) live next to the code they cover under `src/lib/`, with coverage scoped to
`src/lib/**`:

| Test file | Covers |
|-----------|--------|
| `feedbackEngine.test.ts` | Answer grading + function/slope math |
| `progressService.test.ts` | Streaks, milestones, step progression, persistence |
| `contentLoader.test.ts` | Loading, levels, sessions, unlock/completion logic |
| `masteryService.test.ts` | Concept catalog + mastery/weak-area scoring |
| `reviewPlanner.test.ts` | Targeted-review ranking (weakness + recency) |
| `learnerInsights.test.ts` | Concept insight + session miss tally for the tutor |
| `aiTutor.test.ts` | Tutor context building + answer descriptions |
| `inlineMarkup.test.ts` | Inline math/markdown normalization + tokenizing |
| `referenceService.test.ts` | Reference grouping + level-gated unlocking |
| `validateLesson.test.ts` | Lesson-schema validation rules |
| `solutionService.test.ts` | "Solve it" answer seeds + worked-solution blocks |

```bash
npm run test            # run all
npm run test:coverage   # with coverage report (also written to /coverage)
```

## Mobile

Mobile-first UI: portrait and landscape layouts, 44px+ touch targets, safe-area insets, and
graphs that resize via `ResizeObserver`. Animations honor `prefers-reduced-motion`.
