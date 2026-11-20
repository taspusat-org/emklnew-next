# AGENTS.md — Frontend (emklnew-next)

Guidance for Codex when working in this repository.

## Scope

**This file covers the frontend only.** The backend is a separate NestJS repo at
`../emklnew-nest` with its own `AGENTS.md` — read that one before touching server code.

Work in one repo at a time. When a task spans both, state the API contract change first,
implement it in the backend repo, then wire the frontend. Never assume an endpoint exists:
verify it in `../emklnew-nest/src/modules/<module>/*.controller.ts`.

## Project

ERP frontend for EMKL / freight forwarding operations (PT. Transporindo Agung Sejahtera).
Next.js 16 App Router + TypeScript, consuming the NestJS REST API (default
`http://localhost:5004`).

The app is a dense, grid-driven back-office system: ~90 modules under `app/dashboard`, each
one a master-data or transaction screen built from a data grid + modal form + report/export.

## Commands

```bash
npm run dev            # dev server on :5000
npm run build          # production build
npm run lint           # eslint
npm run format         # prettier write
npm test               # jest (unit/component)
npm run test:global    # global suite, separate config
npm run deploy         # maintenance on -> build -> maintenance off (pm2)
```

Always run `npm run lint` and the relevant tests before declaring work complete.
Do not run `npm run deploy` or any pm2 command unless explicitly asked.

## Architecture

Data flows in one direction. Never skip a layer.

```
app/dashboard/<module>/page.tsx        route shell, lookup bootstrap
  └─ components/Grid*.tsx              react-data-grid list + toolbar
  └─ components/Form*.tsx              react-hook-form + zod modal form
       └─ lib/server/use<Module>.ts    react-query hooks (queries, mutations, cache keys)
            └─ lib/apis/<module>.api.ts  axios calls, request/response shaping
                 └─ lib/utils/AxiosInstance.ts  auth, timeouts, offline, refresh
```

| Path                              | Responsibility                                                          |
| --------------------------------- | ----------------------------------------------------------------------- |
| `app/dashboard/<module>/`         | Route + module-local components. No cross-module imports.               |
| `app/api/`                        | Next route handlers: NextAuth, grid config persistence, printer bridge. |
| `app/reports/<module>/`           | Stimulsoft report designer/viewer pages.                                |
| `lib/apis/*.api.ts`               | One file per backend resource. Pure functions returning typed data.     |
| `lib/server/use*.ts`              | react-query wrappers. Owns cache keys, invalidation, loading dispatch.  |
| `lib/validations/*.validation.ts` | Zod schemas. `z.infer` is the single source of form types.              |
| `lib/types/*.type.ts`             | API response interfaces and filter shapes.                              |
| `lib/store/`                      | Redux Toolkit slices (global) + `store/client/` zustand stores (UI).    |
| `lib/utils.ts`, `lib/utils/`      | Formatting, query builders, grid config, axios instance.                |
| `components/custom-ui/`           | Shared domain widgets: LookUp, InputCurrency, ActionButton, filters.    |
| `components/ui/`                  | shadcn primitives. Do not hand-edit; regenerate via shadcn.             |
| `hooks/`                          | Cross-cutting hooks: permissions, breakpoints, debounce, report PDF.    |

## Non-negotiable rules

1. **Use `api2` for backend calls.** `api` points at this Next app itself and exists only for
   a few legacy `/api/*` handlers. New backend work always goes through `api2`.
2. **Path alias `@/`** for every non-sibling import. No `../../..` chains.
3. **Zod first.** Define the schema in `lib/validations/`, derive the TS type with `z.infer`,
   and wire it through `zodResolver`. Never declare a parallel form interface by hand.
4. **No direct axios in components.** Components call `lib/server` hooks; hooks call `lib/apis`.
5. **Reuse `components/custom-ui`** before writing a new input, lookup, or dialog. This
   codebase already has a widget for nearly every field type.
6. **Never edit `components/ui/*` by hand** and never touch the `turbopack.resolveAlias`
   stub map in `next.config.js` — it exists to keep Stimulsoft's node-only deps out of the
   browser bundle. Breaking it breaks the build.
7. `typescript.ignoreBuildErrors` is `true`. A green build proves nothing. Verify types with
   `npx tsc --noEmit` on the files you touched.
8. Do not commit `.env`, `dump.rdb`, `gridConfig.json`, or `*.tsbuildinfo`.

## Adding a module

Mirror an existing module of the same shape (`hutang` for header/detail transactions,
`bank` for flat master data). Required pieces, in order:

1. `lib/types/<module>.type.ts` — response + filter interfaces.
2. `lib/validations/<module>.validation.ts` — zod schema(s), header and detail separately.
3. `lib/apis/<module>.api.ts` — `get*Fn`, `store*Fn`, `update*Fn`, `delete*Fn`. Accept
   `signal?: AbortSignal` on list endpoints; build params with `buildQueryParams`.
4. `lib/server/use<Module>.ts` — `useGet*`, `useCreate*`, `useUpdate*`, `useDelete*`.
   Dispatch `setProcessing`/`setProcessed`, invalidate the query key on mutation success,
   surface failures through `useAlert`.
5. `app/dashboard/<module>/page.tsx` + `components/Grid*.tsx`, `Form*.tsx`, `FilterGrid.tsx`.
6. Register the route in the backend ACL so `usePermissions` resolves it.

## Backend contract

- List endpoints accept `search`, `page`, `limit`, `sortBy`, `sortDirection`, `isLookUp`
  plus arbitrary filter keys. Build them with `buildQueryParams`; the server clamps
  `page < 1` to `1`. `limit: 0` means "no limit".
- Responses carry the paged window plus `pagination`; the backend caches pages in Redis, so
  a mutation response already contains the page the new row landed on. Use it to position
  the grid instead of refetching blindly.
- Reports and exports are asynchronous jobs: the endpoint returns a `jobId`, progress
  arrives over socket.io on the `/report` namespace as `report:progress`, and completion
  carries a `downloadUrl`. `ReportProgressProvider` and `useReportPdf` already implement
  this — do not poll.
- Errors come back as NestJS HTTP exceptions; zod failures are a `400` with an array of
  issues. Surface them via `useAlert`, never as a raw exception string.

## Grids

Grids are `react-data-grid` and follow a fixed contract:

- Server-side pagination, sorting, and per-column filtering. Debounce filter input.
- Column order and widths persist per user via `saveGridConfig` / `loadGridConfig` /
  `resetGridConfig` in `lib/utils.ts`, keyed `Grid<Name>-<userId>`. Reordering uses
  `DraggableColumn`; right-click uses `handleContextMenu`.
- Cancel in-flight list requests with `cancelPreviousRequest` before issuing a new one —
  stale responses landing late corrupt the visible window.
- Use `LoadRowsRenderer` / `EmptyRowsRenderer` for loading and empty states, and
  `highlightText` for search matches.

## Forms

- `react-hook-form` + `zodResolver`, modal-based, header/detail arrays via `useFieldArray`.
- Relational fields use `LookUp` / `LookUpModal`, hydrated on the page through
  `lookupSlice` (`setData`, `setDefault`, `setType`). Lookups marked `type === 'local'` are
  cached in Redux; anything else queries on demand.
- Currency uses `InputCurrency` with `formatCurrency` / `parseCurrency`. Dates are
  `dd-mm-yyyy` throughout — use `formatDateToDDMMYYYY` / `parseDateFromDDMMYYYY`.
- Field max lengths come from `fieldLength(<module>)` into `fieldLengthSlice`.

## State

- **Redux Toolkit** (`lib/store/`) for shared app state. Only `auth`, `menu`, `search`, and
  `report` are persisted — do not add to the whitelist without reason.
- `loadingSlice` drives the global overlay; every long operation must pair
  `setProcessing` with `setProcessed` in a `finally`.
- **zustand** (`lib/store/client/`) for imperative UI: `useAlert`, `useOfflineOverlay`.
- **react-query** owns server state. Do not mirror API responses into Redux.

## Auth and permissions

NextAuth (JWT) with refresh handled inside `AxiosInstance`: 401 triggers one refresh and
retry, 403 never retries. Route protection is in `proxy.ts`. Feature-level checks use
`usePermissions().hasPermission(subject, action)` — gate every create/update/delete control.

## Testing

Jest + Testing Library, `jsdom`. Tests live in `__tests__/` next to the code under test.
Cover validation schemas, api param building, and form/grid behaviour. Mock at the
`lib/apis` boundary, not axios.

## Style

- Prettier is authoritative: single quotes, semicolons, 2 spaces, no trailing commas, LF.
  `lint-staged` formats on commit via husky.
- TypeScript `strict`. Avoid `any`; if unavoidable, narrow at the boundary.
- `no-console` is a lint warning — remove debug logging before committing.
- **Comments: short and rare.** One line, only where the _why_ is not obvious from the code
  (a workaround, a race condition, a backend quirk). No block headers, no banners, no
  restating what the next line does, no emoji, no commented-out code.
- Match the surrounding file's language and idiom. Existing comments are mixed
  Indonesian/English — follow whatever the file already uses.
