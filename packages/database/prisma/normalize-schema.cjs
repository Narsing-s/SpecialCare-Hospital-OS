const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const schemaPath = path.join(__dirname, "schema.prisma");
let source = fs.readFileSync(schemaPath, "utf8").trim();

function findBlock(text, start) {
  const open = text.indexOf("{", start);
  if (open < 0) throw new Error(`Missing opening brace near offset ${start}`);
  let depth = 0;
  let quote = false;
  let escape = false;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') quote = false;
      continue;
    }
    if (ch === '"') {
      quote = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { open, close: i };
    }
  }
  throw new Error(`Missing closing brace near offset ${start}`);
}

function readBalanced(text, index, openChar, closeChar) {
  if (text[index] !== openChar) throw new Error(`Expected ${openChar}`);
  let depth = 0;
  let quote = false;
  let escape = false;
  for (let i = index; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') quote = false;
      continue;
    }
    if (ch === '"') {
      quote = true;
      continue;
    }
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Unbalanced ${openChar}${closeChar}`);
}

function formatSimpleBody(body) {
  const tokens = [];
  let i = 0;
  while (i < body.length) {
    while (/\s/.test(body[i] || "")) i += 1;
    if (i >= body.length) break;
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(body.slice(i));
    if (!match) throw new Error(`Cannot parse schema token near: ${body.slice(i, i + 80)}`);
    const key = match[0];
    i += key.length;
    while (/\s/.test(body[i] || "")) i += 1;
    if (body[i] !== "=") throw new Error(`Expected '=' after ${key}`);
    i += 1;
    while (/\s/.test(body[i] || "")) i += 1;
    const valueStart = i;
    if (body[i] === '"') {
      i += 1;
      let escape = false;
      while (i < body.length) {
        const ch = body[i++];
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') break;
      }
    } else if (/^[A-Za-z_]/.test(body[i] || "")) {
      const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(body.slice(i))[0];
      i += id.length;
      while (/\s/.test(body[i] || "")) i += 1;
      if (body[i] === "(") i = readBalanced(body, i, "(", ")") + 1;
    } else {
      throw new Error(`Cannot parse value near: ${body.slice(i, i + 80)}`);
    }
    tokens.push(`${key} = ${body.slice(valueStart, i).trim()}`);
  }
  return tokens.join("\n");
}

function formatEnumBody(body) {
  return body.trim().split(/\s+/).filter(Boolean).join("\n");
}

function formatModelBody(body) {
  const lines = [];
  let i = 0;
  while (i < body.length) {
    while (/\s/.test(body[i] || "")) i += 1;
    if (i >= body.length) break;

    if (body.startsWith("@@", i)) {
      const start = i;
      i += 2;
      while (/[A-Za-z0-9_]/.test(body[i] || "")) i += 1;
      while (/\s/.test(body[i] || "")) i += 1;
      if (body[i] === "(") i = readBalanced(body, i, "(", ")") + 1;
      lines.push(body.slice(start, i).trim());
      continue;
    }

    const field = /^[A-Za-z_][A-Za-z0-9_]*/.exec(body.slice(i));
    if (!field) throw new Error(`Cannot parse model field near: ${body.slice(i, i + 100)}`);
    const start = i;
    i += field[0].length;
    while (/\s/.test(body[i] || "")) i += 1;

    const type = /^[A-Za-z_][A-Za-z0-9_]*(?:\[\])?\??/.exec(body.slice(i));
    if (!type) throw new Error(`Cannot parse type for ${field[0]}`);
    i += type[0].length;

    while (true) {
      const save = i;
      while (/\s/.test(body[i] || "")) i += 1;
      if (body[i] !== "@" || body[i + 1] === "@") {
        i = save;
        break;
      }
      i += 1;
      while (/[A-Za-z0-9_]/.test(body[i] || "")) i += 1;
      while (/\s/.test(body[i] || "")) i += 1;
      if (body[i] === "(") i = readBalanced(body, i, "(", ")") + 1;
    }

    lines.push(body.slice(start, i).trim());
  }
  return lines.join("\n");
}

function formatSchema(text) {
  const output = [];
  let cursor = 0;
  const blockPattern = /\b(generator|datasource|enum|model)\s+[A-Za-z_][A-Za-z0-9_]*/g;
  let match;
  while ((match = blockPattern.exec(text))) {
    const prefix = text.slice(cursor, match.index).trim();
    if (prefix) output.push(prefix);
    const nameMatch = /^(generator|datasource|enum|model)\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(match[0]);
    const kind = nameMatch[1];
    const name = nameMatch[2];
    const block = findBlock(text, match.index);
    const body = text.slice(block.open + 1, block.close);
    let formattedBody;
    if (kind === "model") formattedBody = formatModelBody(body);
    else if (kind === "enum") formattedBody = formatEnumBody(body);
    else formattedBody = formatSimpleBody(body);
    output.push(`${kind} ${name} {\n${formattedBody.split("\n").map((line) => `  ${line}`).join("\n")}\n}`);
    cursor = block.close + 1;
    blockPattern.lastIndex = cursor;
  }
  const tail = text.slice(cursor).trim();
  if (tail) output.push(tail);
  return `${output.join("\n\n").trim()}\n`;
}

source = formatSchema(source);

function addRelation(modelName, relationLine) {
  const pattern = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`);
  const match = pattern.exec(source);
  if (!match) throw new Error(`Model ${modelName} not found`);
  const fieldName = relationLine.trim().split(/\s+/)[0];
  if (new RegExp(`^\\s*${fieldName}\\s+`, "m").test(match[1])) return;
  const updated = `${match[1].trimEnd()}\n${relationLine}\n`;
  source = source.slice(0, match.index) + match[0].replace(match[1], updated) + source.slice(match.index + match[0].length);
}

addRelation("User", "  doctor Doctor?");
addRelation("Patient", "  medicationAdministrations MedicationAdministration[]");

fs.writeFileSync(schemaPath, source);

execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "format", "--schema", schemaPath],
  { cwd: path.resolve(__dirname, ".."), stdio: "inherit" },
);
