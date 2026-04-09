import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

const connectionString = env.DATABASE_URL;

// Reuse the client across hot reloads in dev
const globalForDb = globalThis as unknown as {
  pg: ReturnType<typeof postgres> | undefined;
};

const client = globalForDb.pg ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
