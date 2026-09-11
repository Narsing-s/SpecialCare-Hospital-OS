const fs = require("node:fs");
const path = require("node:path");

const schemaPath = path.join(__dirname, "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

// Keep normalization deterministic. The checked-in schema is compact, so avoid
// brace-based parsing and avoid running `prisma format` here (Prisma formatting
// can rewrite compact blocks before validation). Only add the two inverse
// relations required by the current model graph when they are missing.
function ensureRelation(modelName, anchor, relationLine) {
  const modelPattern = new RegExp(`model\\s+${modelName}\\s+\\{[\\s\\S]*?${anchor.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*\\}`);
  if (modelPattern.test(schema)) return;

  const fallbackPattern = new RegExp(`(model\\s+${modelName}\\s+\\{[\\s\\S]*?${anchor.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")})\\s*\\}`);
  const updated = schema.replace(fallbackPattern, `$1\n${relationLine}\n}`);
  if (updated === schema) {
    throw new Error(`Unable to add ${relationLine.trim()} to ${modelName}`);
  }
  schema = updated;
}

ensureRelation("User", "auditLogs AuditLog[]", "  doctor Doctor?");
ensureRelation("Patient", "updatedAt DateTime @updatedAt", "  medicationAdministrations MedicationAdministration[]");

fs.writeFileSync(schemaPath, schema.trimEnd() + "\n");
