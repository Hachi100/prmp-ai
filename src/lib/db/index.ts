/**
 * Client PostgreSQL + Drizzle ORM
 * Pool de connexions configure pour Next.js (serverless-friendly)
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // Evite de creer plusieurs instances de Pool en developpement (hot reload)
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl:
      process.env["NODE_ENV"] === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
}

// Singleton du pool en developpement pour eviter l'epuisement des connexions
const pool =
  process.env["NODE_ENV"] === "development"
    ? (global.__pgPool ??= createPool())
    : createPool();

if (process.env["NODE_ENV"] === "development") {
  global.__pgPool = pool;
}

export const db = drizzle(pool, { schema, logger: process.env["NODE_ENV"] === "development" });

export type DB = typeof db;

// Re-export des helpers Drizzle utiles
export { sql, eq, and, or, not, gt, gte, lt, lte, inArray, isNull, isNotNull, desc, asc, count, sum } from "drizzle-orm";
