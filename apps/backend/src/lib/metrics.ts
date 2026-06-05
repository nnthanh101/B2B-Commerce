/**
 * Shared prom-client registry + metric singletons.
 *
 * Importing this module from BOTH the metrics route and the HTTP middleware
 * guarantees that exactly ONE Counter and ONE Histogram exist in the process,
 * regardless of which module Node.js loads first.
 *
 * Singleton guard: globalThis survives Medusa hot-reload re-evaluation so
 * duplicate-registration errors never surface in development.
 *
 * Metric names (ADR-007 SSOT):
 *   medusa_http_requests_total{method,route,status}
 *   medusa_http_request_duration_seconds{method,route,status}
 */

import { register, collectDefaultMetrics, Counter, Histogram } from "prom-client"

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
    registers: [register],
  })

  g.httpDur = new Histogram({
    name: "medusa_http_request_duration_seconds",
    help: "Medusa HTTP request duration in seconds",
    labelNames: ["method", "route", "status"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  })

  g.__dcMetricsInit = true
}

export { register }

// Non-null assertion is safe: the block above always sets these before this line executes.
export const httpReq = g.httpReq!
export const httpDur = g.httpDur!
