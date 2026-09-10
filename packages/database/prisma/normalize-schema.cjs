const fs = require("node:fs");
const path = require("node:path");

const schemaPath = path.join(__dirname, "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

function ensureRelation(modelName, relationLine) {
  const modelPattern = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n?\\}`, "m");
  const match = schema.match(modelPattern);
  if (!match) return;
  const body = match[1];
  if (body.includes(relationLine.trim())) return;
  const updatedBody = `${relationLine}\\n${body}`;
  schema = schema.replace(modelPattern, `model ${modelName} {${updatedBody}\\n}`);
}

ensureRelation("User", "  doctor Doctor?");
ensureRelation("Patient", "  medicationAdministrations MedicationAdministration[]");

schema = schema.replace(/generator client\\s*\\{([\\s\\S]*?)\\}/, (_m, body) => {
  const provider = body.match(/provider\\s*=\\s*"([^"]+)"/);
  return `generator client {\\n  provider = "${provider?.[1] || "prisma-client-js"}"\\n}`;
});

schema = schema.replace(/datasource db\\s*\\{([\\s\\S]*?)\\}/, (_m, body) => {
  const provider = body.match(/provider\\s*=\\s*"([^"]+)"/);
  const url = body.match(/url\\s*=\\s*([^\\s}]+)/);
  return `datasource db {\\n  provider = "${provider?.[1] || "postgresql"}"\\n  url = ${url?.[1] || "env(\\"DATABASE_URL\\")"}\\n}`;
});

schema = schema.replace(/enum\\s+(\\w+)\\s*\\{([\\s\\S]*?)\\}/g, (_m, name, body) => {
  const values = body.trim().split(/\\s+/).filter(Boolean);
  return `enum ${name} {\\n${values.map((value) => `  ${value}`).join("\\n")}\\n}`;
});

schema = schema.replace(/model\\s+(\\w+)\\s*\\{([\\s\\S]*?)\\}/g, (_m, name, body) => {
  let normalized = body.trim();
  normalized = normalized.replace(
    /\\s+(?=[A-Za-z_]\\w*\\s+(?:String|Int|Boolean|DateTime|Decimal|Json|[A-Z][A-Za-z0-9_]*)(?:\\[\\])?(?:\\?)?(?:\\s|@|$))/g,
    "\\n"
  );
  normalized = normalized.replace(/\\s+(?=@@)/g, "\\n");
  normalized = normalized
    .split("\\n")
    .map((line) => `  ${line.trim()}`)
    .filter((line) => line.trim())
    .join("\\n");
  return `model ${name} {\\n${normalized}\\n}`;
});

fs.writeFileSync(schemaPath, `${schema.trim()}\\n`);
