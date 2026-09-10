const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const schemaPath = path.join(__dirname, "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

function ensureRelation(modelName, relationLine) {
  const modelPattern = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\}`, "m");
  const match = schema.match(modelPattern);
  if (!match) return;
  if (match[1].includes(relationLine.trim())) return;
  const body = match[1].trim();
  schema = schema.replace(modelPattern, `model ${modelName} {\n${relationLine}\n${body}\n}`);
}

ensureRelation("User", "  doctor Doctor?");
ensureRelation("Patient", "  medicationAdministrations MedicationAdministration[]");

fs.writeFileSync(schemaPath, `${schema.trim()}\n`);

// Let Prisma itself perform the canonical formatting. This is safer than trying to
// parse/format compact schema text with a custom regex formatter.
execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "format", "--schema", schemaPath], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
});
