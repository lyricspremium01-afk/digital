## Digistore — Digital Products Marketplace

A clean, blue-accented marketplace (inspired by your screenshots) where any user can browse, buy, and sell digital products. Buyers pay via SoleasPay and upload proof; admin confirms and seller is auto-credited 85%. Includes referrals, ratings, seller levels, and a full admin console.

### Brand & design
- Name: **Digistore** (course wording removed everywhere).
- Same look as screenshots: white cards, rounded corners, soft shadows, **bright blue primary** (#2563EB-ish), black headings, EN/FR toggle in header, floating WhatsApp chat bubble.
- Spice it up: subtle gradient hero, animated category chips, "Hot / New / Top Seller" badges, smooth transitions, dark-mode-ready admin console (matches your PubHub admin screenshot).
- Mobile-first with bottom nav: **Home · Shop · Orders · Sell · Account**.

---

### Buyer experience
- **Home / Shop**: product grid with category filter, search, sort (popular, newest, top-rated). Products with more sales surface more often (weighted ranking: sales × recency × rating).
- **Product page**: cover image, gallery, price in F CFA (currency switch USD/EUR/XAF), description, "What you'll learn", "Who it's for", "How delivery works", seller card with level badge, ratings & reviews, related products, **Buy Now**, share link (every product has a unique shareable URL `/p/:slug`).
- **Checkout (3 steps: Pay → Proof → Done)**:
  1. Order summary + "Pay Now via SoleasPay" button (opens your link).
  2. Form: full name, WhatsApp, email, **upload payment screenshot** (JPG/PNG/WEBP).
  3. Confirmation screen — "We'll deliver within 24h via WhatsApp + your account."
- **Ratings**: any buyer who completed an order can rate 1–5 + review.
- **Referral**: every user gets an invite link `/?ref=CODE`. Inviter earns **5% of invitee's first sale + 1% of all future sales** (lifetime), credited to balance.

### Seller experience
- **Sell tab**: upload product (title, category, description, what you'll learn, who it's for, price, cover image, gallery, **delivery link** — Drive/Mega/Telegram/file). Goes to admin **pending approval**.
- **Seller dashboard**: stats (views, sales, revenue, conversion), product list (edit/delete/pause), orders, payouts, level progress bar.
- **Seller levels (1 → 7 Pro Seller)**: auto-promoted by completed-sales thresholds (e.g. 0 / 5 / 20 / 50 / 150 / 400 / 1000), admin can override or demote.
- On admin-confirmed order: seller balance auto-credited **85%** of price; product link auto-released to buyer (in-app + WhatsApp message template).

### Account
- Profile header (avatar, email, role badge: User / Seller / Admin).
- Stat tiles: Orders · Products · Sales · Balance.
- Quick access: My Orders, Seller Dashboard, Admin Panel (admins only), WhatsApp Support, Affiliate Board, Withdraw.
- Language (EN/FR), Currency (USD/EUR/XAF), Sign Out.
- Auth: email/password + Google. Sign-up captures Full Name, Email, Phone/WhatsApp, Password, optional referral code from `?ref=`.

---

### Admin Panel (sophisticated, dark console like your PubHub screenshot)
Sidebar sections:

**Overview**
- Dashboard: live KPIs (revenue, pending orders, new users today, top products, conversion), charts (sales over time, category split, top sellers), recent activity feed.

**Management**
- **Users**: searchable table; view full profile, orders, products, balance, referrals, level. Actions: add/deduct balance, suspend, freeze, promote/demote level (1–7), grant admin, send direct message, view login history.
- **Products**: all products with filters (pending, approved, paused, rejected). Approve / reject (with reason) / edit / feature / delete. See full details incl. delivery link.
- **Orders / Transactions**: every order with buyer, seller, product, amount, payment proof image, status. Actions: **Confirm payment** (auto-credits seller 85%, releases product, notifies buyer via WhatsApp template), reject, refund-mark, add note.
- **Affiliate Board**: leaderboard of top inviters, total referral payouts, per-user referral tree, ability to adjust referral commissions.
- **Sellers**: leaderboard, level distribution, bulk promote.

**Communication**
- **Notifications**: send public broadcast (Promo, Update, Maintenance) to all users — shown in-app bell + optional WhatsApp blast template.
- **Messages**: 1-to-1 chat with any user.

**System**
- **Payment Methods**: edit SoleasPay link (pre-filled with yours), add additional methods (Mobile Money number, bank, crypto address) with on/off toggle.
- **Settings**: edit WhatsApp support number (pre-filled `237651010478`), support email (`honestansah@gmail.com`), commission % (default 85/15), referral % (default 5% / 1%), level thresholds, site name/logo, EN/FR copy, terms & privacy.
- **Stats**: full analytics export (CSV).
- **Audit log**: every admin action recorded.

Admin access bootstrapped to `honestansah@gmail.com`.

---

### Data & security
- Roles in a separate `user_roles` table (user / seller / admin / super_admin) with `has_role()` security-definer function — no role storage on profiles.
- RLS on every table; sellers see only their data, buyers see only their orders, admins via `has_role`.
- Storage buckets: `product-covers` (public), `product-gallery` (public), `payment-proofs` (private, admin-only read), `avatars` (public).
- Balance changes always written via server function inside a transaction with an immutable `ledger` table.
- All admin actions logged to `audit_log`.

### Technical sketch
- TanStack Start routes: `/`, `/shop`, `/p/$slug`, `/checkout/$orderId`, `/account`, `/account/orders`, `/account/sell`, `/account/seller`, `/account/affiliate`, `/auth`, `/admin/*` (protected by `_authenticated/_admin` layout).
- Lovable Cloud (Supabase) for auth, DB, storage. Server functions (`createServerFn`) for all writes (order creation, admin confirm, balance ops, referral payout, level recompute).
- Tables: `profiles`, `user_roles`, `products`, `product_media`, `orders`, `order_proofs`, `reviews`, `referrals`, `referral_earnings`, `ledger`, `notifications`, `messages`, `payment_methods`, `settings`, `audit_log`.
- Ranking job: trending score = `0.6*sales_30d + 0.2*rating + 0.2*recency`, recomputed on order confirm.
- WhatsApp delivery: pre-built `wa.me/<phone>?text=...` deep link with product link + order id (no API key needed).
- SoleasPay: opens your link in new tab; manual proof upload flow as confirmed.

### Out of scope (can add later)
- Automatic SoleasPay webhook (only manual proof for now).
- Physical products / shipping.
- Multi-currency live FX (will use fixed configurable rates).

### Build phases
1. Auth, profiles, roles, base layout + bottom nav, EN/FR toggle, brand polish.
2. Product browsing, product page, ratings, search/sort/ranking.
3. Sell flow + seller dashboard + seller levels.
4. Checkout (SoleasPay link + proof upload) + orders.
5. Admin panel — users, products, orders/confirm, balance/ledger.
6. Referrals + affiliate board + notifications + messaging.
7. Settings (payment methods, WhatsApp, commission), audit log, stats export.
