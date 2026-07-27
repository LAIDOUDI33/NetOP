# NetOptima Algérie — Network Operations Platform

AI-powered mobile network optimization platform designed for Algeria's three telecom operators (Mobilis, Djezzy, Ooredoo). Real-time monitoring, KPI analytics, and intelligent optimization for 2G/3G/4G/5G networks.

## Features

### Operations
- **Real-time Dashboard** — KPI overview with 4 Algerian operator comparison
- **Network Monitoring** — Live health scores, capacity, and performance metrics
- **SON (Self-Organizing Networks)** — Automated tilt/power/PCI adjustments
- **Site Onboarding** — New site commissioning workflow with vendor templates
- **Live Network View** — Real-time streaming KPI visualization
- **Incident Management** — Track, escalate, and resolve network incidents
- **Outage Tracking** — Monitor service-impacting outages with SLA timers
- **Spectrum Management** — Frequency allocation and interference monitoring

### Analytics
- **KPI Analytics** — RSRP, RSRQ, SINR, throughput trends with drill-down
- **Alert Management** — Rule-based alerts with severity, acknowledgment, and correlation
- **Coverage Map** — Interactive Leaflet map with site layers and coverage visualization
- **Alert Correlation** — Group related alerts to identify root cause patterns
- **QoE (Quality of Experience)** — Customer experience scoring and degradation detection
- **Capacity Planning** — Forecast resource utilization and expansion needs
- **Handover Optimization** — Inter-frequency and inter-RAT handover analysis
- **Load Balancing** — Cell-level load distribution and balancing recommendations
- **Interference Analysis** — External and internal interference detection and mitigation
- **Coverage Holes** — Identify and classify coverage gaps
- **Vendor Comparison** — Side-by-side vendor performance benchmarking
- **Service Analytics** — Service-level performance and availability tracking

### Intelligence
- **Network Slicing** — 5G slice lifecycle management (eMBB, URLLC, mMTC)
- **Energy Optimization** — AI-driven energy-saving recommendations
- **Fault Prediction** — ML-based failure prediction with time-to-failure estimation
- **Subscriber Analytics** — ARPU, churn risk, segmentation analysis
- **Network Health** — Composite health scoring across all network layers
- **Benchmarking** — KPI benchmarking against operator and industry targets
- **Playbook Automation** — Pre-defined response playbooks for common scenarios
- **AI Assistant** — Conversational AI for network operations queries
- **NPI (Network Performance Index)** — Composite scoring across all KPIs
- **Trend Analysis** — Long-term KPI trend identification and forecasting
- **Network Simulations** — What-if scenario modeling (tilt, power, frequency changes)
- **ROI Analysis** — CapEx/OpEx optimization and investment prioritization
- **Network Evolution** — Technology migration roadmap (2G→3G→4G→5G)
- **Audit Trail** — Complete audit log of all system actions and changes
- **Executive Dashboard** — C-level summary with key business metrics

### AI Engine
- **AI Optimizer** — GPT-powered network parameter optimization
- **Root Cause Analysis** — Multi-layer evidence-chain RCA
- **Anomaly Detection** — Real-time anomaly detection across all KPIs
- **Multi-Agent Orchestration** — 7 specialized AI agents coordinating network operations
- **Data Pipeline** — ETL pipeline management with quality gates
- **Integration Hub** — Centralized integration health monitoring

### Automation
- **Policy Engine** — Automated policy creation and enforcement
- **Change Management** — Network change request workflow with approvals
- **Vendor Management** — Multi-vendor equipment tracking and performance
- **OSS Integration** — Ericsson/Huawei/Nokia/ZTE OSS connectivity
- **CRM Integration** — Salesforce customer data synchronization
- **Billing Integration** — Amdocs billing data and revenue analytics

### System
- **Reports** — Scheduled and on-demand report generation
- **SLA Dashboard** — Service level agreement monitoring and breach tracking
- **Configuration** — System-wide configuration management
- **Settings** — User preferences, theme, language, and account management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite |
| State | Zustand (client) + TanStack Query (server) |
| Auth | NextAuth.js v4 (JWT + Credentials) |
| Charts | Recharts |
| Maps | Leaflet + React-Leaflet |
| Animation | Framer Motion |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |
| i18n | Custom (fr/en/ar with RTL) |

## Project Structure

```
src/
├── app/
│   ├── api/              # 61 API routes
│   │   ├── alerts/        # Alert CRUD + rules
│   │   ├── anomalies/     # Anomaly detection
│   │   ├── audit/         # Audit trail
│   │   ├── benchmark/     # Benchmarking
│   │   ├── billing/       # Billing integration
│   │   ├── changes/       # Change management
│   │   ├── config/        # System config
│   │   ├── correlation/   # Alert correlation
│   │   ├── coverage/      # Coverage data
│   │   ├── dashboard/     # Dashboard KPIs
│   │   ├── data-pipeline/ # Pipeline management
│   │   ├── energy/        # Energy optimization
│   │   ├── executive/     # Executive metrics
│   │   ├── faults/        # Fault prediction
│   │   ├── health/        # Health scores
│   │   ├── incidents/     # Incident management
│   │   ├── integration-hub/ # Integration health
│   │   ├── integrations/  # OSS/CRM/Billing
│   │   ├── interference/  # Interference analysis
│   │   ├── kpi/           # KPI analytics
│   │   ├── live/          # Real-time data
│   │   ├── load/          # Load balancing
│   │   ├── monitoring/    # Network monitoring
│   │   ├── multi-agent/   # AI agents
│   │   ├── optimizer/     # AI optimizer
│   │   ├── outages/       # Outage tracking
│   │   ├── policies/      # Policy engine
│   │   ├── reports/       # Report generation
│   │   ├── rca/           # Root cause analysis
│   │   ├── services/      # Service analytics
│   │   ├── sla/           # SLA tracking
│   │   ├── slicing/       # Network slicing
│   │   ├── son/           # SON automation
│   │   ├── spectrum/      # Spectrum management
│   │   ├── subscribers/   # Subscriber analytics
│   │   ├── trends/        # Trend analysis
│   │   └── vendors/       # Vendor management
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout
│   ├── loading.tsx        # Loading skeleton
│   ├── not-found.tsx      # 404 page
│   └── page.tsx           # Main SPA page
├── components/
│   ├── ui/                # 48 shadcn/ui components
│   ├── views/             # 51 lazy-loaded view components
│   ├── CommandPalette.tsx
│   ├── ErrorBoundary.tsx
│   ├── HtmlAttributes.tsx
│   ├── NotificationCenter.tsx
│   ├── PaginationControls.tsx
│   └── Providers.tsx
├── hooks/                 # Custom React hooks
├── lib/
│   ├── i18n/locales/      # en.ts, fr.ts, ar.ts (~2100 keys each)
│   ├── api-auth.ts        # API auth helper
│   └── rate-limit.ts      # In-memory rate limiter
├── store/                 # Zustand stores
├── types/                 # TypeScript type definitions
└── middleware.ts           # Route protection

prisma/
├── schema.prisma          # 47 models
└── seed.ts                # Demo data (~3000+ records)
```

## Getting Started

### Prerequisites

- **Node.js 18+** (recommended: 20+) — works with npm, pnpm, or bun
- No separate SQLite install needed (bundled with Prisma)

### Quick Start (3 commands)

```bash
npm install          # or: pnpm install  or:  bun install
npm run setup       # creates .env, pushes schema, seeds demo data
npm run dev         # starts on http://localhost:3000
```

> **Note:** `npm run setup` does everything in one step:
> 1. Creates `.env` from `.env.example` (if missing)
> 2. Generates the Prisma client (`prisma generate`)
> 3. Pushes the database schema (`prisma db push`)
> 4. Seeds ~3000 demo records (`prisma db seed`)

### Manual Installation

If you prefer step-by-step:

```bash
# 1. Install dependencies (postinstall auto-generates Prisma client)
npm install          # or: pnpm install  or:  bun install

# 2. Create environment file
cp .env.example .env

# 3. Push schema to database
npx prisma db push

# 4. Seed demo data
npx prisma db seed

# 5. Start dev server
npm run dev
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot find module '.prisma/client/default'` | Run `npx prisma generate` then restart |
| `prisma db push` fails | Make sure `db/` folder exists: `mkdir -p db` |
| Port 3000 in use | Change port: `npx next dev -p 3001` |
| Seed fails on Windows | Use `npx prisma db seed` (not `bun`) |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|--------|
| `DATABASE_URL` | SQLite database path | `file:./db/custom.db` |
| `NEXTAUTH_SECRET` | JWT signing secret | (required) |
| `NEXTAUTH_URL` | Base URL | `http://localhost:3000` |

### Demo Users

| Email | Password | Role |
|-------|----------|------|
| admin@netoptima-dz.local | admin123 | Super Admin |
| noc@netoptima-dz.local | demo123 | NOC Manager |
| rf@netoptima-dz.local | demo123 | RF Engineer |
| nop@netoptima-dz.local | demo123 | NOP Engineer |
| field@netoptima-dz.local | demo123 | Field Technician |
| viewer@netoptima-dz.local | demo123 | Read-Only Viewer |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | **One-command setup**: .env + schema + seed |
| `npm run dev` | Start dev server (port 3000) |
| `npm run lint` | Run ESLint |
| `npx prisma db push` | Push Prisma schema to database |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma db seed` | Seed demo data |
| `npx prisma migrate reset` | Reset database and reseed |

## Key Features

- **Trilingual**: Full French, English, and Arabic support with RTL layout
- **Role-Based Access**: 6 roles with 102 granular permissions
- **51 Views**: Complete NOC platform covering operations, analytics, AI, and automation
- **61 API Routes**: RESTful endpoints with rate limiting and error handling
- **Real-time**: WebSocket-ready architecture for live monitoring
- **Accessible**: ARIA attributes, skip navigation, keyboard focus indicators, screen reader support
- **Responsive**: Mobile-first design with collapsible sidebar
- **Dark Mode**: System-aware theme switching

## Architecture

- **SPA Pattern**: Single-page app using Next.js App Router with client-side view switching
- **Lazy Loading**: 43 of 51 views are dynamically imported to reduce initial bundle
- **Error Boundaries**: Each view wrapped in React error boundaries
- **Rate Limiting**: Sliding-window in-memory rate limiter on all API routes
- **Auth Middleware**: JWT-based route protection via Next.js middleware

## License

Private — NetOptima Algérie
