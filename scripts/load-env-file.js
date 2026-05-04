const fs = require("node:fs");
const path = require("node:path");

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const index = trimmed.indexOf("=");
  if (index === -1) return null;

  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return key ? [key, value] : null;
}

function loadEnvFiles(root, fileNames = [".env.local", ".env"]) {
  fileNames.forEach((fileName) => {
    const filePath = path.join(root, fileName);
    if (!fs.existsSync(filePath)) return;

    fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map(parseEnvLine)
      .filter(Boolean)
      .forEach(([key, value]) => {
        if (process.env[key] === undefined) process.env[key] = value;
      });
  });
}

module.exports = { loadEnvFiles };
