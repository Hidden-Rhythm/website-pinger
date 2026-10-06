<div align="center">

# ⚡ Pulse

### Website monitoring, without the infrastructure overhead.

Monitor websites and APIs, track uptime and latency, detect incidents, inspect SSL certificates, and receive alerts — all from a modern, database-free monitoring dashboard.

<br>

<a href="https://website-pinger-pulse.vercel.app">
  <img src="https://img.shields.io/badge/⚡_LIVE_DEMO-Open_Pulse-111111?style=for-the-badge&labelColor=000000" alt="Live Demo">
</a>
&nbsp;
<a href="https://github.com/Hidden-Rhythm/website-pinger">
  <img src="https://img.shields.io/badge/GITHUB-Repository-111111?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
</a>

<br><br>

<img src="https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white">
<img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black">
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white">
<img src="https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi&logoColor=white">
<img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white">
<img src="https://img.shields.io/badge/Vercel-Ready-000000?style=flat-square&logo=vercel&logoColor=white">

</div>

<br>

---

<div align="center">

> **Know when your website goes down.**
>
> No database. No Redis. No monitoring server.
>
> Just Pulse.

</div>

---

## ✦ What is Pulse?

**Pulse** is a browser-driven website and API monitoring platform designed to give developers a clean, powerful way to monitor endpoints without building or maintaining a traditional monitoring infrastructure.

It combines a modern Next.js interface with a stateless FastAPI backend for performing secure HTTP, API, and SSL checks.

The result is a monitoring experience that feels like a traditional SaaS dashboard — while keeping your data on your own device.

<br>

<div align="center">

### `simple architecture` · `powerful monitoring` · `zero database`

</div>

---

# ◈ The Dashboard

Pulse is designed around a simple idea:

**Everything important should be visible at a glance.**

```text
┌──────────────────────────────────────────────────────────────────────┐
│  PULSE                                                ● MONITORING   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Overview                                                            │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   UPTIME     │  │   RESPONSE   │  │  INCIDENTS   │                │
│  │   99.98%     │  │    184ms     │  │      02      │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    RESPONSE TIME                             │    │
│  │                                                              │    │
│  │      ╭──╮                  ╭───╮                             │    │
│  │  ────╯  ╰────╮      ╭──────╯   ╰──────                       │    │
│  │               ╰──────╯                                       │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ● api.example.com                         184 ms      ONLINE        │
│  ● example.com                             231 ms      ONLINE        │
│  ● service.example.com                     412 ms      DEGRADED      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

The actual interface provides interactive charts, monitor cards, incident history, configuration controls, integrations, status pages, and customizable themes.

---

# ◇ Features

<table>
<tr>
<td width="50%">

### ⚡ HTTP Monitoring

Monitor websites and APIs with configurable intervals and status expectations.

* HTTP / HTTPS
* Status validation
* Response time
* Custom status codes
* Redirect handling

</td>
<td width="50%">

### ◈ API Assertions

Go beyond simply checking whether an endpoint responds.

* Keyword matching
* Negative matching
* JSON path extraction
* Value comparisons
* Existence checks

</td>
</tr>

<tr>
<td width="50%">

### ◉ SSL / TLS

Inspect certificates before they become a problem.

* Certificate validity
* Expiration date
* Days remaining
* Issuer
* Subject
* TLS information

</td>
<td width="50%">

### ◌ Incident Detection

Pulse understands the difference between a temporary failure and an actual outage.

```text
ONLINE
   ↓
DEGRADED
   ↓
DOWN
   ↓
RESOLVED
```

</td>
</tr>

<tr>
<td width="50%">

### ◈ Analytics

Understand how your services actually perform.

* Average latency
* Median / P50
* P95
* P99
* Minimum
* Maximum
* Uptime

</td>
<td width="50%">

### ◇ Integrations

Connect monitoring events to your existing workflow.

* Discord
* Slack
* Generic webhooks
* Custom headers
* Message templates

</td>
</tr>
</table>

---

# ⌁ Monitoring

Pulse supports multiple layers of endpoint validation.

### HTTP

```text
GET https://example.com
```

Check:

```text
✓ HTTP status
✓ Response time
✓ Redirects
✓ Availability
```

### Keyword

```text
contains       "Welcome"
not_contains   "Internal Server Error"
```

### JSON

```text
data.status
items[0].id
user.profile.name
```

With operators such as:

```text
equals
contains
exists
greater_than
less_than
```

This makes Pulse useful for both traditional websites and API endpoints.

---

# ◉ Security First

Monitoring infrastructure has to be careful about what it is allowed to request.

Pulse includes dedicated **SSRF protection** in its Python backend.

Before an outbound request is performed, Pulse validates the destination.

```text
                     REQUEST
                        │
                        ▼
                ┌───────────────┐
                │ Scheme Check  │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ DNS Resolution│
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │  CIDR Check   │
                └───────┬───────┘
                        │
                ┌───────┴────────┐
                │                │
              SAFE             BLOCKED
                │
                ▼
          HTTP / HTTPS
```

Blocked destinations include:

* Loopback networks
* RFC1918 private networks
* Link-local addresses
* Cloud metadata endpoints
* Multicast ranges
* Carrier-grade NAT
* Unsafe URL schemes

Redirects are also revalidated instead of blindly following every destination.

---

# ⌂ Database-Free by Design

Pulse does **not** require:

```text
✕ PostgreSQL
✕ MySQL
✕ MongoDB
✕ Supabase
✕ Firebase
✕ Redis
✕ Prisma
✕ Drizzle
```

Instead, monitoring state lives on the user's device.

### Browser

```text
┌─────────────────────────────────────────┐
│                PULSE                    │
├─────────────────────────────────────────┤
│                                         │
│  localStorage                           │
│  ├── Theme                              │
│  ├── Accent                             │
│  ├── Layout                             │
│  └── Preferences                        │
│                                         │
│  IndexedDB                              │
│  ├── monitors                           │
│  ├── checks                             │
│  ├── incidents                          │
│  ├── integrations                       │
│  ├── statusPages                        │
│  └── maintenanceWindows                 │
│                                         │
└─────────────────────────────────────────┘
```

The backend remains stateless.

It receives a request, performs the check, returns the result, and does not persist monitoring data.

---

# ⌁ Architecture

```text
                           ┌──────────────────────┐
                           │        PULSE         │
                           │     Next.js App      │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │ Monitoring Scheduler │
                           └──────────┬───────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
               HTTP / API           SSL           Assertions
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │    FastAPI Backend   │
                           │                      │
                           │   Stateless          │
                           │   SSRF Protected     │
                           └──────────┬───────────┘
                                      │
                                      ▼
                              Monitoring Result
```

The architecture deliberately keeps persistence out of the server.

---

# ◇ Analytics

Pulse records detailed client-side telemetry so you can understand not only **whether** something is online, but **how it performs**.

```text
RESPONSE TIME

P50     ─────── 142 ms
P95     ─────── 184 ms
P99     ─────── 312 ms
AVG     ─────── 167 ms
MIN     ───────  91 ms
MAX     ─────── 441 ms
```

Interactive charts make latency changes and incidents easy to identify.

---

# ◉ Status Pages

Create portable status pages for monitored services.

A status page can show:

```text
● API                  Operational
● Website              Operational
● Authentication       Operational
● Database             Operational
```

Status configurations can be shared without exposing private webhook credentials.

---

# ◇ Backup & Export

Your monitoring data stays portable.

### JSON

Export the complete Pulse configuration and monitoring state:

```text
pulse-backup.json
```

### CSV

Export historical check data for external analysis.

```text
timestamp,status,response_time,monitor
2026-10-06T18:00:00Z,200,184,Website
2026-10-06T18:01:00Z,200,172,Website
2026-10-06T18:02:00Z,200,191,Website
```

---

# ⌘ Themes

Pulse supports multiple visual environments.

| Theme      |     |
| ---------- | --- |
| Midnight   | `●` |
| Carbon     | `●` |
| OLED Black | `●` |
| Slate      | `●` |
| Light      | `○` |

And multiple accent options:

`Cyan` · `Violet` · `Blue` · `Emerald` · `Amber` · `Rose`

---

# ⚙ Tech Stack

<div align="center">

| Layer      | Technology               |
| ---------- | ------------------------ |
| Frontend   | Next.js 14               |
| UI         | React 18                 |
| Language   | TypeScript               |
| Styling    | Tailwind CSS             |
| Animation  | Framer Motion            |
| Icons      | Lucide React             |
| Charts     | Recharts                 |
| Backend    | FastAPI                  |
| Runtime    | Python                   |
| HTTP       | HTTPX                    |
| Validation | Pydantic                 |
| Storage    | IndexedDB + localStorage |
| Deployment | Vercel                   |

</div>

---

# ⌁ Getting Started

## Requirements

```text
Node.js 18+
Python 3.10+
npm
pip
```

Node.js 20+ and Python 3.12+ are recommended.

### Clone

```bash
git clone https://github.com/Hidden-Rhythm/website-pinger.git
cd website-pinger
```

### Install

```bash
npm install
pip install -r requirements.txt
```

### Start

```bash
npm run dev
```

Pulse will start:

```text
Frontend → http://localhost:3000
API      → http://127.0.0.1:8000
```

Open:

```text
http://localhost:3000
```

---

# ⌘ Development Commands

### Frontend + Backend

```bash
npm run dev
```

### Frontend only

```bash
npm run dev:web
```

### Backend only

```bash
npm run dev:api
```

### Production build

```bash
npm run build
```

### Backend tests

```bash
python -m pytest tests/test_backend.py -v
```

### Frontend tests

```bash
node tests/test_frontend_logic.mjs
```

---

# ▲ Deploy to Vercel

Pulse is designed to deploy directly to Vercel.

```text
GitHub
   │
   ▼
 Vercel
   │
   ├───────────────┐
   ▼               ▼
Next.js          FastAPI
Frontend         Serverless API
```

No separate:

```text
Database
Redis
Worker
VM
Monitoring Server
```

is required.

### Deploy

1. Fork or clone the repository.
2. Import the repository into Vercel.
3. Configure the required environment variables if applicable.
4. Deploy.

### Live deployment

<div align="center">

<a href="https://website-pinger-pulse.vercel.app">

**⚡ Launch Pulse →**

`website-pinger-pulse.vercel.app`

</a>

</div>

---

# ◈ Project Structure

```text
website-pinger/
│
├── api/                 # FastAPI / Vercel API
│
├── app/                 # Next.js application
│
├── backend/             # Backend monitoring logic
│
├── components/          # Reusable UI components
│
├── lib/                 # Client utilities & monitoring logic
│
├── public/              # Static assets
│
├── tests/               # Backend & frontend tests
│
├── .env.example
├── next.config.mjs
├── package.json
├── requirements.txt
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

---

# ◌ Monitoring Lifecycle

Pulse's browser scheduler handles monitoring automatically.

```text
                    START
                      │
                      ▼
               Load monitors
                      │
                      ▼
              Scheduler starts
                      │
                      ▼
              Check is due?
                 /       \
               NO         YES
               │           │
               │           ▼
               │      Run secure check
               │           │
               │           ▼
               │      Evaluate result
               │           │
               │           ▼
               │      Update telemetry
               │           │
               │           ▼
               │      Detect incident
               │           │
               └───────────┘
```

Pulse also reacts to browser visibility and network state to avoid unnecessary checks and false alerts.

---

# ⚠ Important

Pulse is intentionally **browser-driven**.

Monitoring occurs while the Pulse application is active.

If the browser or application is closed:

```text
Monitoring
     ↓
   PAUSED
```

When Pulse is opened again:

```text
Pulse loads
     ↓
Scheduler resumes
     ↓
Due monitors are checked
```

This architecture keeps the project database-free, but it also means Pulse is not intended to replace a dedicated always-on monitoring service.

---

# ◇ Why Pulse?

Traditional monitoring can quickly become infrastructure-heavy.

```text
Database
   +
Worker
   +
Scheduler
   +
Queue
   +
Redis
   +
Monitoring Server
   +
Maintenance
```

Pulse takes a different approach:

```text
             PULSE

       ┌──────────────┐
       │   Browser    │
       └──────┬───────┘
              │
       ┌──────▼───────┐
       │    FastAPI   │
       └──────┬───────┘
              │
       ┌──────▼───────┐
       │   Endpoint   │
       └──────────────┘
```

**Less infrastructure.
Less maintenance.
More control.**

---

# ◈ Roadmap

Potential future improvements include:

* [ ] More notification providers
* [ ] Additional API assertion types
* [ ] Advanced maintenance scheduling
* [ ] More status page customization
* [ ] Expanded SSL diagnostics
* [ ] More export formats
* [ ] Improved accessibility
* [ ] Additional monitoring protocols

---

# Contributing

Contributions are welcome.

If you discover a bug or have an idea:

1. Open an issue.
2. Describe the problem or feature clearly.
3. Include reproduction steps when applicable.
4. Submit a pull request for improvements.

---

# ◇ Links

<div align="center">

### ⚡ Pulse

**[Live Demo](https://website-pinger-pulse.vercel.app)**
**[GitHub Repository](https://github.com/Hidden-Rhythm/website-pinger)**

<br>

Built with **Next.js + FastAPI** by **Hidden-Rhythm**.

<br>

`Monitor.` · `Measure.` · `Respond.`

</div>
