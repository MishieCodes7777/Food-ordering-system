# 🍽️ Akio — Food Ordering System

A full-stack food ordering application: a customer-facing storefront, a role-based admin panel, and secure Razorpay payment integration. Built as a monorepo with an Express 5 API backend and a React 19 + Vite frontend.

The app is currently **single-restaurant in practice** — the schema is shaped for multi-tenancy (`restaurant_id` on most tables), but the frontend has no restaurant-selection UX; public queries always scope to the one active restaurant.

## Tech Stack

**Backend:** Node.js, Express 5, PostgreSQL, Redis (optional, `ioredis`), JWT, Razorpay, Google OAuth, MSG91 (SMS/OTP), Zod, Cloudinary, Pino
**Frontend:** React 19, Vite, Tailwind CSS 4, GSAP, Three.js, Recharts, Sonner, Axios
**Security:** Helmet, CORS whitelist, rate limiting, account lockout, HTTP-only cookies, input sanitization, token blacklist, OTP-gated registration

## Project Structure

```
├── backend/                # Express API server
│   ├── src/
│   │   ├── config/         # Cloudinary, Razorpay, MSG91, DB test config
│   │   ├── controllers/    # Auth, Cart, Orders, Payments, Profile, Reviews,
│   │   │                   # Coupons, Ledger, Restaurant, Upload, Admin*, Google auth
│   │   ├── db/              # PostgreSQL connection + numbered migrations
│   │   ├── middleware/      # Auth, adminAuth (role-gated), Validate, Sanitize,
│   │   │                    # Rate limit, Upload, Error handler, Request ID
│   │   ├── routes/          # Customer + Admin API routes
│   │   ├── scripts/         # Database seed scripts (e.g. seedAdmin)
│   │   └── utils/           # Validation schemas, token blacklist, login lockout,
│   │                        # OTP store, coupon utils, Redis client, logger
│   └── src/server.js
├── frontend/                # React (Vite) client
│   ├── src/
│   │   ├── components/      # Navbar, Footer, Onboarding, OTP input, Star rating,
│   │   │                    # animated UI (SplitText, MagicBento, AnimatedList,
│   │   │                    # Counter, Aurora background), admin/ layout components
│   │   ├── context/         # AuthContext, AdminAuthContext, CartContext
│   │   ├── pages/            # Home, Menu, Cart, Orders, Profile, Contact, Login/Register
│   │   ├── pages/admin/      # Dashboard, Orders, Menu Items, Categories, Tables,
│   │   │                     # Analytics, Reviews, Ledger, Settings
│   │   └── services/         # API client, Auth, Cart, Menu, Order services
│   └── index.html
└── README.md
```

## Features

### Customer Side
- Registration gated behind SMS OTP verification (MSG91), plus Google sign-in
- JWT auth via HTTP-only cookies; guided onboarding stepper for new users
- Browse menu by category with search/autocomplete and veg/non-veg filters
- Item detail modal, cart with live totals, coupon codes, and discount display
- Razorpay checkout with signature verification and a success animation
- Order history, live order status, and order cancellation (restores cart)
- Post-delivery item reviews & star ratings
- Profile management and password change
- SMS notification when an admin marks an order "ready" for pickup
- Animated, responsive UI (GSAP, Three.js aurora background, mobile dock nav, desktop pill nav)

### Admin Side
- Separate admin authentication (own table, own JWT claim) with **role-based access** — `owner` / `manager` / `staff`, enforced per-route
- Google sign-in for admin accounts
- Menu item CRUD, featured-item toggle, availability toggle, category management
- Restaurant profile & GST settings management
- Coupon management (owner/manager only)
- Table management
- Order management with full status flow (pending → accepted → preparing → ready → completed); cancelling triggers an automatic Razorpay refund
- Review moderation (view/delete)
- Financial ledger (owner/manager only)
- Analytics dashboard: revenue trends, popular items, payment breakdown, revenue calendar, date-filtered stats
- Image upload via Cloudinary

### Security
- Helmet secure headers, CORS whitelist (frontend origin only), HPP prevention
- Rate limiting (auth, OTP, and general API limits) with optional Redis-backed store for multi-instance deployments
- Account lockout after repeated failed logins
- Zod input validation + XSS input sanitization on every request
- HTTP-only JWT cookies, separate `type: "customer" | "admin"` claims, real logout via token blacklist
- Parameterized SQL queries, bcrypt password hashing, DB transactions for critical operations
- Generic error responses (no user enumeration), request body size limits, structured request logging
- Razorpay webhook signature verification
- Ownership verification on all resource access

## API Endpoints

All routes are mounted under `/api`.

### Auth (`/api/auth`)
- `POST /register/send-otp` — Validate + send registration OTP (SMS)
- `POST /register/verify-otp` — Verify OTP and create the account
- `POST /login` — Login
- `POST /google` — Google sign-in
- `POST /logout` — Logout (auth required)

### Menu (`/api/menu`, public)
- `GET /categories` — All categories
- `GET /items` — All items (filterable by category)
- `GET /featured` — Featured items for the home page

### Cart (`/api/cart`, protected)
- `GET /` — Get cart with item details
- `POST /add` — Add item (supports food_type_choice)
- `PUT /update` — Update quantity
- `DELETE /remove/:itemId` — Remove item
- `DELETE /clear` — Clear cart

### Coupons (`/api/coupons`, protected)
- `POST /validate` — Validate a coupon code against the current cart

### Orders (`/api/orders`, protected)
- `POST /place` — Place order from cart
- `GET /` — Order history with items
- `GET /:id` — Order details
- `GET /:id/status` — Order status
- `POST /:id/cancel` — Cancel & restore cart

### Payments (`/api/payments`, protected)
- `POST /create-order` — Create Razorpay order
- `POST /verify` — Verify payment signature
- `GET /:orderId` — Payment status
- `POST /refund` — Refund payment

### Profile (`/api/profile`, protected)
- `GET /` — Get profile
- `PUT /` — Update name & phone
- `PUT /password` — Change password
- `GET /orders` — Order history with payment details

### Reviews (`/api/reviews`)
- `POST /` — Create/update a review (auth required)
- `GET /reviewable` — Items the current user can review (auth required)
- `GET /item/:itemId` — Reviews for an item (public)

### Webhooks (`/api/webhooks`)
- `POST /razorpay` — Razorpay payment events

### Admin (`/api/admin/*`, admin auth required)
- `POST /auth/login`, `POST /auth/google`, `POST /auth/register` (owner only), `POST /auth/logout`, `GET /auth/me`
- `GET|PUT /restaurant`, `POST /restaurant` (owner), `PUT /restaurant/toggle` (owner), `GET|PUT /restaurant/gst`
- `GET|POST|PUT|DELETE /categories` — Category CRUD
- `GET|POST|PUT|DELETE /menu-items`, `PUT /menu-items/:id/featured`, `PUT /menu-items/:id/availability`
- `GET|POST|PUT|DELETE /tables` — Table management
- `GET|PUT /orders` — View & update order status
- `GET /analytics` — Analytics data
- `GET /ledger`, `GET /ledger/summary` — Financial ledger (owner/manager only)
- `GET /reviews`, `DELETE /reviews/:id` — Review moderation
- `GET|POST|PUT|DELETE /coupons` — Coupon management (owner/manager only)
- `POST /upload` — Image upload (Cloudinary)

## Setup

### Backend
```bash
cd backend
npm install
# Copy .env.example to .env and fill in your values
npm run dev
```

### Frontend
```bash
cd frontend
npm install
# Copy .env.example to .env and fill in your values
npm run dev
```

### Database
Migrations are plain numbered `.sql` files with no migration-runner — apply manually in order:
```bash
psql -U postgres -d akio_db -f backend/src/db/migrations/001_create_users.sql
# ... through the highest-numbered file in backend/src/db/migrations/
```
All migrations use `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, so they're safe to re-run.

### Seed Admin
```bash
cd backend
node src/scripts/seedAdmin.js
```
Creates the first admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`.

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for the full list with descriptions. Required:
- Database credentials (`DB_*`)
- `JWT_SECRET`
- Razorpay keys (`RAZORPAY_*`)
- Cloudinary keys (`CLOUDINARY_*`)
- `FRONTEND_URL` (backend) / `VITE_API_URL` (frontend)

Optional (each degrades gracefully when unset):
- `REDIS_URL` — shared rate-limit/lockout/token-blacklist state across multiple backend instances; falls back to in-memory otherwise
- `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` — enables Google sign-in for customers and admins
- `MSG91_*` — sends real OTP/order-ready SMS; without it, OTPs are logged server-side and returned as `dev_otp` for local dev

## Running Locally

Both servers must run simultaneously (separate terminals): backend on `PORT` from `backend/.env` (default `5000`), frontend via Vite (default `5173`). Make sure `frontend/.env`'s `VITE_API_URL` points at wherever the backend is actually running — Vite bakes this in at dev-server startup, so changing it requires restarting the Vite process.

## Team

- **Customer side (Backend + Frontend):** Nikunj
- **Admin side (Backend + Frontend):** Bhavya
