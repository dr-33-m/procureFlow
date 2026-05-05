# procureFlow

A procurement operations platform built for F&B and hospitality teams. procureFlow connects the full purchasing cycle — from creating a shopping list and dispatching runners to verifying deliveries and tracking pantry stock.

## Core Modules

| Module | Description |
|--------|-------------|
| **Shopping Lists** | Create and manage procurement lists with product quantities, prices, and per-item supplier assignments |
| **Runner Mode** | Mobile-optimized view for runners to mark items as found/partial/not found, log purchased quantities and prices, and scan barcodes |
| **Receiving** | Managers verify incoming deliveries by counting received items against what was ordered and purchased; items are approved into pantry stock |
| **Pantry** | Live inventory of all stocked products with current quantities, units, and stock movement history |
| **Issuance** | Deduct stock from the pantry for kitchen or operational use; supports pack/single unit toggling and logs all transactions |
| **Dashboard** | Overview of pending lists, recent activity, spend summaries, and stock alerts |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (SSR via Vite + Nitro) |
| Routing | TanStack Router (file-based, type-safe) |
| Data Fetching | TanStack Query + `createServerFn` |
| Database ORM | Drizzle ORM |
| Database | PostgreSQL |
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

### Installation

```bash
git clone https://github.com/your-org/procureFlow.git
cd procureFlow
pnpm install
```

### Environment

Copy the example env file and fill in your database credentials:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://user:password@localhost:5432/procureflow
MOCK_HOTEL_ID=your-hotel-uuid
```

### Database Setup

```bash
pnpm db:migrate   # apply schema migrations
pnpm db:seed      # seed demo data
```

### Development

```bash
pnpm dev
```

The app starts at `http://localhost:3000`.

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
│   ├── features/         # domain-specific components
│   │   ├── issuance/
│   │   ├── pantry/
│   │   ├── receiving/
│   │   └── shopping-lists/
│   ├── layout/           # app shell (sidebar, header)
│   └── ui/               # shared primitives
├── db/
│   ├── schema.ts         # Drizzle schema definitions
│   └── seed.ts           # demo data seeder
├── hooks/                # TanStack Query hooks per domain
├── lib/                  # utilities (format, constants)
├── routes/               # TanStack Router file-based routes
├── server/               # createServerFn handlers
├── stores/               # Zustand stores
└── types/                # shared TypeScript types and enums
drizzle/
└── migrations/           # SQL migration files
```

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

### Receiving Status Logic

| Status | Condition |
|--------|-----------|
| **Pending** | Item not yet confirmed by manager |
| **Matched** | Received quantity equals or exceeds the original requested amount |
| **Shortage** | Received quantity is less than requested (includes confirmed zeros) |
| **Surplus** | Received quantity exceeds the original requested amount |

All shortages and surpluses are counted as flagged issues in the receiving footer.

## Multi-Tenancy

All database records are scoped to a `hotelId` foreign key. Currently the tenant is set via the `MOCK_HOTEL_ID` environment variable. Full authentication, company onboarding, and role-based access are on the roadmap (see below).

## Roadmap

- [ ] Authentication (sign up / sign in / session management)
- [ ] Company and user onboarding flow
- [ ] Tiered plan access (feature gates per plan tier)
- [ ] Role-based access control (manager, runner, admin)
- [ ] Supplier purchase orders and invoice matching
- [ ] Spend reporting and export (CSV / PDF)

## License

procureFlow is licensed under the [GNU Affero General Public License v3.0](LICENSE).

This means if you run a modified version of procureFlow as a network service (SaaS), you must make your modified source code available to users of that service under the same license.
