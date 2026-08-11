# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Akio — a full-stack food ordering app. Monorepo with two independent Node/npm projects: `backend/` (Express 5 API) and `frontend/` (React 19 + Vite). Two developers split the codebase: customer-facing backend+frontend vs. the admin panel — this split is still visible in the route/controller naming (`admin*` prefix everywhere on the admin side).

The app is currently **single-restaurant in practice**: the schema is shaped for multi-tenancy (`restaurant_id` on most tables) but there is no restaurant-selection UX anywhere in the frontend. Public/customer-facing queries scope to `(SELECT id FROM restaurants WHERE is_active = TRUE LIMIT 1)` — the one active restaurant — rather than accepting a tenant selector. Keep this convention when touching public endpoints; don't assume multi-restaurant selection exists.

## Commands

### Backend (`backend/`)
```bash
npm run dev              # nodemon src/server.js — auto-restarts on file changes
npm start                # node src/server.js — no auto-restart
npm test                 # vitest run — hits the real local dev DB (see tests/helpers.js), no separate test DB
node src/scripts/seedAdmin.js   # create the first admin user from ADMIN_EMAIL/ADMIN_PASSWORD in .env
```
`src/app.js` exports the Express app separately from `src/server.js` (which just calls `app.listen`) specifically so `tests/*.test.js` can import `app.js` and drive it with `supertest` without binding a port. No lint script configured for the backend.

Migrations are plain numbered `.sql` files, no migration-runner/tracking table — apply manually in order:
```bash
psql -U postgres -d food_ordering_db -f src/db/migrations/001_create_users.sql
# ... through the highest-numbered file in src/db/migrations/
```
All migrations use `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so they're safe to re-run. `src/db/migrations/README.md` documents the table purposes but check the actual directory listing for the current highest migration number — the README lags behind new migrations.

### Frontend (`frontend/`)
```bash
npm run dev       # vite dev server
npm run build     # production build (vite build)
npm run lint      # eslint .
npm run preview   # preview a production build locally
npm test          # vitest run — jsdom environment, config lives in vite.config.js's `test` block
```
Tests are co-located with source (`Component.test.jsx` next to `Component.jsx`), using `@testing-library/react` + `vitest`. Coverage is intentionally scoped to the highest-value pieces (error handling, route guarding, shared admin CRUD hook), not exhaustive across all ~60 components.

### Running the app locally
Both servers must run simultaneously (separate terminals): backend on `PORT` from `backend/.env` (default 5000), frontend via Vite (default 5173). `frontend/.env`'s `VITE_API_URL` must point at wherever the backend is actually running — it's easy for this to drift to a stale/production URL; if auth or cart behavior looks broken, check this first before debugging code. Vite bakes `VITE_API_URL` in at dev-server startup, so changing `frontend/.env` requires restarting the Vite process, not just a browser refresh.

The backend **fails fast at startup** if any required env var is missing (`JWT_SECRET`, `DB_*`, `RAZORPAY_*`, `CLOUDINARY_*`) — see `src/app.js`. If the server won't boot, check the startup error for exactly which var is unset before looking anywhere else.

`REDIS_URL` and `MSG91_*` are optional — both degrade gracefully when unset (in-memory rate-limit/lockout/blacklist state, and OTPs logged to the console instead of texted) so local dev needs neither configured. See the "Registration" and "Shared state" sections below.

## Architecture

### Auth: two entirely separate systems sharing one JWT secret
Customer auth (`middleware/auth.js`, cookie/header `token`) and admin auth (`middleware/adminAuth.js`, cookie/header `admin_token`) are fully independent — separate tables (`users` vs `admin_users`), separate login/register controllers, separate React contexts (`AuthContext` vs `AdminAuthContext`) and separate route guards on the frontend. They share `JWT_SECRET`, so **every JWT must carry a `type: "customer"` or `type: "admin"` claim**, and both middlewares reject tokens missing or mismatching that claim — this is load-bearing, not decorative; don't add a new token-issuing path without setting `type`.

Admin roles (`admin_users.role`): `owner` / `manager` / `staff`, gated per-route via `requireRole(...)` in `middleware/adminAuth.js`. Only `owner` can register new admins or create/toggle a restaurant.

Auth cookies (`utils/cookieOptions.js`): `secure` is tied to `NODE_ENV === "production"`, `sameSite` is configurable via `COOKIE_SAME_SITE` (defaults to `"strict"`). If frontend and backend are ever deployed on different domains (not just different ports), `COOKIE_SAME_SITE=none` must be set on the backend or the cookie silently won't be sent cross-site — this has caused real "gets logged out after a few minutes" bugs in this app before.

### Customer registration is OTP-gated — no unverified accounts ever exist
`POST /api/auth/register/send-otp` validates the details and texts a 6-digit code to the phone (via MSG91, or logged to the console/returned as `dev_otp` in the response when `MSG91_AUTH_KEY` isn't set). **No user row is created at this point** — the pending registration (name, email, hashed password) sits in `utils/otpStore.js` (Redis-or-in-memory, 10 min TTL) keyed by phone, alongside the hashed OTP and an attempt counter. Only `POST /api/auth/register/verify-otp` with the correct code actually `INSERT`s the user, with `phone_verified = TRUE`. Phone uniqueness is enforced at the application layer in `sendRegistrationOtp` (checked again in `verifyRegistrationOtp` in case of a race), not a DB constraint — the live dev DB has pre-existing duplicate test phone numbers blocking a `UNIQUE` constraint from being added; see the comment in `migrations/017_add_phone_verified.sql`.

**Phone number is immutable once set** — `profileController.updateProfile` only ever accepts/writes `name`; it silently ignores `phone` even if a client sends one (`updateProfileSchema` in `utils/validation.js` doesn't include it, and Zod's `safeParse` strips unknown keys). Don't add phone back to that schema without deliberately deciding to reopen it.

This flow only applies to plain email/password signup — Google OAuth registration (`googleAuthController.googleLogin`) is untouched and doesn't collect or verify a phone number at all.

### Customer gets texted + in-app notified when their order is marked "ready"
`adminOrderController.updateOrderStatus` — after the status-update transaction commits, if the new status is `ready`, it looks up the customer's phone/name and calls `sendOrderReadySms` (`config/msg91.js`), a second MSG91 Flow template distinct from the OTP one (MSG91 templates are fixed pre-approved content per message type, so this can't reuse `sendOtpSms`). Needs `MSG91_ORDER_READY_TEMPLATE_ID` in `.env` (falls back to logging in dev mode, same pattern as OTP) — see `.env.example` for the two template variables it substitutes (`MSG91_CUSTOMER_NAME_VARIABLE_NAME`/`MSG91_ORDER_ID_VARIABLE_NAME`). This is deliberately best-effort: wrapped in try/catch *outside* the DB transaction, so an SMS failure never blocks or rolls back the status update.

On the frontend, `hooks/useOrderNotifications.js` (polls `/api/orders` every 15s, mounted globally via `PillNav.jsx` so it's active on every customer page, not just the Orders page) already fires an in-app notification-bell entry on any status transition it recognizes (`STATUS_MESSAGES`: confirmed/preparing/ready/completed) — but only the `ready` transition additionally pops a `sonner` toast, since that's the one status a customer needs to actively notice and act on (go collect the order) rather than just see later in the bell dropdown. If you add a new status the customer should be actively alerted to, follow this same "toast for the urgent one, badge-only for the rest" split rather than toasting everything.

### "Recently Ordered" on Home — visibility is derived, not a stored flag
`GET /api/orders/recent-items` (`orderController.getRecentlyOrderedItems`) returns up to 5 distinct menu items the logged-in customer has ordered before (most recent first, `status != 'cancelled'`, `is_available = TRUE` only — an item that's since been taken off the menu or came from a cancelled order won't show up). **Route ordering matters here**: it's registered in `orderRoutes.js` *before* `GET /:orderId`, otherwise Express would match `recent-items` as an `:orderId` value on that wildcard route instead. `Home.jsx` renders the whole section conditionally on `recentItems.length > 0` — there's no separate "has this customer ever ordered" flag; an empty array *is* the signal to hide the section, which is also what makes it correctly disappear if all their past items become unavailable, not just for brand-new customers. The card/add-to-cart markup and handlers (`getCartQuantity`, `handleIncrement`/`handleDecrement`/`handleAddToCart`) are duplicated from `MenuPage.jsx`'s pattern rather than shared — extract a hook if a third page needs the same add-to-cart wiring.

### Order/payment lifecycle — the part most bugs cluster around
1. `POST /api/orders/place` — creates the order from the cart, status starts at `pending`. Cart's restaurant is locked via `SELECT ... FOR UPDATE` before reading, and a cart can only ever hold items from one restaurant at a time (enforced in `cartController.addToCart`).
2. `POST /api/payments/create-order` → Razorpay order created, amount comes from the DB (`orders.total_amount`), never from the client.
3. Razorpay checkout happens client-side; `POST /api/payments/verify` confirms via HMAC signature (constant-time compare).
4. **Order status stays `pending` after payment succeeds** — payment completing and order status advancing are deliberately decoupled; only an admin action (`PUT /api/admin/orders/:id/status`) moves it to `accepted`/`preparing`/`ready`/`completed`/`cancelled` (full enum in `utils/adminValidation.js`). This means a paid order can sit in `pending` for a while — the customer-facing self-refund endpoint only blocks refunds once status leaves `pending`, so "paid but not yet accepted" is a window where a customer can still self-refund. Know this before assuming refund logic is airtight against abuse — it's an intentional-looking gap, not yet resolved as a business decision.
5. Admin cancelling an order (`updateOrderStatus` with `status: "cancelled"`) auto-refunds via Razorpay in the same transaction. Customer-initiated cancel (`orderController.cancelOrder`) mirrors this same auto-refund behavior.

### Multi-tenant scoping pattern
Every admin-side write (menu items, categories, tables, orders) must scope by `restaurant_id = req.admin.restaurant_id` **directly on the mutating query itself**, not just on an earlier ownership-check `SELECT` — several past bugs here were exactly this: a `SELECT` correctly checked ownership, but the follow-up `UPDATE`/`DELETE` didn't repeat the check and would have silently accepted a cross-restaurant write if the two ever became decoupled. Follow the existing pattern (e.g. `categoryController.deleteCategory`) rather than the pattern where only the `SELECT` is scoped.

There is no `public_id` column anywhere for Cloudinary assets — only the full `image_url` is stored. Any code that needs to verify "does this admin own this uploaded image" has to substring-match the URL against the admin's own restaurant's stored URLs (see `uploadController.deleteImage`) — use `POSITION($1 IN image_url) > 0`, not `LIKE '%' || $1 || '%'`, since the latter lets SQL wildcard characters (`%`, `_`) in user input produce false-positive ownership matches.

### Error handling
Controllers `next(error)` to a single `middleware/errorHandler.js`, which redacts messages/stack traces when `NODE_ENV === "production"` and logs via `utils/logger.js` (pino, structured JSON) with `req.id`/`userId`/`adminId` context. Follow this pattern for any new controller — don't `res.status(500).json({message, error: error.message})` directly, which bypasses both the redaction and the structured logging (this was a real, repeated bug pattern across ~60 call sites at one point). Every request gets a `req.id` (set by `middleware/requestId.js`, first middleware in the chain) — thread it through any new `logger.error(...)`/`logger.info(...)` call so a single failure is traceable across the morgan access-log line, the error log line, and the `requestId` field in the JSON error response the client saw.

### Shared state: Redis-or-in-memory, everywhere it matters
Rate limiting (`middleware/rateLimiter.js`), login lockout (`utils/loginLockout.js`), the logout token blacklist (`utils/tokenBlacklist.js`), and the OTP store (`utils/otpStore.js`) all check `utils/redisClient.js` (non-null only if `REDIS_URL` is set) and use Redis when available, falling back to an in-memory `Map`/counter otherwise. **This in-memory fallback is per-process** — it silently stops working correctly (each instance has its own separate counters) the moment this app runs as more than one backend instance. Fine for local dev and a single-instance deploy; set `REDIS_URL` before ever running this behind a load balancer or with multiple replicas. When adding a new piece of state that needs to survive/coordinate across requests, follow this same pattern rather than a bare in-memory `Map`.

### Pagination pattern on order-listing endpoints
`GET /api/orders`, `/api/profile/orders`, and `/api/admin/orders` all take `?page=&limit=` (default 20, max 50) and batch-fetch related rows (items, payments) in one extra query via `WHERE x = ANY($1)` rather than looping per-row — follow this pattern for any new list endpoint over `orders`/`order_items`/`payments` rather than a per-row query loop, which was a real N+1 performance bug here before.

### Frontend structure
- `src/services/api.js` — single shared axios instance (`withCredentials: true`); every API call in the app goes through this, no raw `fetch()` calls exist. Its response interceptor redirects to `/login` on 401 (only when the *current page* is `/cart`, `/orders`, or `/profile`), and separately shows a deduplicated `sonner` toast (`id: "network-error"` / `id: "server-error"`) for any request with no response or a 5xx status — this is the one place that catches "the backend is down/overloaded" globally, so individual components don't each need to handle that case themselves.
- `App.jsx` is wrapped in `components/ErrorBoundary.jsx` (catches render-time crashes anywhere in the tree, shows a full-page "Oops" fallback with a reload button) and renders `components/OfflineBanner.jsx` unconditionally at the top level (driven by `hooks/useOnlineStatus.js`, a `navigator.onLine` + online/offline-event hook) — both are global, not tied to any specific route.
- `src/pages/MenuPage.jsx` composes five focused components from `src/components/menu/` (`MenuSearchHeader`, `CategoryGrid`, `ViewAllItems`, `CategoryItemList`, `ItemDetailModal`) — state/data-fetching/derived-filtering logic lives in `MenuPage.jsx`, presentation lives in the sub-components.
- Admin CRUD pages (`AdminCategories`, `AdminMenuItems`, `AdminTables`) share `hooks/useAdminCrud.js` (fetch/open/submit/delete plumbing) and `hooks/useImageUpload.js` — when adding a new admin resource page, use these hooks rather than re-implementing the fetch/modal/save pattern.
- Order-notification polling (customer `hooks/useOrderNotifications.js`, admin `hooks/useAdminOrderNotifications.js`) share a generic `hooks/usePollingNotifications.js` engine; each supplies its own "what counts as new" diff strategy (status-transition vs. new-order-detection) since those are genuinely different algorithms, not just different config.

### Admin panel: shared components + trend/export patterns
Admin list pages (`AdminLedger`, and progressively others) build on three shared components in `src/components/admin/`: `AdminPageHeader` (title/subtitle + a right-aligned `actions` slot — use this instead of an ad hoc `<h1>`), `AdminTable` (generic sortable/selectable table), and `AdminStatCard` (stat card with an optional `trend` prop, `{direction: "up"|"down", percent}`). Use these for any new admin list/dashboard page rather than re-rolling the markup.

Period-over-period trend deltas (`analyticsController.getAnalyticsSummary`) are computed server-side via `computeTrend(current, previous)`, which returns `null` — not `0%` — when the previous-period value is `0`, so the frontend can distinguish "no baseline to compare against" from "flat 0% change" and simply omit the trend line (`AdminStatCard` renders nothing when `trend` is falsy). The summary query fetches all three periods (today/week/month) *and* their immediately-preceding equal-length windows in one query using `FILTER (WHERE ...)` clauses over a single 60-day scan, rather than 6 separate queries.

`analyticsController.getDailyAnalytics` builds its series with `generate_series` LEFT JOINed to `orders`, zero-filling days with no orders — the daily endpoint used to silently skip zero-order days (sparse array), which broke any day-by-day comparison. Pass `?compare=true` to also get `previous_analytics`, an equal-length array covering the prior period, safe to zip with the current array **by index** (`current[i]` ↔ `previous[i]`, i.e. "day i of this period" vs "day i of last period") for chart overlays — the two arrays are guaranteed the same length and both gap-free. The date field is deliberately `TO_CHAR(..., 'YYYY-MM-DD')` (a string), not a native SQL `date` cast — casting to `::date` makes `pg` return a JS `Date` object, which `res.json()` then serializes via `.toISOString()` and silently shifts the date backward a day in any timezone ahead of UTC (this actually happened once while wiring the compare feature — caught by checking the raw JSON response, not just the UI).

CSV export (`utils/csvExport.js`'s `downloadCsv(filename, columns, rows)`, used by `AdminLedger`/`AdminOrders`) is entirely client-side — no export endpoint. It just fetches the currently-filtered data with a much higher page size than normal browsing ever uses. The `ledger`/`orders` list endpoints accept `?export=true`, which raises their `limit` ceiling (100→5000 for ledger, 50→5000 for orders) for that one request only; normal paginated requests are unaffected. Follow this pattern (higher-ceiling flag, not a separate endpoint) for exporting any other filtered list.

Sidebar collapse state (`AdminSidebar`/`AdminLayout`) is lifted into `AdminLayout.jsx` and persisted to `localStorage["akio_admin_sidebar_collapsed"]` — read on mount via `useState(() => ...)`, written via a `useEffect`. This is a legitimate effect (syncing React state to an external system), unlike the `fetchX()`-in-`useEffect` pattern below.

Several admin list pages (`AdminOrders`, `AdminLedger`, others touching `analyticsController`) call `fetchX()` synchronously inside a bare `useEffect(() => { fetchX(); }, [deps])`, which the `react-hooks/set-state-in-effect` ESLint rule flags. This is an intentional, codebase-wide, pre-existing pattern — not a bug to fix opportunistically. Leave it alone unless a task specifically targets it.

### Database
No indexes existed beyond primary/unique keys until migration `016_add_indexes.sql` — if you add a new frequently-filtered/joined column, add its index in the same migration, don't assume Postgres auto-indexes foreign keys (it doesn't). `payments.transaction_id` has a unique index (partial, `WHERE transaction_id IS NOT NULL`) since it's the lookup key for every Razorpay webhook.

No `CHECK` constraints exist on any status/amount column — validity is enforced only at the application layer (Zod schemas in `utils/validation.js` / `utils/adminValidation.js`). Don't assume the DB will reject an invalid status string or a negative amount.
