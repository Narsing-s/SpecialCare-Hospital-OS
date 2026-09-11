const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const schemaPath = path.join(__dirname, "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

// The checked-in Prisma schema is intentionally compact (many blocks are one line).
// Add only the two compatibility relations that older generated schemas may miss.
function ensureRelation(modelName, relationLine) {
  const modelPattern = new RegExp(`model\\s+${modelName}\\s*\\{`);
  const match = modelPattern.exec(schema);
  if (!match || match.index == null) return;

  const open = schema.indexOf("{", match.index);
  if (open < 0) throw new Error(`Unable to find opening brace for ${modelName}`);

  let depth = 0;
  let close = -1;
  for (let i = open; i < schema.length; i += 1) {
    if (schema[i] === "{") depth += 1;
    if (schema[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0) throw new Error(`Unable to find closing brace for ${modelName}`);

  const block = schema.slice(open + 1, close);
  const fieldName = relationLine.trim().split(/\s+/)[0];
  const fieldPattern = new RegExp(`(^|\\n)\\s*${fieldName}\\s+`);
  if (fieldPattern.test(block)) return;

  const prefix = schema.slice(0, close).replace(/\s*$/, "");
  const suffix = schema.slice(close);
  schema = `${prefix}\n${relationLine}\n${suffix}`;
}

ensureRelation("User", "  doctor Doctor?");
ensureRelation("Patient", "  medicationAdministrations MedicationAdministration[]");

fs.writeFileSync(schemaPath, `${schema.trim()}\n`);

execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "format", "--schema", schemaPath],
  { cwd: path.resolve(__dirname, ".."), stdio: "inherit" },
);
