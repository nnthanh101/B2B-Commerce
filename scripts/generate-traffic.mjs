#!/usr/bin/env node
/**
 * Generate real commerce HTTP traffic to populate Grafana/Prometheus metrics panels.
 * Hits multiple medusa endpoints to produce latency + request rate samples.
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";

async function getAdminToken() {
  const res = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@test.local", password: "Test1234!" }),
  });
  const { token } = await res.json();
  return token;
}

async function getPublishableKey(adminToken) {
  const res = await fetch(`${BACKEND_URL}/admin/api-keys?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();
  const key = (data.api_keys || []).find(k => k.type === "publishable" && !k.revoked_at);
  return key?.token || "";
}

async function main() {
  console.log("Starting traffic generation...");
  const adminToken = await getAdminToken();
  const pubKey = await getPublishableKey(adminToken);
  console.log(`Pub key: ${pubKey.slice(0, 20)}...`);

  const storeHeaders = { "x-publishable-api-key": pubKey };
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const rounds = 5;
  for (let r = 0; r < rounds; r++) {
    console.log(`Round ${r + 1}/${rounds}...`);

    // Hit store endpoints (these are instrumented by Medusa metrics)
    await fetch(`${BACKEND_URL}/health`).catch(() => {});
    await fetch(`${BACKEND_URL}/store/regions`, { headers: storeHeaders }).catch(() => {});
    await fetch(`${BACKEND_URL}/store/products?limit=12`, { headers: storeHeaders }).catch(() => {});
    await fetch(`${BACKEND_URL}/store/product-categories`, { headers: storeHeaders }).catch(() => {});
    await fetch(`${BACKEND_URL}/store/collections`, { headers: storeHeaders }).catch(() => {});

    // Hit admin endpoints
    await fetch(`${BACKEND_URL}/admin/quotes?limit=10`, { headers: adminHeaders }).catch(() => {});
    await fetch(`${BACKEND_URL}/admin/approvals`, { headers: adminHeaders }).catch(() => {});
    await fetch(`${BACKEND_URL}/admin/products?limit=10`, { headers: adminHeaders }).catch(() => {});
    await fetch(`${BACKEND_URL}/admin/orders?limit=10`, { headers: adminHeaders }).catch(() => {});
    await fetch(`${BACKEND_URL}/admin/customers?limit=10`, { headers: adminHeaders }).catch(() => {});

    // Small pause between rounds
    await new Promise(r => setTimeout(r, 500));
  }

  console.log("Traffic generation complete. Waiting for Prometheus scrape...");
  await new Promise(r => setTimeout(r, 20000));  // Wait 20s for at least 1 scrape interval

  // Verify PromQL returns data
  const rateRes = await fetch(`${BACKEND_URL.replace("9000", "9090")}/api/v1/query?query=sum(rate(medusa_http_requests_total%5B5m%5D))`);
  const rateData = await rateRes.json();
  const value = rateData.data?.result?.[0]?.value?.[1];
  console.log(`sum(rate(medusa_http_requests_total[5m])) = ${value}`);

  if (!value || parseFloat(value) === 0) {
    console.error("WARN: PromQL rate still empty/zero. Wait another scrape interval.");
  } else {
    console.log("PASS: PromQL rate > 0, panels should be populated.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
