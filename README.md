# Khadim‑e‑Millat Welfare Foundation

## Overview

- End‑to‑end platform for a community welfare organization to run donation campaigns, recurring sponsorships, scrap‑to‑funds marketplace, expense tracking, and member communications.
- Implements a unified operational backend with role‑based access for admins, moderators, field surveyors, and members using Next.js App Router and MongoDB.
- Automates receipts, notifications, financial document generation, and donor/member engagement with minimal manual intervention.
- Integrates payments (Razorpay), media (Cloudinary), email (Resend), web‑push, and WhatsApp/SMS for multi‑channel outreach.
- Ships as a PWA with service worker for push delivery and offline resilience where appropriate.

## Problem It Solves

- Consolidates fragmented workflows (offline donations, campaign management, beneficiary surveys, expense filing, and communications) into a single system.
- Ensures traceability from donation intake to program spend via models for donations, expenses, and generated financial documents.
- Reduces manual communication overhead by automating targeted, multi‑channel notifications with delivery logging and analytics.
- Turns in‑kind scrap contributions into funds via a listing and purchase workflow, with moderation and conversation tooling.
- Produces compliant receipts (including 80G context) and summary documents without external tooling.

## Target Users

It's an internal management tool cum external platform the client Khadim-e-Millat Welfare Foundation.

the target users are:

- Organization admins and finance operators managing funds, expenses, and reports.
- Field surveyors capturing beneficiary data and assessments on site.
- Moderators handling marketplace items and donor interactions.
- Members and donors tracking contributions, subscriptions, and downloadable documents.

## Architecture & Technical Design

- Backend structure
  - Next.js App Router API routes under /app/api for REST‑style handlers; server actions for privileged flows. See examples: [cash-intake](/app/api/cash-intake/route.ts), [public items](/app/api/public/items/route.ts), [Razorpay webhook](/app/api/razorpay/webhook/route.ts).
  - MongoDB via Mongoose with connection reuse and model registration at startup. See [db.ts](/lib/db.ts).
  - Service layer encapsulates integrations and business logic (notifications, purchases, subscriptions, assessment, receipts). See [notification.service.ts](/lib/services/notification.service.ts).
- Frontend structure
  - Next.js 16 with React 19, Tailwind 4, shadcn UI. Client components for interactive dashboards and forms; server components for data‑heavy pages.
  - PWA assets and service worker for push and UX polish. See [sw.js](/public/sw.js) and [manifest.ts](/app/manifest.ts). Config in [next.config.ts](/next.config.ts).
- Database design approach
  - Mongoose models for donors, campaigns, welfare programs, expenses, purchases/scrap items, notifications, audience segments, sponsorships, surveys, web‑push subscriptions, and financial documents. Example: [NotificationTemplate](/models/NotificationTemplate.ts), [WebPushSubscription](/models/WebPushSubscription.ts).
  - Indexes where correctness/per‑user uniqueness matters (e.g., push subscriptions).
- Key integrations
  - Authentication/Identity: Clerk (role‑based). API routes guard with role checks.
  - Payments: Razorpay (one‑time and subscriptions) with signature verification and webhooks.
  - Media: Cloudinary for uploads and asset delivery.
  - Messaging: Resend (email), Web Push (VAPID), optional WhatsApp/SMS.
- Patterns used
  - Layered architecture: models ↔ services ↔ API routes/pages. Validation via Zod schemas at the API edge.
  - Resiliency patterns: backoff/retry for external messaging; channel availability checks with graceful degradation.
  - Simple in‑memory rate limiting and caches for burst control in selected endpoints/utilities.
- Scalability considerations
  - Stateless API handlers and idempotent webhooks facilitate horizontal scaling.
  - In‑memory rate limiter and caches are per‑instance; recommend external store (Redis) for multi‑instance deployments.
  - Image domains whitelisted; server action body limits tuned for media flows. See [next.config.ts](/next.config.ts).

## Key Features

- Campaigns and welfare programs with donation flows and 80G receipt generation (SVG/HTML) and per‑donation endpoints. See [receipt SVG](/app/api/receipts/%5BdonationId%5D/svg/route.ts).
- Recurring sponsorships with subscription lifecycle handling and Razorpay webhooks.
- Scrap‑to‑funds marketplace with item listing, purchase, conversations, and moderation.
- Expense management: categories, entries, receipt uploads, analytics, and exportable reports.
- Notification campaigns: audience segmentation, templates, multi‑channel delivery with logs and metrics.
- Financial document generation and member portal access for transparency.

## Automation & Optimization

- Notification service auto‑filters unavailable channels, retries transient failures with backoff, and records per‑user/channel status. See [notification.service.ts](/lib/services/notification.service.ts).
- Config validator verifies critical envs at runtime and degrades non‑essential channels safely. See [config-validator.service.ts](/lib/services/config-validator.service.ts).
- Web‑push subscription migration links existing browser subscriptions to signed‑in users automatically. See [WebPushManager](/components/WebPushManager.tsx) and [subscribe route](/app/api/protected/web-push/subscribe/route.ts).
- Receipt/financial document pipelines generate deliverables without manual formatting tools.
- Lightweight token‑bucket limiter for select endpoints to protect from bursts. See [rateLimiter](/lib/utils/rateLimiter.ts).

## Installation & Setup

- Prerequisites: Node 18+, pnpm, MongoDB.
- Install dependencies:

```bash
pnpm install
```

- Configure environment (minimum):

```env
# Database
kmwf_MONGODB_URI=mongodb://localhost:27017/your_db

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Email (Resend)
RESEND_API_KEY=...
NOTIFICATION_EMAIL=notifications@yourdomain.com
NOTIFICATION_FROM_NAME=Your Org

# Payments (Razorpay)
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

- Run:

```bash
pnpm dev        # development
pnpm build && pnpm start   # production
```

Optional data utilities: see package scripts in [package.json](/package.json) for migrations/seeds.

## Engineering Highlights

- Performance decisions
  - Next.js 16 App Router and React 19 for RSC/server actions where beneficial.
  - Client‑side tables and filters use lightweight state with SWR where appropriate.
  - Controlled image domains and optimized payload sizes for uploads.
- Security decisions
  - Role‑based guards around protected routes and admin functions (Clerk). Payment signatures verified for Razorpay webhooks.
  - Service worker limited to push handling; no privileged logic in client.
  - No secrets exposed to the client; public keys only via NEXT_PUBLIC_*.
- Design trade‑offs
  - In‑memory rate limiter and moderator caches simplify deployment but are per‑instance; external store is recommended for horizontal scale.
  - Receipt generation uses HTML/SVG for portability; avoids headless chrome dependency unless needed.
- Technology choices
  - Next.js + MongoDB (Mongoose) for rapid, typed development with App Router.
  - Resend/Web‑push channels for reliable outreach; WhatsApp/SMS for reach where configured.
  - Cloudinary for robust media handling in marketplace and receipts.

## Future Improvements

- Move rate limiting, job queues, and caches to Redis for multi‑instance coherence.
- Introduce domain‑level authorization policies for finer‑grained access.
- Expand analytics dashboards with cohort and conversion metrics.
- Optional multi‑tenant support if organizations need isolated spaces.
