-- Enterprise workflow domains: insurance, notifications, nursing, procurement and blood issue traceability

ALTER TABLE "InventoryItem" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "BloodUnit" ADD COLUMN "testingStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "BloodUnit" ADD COLUMN "storageLocation" TEXT;
ALTER TABLE "BloodUnit" ADD COLUMN "collectedAt" TIMESTAMP(3);

CREATE TABLE "InsuranceProvider" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "InsuranceProvider_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InsuranceProvider_hospitalId_code_key" ON "InsuranceProvider"("hospitalId","code");
ALTER TABLE "InsuranceProvider" ADD CONSTRAINT "InsuranceProvider_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PatientInsurance" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "policyNumber" TEXT NOT NULL,
  "memberId" TEXT,
  "planName" TEXT,
  "coveragePercent" DECIMAL(65,30),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "validFrom" TIMESTAMP(3),
  "validTo" TIMESTAMP(3),
  CONSTRAINT "PatientInsurance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatientInsurance_providerId_policyNumber_key" ON "PatientInsurance"("providerId","policyNumber");
CREATE INDEX "PatientInsurance_patientId_active_idx" ON "PatientInsurance"("patientId","active");
ALTER TABLE "PatientInsurance" ADD CONSTRAINT "PatientInsurance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientInsurance" ADD CONSTRAINT "PatientInsurance_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InsuranceClaim" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "insuranceId" TEXT,
  "claimNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "approved" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "submittedAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InsuranceClaim_claimNumber_key" ON "InsuranceClaim"("claimNumber");
CREATE INDEX "InsuranceClaim_providerId_status_idx" ON "InsuranceClaim"("providerId","status");
CREATE INDEX "InsuranceClaim_patientId_status_idx" ON "InsuranceClaim"("patientId","status");
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "PatientInsurance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InsuranceClaimItem" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "amount" DECIMAL(65,30) NOT NULL,
  CONSTRAINT "InsuranceClaimItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "InsuranceClaimItem" ADD CONSTRAINT "InsuranceClaimItem_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PreAuthorization" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "approvedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "reference" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "PreAuthorization_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PreAuthorization_patientId_status_idx" ON "PreAuthorization"("patientId","status");
ALTER TABLE "PreAuthorization" ADD CONSTRAINT "PreAuthorization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreAuthorization" ADD CONSTRAINT "PreAuthorization_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'INFO',
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId","readAt","createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationPreference_userId_channel_eventType_key" ON "NotificationPreference"("userId","channel","eventType");
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NursingAssignment" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "nurseId" TEXT,
  "shift" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "NursingAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NursingAssignment_hospitalId_status_idx" ON "NursingAssignment"("hospitalId","status");
CREATE INDEX "NursingAssignment_patientId_status_idx" ON "NursingAssignment"("patientId","status");
ALTER TABLE "NursingAssignment" ADD CONSTRAINT "NursingAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingAssignment" ADD CONSTRAINT "NursingAssignment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingAssignment" ADD CONSTRAINT "NursingAssignment_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "NursingTask" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  CONSTRAINT "NursingTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NursingTask_assignmentId_status_dueAt_idx" ON "NursingTask"("assignmentId","status","dueAt");
ALTER TABLE "NursingTask" ADD CONSTRAINT "NursingTask_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "NursingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CarePlan" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "goals" TEXT,
  "interventions" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CarePlan_patientId_status_idx" ON "CarePlan"("patientId","status");
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "contactName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Supplier_hospitalId_code_key" ON "Supplier"("hospitalId","code");
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "InventoryItem_supplierId_active_idx" ON "InventoryItem"("supplierId","active");

CREATE TABLE "InventoryBatch" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "lotNumber" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryBatch_itemId_lotNumber_key" ON "InventoryBatch"("itemId","lotNumber");
CREATE INDEX "InventoryBatch_expiresAt_status_idx" ON "InventoryBatch"("expiresAt","status");
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedAt" TIMESTAMP(3),
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseOrder_hospitalId_orderNumber_key" ON "PurchaseOrder"("hospitalId","orderNumber");
CREATE INDEX "PurchaseOrder_supplierId_status_idx" ON "PurchaseOrder"("supplierId","status");
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PurchaseOrderItem" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitCost" DECIMAL(65,30) NOT NULL,
  CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PurchaseOrderItem_itemId_idx" ON "PurchaseOrderItem"("itemId");
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BloodIssue" (
  "id" TEXT NOT NULL,
  "bloodUnitId" TEXT NOT NULL,
  "patientId" TEXT,
  "issuedBy" TEXT,
  "crossmatchStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "transfusionStatus" TEXT NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reactionNotes" TEXT,
  CONSTRAINT "BloodIssue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BloodIssue_patientId_issuedAt_idx" ON "BloodIssue"("patientId","issuedAt");
CREATE INDEX "BloodIssue_bloodUnitId_issuedAt_idx" ON "BloodIssue"("bloodUnitId","issuedAt");
ALTER TABLE "BloodIssue" ADD CONSTRAINT "BloodIssue_bloodUnitId_fkey" FOREIGN KEY ("bloodUnitId") REFERENCES "BloodUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BloodIssue" ADD CONSTRAINT "BloodIssue_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
