# SpecialCare Enterprise Hospital OS

A production-oriented Hospitalization & Hospital Operations Platform designed for 1,000+ bed hospitals and multi-hospital networks.

## Patient journey

Registration → OPD/Emergency → Admission → Bed Allocation → Clinical Care → Nursing → Diagnostics → Pharmacy → Billing/Insurance → Transfer → Discharge → Follow-up.

## Current workspaces

- `/` — Hospital Command Center and patient registry
- `/admin` — Facility & Bed Configuration
- `/admissions` — Admissions, transfers, discharge and patient journey
- `/care` — Clinical documentation, vitals, notes, diagnoses and orders
- `/nursing` — Nursing observation board and latest bedside observations
- `/diagnostics` — Laboratory/radiology order and result workspace
- `/pharmacy` — Prescriptions and medication administration
- `/operations` — Emergency, ICU, Operating Theatre, Blood Bank and Ambulance command workspace
- `/insurance` — Insurance/TPA provider directory and claims workspace
- `/reports` — Live operational and financial reporting
- `/audit` — Audit event review

## Hospital operations

The Operations workspace provides database-backed foundations for:

- Emergency intake, triage, clinician assignment, disposition and case status
- ICU stays with bed labels, acuity and active/closed status
- Operating Theatre scheduling, theatre assignment and case status
- Blood bank inventory by blood group, component, donation code and availability
- Ambulance dispatch, patient transport, pickup/destination and lifecycle timestamps
- Live operational summary counts for command-center monitoring

## Phase 1

- Authentication and scope-aware RBAC foundation
- Hospital/campus/building/floor/ward/room/bed hierarchy
- Patient registration and MRN
- Appointments and queues
- Encounters, notes, diagnoses and clinical orders
- Admissions, transfers and bed management
- Nursing and vitals
- Laboratory and radiology foundations
- Pharmacy and prescriptions
- Billing and insurance foundation
- Inventory and stock movements
- Emergency, ICU, OT, blood bank and ambulance foundations
- Notifications, preferences and audit-event APIs
- Insurance/TPA policies, pre-authorizations and claims
- Nursing assignments, bedside tasks and care plans
- Operational and financial reporting
- Hospital command center

## Architecture

Next.js + TypeScript frontend, Fastify + TypeScript API, PostgreSQL + Prisma, object storage for documents, realtime events and versioned REST APIs.

## Database

Prisma migrations are committed under `packages/database/prisma/migrations`. The database includes hospital operations plus insurance/TPA, notifications, nursing assignments/tasks, care plans and audit/reporting foundations with indexes and foreign keys. Run Prisma validation/migrations after pulling the latest changes. Demo seed data includes a 5,120-bed facility hierarchy plus non-production blood-bank and ambulance records.

## Development

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
npm run dev:api
```

> Clinical workflows, privacy/security controls and regulatory requirements must be validated by qualified healthcare, legal and security professionals before real-world deployment. The demo seed data and disabled demo clinician account are for development only.


## Run locally (recommended: Docker Compose)

This starts the database, API, and the existing web UI together. No UI redesign is involved.

**Requirements:** Git and Docker Desktop with Docker Compose enabled.

### Windows PowerShell

```powershell
git clone https://github.com/Narsing-s/SpecialCare-Hospital-OS.git
cd SpecialCare-Hospital-OS
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://localhost:4000/health
```

### macOS / Linux

```bash
git clone https://github.com/Narsing-s/SpecialCare-Hospital-OS.git
cd SpecialCare-Hospital-OS
cp .env.example .env
docker compose up --build -d
docker compose ps
curl http://localhost:4000/health
```

When the `web` and `api` containers are healthy, open **http://localhost:3000**. The API health endpoint is **http://localhost:4000/health**.

**Local demo sign-in**

- Email: `demo.clinician@specialcare.local`
- Password: the value of `SEED_ADMIN_PASSWORD` in your local `.env` file (default: `LocalDemoPassword123!`)

These credentials and all seeded data are for local development only. Change them before any shared deployment.

### Useful local commands

```bash
docker compose logs -f api
docker compose logs -f web
docker compose restart api web
docker compose down
```

`docker compose down` keeps the database volume. To completely reset the local demo database, use `docker compose down -v` (this permanently deletes its local data).

If a port is already in use, stop the other process or change the published ports in `docker-compose.yml`. If a build fails, inspect `docker compose logs --no-color` and the relevant GitHub Actions run.

### Run the services directly with Node.js (optional)

Install Node.js 20+, PostgreSQL 17, and dependencies with `npm install`. Configure `DATABASE_URL`, `AUTH_SECRET`, `SEED_ADMIN_PASSWORD`, and `CORS_ORIGIN=http://localhost:3000` in your shell before running the database setup and API. Copy `apps/web/.env.example` to `apps/web/.env.local` so Next.js uses `NEXT_PUBLIC_API_URL=http://localhost:4000`. Start the API with `npm run dev:api` and the web UI with `npm run dev` in separate terminals.

## Production-readiness status

The repository is a strong portfolio/reference implementation, but it is **not yet a production clinical system**. The next mandatory hardening items are:

- Enforce authentication on every protected API route; the current demo API is intentionally open for local development.
- Enforce hospital/department/ward/patient scope in authorization checks.
- Centralize and automatically emit audit events from state-changing clinical, financial and operational commands.
- Add password hashing, session/refresh-token management, account lockout and MFA/SSO integration.
- Replace ad-hoc request casts with centralized Fastify JSON Schema/Zod validation.
- Add idempotency keys for payments, claims, medication administration, blood issue and other retry-sensitive commands.
- Add comprehensive unit/API authorization/E2E tests and security/dependency scanning.
- Add FHIR/HL7/PACS/LIS integrations, document/object storage, retention policies, backup/restore and disaster recovery controls as required by the deployment.

Never use the demo credentials or seed data for a real patient environment.


## Authentication and security configuration

Protected API routes require an authenticated hospital session. Browser sessions use an HttpOnly cookie; API clients may use a Bearer token.

Set these environment variables outside source control:

- `AUTH_SECRET` — long, random signing secret; required for deployed environments.
- `CORS_ORIGIN` — comma-separated trusted frontend origins; never use a wildcard in production.
- `SEED_ADMIN_PASSWORD` — only for development/demo database seeding; do not commit the value.

The seed creates the `HOSPITAL_ADMIN` role and permission mappings for the demo administrator. Change the seeded password immediately in a real environment.

Password storage uses salted scrypt rather than plaintext credentials. OWASP recommends memory-hard password hashing such as Argon2id or scrypt for password storage.

For production deployment, use HTTPS and an external identity provider/SSO with MFA where available. Browser session credentials should remain HttpOnly/Secure and should not be placed in localStorage.
