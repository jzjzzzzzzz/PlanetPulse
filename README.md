# Planet Pulse 🌍

> **See what Earth is signaling now.**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![CI](https://github.com/jzjzzzzzzz/PlanetPulse/actions/workflows/ci.yml/badge.svg)](https://github.com/jzjzzzzzzz/PlanetPulse/actions/workflows/ci.yml)

**Live Demo:** [planet-pulse-eta.vercel.app](https://planet-pulse-eta.vercel.app)
**Video Demo:** [YouTube - Planet Pulse Walkthrough](https://youtu.be/RFy7bojIiLs)

---

## Current Status

Phase 1 is deployed and publicly accessible. NASA EONET is active. NASA FIRMS is optional (not currently configured). This project is not an official NASA product and is not an emergency alert service.

Planet Pulse transforms scattered environmental data into a clear global overview and a personalized local environmental signal. It combines a cinematic interactive 3D Earth, real NASA environmental-event data, an explainable hotspot-ranking system, and location-aware information.

---

## Product Positioning

Planet Pulse is an **environmental situation-awareness website**, not an emergency-warning service.

**What it is:**
- A global environmental monitoring dashboard
- An educational tool for understanding Earth systems
- A demonstration of real-time NASA open data in a consumer-grade interface

**What it is NOT:**
- An emergency alert or warning system
- An official NASA product
- A replacement for local emergency services

---

## Phase 1 Features

### 3D Globe
- Interactive dark-themed globe with atmospheric glow
- Real NASA EONET events rendered as color-coded markers
- Animated rings for high-severity events
- User location marker
- Click-to-focus navigation (globe flies to selected events)
- Auto-rotation that pauses on user interaction
- Hover tooltips for all event markers

### Global Hotspot Ranking
- Deterministic 0–100 scoring system
- Factors: event category weight, recency, magnitude, observation count, nearby fire density
- Explainable — every score includes human-readable reasoning
- Top 8 hotspots displayed in a right-side panel

### Personal Relevance
- Approximate location from Vercel IP geolocation headers
- Optional precise browser geolocation (opt-in only)
- Personal relevance score (proximity × severity × recency × time-of-day)
- Local time display
- Nearest event distance calculation

### Real Data Sources
- **NASA EONET v3** — open environmental events (wildfires, storms, volcanoes, floods, etc.)
- **NASA FIRMS** (optional) — satellite fire and thermal-anomaly detections
- Graceful fallback when APIs are unavailable
- Server-side caching with ~10-minute revalidation

### Responsive Design
- Full desktop layout: top bar, left filters, right hotspots, bottom signal bar
- Mobile layout: simplified top bar, collapsible bottom sheet, filter drawer
- Glass-panel design language with space-themed dark aesthetic
- Supports screens from 375px wide phones to large desktops

---

## Architecture

```
Client:  3D Globe (dynamic) + Panels (Layer/Hotspot) + Bottom Bar (Local Signal)
              │
              │ fetch() to API routes
              ▼
Server:  /api/events ──► NASA EONET v3 API
         /api/fires  ──► NASA FIRMS API (optional)
         /api/location ─► Vercel IP Headers
         Scoring Engine (pure functions)
```

**Key architectural decisions:**
- Globe is dynamically imported with SSR disabled (Three.js/WebGL)
- Globe is behind a clean component boundary for future CesiumJS replacement
- All data fetching happens server-side via API routes
- Scoring logic is isolated in pure functions with unit tests
- No database, no auth, no CMS — fully stateless

---

## Data Sources

| Source | Endpoint | Purpose |
|--------|----------|---------|
| NASA EONET v3 | `eonet.gsfc.nasa.gov/api/v3/events` | Environmental event data |
| NASA FIRMS | `firms.modaps.eosdis.nasa.gov/api/area/` | Satellite fire detections (optional) |
| Vercel IP Geolocation | Request headers | Approximate user location |

**Disclaimer:** Planet Pulse uses satellite and public environmental data for awareness and exploration. It is **not an official emergency alert service**. Do not rely on it for safety-critical decisions.

---

## Local Setup

```bash
# Prerequisites: Node.js 18+, npm

# 1. Install dependencies
npm install

# 2. Set up environment variables (copy and edit)
cp .env.example .env.local

# 3. (Optional) Get a NASA FIRMS key at:
#    https://firms.modaps.eosdis.nasa.gov/api/map_key/
#    Add it to .env.local: NASA_FIRMS_MAP_KEY=your_key_here

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NASA_FIRMS_MAP_KEY` | No | NASA FIRMS API key for fire detections |
| `NEXT_PUBLIC_SITE_URL` | No | Public site URL (default: `http://localhost:3000`) |

When `NASA_FIRMS_MAP_KEY` is not configured, the app works normally with EONET data and displays: "Detailed fire detections unavailable — FIRMS key not configured."

---

## NASA FIRMS Key Setup

1. Visit [https://firms.modaps.eosdis.nasa.gov/api/map_key/](https://firms.modaps.eosdis.nasa.gov/api/map_key/)
2. Register with your email to receive a free API key
3. Add the key to `.env.local`: `NASA_FIRMS_MAP_KEY=your_key_here`
4. Restart the dev server

The FIRMS key is **never exposed to the client**. All FIRMS requests go through the server-side `/api/fires` route.

---

## Production Verification

| Item | Status |
|------|--------|
| **Production URL** | [planet-pulse-eta.vercel.app](https://planet-pulse-eta.vercel.app) |
| **Deployment date** | 2026-07-10 |
| **Vercel project** | `planet-pulse` |
| **Production branch** | `main` |
| **GitHub connected** | Pending (requires Vercel GitHub integration) |

### Tested Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/` (homepage) | ✅ 200 | Full Planet Pulse app |
| `/api/health` | ✅ 200 | Returns `{"status":"ok"}` |
| `/api/events` | ✅ 200 | EONET with fallback data |
| `/api/location` | ✅ 200 | Vercel IP geolocation |
| `/api/fires` | ✅ 200 | Graceful unavailable (no FIRMS key) |

### Current Limitations

- NASA FIRMS is **not configured** — fire detections return unavailable
- EONET live fetch may fall back to bundled sample data when the NASA API is unreachable
- No database, auth, or persistent storage
- GitHub Actions CI badge activates after the first push to `main`

## Vercel Deployment

This project is connected to Vercel for automatic deployments on pushes to `main`.

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy to production
vercel --prod

# 3. Set environment variables:
vercel env add NEXT_PUBLIC_SITE_URL production
#    NASA_FIRMS_MAP_KEY (optional)
```

The app automatically reads Vercel's IP geolocation headers for approximate user location in production.

---

## Privacy Approach

- **No IP addresses are stored or logged**
- Location data is derived server-side from Vercel headers (city-level only)
- No cookies are set for location tracking
- Precise browser geolocation is strictly opt-in (button click required)
- No location data is persisted to any database or storage
- No user accounts, no authentication, no tracking

---

## Data Limitations

- EONET events are sourced from multiple international agencies; not all events are captured in real time
- Some events lack magnitude or scientific measurement data
- The hotspot score is a **relative ranking tool**, not a scientific hazard assessment
- FIRMS detects thermal anomalies (hot pixels) which may include non-wildfire heat sources
- Location from IP geolocation is approximate (city level at best)
- EONET may be unavailable; fallback sample data is clearly labeled

---

## Scoring Methodology

### Global Hotspot Score (0–100)

| Factor | Weight | Description |
|--------|--------|-------------|
| Category base | 0–30 | Wildfire/volcano (25), storm (20), flood (18), others graded |
| Recency | 0–25 | Updated <6h (25), <12h (22), <24h (18), <7d (5) |
| Magnitude | 0–15 | Measured (15), partial (8), unavailable (0) |
| Open status | 0–10 | Open (10), closed (0) |
| Observations | 0–10 | ≥5 obs (10), 1 obs (3) |
| FIRMS density | 0–10 | Nearby fire detections when available |

### Personal Relevance Score (0–100)

| Factor | Weight | Description |
|--------|--------|-------------|
| Proximity | 45% | Inverse distance buckets (<50km: 45, <100km: 35, ...) |
| Hotspot severity | 30% | 0.3 × event hotspot score |
| Data recency | 15% | <6h (15), <12h (12), <24h (9), older (0) |
| Time context | 10% | Daytime + recent data (10), daytime only (5) |

All scores are fully deterministic and independently testable.

---

## Testing

```bash
# Run all tests
npm test

# 95 tests across 4 test files:
# • eonet-normalization.test.ts  (34 tests)
# • hotspot-score.test.ts        (15 tests)
# • personal-relevance.test.ts   (16 tests)
# • distance.test.ts             (13 tests)
# • And more...
```

Tests cover: EONET category normalization, geometry selection, coordinate validation, URL sanitization, Haversine distance, hotspot score bounds and determinism, personal relevance bounds, and more.

---

## Future (Phase 2 Ideas)

- **CesiumJS** globe integration for higher-fidelity Earth rendering
- **NASA GIBS** satellite imagery layers
- **Event history timeline** with playback controls
- **Air quality data** integration
- **Event clustering** at distant zoom levels
- **Shareable event URLs** (deep linking)
- **PWA support** for offline globe viewing
- **Multi-language** support

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| 3D Globe | react-globe.gl + Three.js |
| Icons | Lucide React |
| Validation | Zod |
| Testing | Vitest |
| Package Manager | npm |

---

*Data from NASA EONET. Fire detections from NASA FIRMS. Planet Pulse is not an official NASA product.*

---

## License

Copyright © 2026 **John Zhou**

This project is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full text.

You may freely use, modify, and distribute this software under the terms of the Apache 2.0 license. Attribution is appreciated.
