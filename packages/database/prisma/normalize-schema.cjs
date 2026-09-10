const fs = require("node:fs");
const path = require("node:path");

const schemaPath = path.join(__dirname, "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes("doctor Doctor?")) schema = schema.replace("model User {", "model User { doctor Doctor?");
if (!schema.includes("medicationAdministrations MedicationAdministration[]")) schema = schema.replace("model Patient {", "model Patient { medicationAdministrations MedicationAdministration[]");

schema = schema.replace(/generator client\s*\{([\s\S]*?)\}/, (_m, body) => {
  const provider = body.match(/provider\s*=\s*"([^"]+)"/);
  return `generator client {\n  provider = "${provider?.[1] || "prisma-client-js"}"\n}`;
});

schema = schema.replace(/datasource db\s*\{([\s\S]*?)\}/, (_m, body) => {
  const provider = body.match(/provider\s*=\s*"([^"]+)"/);
  const url = body.match(/url\s*=\s*([^\s}]+)/);
  return `datasource db {\n  provider = "${provider?.[1] || "postgresql"}"\n  url = ${url?.[1] || "env(\"DATABASE_URL\")"}\n}`;
});

schema = schema.replace(/enum\s+(\w+)\s*\{([\s\S]*?)\}/g, (_m, name, body) => {
  const values = body.trim().split(/\s+/).filter(Boolean);
  return `enum ${name} {\n${values.map((value) => `  ${value}`).join("\n")}\n}`;
});

schema = schema.replace(/model\s+(\w+)\s*\{([\s\S]*?)\}/g, (_m, name, body) => {
  let normalized = body.trim();
  normalized = normalized.replace(
    /\s+(?=[A-Za-z_]\w*\s+(?:String|Int|Boolean|DateTime|Decimal|Json|[A-Z][A-Za-z0-9_]*)(?:\[\])?(?:\?)?(?:\s|@|$))/g,
    "\n"
  );
  normalized = normalized.replace(/\s+(?=@@)/g, "\n");
  normalized = normalized
    .split("\n")
    .map((line) => `  ${line.trim()}`)
    .filter((line) => line.trim())
    .join("\n");
  return `model ${name} {\n${normalized}\n}`;
});

fs.writeFileSync(schemaPath, `${schema.trim()}\n`);
