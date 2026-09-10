# SpecialCare Enterprise Hospital OS

A production-oriented Hospitalization & Hospital Operations Platform designed for 1,000+ bed hospitals and multi-hospital networks.

## Patient journey

Registration → OPD/Emergency → Admission → Bed Allocation → Clinical Care → Nursing → Diagnostics → Pharmacy → Billing/Insurance → Transfer → Discharge → Follow-up.

## Phase 1

- Authentication and scope-aware RBAC
- Hospital/campus/building/floor/ward/bed hierarchy
- Patient registration and MRN
- Appointments and queues
- Encounters, notes, diagnoses and clinical orders
- Admissions, transfers and bed management
- Nursing and vitals
- Laboratory and radiology foundations
- Pharmacy and prescriptions
- Billing and insurance foundation
- Notifications and immutable audit trail
- Hospital command center

## Architecture

Next.js + TypeScript frontend, Fastify + TypeScript API, PostgreSQL + Prisma, object storage for documents, realtime events and versioned REST APIs.

> Clinical workflows, privacy/security controls and regulatory requirements must be validated by qualified healthcare, legal and security professionals before real-world deployment.
