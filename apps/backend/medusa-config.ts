import { COMPANY_MODULE } from "./src/modules/company"
import { QUOTE_MODULE } from "./src/modules/quote"
import { APPROVAL_MODULE } from "./src/modules/approval"
import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      ssl: false,
      sslmode: "disable",
    },
    redisUrl: process.env.REDIS_URL,
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
    // [Modules.FILE] is intentionally omitted: Medusa v2 framework (express-loader.js L124)
    // unconditionally mounts express.static(baseDir/static) at /static — no module config needed.
    // Configuring @medusajs/file-local as the module resolve (not as a provider) causes
    // "No service found in module File" on startup. Ref: @medusajs/framework/dist/http/express-loader.js:124
  },
  admin: {
    vite: (config) => ({
      server: {
        host: "0.0.0.0",
        allowedHosts: ["localhost", ".localhost", "127.0.0.1"],
        hmr: {
          port: 5173,
          clientPort: 5173,
        },
      },
      optimizeDeps: {
        include: [
          ...(config.optimizeDeps?.include ?? []),
          "@medusajs/icons",
        ],
      },
    }),
  },
})
