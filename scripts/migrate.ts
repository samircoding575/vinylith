import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Running migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ Migrations applied");

  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
