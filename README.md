# procureFlow

A procurement operations platform built for F&B and hospitality teams. procureFlow connects the full purchasing cycle — from creating a shopping list and dispatching runners to verifying deliveries and tracking pantry stock — with full multi-tenant authentication, role-based access control, and company management built in.

## Core Modules

| Module | Description |
|--------|-------------|
| **Shopping Lists** | Create and manage procurement lists with product quantities, prices, and per-item supplier assignments. Supports AI-assisted draft generation from par levels and purchase history. |
| **Runner Mode** | Mobile-optimized view for runners to mark items as found/partial/not found, log purchased quantities and prices, and scan barcodes |
| **Receiving** | Managers verify incoming deliveries by counting received items against what was ordered and purchased; items are approved into pantry stock |
| **Pantry** | Live inventory of all stocked products with current quantities, units, and stock movement history |
| **Issuance** | Deduct stock from the pantry for kitchen or operational use; supports pack/single unit toggling and logs all transactions |
| **Dashboard** | Overview of pending lists, recent activity, spend summaries, and stock alerts — owner and admin only |
| **Company Settings** | Manage company details, subscription plan, branches, and team members across tabs |
| **Profile Settings** | Update display name, username, avatar, email, and password via Logto Account Center API |

## Roles & Access

procureFlow uses four roles with distinct access boundaries enforced at the route, UI, and server levels.

| Role | Access |
|------|--------|
| **Owner** | Full access to all modules, company settings, plan management, branch management, and member invites |
| **Admin** | All modules except plan management; can manage members and branches |
| **Chef** | Shopping lists (create, edit, generate), pantry, and issuance |
| **Runner** | Shopping lists assigned to them only — runner mode view |

Route guards (`beforeLoad`) redirect unauthorised roles before pages render. Server functions enforce `requireRole()` independently so the data layer is always protected regardless of client state.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (SSR via Vite + Nitro) |
| Routing | TanStack Router (file-based, type-safe) |
| Data Fetching | TanStack Query + `createServerFn` |
| Database ORM | Drizzle ORM |
| Database | PostgreSQL |
| Auth | Logto (OIDC) via `@logto/node` |
| Client State | Zustand (with `persist` middleware) |
| UI Components | shadcn/ui + Radix UI primitives |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Notifications | Sonner |
| Font | Geist |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- A [Logto](https://logto.io) tenant (cloud or self-hosted)

### Installation

```bash
git clone https://github.com/dr-33-m/procureFlow.git
cd procureFlow
pnpm install
```

### Environment

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://user:password@localhost:5432/procureflow
SESSION_SECRET=a-long-random-string-at-least-32-chars

LOGTO_ENDPOINT=https://your-tenant.logto.app
LOGTO_APP_ID=your-app-id
LOGTO_APP_SECRET=your-app-secret
```

### Logto Setup

1. Create a **Traditional Web** application in your Logto console
2. Set the redirect URI to `http://localhost:3000/auth/sign-in/callback`
3. Set the post-logout redirect URI to `http://localhost:3000/auth/sign-out/callback`
4. Enable the **Account Center** with `profile`, `email`, `username`, and `avatar` fields so users can update their details from within the app

### Database Setup

```bash
pnpm db:migrate   # apply schema migrations
pnpm db:seed      # seed demo data
```

### Development

```bash
pnpm dev
```

The app starts at `http://localhost:3000`. The first user to sign in and complete onboarding becomes the company **Owner**.

## Other Commands

```bash
pnpm build        # production build
pnpm typecheck    # TypeScript type checking
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm db:generate  # generate migrations from schema changes
pnpm db:studio    # open Drizzle Studio (DB browser)
```

## Project Structure

```
src/
├── components/
│   ├── features/         # domain-specific components (one folder per domain)
│   │   ├── dashboard/
│   │   ├── issuance/
│   │   ├── members/
│   │   ├── onboarding/
│   │   ├── pantry/
│   │   ├── receiving/
│   │   ├── settings/
│   │   │   ├── company/  # General, Plan, Branches, Members tabs
│   │   │   └── profile/  # Identity, Contact, Password, Email OTP
│   │   └── shopping-lists/
│   ├── layout/           # app shell (sidebar, header, app-layout)
│   └── ui/               # shared primitives (shadcn/ui + custom)
├── db/
│   ├── schema.ts         # Drizzle schema definitions
│   └── seed.ts           # demo data seeder
├── hooks/                # TanStack Query hooks per domain
├── lib/
│   ├── query-manager/    # query keys + options per domain
│   │   ├── company/
│   │   ├── dashboard/
│   │   ├── issuance/
│   │   ├── pantry/
│   │   ├── profile/
│   │   ├── receiving/
│   │   └── shopping-lists/
│   └── utils.ts          # shared pure utilities
├── routes/               # TanStack Router file-based routes
├── server/               # createServerFn handlers per domain
│   └── auth/             # Logto client, session, context, callbacks
├── stores/               # Zustand stores (branch context)
└── types/                # shared TypeScript types
drizzle/
└── migrations/           # SQL migration files
```

## Authentication & Onboarding

Authentication is handled by Logto (OIDC). On first sign-in, new users are sent to an onboarding flow where they either:

- **Create a company** — becomes the owner; creates the first branch
- **Join with an invite token** — redeems a token generated by an owner or admin, which assigns them their role and branch

Subsequent sign-ins sync the user's name and avatar from Logto and resolve their company membership automatically.

## Procurement Workflow

```
Shopping List Created
        │
        ▼
   [ pending ]
        │  Assigned to runner
        ▼
  [ shopping ]
        │  Runner marks all items
        ▼
  [ in_review ]
        │  Manager opens Receiving page
        │  Counts items, confirms each row
        ▼
 [ completed ]
        │  Items added to Pantry
        ▼
    Pantry Stock
        │  Issuance deductions
        ▼
  Transaction Log
```

### Receiving Item Statuses

| Status | Condition |
|--------|-----------|
| **Pending** | Item not yet confirmed by manager |
| **Matched** | Received quantity equals the requested amount |
| **Shortage** | Received quantity is less than requested |
| **Surplus** | Received quantity exceeds the requested amount |

All shortages and surpluses are counted as flagged issues in the receiving footer.

## Multi-Tenancy

Every record is scoped to a `companyId`. Branches scope data further for chefs and runners. Owners and admins have company-wide access and can switch between branches; chefs and runners are locked to their assigned branch.

## Roadmap

- [ ] Supplier purchase orders and invoice matching
- [ ] Spend reporting and export (CSV / PDF)
- [ ] Push notifications for list status changes

## License

procureFlow is licensed under the [GNU Affero General Public License v3.0](LICENSE).

This means if you run a modified version of procureFlow as a network service (SaaS), you must make your modified source code available to users of that service under the same license.
