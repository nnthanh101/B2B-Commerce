/**
 * Prometheus /admin/metrics endpoint for Medusa v2 backend.
 *
 * Emits:
 *   - medusa_http_requests_total{method,route,status}   (counter)
 *   - medusa_http_request_duration_seconds{method,route,status} (histogram)
 *   - prom-client collectDefaultMetrics() (process/node defaults)
 *
 * Metric-name SSOT: these names must match the Grafana dashboard PromQL
 * (ADR-007 delta 7: medusa_http_requests_total, medusa_http_request_duration_seconds).
 *
 * Auth:
 *   - Development (NODE_ENV != "production"): open — no auth required.
 *   - Production: Bearer token gate via METRICS_BEARER_TOKEN env var.
 *
 * Singleton + metric definitions live in src/lib/metrics.ts (shared with the
 * HTTP middleware so both use exactly ONE registry/counter/histogram).
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { register } from "../../../lib/metrics"

// Opt out of Medusa's built-in admin JWT authentication.
// This route enforces its own auth: open in dev, Bearer token in production.
// See: Medusa v2 AUTHENTICATE export flag (routes-loader.js AUTHTHENTICATION_FLAG).
export const AUTHENTICATE = false

// ---------------------------------------------------------------------------
// GET /admin/metrics — Prometheus text format scrape endpoint
// ---------------------------------------------------------------------------
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    const expected = process.env.METRICS_BEARER_TOKEN
    const auth = req.headers["authorization"] as string | undefined
    if (!expected || !auth || auth !== `Bearer ${expected}`) {
      res.status(401).type("text/plain").send("unauthorized")
      return
    }
  }

  res.setHeader("Content-Type", register.contentType)
  res.send(await register.metrics())
}
