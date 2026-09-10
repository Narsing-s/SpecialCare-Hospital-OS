# Roles & Permissions

SUPER_ADMIN: platform configuration
HOSPITAL_ADMIN: hospital operations
CLINICAL_ADMIN: clinical configuration
DOCTOR: assigned patients, encounters and clinical orders
NURSE: assigned wards, patients, vitals and nursing tasks
RECEPTION: registration, demographics, appointments and queues
EMERGENCY_STAFF: triage and emergency workflow
LAB_TECHNICIAN: laboratory workflow and results
RADIOLOGY_TECHNICIAN: imaging workflow
PHARMACIST: prescriptions and dispensing
BILLING: invoices and payments
INSURANCE: claims/TPA
BLOOD_BANK: blood inventory and issue workflow
OT_STAFF: operating theatre workflow
ICU_STAFF: critical-care workflow
INVENTORY: stock
PROCUREMENT: purchasing
HR: workforce
AUDITOR: audit/read-only review
PATIENT: own records and appointments
ATTENDANT: explicitly authorized patient-linked access

Examples: `patient.read`, `patient.create`, `bed.assign`, `encounter.read`, `clinical.order.create`, `medication.dispense`, `billing.read`, `audit.read`.

Hospital, department, ward and patient scope must be enforced server-side.
