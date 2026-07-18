# 🥗 InfoDiet

**Your brain deserves a healthy diet.**

InfoDiet is a Chrome extension SaaS that tracks how you consume information online and helps you set healthy daily limits per content category. Built with Next.js, MongoDB Atlas, and Stripe billing.

🌐 **Live:** [getinfodiet.app](https://getinfodiet.app)

---

## Features

### Free

- Automatic content tracking across 8 categories
- Today's consumption breakdown in the extension popup
- Runs silently in the background — no manual logging

### Pro ($3/month)

- Daily budgets per category with real-time blocking
- Information Quality Score — educational vs entertainment ratio
- Weekly trend dashboard with charts and category breakdowns
- Budget alerts when approaching or exceeding daily limits
- Cross-device sync
- 10-minute override on blocked sites
- 7-day free trial, no credit card required

---

## Content Categories

| Category | Examples |
|----------|----------|
| 📰 News & Politics | CNN, BBC, NYTimes |
| 📱 Social Media | Twitter, Instagram, TikTok |
| 🎬 Entertainment | YouTube, Netflix, Twitch |
| 📚 Educational | Coursera, Wikipedia, Khan Academy |
| 🛍️ Shopping | Amazon, eBay, Etsy |
| 💬 Forums | Reddit, Quora, HackerNews |
| 🎮 Gaming | Steam, Roblox, IGN |
| 🌐 Other | Everything else |

---

## Tech Stack

### Chrome Extension

- React + TypeScript
- Vite
- Chrome Manifest V3
- Service worker with session storage for accurate time tracking across worker restarts

### Backend

- Next.js (App Router) on Vercel
- MongoDB Atlas + Mongoose
- JWT authentication with bcrypt
- Stripe billing — subscriptions, webhooks, customer portal
- Nodemailer + Gmail SMTP — transactional email

---

## Architecture

infodiet-extension/    ← Chrome extension (React + Vite)
src/                   ← Popup UI components
public/
background.js          ← MV3 service worker (time tracking + blocking)
categoryMap.js         ← Domain → category mapping
budget-exceeded.html   ← Redirect page when budget is hit
budget-exceeded.js     ← Override logic
infodiet-web/          ← Next.js backend + web dashboard (Vercel)
app/
api/
auth/                  ← register, login, forgot/reset password
consumption/           ← record and retrieve consumption data
budget/                ← manage time budgets per category
stripe/                ← checkout, webhook, portal, status
user/                  ← plan, me
dashboard/             ← weekly analytics dashboard
budget/                ← budget settings page
models/                ← Mongoose schemas (User, Consumption, Budget)
lib/                   ← mongodb, auth, stripe helpers

---

## How Time Tracking Works

InfoDiet uses Chrome's `storage.session` API to persist active tab state across MV3 service worker restarts:

1. `tabs.onActivated` and `tabs.onUpdated` → save current tab + start time to session storage
2. `windows.onFocusChanged` → pause tracking when browser loses focus
3. `alarms.trackTime` (every 1 min) → sync active tab state and flush elapsed time
4. Elapsed time → stored locally in `todayConsumption` → synced to backend every 5 minutes

This approach solves the MV3 service worker lifecycle problem where plain module-level variables are wiped after ~30 seconds of inactivity.

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Stripe account
- Gmail account with App Password enabled
- Chrome browser

### Backend Setup

```bash
cd infodiet-web
npm install
```

Create `.env.local`:

MONGODB_URI=your-mongodb-connection-string/infodiet
JWT_SECRET=your-jwt-secret
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

```bash
npm run dev
```

### Extension Setup

```bash
cd infodiet-extension
npm install
npm run build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

---

## Stripe Webhook Events

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Set plan to `pro` (trial start) |
| `invoice.paid` | Set plan to `pro` |
| `customer.subscription.deleted` | Set plan to `free` |

---

## Budget Enforcement Flow

1. User sets a daily budget (e.g. 30 min for Social Media)
2. Background service worker tracks time on each site
3. When budget is reached → `checkBudget()` fires a notification and redirects the active tab to `budget-exceeded.html`
4. `webNavigation.onBeforeNavigate` catches future navigation attempts and redirects them
5. User can override for 10 minutes via the budget exceeded page
6. At midnight → `checkDailyReset()` resets all consumption counters

---

## Deployment

- **Backend:** Vercel (auto-deploys from GitHub)
- **Extension:** Chrome Web Store
- **Database:** MongoDB Atlas (`infodiet` database)
- **Domain:** Namecheap → Vercel

---

## License

MIT