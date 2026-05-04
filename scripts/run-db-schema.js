const fs = require("node:fs");
const path = require("node:path");
const { loadEnvFiles } = require("./load-env-file");

const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "db", "schema.sql");
loadEnvFiles(root);

async function loadPostgres() {
  try {
    const module = await import("postgres");
    return module.default;
  } catch (error) {
    throw new Error(
      "Missing optional dependency `postgres`. Run `npm.cmd install` after network access is available, then retry.",
    );
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before running db/schema.sql.");
  }

  const schema = fs.readFileSync(schemaPath, "utf8");
  const postgres = await loadPostgres();
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    ssl: databaseUrl.includes("sslmode=disable") ? false : "require",
  });

  try {
    await sql.unsafe(schema);
    console.log("Database schema applied successfully.");
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
