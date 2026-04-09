# Vinylith — Library of Curiosities

Production-grade library management system for books, vintage vinyl records, toys, and notebooks.

## Stack

- **Next.js 15** (App Router, Turbopack) + **Tailwind CSS**
- **tRPC 11** — end-to-end type-safe API
- **Drizzle ORM** + **Neon Postgres**
- **NextAuth v5** — credentials auth with JWT sessions + roles
- **OpenAI embeddings** — with local mock fallback + text-search fallback
- **sonner** — toast notifications
- **@t3-oss/env-nextjs** — typed runtime env validation

## Production-grade features

### UI/UX
- Toasts on every mutation (success + error)
- Loading skeletons for catalog / item detail / dashboard
- Mobile-responsive nav with hamburger drawer
- Cursor-based pagination on the catalog
- URL search params so filters are shareable/bookmarkable

### Security & hardening
- **Typed env vars** — build fails if `DATABASE_URL` or `AUTH_SECRET` are missing/invalid
- **Rate limiting** — in-memory limiter on `register` (5/hour) and `search` (30/min) per IP
- **Role-enforced tRPC procedures**:
  - `publicProcedure` — list items, view item, register, search
  - `protectedProcedure` — borrow, return, view dashboard
  - `librarianProcedure` — create/update/delete items, log condition
  - Members **cannot** trigger any admin mutation — verified end-to-end
- Hashed passwords (bcrypt), JWT sessions

### AI & edge cases
- Real OpenAI `text-embedding-3-small` when `OPENAI_API_KEY` is set
- 8s timeout on embedding calls (abortable)
- Graceful fallback chain: OpenAI → deterministic mock → text ILIKE search
- Search response includes a `mode` field so the UI can show which engine handled the query

## Local development

```bash
npm install
npm run db:push          # push schema to Neon
npm run db:seed          # seed 5 sample items + admin user
npm run dev              # http://localhost:3000
```

**Test credentials**
- Admin: `admin@vinylith.dev` / `admin1234`
- Member: `jane@vinylith.dev` / `member1234`

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Start built app |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate a new Drizzle migration file |
| `npm run db:push` | Push schema directly (dev only) |
| `npm run db:migrate` | Apply migration files to the DB (production) |
| `npm run db:seed` | Seed sample data |

## Deploying to Vercel (free)

### 1. Push to GitHub
```bash
git init && git add -A && git commit -m "Initial commit"
git remote add origin https://github.com/<you>/vinylith.git
git push -u origin main
```

### 2. Import to Vercel
- Go to https://vercel.com/new
- Select your GitHub repo
- Framework preset: Next.js (auto-detected)

### 3. Environment variables (in Vercel project settings → Environment Variables)
| Key | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `AUTH_SECRET` | A 32+ char random string (`openssl rand -base64 32`) |
| `AUTH_URL` | `https://<your-domain>.vercel.app` |
| `OPENAI_API_KEY` | *(optional)* real embeddings if set |

The app will **refuse to build** without `DATABASE_URL` and `AUTH_SECRET` — that's the typed env guard catching misconfiguration early.

### 4. Run production migrations
Vercel will run `npm run build` automatically. For schema migrations, run from your local machine whenever you change the Drizzle schema:

```bash
# 1. Create migration file from schema changes
npm run db:generate

# 2. Commit the new file in drizzle/
git add drizzle && git commit -m "db: add migration"

# 3. Apply to production Neon (using prod DATABASE_URL)
DATABASE_URL="postgresql://…prod…" npm run db:migrate

# 4. Push code — Vercel redeploys
git push
```

Alternatively, add a one-time `postinstall` or Vercel build hook to run `db:migrate` automatically on every deploy.

### 5. First-time prod seed (optional)
```bash
DATABASE_URL="postgresql://…prod…" npm run db:seed
```
Then immediately change the seeded admin password through the UI.

## Architecture

```
┌──────────────────┐       tRPC        ┌───────────────────────┐
│  Next.js client  │ ◄───────────────► │  Next.js route (tRPC) │
│  (RSC + client)  │                   │  + NextAuth handlers  │
└──────────────────┘                   └───────────┬───────────┘
                                                   │
                            ┌──────────────────────┼──────────────────────┐
                            │                      │                      │
                       ┌────▼─────┐         ┌──────▼──────┐        ┌──────▼──────┐
                       │  Neon    │         │  OpenAI     │        │ Rate limit  │
                       │  Postgres│         │  embeddings │        │  (in-mem)   │
                       └──────────┘         └─────────────┘        └─────────────┘
```

## Project layout

```
src/
├── app/              # Next.js App Router
│   ├── api/          # tRPC + NextAuth routes
│   ├── items/        # catalog, detail, create
│   ├── search/       # AI search
│   ├── dashboard/    # user dashboard
│   ├── login/
│   └── register/
├── auth.ts           # NextAuth v5 config
├── env.ts            # Typed runtime env
├── components/       # navbar, skeletons
├── server/
│   ├── db/           # Drizzle schema + client
│   ├── api/routers/  # items, borrowings, users, search
│   ├── ai/           # embeddings + similarity + timeouts
│   ├── rate-limit.ts # in-memory limiter
│   └── trpc.ts       # public / protected / librarian procedures
├── trpc/react.tsx    # client provider
└── types/            # next-auth augmentation
drizzle/              # generated SQL migrations
scripts/              # seed.ts, migrate.ts
```

## Notes for scaling beyond free tier

- **Rate limiter** — in-memory works for a single serverless container. For multi-region, swap `src/server/rate-limit.ts` for `@upstash/ratelimit` (keeps the same interface).
- **Embeddings** — stored as `jsonb` for simplicity. For 10k+ items, enable `pgvector` in Neon and change `embedding` to `vector(1536)` for sub-linear ANN search.
- **File uploads** — item images currently take URLs. Add Vercel Blob or UploadThing for direct upload.
