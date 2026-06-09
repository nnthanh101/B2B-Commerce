import { COMPANY_MODULE } from "./src/modules/company"
import { QUOTE_MODULE } from "./src/modules/quote"
import { APPROVAL_MODULE } from "./src/modules/approval"
import { INVITE_MODULE } from "./src/modules/invite"
import { defineConfig, loadEnv, Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

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
      // KC-2: both actors can use emailpass (regression-safe) and Keycloak SSO
      authMethodsPerActor: {
        user: ["emailpass", "vymalo-keycloak"],
        customer: ["emailpass", "vymalo-keycloak"],
      },
    },
  },
  modules: [
    // --- B2B custom modules (local) ---
    {
      resolve: "./modules/company",
      key: COMPANY_MODULE,
    },
    {
      resolve: "./modules/quote",
      key: QUOTE_MODULE,
    },
    {
      resolve: "./modules/approval",
      key: APPROVAL_MODULE,
    },
    {
      resolve: "./modules/invite",
      key: INVITE_MODULE,
    },
    // [Modules.FILE] is intentionally omitted: Medusa v2 framework (express-loader.js L124)
    // unconditionally mounts express.static(baseDir/static) at /static — no module config needed.
    // Configuring @medusajs/file-local as the module resolve (not as a provider) causes
    // "No service found in module File" on startup. Ref: @medusajs/framework/dist/http/express-loader.js:124

    // --- KC-2: Auth module with emailpass (first, regression-safe) + Keycloak SSO provider ---
    {
      resolve: "@medusajs/medusa/auth",
      key: Modules.AUTH,
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
      options: {
        providers: [
          // emailpass FIRST — preserves existing admin/customer login (regression-safe)
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          // Keycloak SSO via @vymalo/medusa-keycloak
          {
            resolve: "@vymalo/medusa-keycloak",
            id: "vymalo-keycloak",
            options: {
              url: process.env.KEYCLOAK_URL,
              realm: process.env.KEYCLOAK_REALM,
              clientId: process.env.KEYCLOAK_CLIENT_ID,
              clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
              scope: process.env.KEYCLOAK_SCOPE || "openid profile email",
              default_redirect_uri: process.env.KEYCLOAK_CALLBACK_URL,
            },
          },
        ],
      },
    },
  ],
  admin: {
    vite: (config) => ({
      server: {
        host: "0.0.0.0",
        allowedHosts: ["localhost", ".localhost", "127.0.0.1", "host.docker.internal"],
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
