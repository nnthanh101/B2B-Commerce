import { QUOTE_MODULE } from "./src/modules/quote";
import { APPROVAL_MODULE } from "./src/modules/approval";
import { COMPANY_MODULE } from "./src/modules/company";
import { loadEnv, defineConfig } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Local Docker Postgres has no TLS. Enable SSL for AWS RDS in Phase 2 by
    // setting DATABASE_SSL=true. Ref: https://docs.medusajs.com/learn/installation/docker
    databaseDriverOptions:
      process.env.DATABASE_SSL === "true"
        ? { ssl: { rejectUnauthorized: false } }
        : { ssl: false, sslmode: "disable" },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: {
    [COMPANY_MODULE]: {
      resolve: "./modules/company",
    },
    [QUOTE_MODULE]: {
      resolve: "./modules/quote",
    },
    [APPROVAL_MODULE]: {
      resolve: "./modules/approval",
    },
  },
  // Allow the Admin (Vite) dev server to run inside Docker with working HMR.
  // Ref: https://docs.medusajs.com/learn/installation/docker
  admin: {
    vite: () => ({
      server: {
        host: "0.0.0.0",
        allowedHosts: ["localhost", ".localhost", "127.0.0.1"],
        hmr: { port: 5173, clientPort: 5173 },
      },
    }),
  },
});
