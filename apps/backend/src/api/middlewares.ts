import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { defineMiddlewares } from "@medusajs/medusa";
import { adminMiddlewares } from "./admin/middlewares";
import { storeMiddlewares } from "./store/middlewares";
import { httpReq, httpDur } from "../lib/metrics";

// ---------------------------------------------------------------------------
// Global HTTP metrics middleware
// Records medusa_http_requests_total and medusa_http_request_duration_seconds
// on every request. Route label uses req.baseUrl (template, not full path with
// IDs) to keep cardinality low.
// ---------------------------------------------------------------------------
function metricsMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): void {
  const startMs = Date.now();
  res.on("finish", () => {
    const route = req.baseUrl || req.path || "unknown";
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };
    httpReq.inc(labels);
    httpDur.observe(labels, (Date.now() - startMs) / 1000);
  });
  next();
}

export default defineMiddlewares({
  routes: [
    { matcher: "/*", middlewares: [metricsMiddleware] },
    ...adminMiddlewares,
    ...storeMiddlewares,
    {
      matcher: "/store/customers/me",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          req.allowed = ["employee"];
          next();
        },
      ],
    },
  ],
});
