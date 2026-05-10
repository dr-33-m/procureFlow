# ProcureFlow — Coding Guidelines

## Stack

- **Framework**: TanStack Start (SSR React, file-based routing)
- **State**: TanStack Query (server state) + Zustand (local UI state)
- **DB**: Drizzle ORM + PostgreSQL
- **Auth**: Logto (OIDC) via `@logto/node`
- **UI**: shadcn/ui + Tailwind CSS
- **Icons**: Lucide React (exclusively — do not introduce other icon libraries)
- **Toasts**: Sonner

---

## Project Structure

```
src/
  components/
    features/          # Feature-specific UI (one folder per domain)
      pantry/
      receiving/
      shopping-lists/
      settings/
        profile/       # Each complex feature gets its own subdirectory
        company/
    layout/            # App shell (sidebar, header, app-layout)
    ui/                # Shared primitives (shadcn/ui + custom)
  hooks/               # All business logic, queries, and mutations
  lib/
    query-manager/     # Query keys + query options per domain
      pantry/
        keys.ts
        options.ts
    utils.ts           # Pure utility functions (getInitials, cn, etc.)
  routes/              # TanStack Router file-based routes (thin)
  server/              # Server functions only (createServerFn)
  db/                  # Drizzle schema, seed, db client
  stores/              # Zustand stores
  types/               # Shared TypeScript types
```

---

## Layer Responsibilities

### `server/` — Server functions only
- Each file exports `createServerFn` handlers grouped by domain
- No business logic beyond DB queries and auth checks
- All DB access goes through Drizzle — never raw SQL strings
- Auth context via `getAuthContext()`, role enforcement via `requireRole()`

### `lib/query-manager/` — Keys + options
- `keys.ts`: defines the query key hierarchy as a typed object
- `options.ts`: returns `{ queryKey, queryFn, staleTime }` objects — no hooks, no side effects
- One folder per domain, mirrors the `server/` domain split

### `hooks/` — Business logic layer
- **All `useQuery` and `useMutation` calls live here** — never inside components
- Each mutation hook owns its `toast.success` / `toast.error` and `queryClient.invalidateQueries`
- Hooks compose query-manager options: `useQuery(getInventoryOptions(params))`
- One file per domain: `use-pantry.ts`, `use-company.ts`, `use-profile.ts`, etc.
- Hooks are the only place that imports from both `server/` and `lib/query-manager/`

### `components/` — Presentation only
- Components receive data and callbacks as props — no `useQuery`/`useMutation` directly
- Feature components import from `hooks/` and render the result
- Keep components small and focused on a single concern
- Complex features live in a subdirectory with an `index.tsx` orchestrator and separate sub-components
- Dialogs, sections, rows, and tabs are separate files — never inline inside a page file

### `lib/utils.ts` — Shared utilities
- Pure functions with no side effects or React imports: `cn`, `getInitials`, formatters, etc.
- If the same logic appears in 2+ files, it belongs here

### `types/` — Shared types
- All shared types exported from `src/types/index.ts`
- No domain types defined inside component or hook files unless truly local

---

## Component Rules

### Size
- If a component exceeds ~150 lines, split it. Orchestrators coordinate; leaf components render.
- A page component should mostly render sub-components, not raw JSX markup.

### Controlled vs stateful
- Prefer controlled components (props + callbacks) for reusable UI
- Only the orchestrator (page/index) owns multi-step state machines and save flows

### No direct server imports in components
- Components never import from `server/` directly
- All data flows through hooks

---

## Design System Consistency

- **Icons**: Lucide React only. Keep icon sizes consistent (`h-4 w-4` for actions, `h-3 w-3` for inline labels, `h-5 w-5` for empty states).
- **Colors**: Use semantic Tailwind tokens (`text-muted-foreground`, `bg-card`, `border-destructive`) — never hardcoded hex values.
- **Spacing**: Follow the existing rhythm — `space-y-6` between page sections, `space-y-1.5` within form fields, `gap-3` between inline elements.
- **Typography**: Stick to `text-sm` for body, `text-xs` for meta/hints, `font-medium` for labels/headings. No custom font sizes.
- **Badges**: Role, status, and tier badges always use `variant="outline"` with semantic color classes.
- **Loaders**: Use `<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />` for page-level loading, inline spinner in buttons.
- **Empty states**: `border-dashed` card with centered `text-sm text-muted-foreground`.
- **Toasts**: `toast.success` for completed actions, `toast.error` for failures — one line, no raw error objects.

---

## Mobile Responsiveness

Every component must work on mobile. Guidelines:
- Use responsive grid classes: `grid-cols-1 sm:grid-cols-2`, `grid-cols-1 sm:grid-cols-3`
- Prefer `flex-wrap` over fixed-width flex rows for action bars
- Tables on mobile: either scroll horizontally (`overflow-x-auto`) or collapse to card layout
- Dialogs use `sm:max-w-sm` / `sm:max-w-lg` — never fixed pixel widths
- Test sidebar collapsed state — icon-only mode must not break page layout

---

## Data Fetching Patterns

```ts
// ✅ Correct — hook owns the query
export function useInventoryItems(params) {
  return useQuery(getInventoryItemsOptions(params))
}

// ✅ Correct — hook owns the mutation
export function useAddInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => addInventoryItem({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      toast.success('Item added')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add item'),
  })
}

// ❌ Wrong — useQuery/useMutation inside a component
function MyComponent() {
  const { data } = useQuery({ queryKey: [...], queryFn: ... }) // not here
}
```

---

## Auth & Permissions

- Session data available via `useAuth()` — contains `userId`, `userName`, `userEmail`, `userRole`, `companyId`, `defaultBranchId`
- Role checks via `usePermissions()` — derive boolean flags, never compare `auth.userRole` directly in components
- Server-side enforcement via `requireRole(ctx, 'owner', 'admin')` in every sensitive server function
- Never trust client-side role checks alone for sensitive operations

---

## File Naming

| Thing | Convention |
|-------|-----------|
| Components | `kebab-case.tsx` |
| Hooks | `use-domain.ts` |
| Server functions | `domain.ts` |
| Query keys | `keys.ts` inside `query-manager/domain/` |
| Query options | `options.ts` inside `query-manager/domain/` |
| Route files | match TanStack Router file convention |
| Types | PascalCase, exported from `types/index.ts` |

---

## New Feature Checklist

Before shipping any new feature:

- [ ] Server function in `server/<domain>.ts`
- [ ] Query keys in `lib/query-manager/<domain>/keys.ts`
- [ ] Query options in `lib/query-manager/<domain>/options.ts`
- [ ] Hooks in `hooks/use-<domain>.ts`
- [ ] Components in `components/features/<domain>/` (subdirectory if complex)
- [ ] Route file in `routes/` (thin — imports page component, sets up `beforeLoad` if needed)
- [ ] Types in `types/index.ts`
- [ ] Shared utilities in `lib/utils.ts`
- [ ] Mobile responsive (test at 375px)
- [ ] Consistent with existing design system (icons, spacing, typography)
- [ ] Role-gated at both route level (`beforeLoad`) and server level (`requireRole`)
