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
- Notifications and immutable audit-trail foundation
- Hospital command center

## Architecture

Next.js + TypeScript frontend, Fastify + TypeScript API, PostgreSQL + Prisma, object storage for documents, realtime events and versioned REST APIs.

## Database

Prisma migrations are committed under `packages/database/prisma/migrations`. The current operations migration adds EmergencyCase, ICUStay, OTCase, BloodUnit and AmbulanceTrip with indexes and foreign keys. Demo seed data includes a 5,120-bed facility hierarchy plus non-production blood-bank and ambulance records.

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
