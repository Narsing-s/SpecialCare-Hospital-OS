# Architecture

Target: 1,000+ beds, thousands of concurrent users, multiple buildings and optional multi-hospital tenancy.

## Facility hierarchy
Hospital Group → Hospital → Campus → Building → Floor → Ward → Room → Bed

## Core principles
- Domain-oriented services
- Versioned API contracts
- PostgreSQL as transactional system of record
- Object storage for documents/reports
- Event-driven integration boundary
- Idempotent commands
- Immutable audit events
- Least-privilege scope-aware RBAC
- Observability and operational dashboards

External EMR/HIS, ERP, PACS/RIS, LIS, payment, insurance/TPA, messaging, medical devices and government systems should connect through versioned APIs/events.
