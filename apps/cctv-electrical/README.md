# SecureVision — CCTV & Electrical E-commerce Platform

A production-ready storefront + admin panel for a CCTV camera and electrical
installation business, built with **React + TypeScript + Tailwind CSS +
Firebase**. Customers browse products, add to cart, and check out with an
order that's saved securely to Firestore *and* opened as a pre-filled
WhatsApp message. Admins manage products, categories, services, business
settings and orders from a protected `/admin` panel.

## Features

- **Storefront**: category-filterable product catalog, product detail pages,
  services page, about/contact pages — fully responsive, SEO metadata
  (title/description/canonical/Open Graph/JSON-LD) via `react-helmet-async`.
- **Cart & checkout**: persistent cart (localStorage), quantity controls,
  checkout form → order written to Firestore → WhatsApp opened with order +
  customer details pre-filled.
- **Per-product WhatsApp enquiry button** in addition to Add to Cart.
- **Admin panel** (`/admin`, email/password auth):
  - Products: create/edit/delete, multi-photo upload (Firebase Storage),
    price, description, specs, availability toggle, featured flag — changes
    reflect on the storefront instantly via Firestore realtime listeners.
  - Categories: create/edit/delete, used to filter the storefront.
  - Services: create/edit/delete with photos, shown on Services page.
  - Orders: view/filter by status, update status (pending → confirmed →
    completed / cancelled).
  - Settings: business name, tagline, contact info, WhatsApp number, hours,
    logo, hero image, social links, map embed, SEO description.
- **Security**: strict Firestore + Storage rules — public read for catalog
  data, admin-only writes (checked via an `admins/{uid}` allow-list doc, not
  client-side trust), tightly validated public order creation, no public
  read/update/delete on orders.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- React Router v6
- Firebase: Authentication, Firestore, Storage, Hosting
- `react-hot-toast` for notifications, `react-helmet-async` for SEO tags

## Project Structure

```
src/
  components/       shared UI, layout, product/cart/admin components
  contexts/         AuthContext, CartContext
  hooks/            Firestore data hooks (products, categories, services, settings, orders)
  lib/firebase.ts   Firebase app initialization
  pages/            public storefront pages
  pages/admin/       admin panel pages
  types/            shared TypeScript types
  utils/            format, whatsapp link builder, image upload helpers
firestore.rules      Firestore security rules
storage.rules         Storage security rules
firestore.indexes.json
firebase.json         Hosting + rules deploy config
```

## 1. Firebase Project Setup

1. Create a project at https://console.firebase.google.com.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Enable **Firestore Database** (production mode; choose a region).
4. Enable **Storage**.
5. In **Project Settings → General**, add a Web App and copy the config
   values into `.env` (copy `.env.example` → `.env` first).

```bash
cp .env.example .env
# fill in VITE_FIREBASE_* values, VITE_DEFAULT_WHATSAPP_NUMBER, VITE_SITE_URL
```

### Create your first admin user

The app has **no public sign-up** — admin accounts are provisioned manually:

1. Firebase Console → Authentication → Users → **Add user** (email + password).
2. Firebase Console → Firestore Database → start collection **`admins`** →
   create a document whose **document ID is that user's UID** (find the UID
   on the Authentication users list). Fields don't matter for the rules to
   pass, but add e.g. `{ email: "you@example.com", createdAt: <timestamp> }`
   for your own reference.
3. Sign in at `/admin/login` with that email/password.

Repeat step 2 for any additional admins. Because `admins/{uid}` is only
client-writable as `false` (see `firestore.rules`), this list can only be
changed from the Firebase Console or the Admin SDK — never from the app —
which is what keeps the admin panel secure even though the client bundle is
public.

## 2. Local Development

```bash
npm install
npm run dev        # http://localhost:5173
```

Add at least one **category** (Admin → Categories) before adding products —
products require a category.

### Local demo with the Firebase Emulator Suite (no real project needed)

To try the full app — storefront + admin panel — without creating a real
Firebase project, run it against the local Firebase Emulator Suite instead:

```bash
npm install -g firebase-tools   # if not already installed

# terminal 1 — start local Auth/Firestore/Storage emulators
npm run emulators

# terminal 2 — seed demo categories, products, services, settings + an admin user
npm run seed:emulator

# terminal 3 — point the app at the emulators and run it
cp .env.example .env
# edit .env: set VITE_USE_FIREBASE_EMULATOR=true (any placeholder values are
# fine for the other VITE_FIREBASE_* keys since the emulator ignores them)
npm run dev
```

Demo admin login (emulator-only, resets every time the emulator restarts):
`demo@securevision.test` / `Demo@12345`.

The Emulator UI (Firestore/Auth data browser) is at http://127.0.0.1:4000
while `npm run emulators` is running. This is purely a local dev/demo tool —
`VITE_USE_FIREBASE_EMULATOR` should never be set to `true` in a production
build.

## 3. Firestore & Storage Rules

Deploy the security rules and indexes before going live:

```bash
npm install -g firebase-tools   # if not already installed
firebase login
firebase use --add               # pick your Firebase project, alias "default"
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Review `firestore.rules` and `storage.rules` — the security model is:

| Collection  | Public read | Public write | Admin read | Admin write |
|-------------|:-----------:|:-------------:|:----------:|:-----------:|
| `categories`| ✅ | ❌ | ✅ | ✅ |
| `products`  | ✅ | ❌ | ✅ | ✅ |
| `services`  | ✅ | ❌ | ✅ | ✅ |
| `settings`  | ✅ | ❌ | ✅ | ✅ |
| `orders`    | ❌ | ✅ create-only, validated | ✅ | ✅ (status updates) |
| `admins`    | own doc only | ❌ (console/Admin SDK only) | own doc only | ❌ |

Storage: `products/`, `services/`, `branding/` are publicly readable; writes
require an authenticated admin, an `image/*` content type, and a 5MB size cap
(enforced both client-side and in `storage.rules`).

## 4. Build & Deploy (Firebase Hosting)

```bash
npm run build            # outputs to dist/
firebase deploy --only hosting
# or, once your .env is filled in:
npm run deploy            # build + hosting deploy in one step
```

`firebase.json` configures SPA rewrites (all routes → `index.html`) and long
cache headers for hashed static assets. Update `.firebaserc` with your real
Firebase project ID before deploying.

### Recommended production checklist

- [ ] Firebase project on the **Blaze** plan if you expect meaningful Storage
      egress/bandwidth (Spark's free tier is fine to start).
- [ ] `npm run build` passes with no TypeScript errors (`npm run typecheck`).
- [ ] `npm run lint` is clean.
- [ ] `firestore.rules` / `storage.rules` deployed and tested (try writing as
      a non-admin from the browser console — it should be denied).
- [ ] At least one admin user created (see step 1).
- [ ] Business Settings filled in from `/admin/settings`, especially the
      **WhatsApp number** — without it, enquiry/checkout WhatsApp buttons are
      hidden/disabled.
- [ ] Custom domain connected in Firebase Hosting, and `VITE_SITE_URL` in
      `.env` updated to match (used for canonical URLs / JSON-LD).
- [ ] Update `public/sitemap.xml` and `public/robots.txt` with your real
      domain.
- [ ] Replace `public/favicon.svg` and `public/og-image.jpg` with your brand
      assets referenced in `index.html`.

## Notes on Order Flow

Placing an order does two things, in order:
1. Writes a validated order document to Firestore (`orders` collection) —
   this is the durable, admin-visible record, manageable from
   `/admin/orders`.
2. Opens WhatsApp (`wa.me`) in a new tab with the order items, total, and
   customer details pre-filled, so the customer can send it directly to the
   business's WhatsApp number for confirmation.

If the WhatsApp number hasn't been configured in Settings yet, the order is
still saved and visible in the admin panel; the customer sees a toast asking
them to wait to be contacted instead.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm run typecheck` | TypeScript check only, no emit |
| `npm run deploy` | Build + `firebase deploy --only hosting` |
