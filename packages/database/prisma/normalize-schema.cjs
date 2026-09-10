const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const schemaPath = path.join(__dirname, "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

// Keep normalization idempotent. Match a complete Prisma model block rather than
// using a non-greedy regex that can stop at braces inside relation attributes.
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

  const block = schema.slice(start, end + 1);
  if (block.includes(relationLine.trim())) return;

  const insertAt = schema.indexOf("\n", braceStart);
  if (insertAt < 0) throw new Error(`Malformed Prisma model ${modelName}`);
  schema = `${schema.slice(0, insertAt + 1)}${relationLine}\n${schema.slice(insertAt + 1)}`;
}

ensureRelation("User", "  doctor Doctor?");
ensureRelation("Patient", "  medicationAdministrations MedicationAdministration[]");

fs.writeFileSync(schemaPath, `${schema.trim()}\n`);

// Prisma owns formatting/validation. Do not use a custom schema formatter.
execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "format", "--schema", schemaPath],
  { cwd: path.resolve(__dirname, ".."), stdio: "inherit" },
);
