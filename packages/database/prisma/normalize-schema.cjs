const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const schemaPath = path.join(__dirname, "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

// Keep normalization idempotent. Prisma models in this repository may initially
// be written on one line, so relation fields must be inserted immediately before
// the model's closing brace, not after the first newline following the opening brace.
function ensureRelation(modelName, relationLine) {
  const modelStart = new RegExp(`model\\s+${modelName}\\s*\\{`, "m");
  const startMatch = schema.match(modelStart);
  if (!startMatch || startMatch.index == null) return;

  const start = startMatch.index;
  const braceStart = schema.indexOf("{", start);
  if (braceStart < 0) return;

  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < schema.length; i += 1) {
    if (schema[i] === "{") depth += 1;
    else if (schema[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) throw new Error(`Unable to find end of Prisma model ${modelName}`);

  const block = schema.slice(braceStart + 1, end);
  if (new RegExp(`(^|\\n)\\s*${relationLine.trim().replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*(?=\\n|$)`).test(block)) return;

  const beforeClose = schema.slice(0, end).replace(/\\s*$/, "");
  const afterClose = schema.slice(end);
  schema = `${beforeClose}\n${relationLine}\n${afterClose}`;
}

ensureRelation("User", "  doctor Doctor?");
ensureRelation("Patient", "  medicationAdministrations MedicationAdministration[]");

fs.writeFileSync(schemaPath, `${schema.trim()}\n`);

// Prisma owns formatting and validation.
execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "format", "--schema", schemaPath],
  { cwd: path.resolve(__dirname, ".."), stdio: "inherit" },
);
