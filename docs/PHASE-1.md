# Phase 1 Implementation Plan

1. Platform foundation: authentication, RBAC, hospital hierarchy, audit, validation and security.
2. Patient registration: MRN, demographics, contacts, allergies and insurance foundation.
3. Scheduling: doctor schedules, appointments and queues.
4. Clinical: encounters, notes, diagnoses and orders.
5. Admissions: bed inventory, assignment, transfer and discharge.
6. Nursing: vitals, observations and ward tasks.
7. Diagnostics: laboratory and radiology order/report foundation.
8. Pharmacy: prescription and dispensing foundation.
9. Finance: invoice, payment and insurance foundation.
10. Command center: capacity, emergency, ICU, diagnostics and discharge KPIs.
11. CI/security: automated build, dependency/security checks and environment separation.

Definition of done: an admin can configure a hospital; reception can register and schedule a patient; a doctor can create an encounter and order services; admission can assign/transfer a bed; nursing can record vitals; billing can create an invoice; and privileged operations are auditable.
