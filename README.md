# Vinylith — Library Management System

A modern, full-featured library management system for diverse collections — books, vinyl records, toys, and notebooks. Built with a production-grade stack: Next.js 15, tRPC, Drizzle ORM, Neon PostgreSQL, NextAuth v5, AI-powered semantic search, Stripe payments, and Resend email.

**Live demo:** https://vinylith.vercel.app

---

## Features

### For Members
- **Browse catalog** — paginated item listing with type filters and sorting
- **AI semantic search** — natural language search powered by local Transformers.js embeddings (no API cost)
- **Borrow items** — one-click checkout with 14-day loan period
- **Waitlist** — join a queue when an item is checked out; get notified by email when it's your turn
- **Dashboard** — view active loans, overdue items, borrowing history, waitlist positions, and outstanding fees
- **Late fee payments** — pay overdue fees via Stripe Checkout directly from the dashboard
- **Password reset** — self-service forgot/reset password via email link

### For Librarians
- **Add items** — create new catalog entries with type-specific attributes, condition, and image URL
- **Log condition** — track item condition history with timestamped notes

### For Admins
- **Admin settings** — bulk import items via CSV or JSON drag-and-drop, manage and delete items
- **User management** — view all users, approve pending accounts, change roles, deactivate or delete users
- **All active loans** — overview of every item currently checked out

### System
- **Membership approval flow** — new users start as `pending` and require admin activation before borrowing
- **Overdue enforcement** — users with overdue items or unpaid fees are blocked from new checkouts
- **Transactional email** — borrow confirmations, waitlist notifications, password reset emails
- **Rate limiting** — in-memory fixed-window rate limiting on registration and search endpoints

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Toasts | Sonner |
| API | tRPC v11 + TanStack Query v5 |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Drizzle ORM |
| Auth | NextAuth.js v5 (JWT, credentials provider) |
| AI Search | Transformers.js — `Xenova/all-MiniLM-L6-v2` (local ONNX, free) |
| Payments | Stripe Checkout + Webhooks |
| Email | Resend (with console.log fallback in dev) |
| Env validation | @t3-oss/env-nextjs + Zod |
| Hosting | Vercel (frontend) + Neon (database) |

---

## Folder Structure

```
vinylith/
├── scripts/
│   └── seed.ts                  # Seeds 33 catalog items with real AI embeddings
│
├── src/
│   ├── app/                     # Next.js App Router pages
│   │   ├── page.tsx             # Landing / home page
│   │   ├── layout.tsx           # Root layout (Navbar, Toaster, SessionProvider)
│   │   ├── globals.css          # Tailwind base styles
│   │   │
│   │   ├── items/
│   │   │   ├── page.tsx         # Catalog listing with infinite scroll pagination
│   │   │   ├── new/page.tsx     # Add new item form (librarian+)
│   │   │   └── [id]/page.tsx    # Item detail — borrow, waitlist, condition history
│   │   │
│   │   ├── search/page.tsx      # AI semantic search page
│   │   ├── dashboard/page.tsx   # User dashboard — loans, waitlist, fees
│   │   │
│   │   ├── login/page.tsx       # Sign-in page
│   │   ├── register/page.tsx    # Registration → pending approval screen
│   │   ├── forgot-password/     # Request password reset email
│   │   └── reset-password/      # Consume reset token, set new password
│   │
│   │   ├── admin/
│   │   │   ├── settings/page.tsx  # Bulk import (CSV/JSON), item management
│   │   │   └── users/page.tsx     # User management — roles, deactivate, delete
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts   # NextAuth handler
│   │       ├── trpc/[trpc]/route.ts          # tRPC HTTP handler
│   │       └── webhooks/stripe/route.ts      # Stripe payment webhook
│   │
│   ├── components/
│   │   ├── navbar.tsx           # Sticky nav with mobile drawer, role-aware links
│   │   └── skeletons.tsx        # Loading skeleton components
│   │
│   ├── server/
│   │   ├── db/
│   │   │   ├── index.ts         # Drizzle + postgres-js client singleton
│   │   │   └── schema.ts        # Full database schema (tables, enums, relations, types)
│   │   │
│   │   ├── api/
│   │   │   ├── root.ts          # Registers all tRPC routers into appRouter
│   │   │   └── routers/
│   │   │       ├── items.ts         # CRUD, condition logs, cursor-based pagination
│   │   │       ├── borrowings.ts    # Checkout, return, active loans, fee calculation
│   │   │       ├── waitlist.ts      # Join/leave queue, position tracking, notify next
│   │   │       ├── users.ts         # Public registration
│   │   │       ├── adminUsers.ts    # Admin: list all users, setRole, deleteUser
│   │   │       ├── admin.ts         # Librarian: bulk import items, delete items
│   │   │       ├── payments.ts      # Stripe Checkout session creation
│   │   │       ├── search.ts        # Semantic search with rate limiting
│   │   │       └── auth.ts          # Forgot password / reset password flow
│   │   │
│   │   ├── ai/
│   │   │   └── embeddings.ts    # Transformers.js pipeline, cosine similarity, mock fallback
│   │   │
│   │   ├── email.ts             # Resend client, HTML email templates, email audit log
│   │   ├── stripe.ts            # Stripe client singleton, calcLateFee helper
│   │   ├── rate-limit.ts        # In-memory fixed-window rate limiter per IP
│   │   └── trpc.ts              # tRPC context, procedure factories (public/protected/librarian/admin)
│   │
│   ├── trpc/
│   │   └── react.tsx            # tRPC React client + QueryClient provider setup
│   │
│   ├── types/
│   │   └── next-auth.d.ts       # Augments Session & User types with id and role
│   │
│   ├── auth.ts                  # NextAuth config — credentials provider, JWT/session callbacks
│   ├── env.ts                   # Type-safe env variable validation with Zod
│   └── middleware.ts            # Protects /admin/* routes (redirects non-admins to home)
│
├── drizzle.config.ts            # Drizzle Kit config (reads .env.local)
├── next.config.ts               # Next.js config
├── tsconfig.json                # TypeScript config
└── .env.local                   # Local environment variables (not committed)
```

---

## Database Schema

### Tables

**`users`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | |
| `email` | text | Unique |
| `password_hash` | text | bcrypt |
| `role` | enum | `pending \| member \| librarian \| admin \| deactivated` |
| `created_at` | timestamp | |

**`items`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `type` | enum | `book \| vinyl \| toy \| notebook` |
| `title` | text | |
| `description` | text | Nullable |
| `condition` | enum | `mint \| near_mint \| good \| fair \| poor` |
| `image_url` | text | Nullable |
| `attributes` | jsonb | Type-specific metadata (author, artist, age range, etc.) |
| `embedding` | jsonb | 384-dim float array for AI search |
| `created_at` / `updated_at` | timestamp | |

**`borrowings`** — loan records
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `item_id` | uuid → items | Cascade delete |
| `user_id` | uuid → users | Cascade delete |
| `borrowed_at` | timestamp | |
| `due_at` | timestamp | 14 days from checkout |
| `returned_at` | timestamp | Null = still out |

**`condition_logs`** — item condition history
| Column | Type | Notes |
|---|---|---|
| `item_id` | uuid → items | |
| `condition` | enum | |
| `notes` | text | |
| `logged_by` | uuid → users | |
| `logged_at` | timestamp | |

**`late_fees`** — overdue charges ($0.25/day, max $10.00)
| Column | Type | Notes |
|---|---|---|
| `borrowing_id` | uuid → borrowings | |
| `user_id` | uuid → users | |
| `amount_cents` | integer | e.g. `250` = $2.50 |
| `paid_at` | timestamp | Null = unpaid |
| `stripe_session_id` | text | Set after Stripe Checkout |

**`waitlist`** — queue per item
| Column | Type | Notes |
|---|---|---|
| `item_id` | uuid → items | |
| `user_id` | uuid → users | |
| `joined_at` | timestamp | Queue order |
| `notified_at` | timestamp | Set when user is emailed "it's available" |
| `fulfilled_at` | timestamp | Set when user borrows or leaves queue |

**`password_reset_tokens`**
| Column | Type | Notes |
|---|---|---|
| `token` | text | 64-char hex, unique |
| `expires_at` | timestamp | 1 hour TTL |
| `used_at` | timestamp | One-time use |

**`email_logs`** — audit trail of all sent emails
| Column | Type | Notes |
|---|---|---|
| `to_email` | text | |
| `subject` | text | |
| `type` | text | `borrow_confirmation \| due_reminder \| password_reset` |
| `success` | boolean | |
| `error` | text | Populated on failure |

---

## Role System

| Role | Permissions |
|---|---|
| `pending` | Can sign in only; cannot borrow or browse restricted pages |
| `member` | Browse, borrow, join waitlist, pay fees |
| `librarian` | Everything above + add/edit items, log condition |
| `admin` | Everything above + manage users, bulk import, delete items |
| `deactivated` | Cannot sign in |

Route protection is enforced at two levels:
1. **Middleware** (`src/middleware.ts`) — blocks all `/admin/*` routes for sessions without `role === "admin"`
2. **tRPC procedures** — `adminProcedure` and `librarianProcedure` throw `FORBIDDEN` if role requirements aren't met

---

## AI Semantic Search

Search uses **Transformers.js** with the `Xenova/all-MiniLM-L6-v2` model running entirely in Node.js — no external API calls, no cost, no rate limits:

1. **Indexing** — when an item is created or imported, a 384-dimensional embedding vector is generated and stored as a JSONB array in the database
2. **Query** — the user's search query is embedded with the same model
3. **Ranking** — cosine similarity is computed in-memory across all items and results are sorted by score
4. **Mode indicator** — the UI shows whether results came from `"ai"` (real model), `"mock"` (deterministic fallback), or `"fallback"` (error)

The ONNX model is cached in `.cache/transformers` after first load (~23MB download).

---

## Environment Variables

Create a `.env.local` file at the project root:

```env
# Required
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
AUTH_SECRET=any-long-random-string
AUTH_URL=http://localhost:3000

# Optional — app gracefully falls back if not set
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Missing required variables cause the build to fail immediately with a clear error message (via `@t3-oss/env-nextjs`).

---

## Getting Started

### Prerequisites
- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database (free tier is sufficient)

### Local Setup

```bash
# 1. Clone
git clone https://github.com/samircoding575/vinylith.git
cd vinylith

# 2. Install dependencies
npm install

# 3. Set up environment
# Create .env.local and fill in DATABASE_URL and AUTH_SECRET at minimum

# 4. Push schema to database
npm run db:push

# 5. Seed with 33 sample items
npm run db:seed

# 6. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Creating Your First Admin Account

1. Register a new account at `/register`
2. Promote it to admin directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

All future user approvals can be done from the `/admin/users` UI.

---

## Available Scripts

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # TypeScript check (no emit)
npm run db:push      # Apply schema to database
npm run db:generate  # Generate Drizzle migration files
npm run db:seed      # Seed with 33 sample catalog items
```

---

## Deployment

The app deploys to **Vercel** (frontend) + **Neon** (database) — both have free tiers with no credit card required.

### Deploy Steps

1. Push this repo to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in the Vercel dashboard
4. Deploy — Vercel rebuilds and redeploys automatically on every push to `main`
5. Run `npm run db:push` against your production Neon URL to apply the schema

### Stripe Webhook Setup (for live payments)

1. In the [Stripe dashboard](https://dashboard.stripe.com/webhooks), add an endpoint:
   - **URL:** `https://your-domain.vercel.app/api/webhooks/stripe`
   - **Event:** `checkout.session.completed`
2. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel environment variables

---

## Key Design Decisions

- **tRPC over REST** — end-to-end type safety from DB schema to React components, zero boilerplate API contracts
- **Cursor-based pagination** — avoids offset performance degradation at scale; cursor is the last item's `createdAt` ISO string
- **Local AI embeddings** — Transformers.js ONNX runs in Node.js with no external dependency, no token limits, no cost
- **Fire-and-forget emails** — sends use `.catch(console.error)` so a Resend outage never breaks a checkout or return
- **In-memory rate limiting** — simple fixed-window per IP; resets on server restart (appropriate for Vercel's serverless model)
- **Pending membership** — prevents drive-by signups from immediately borrowing; admin must explicitly approve each user

---

## License

MIT
