/**
 * Prometheus /admin/metrics endpoint for Medusa v2 backend.
 *
 * scope_id: commerce-plugin-sprint-3-5-tracks-bc-2026-06-03
 *
 * Auth strategy:
 *   - Development (NODE_ENV != "production"): open — no auth required
 *   - Production: Bearer token gate via METRICS_BEARER_TOKEN env var
 *
 * prom-client registration is process-singleton via globalThis to survive
 * Medusa's hot-reload module re-evaluation without duplicate-metric errors.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { register, collectDefaultMetrics, Counter, Histogram } from "prom-client"

// Process-singleton guard — prevents duplicate metric registration on hot-reload
const g = globalThis as unknown as {
  __dcMetricsInit?: boolean
  httpReq?: Counter<string>
  httpDur?: Histogram<string>
}

if (!g.__dcMetricsInit) {
  collectDefaultMetrics({ register })

  g.httpReq = new Counter({
    name: "medusa_http_requests_total",
    help: "Total Medusa HTTP requests",
    labelNames: ["method", "route", "status"],
  })

  g.httpDur = new Histogram({
    name: "medusa_http_request_duration_seconds",
    help: "Medusa HTTP request duration in seconds",
    labelNames: ["method", "route", "status"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  })

  g.__dcMetricsInit = true
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  // Production: require Bearer token auth
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
