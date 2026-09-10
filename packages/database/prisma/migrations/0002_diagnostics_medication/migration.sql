CREATE TABLE "PrescriptionItem" (
  "id" TEXT NOT NULL,
  "prescriptionId" TEXT NOT NULL,
  "medication" TEXT NOT NULL,
  "dose" TEXT,
  "route" TEXT,
  "frequency" TEXT,
  "duration" TEXT,
  "quantity" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MedicationAdministration" (
  "id" TEXT NOT NULL,
  "prescriptionItemId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "administeredBy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'GIVEN',
  "administeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  CONSTRAINT "MedicationAdministration_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DiagnosticResult" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PRELIMINARY',
  "result" JSONB,
  "reportedBy" TEXT,
  "reportedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MedicationAdministration_patientId_administeredAt_idx" ON "MedicationAdministration"("patientId","administeredAt");
CREATE INDEX "DiagnosticResult_patientId_createdAt_idx" ON "DiagnosticResult"("patientId","createdAt");
CREATE INDEX "DiagnosticResult_orderId_idx" ON "DiagnosticResult"("orderId");
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticResult" ADD CONSTRAINT "DiagnosticResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticResult" ADD CONSTRAINT "DiagnosticResult_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ClinicalOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
