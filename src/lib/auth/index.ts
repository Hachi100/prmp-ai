/**
 * Configuration Better-Auth
 * Session JWT, RBAC (prmp, admin, readonly), duree 8h
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Simplifie pour l'environnement Benin
  },
  session: {
    expiresIn: 8 * 60 * 60, // 8 heures (journee de travail)
    updateAge: 2 * 60 * 60, // Renouveler si actif dans les 2h
  },
  trustedOrigins: [
    process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "prmp",
      },
      entiteId: {
        type: "string",
      },
    },
  },
});

export type Auth = typeof auth;
