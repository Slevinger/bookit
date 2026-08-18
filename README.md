# BookIt — B&B Booking Manager

A fast, minimal-click booking manager for a B&B: room listings, a calendar-first booking board, and a scheduling-assistant style availability checker.

## Features

- **Calendar board (home)** — rooms as rows, days as columns. Click an empty cell to book that room and date; click a booking bar to view, edit, or cancel it.
- **Check availability** — pick a from/to range and see every room on a timeline with the proposed range highlighted, existing bookings as blocks, and one-click booking of free rooms (single or several together).
- **Bookings** — multi-room bookings with a per-room price, adults + children, one or more contacts (name + phone required), notes, and search by guest name or phone.
- **Rooms** — inline add/edit with capacity, nightly price, and active toggle.
- Simple shared-password login. Mobile friendly.

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind + shadcn/ui · Firestore (`firebase-admin`) · Vitest + React Testing Library · Cloud Run

## Local development

1. Copy env and set values:

```bash
cp .env.example .env.local
```

2. Place the GCP service-account key (`bookit-*.json`) in the project root — it is picked up automatically (and gitignored).

3. Run:

```bash
npm install
npm run dev
```

## Tests

Everything was built test-first.

```bash
npm test         # run once
npm run test:watch
```

## Deploy to GCP (Cloud Run)

One-time setup:

```bash
gcloud auth login
gcloud config set project bookit-505917
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com
gcloud firestore databases create --location=europe-west1
```

Deploy:

```bash
APP_PASSWORD=... SESSION_SECRET=$(openssl rand -hex 32) ./deploy.sh
```

On Cloud Run no key file is needed — the service's attached service account is used automatically.

## Architecture

- `src/lib/domain` — pure business rules (dates/overlap, availability, validation, pricing)
- `src/lib/repositories` — Firestore access behind interfaces; conflict-checked writes run in transactions
- `src/lib/services` — booking service enforcing "no double booking" across multi-room bookings
- `src/lib/events` — in-process domain events (`booking.created` …) for future integrations: email/WhatsApp confirmations, iCal/OTA sync, payments
- `src/app/actions` — server actions (thin, serializable results)
- `src/components` — UI

Bookings carry a `source` field ("manual" today, "airbnb" / "booking.com" / "website" later) and rooms carry `externalRefs` for future channel-manager IDs.
