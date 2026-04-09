import type { Config } from "drizzle-kit";
import { config } from "dotenv";
config({ path: ".env.local" });

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/library",
  },
} satisfies Config;
