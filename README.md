# Pulse — Advanced Database-Free Website Monitoring

> **Know when your website goes down.**

Pulse is a modern, commercial-grade website and API monitoring platform designed with an absolute architectural rule: **There is no database.**

Pulse does **not** use Supabase, PostgreSQL, MySQL, MongoDB, Firebase, Redis, SQLite, Prisma, Drizzle, or server-side persistent storage. The user's browser is the single source of truth.

---

> [!IMPORTANT]
> **Pulse does not use a database.**
> **Monitoring runs while Pulse is open in the user's browser.**
> When the browser or tab is closed, monitoring is paused. When you return to Pulse, the centralized scheduler catches up and resumes checks immediately.

---

## ⚡ Architectural Principles

### 1. Zero Database & Browser Storage Architecture
* **localStorage**: Lightweight settings (Theme, Accent color, Density, Widget order, Sound, Date/time formats).
* **IndexedDB (`pulse_db`)**: Enterprise-grade client-side object stores:
  * `monitors`: Endpoint configurations, thresholds, and execution state.
  * `checks`: High-resolution latency telemetry, HTTP status codes, and assertion details.
  * `incidents`: Outage tracking, root cause diagnosis, and lifecycle timelines.
  * `integrations`: Notification webhook credentials (never saved to localStorage; always masked in the UI).
  * `statusPages`: Custom public status dashboard configurations.
  * `maintenanceWindows`: Scheduled maintenance periods.

### 2. Stateless Python Backend
The Python backend (`FastAPI`, `httpx`, `Pydantic`) is strictly **stateless**:
* Executes HTTP and SSL checks safely on behalf of the client.
* Resolves DNS records and runs comprehensive Server-Side Request Forgery (SSRF) checks before opening any socket.
* Returns latency, headers, and assertion evaluation results to the client.
* **Immediately discards all request data** — zero database, zero file logging of secrets.

---

## 🛡️ Security & SSRF Protection

Before every outbound check or notification webhook dispatch:
1. **Scheme Validation**: Strictly allows only `http://` and `https://`. Blocks `file://`, `ftp://`, `gopher://`, etc.
2. **DNS Resolution**: Resolves all IPv4 and IPv6 `A`/`AAAA` records using `socket.getaddrinfo()`.
3. **CIDR Range Blocking**: Rejects:
   * IPv4 Loopback (`127.0.0.0/8`) and IPv6 Loopback (`::1`)
   * Private Networks RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
   * Link-local & Cloud Metadata (`169.254.0.0/16`, `169.254.169.254`, `metadata.google.internal`)
   * Multicast (`224.0.0.0/4`, `ff00::/8`) and Carrier-grade NAT (`100.64.0.0/10`)
4. **Hop-by-Hop Redirect Defense**: Each HTTP redirect (up to 5 max) must re-resolve DNS and pass SSRF verification before being followed.
5. **Memory Defense**: Response body reads are streamed with a 512 KB cap to prevent denial-of-service memory exhaustion.

---

## 🚀 Key Features

* **Multi-Type Probing**:
  * **HTTP / Web**: Standard status code verification (2xx, 3xx, custom status code matching).
  * **Keyword Assertions**: Substring matching (`contains` / `not_contains`).
  * **Safe JSON Assertions**: Path navigation (`data.status`, `items[0].id`) with comparison operators (`equals`, `contains`, `exists`, `greater_than`, `less_than`) without arbitrary code execution.
  * **SSL/TLS Inspection**: Certificate validity, subject, issuer, protocol version, cipher, and days remaining.
* **Centralized Browser Scheduler (`MonitoringScheduler`)**:
  * Single tick loop handling concurrent check limits (up to 3 parallel checks).
  * `document.visibilityState` listener: instantly triggers due checks when tab regains focus.
  * Network online/offline event handlers preventing false alerts during connection loss.
  * Sleep wake-up detection prevents request flooding.
* **Incident Engine**:
  * Failure threshold transitions (`ONLINE` → `DEGRADED` → `DOWN`).
  * Automatic incident generation and resolution tracking.
* **Alerts & Integrations**:
  * **Discord Webhook**: Rich embedded cards with customizable message templates (`{{monitor_name}}`, `{{status}}`, `{{response_time}}`, `{{downtime}}`).
  * **Slack Webhook**: Formatted blocks with markdown context.
  * **Generic Webhooks**: Raw JSON event payloads with custom HTTP headers.
* **Telemetry & Analytics**:
  * Response times: Average, Median (P50), P95, P99, Minimum, Maximum.
  * Uptime tracking clearly delineating **Monitored Time** vs **Unmonitored Time**.
  * Interactive charts powered by Recharts.
* **Export / Import / Backup**:
  * Full JSON backup export (`pulse-backup.json`).
  * CSV export for historical checks.
  * Strict JSON schema validation and prototype pollution prevention on import.
* **Status Pages**:
  * Local status pages accessible via `/status/[slug]`.
  * Portable shareable status URLs (`/status?config=<base64-payload>`) containing zero secrets or private credentials.
* **Theming**:
  * 5 Themes: Midnight, Carbon, OLED Black, Slate, Light.
  * 6 Accents: Cyan, Violet, Blue, Emerald, Amber, Rose.

---

## 🛠️ Local Development

### Prerequisites
* Node.js 18+ (tested with Node 20 / 22)
* Python 3.10+ (tested with Python 3.12)

### 1. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
pip install -r requirements.txt
```

### 2. Run Development Server
```bash
# Runs both Next.js (port 3000) and FastAPI (port 8000) concurrently
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the landing page and dashboard.

---

## 🧪 Testing

### Backend Test Suite
```bash
python -m pytest tests/test_backend.py -v
```
Tests SSRF private IP blocking, protocol blocking, loopback blocking, safe JSON path extraction, operators, and rate limiters.

### Frontend Logic Suite
```bash
node tests/test_frontend_logic.mjs
```
Tests duration formatting, percentile computation, webhook credential masking, and backup import validation.

### Production Build
```bash
npm run build
```

---

## ☁️ Vercel Deployment

Pulse is ready for deployment on Vercel using Vercel's Python Serverless Runtime.

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Import the project into Vercel.
3. Vercel automatically detects Next.js and routes `/api/(.*)` to `api/index.py` via `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.py"
    }
  ]
}
```

No external database, Redis instance, or worker service is required.

---

## 👤 Author & Contact

Developed and maintained by **Hidden-Rhythm**:

- **GitHub**: [@Hidden-Rhythm](https://github.com/Hidden-Rhythm)
- **Discord**: `hidden-rhythm`

---

