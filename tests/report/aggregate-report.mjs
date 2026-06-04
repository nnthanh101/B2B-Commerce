#!/usr/bin/env node
/**
 * aggregate-report.mjs — RQ2 Test Report Aggregator (OceanSoft B2B Commerce v1.1.0)
 *
 * Reads (whatever exists) from <reportDir>:
 *   jest-integration.json        (jest --json output, Tier 3a)
 *   playwright-json-results.json  (Playwright JSON reporter, Tier 3b)
 *   static-results.log           (Tier 1 tsc/lint, optional)
 * Writes:
 *   REPORT.md  + REPORT.html
 *
 * Pure Node ESM, zero npm deps. Idempotent: same inputs => same outputs.
 * Usage: node tests/report/aggregate-report.mjs <reportDir>
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const reportDir = resolve(process.argv[2] ?? "tmp/Digital-Commerce/test-results");

const readJson = (p) => {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
};
const dur = (ms) => (ms == null ? "—" : ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`);

function parseJest(j) {
  if (!j) return [];
  const rows = [];
  for (const f of j.testResults ?? []) {
    const m = f.testFilePath?.match(/integration-tests\/(?:http\/)?(.+?)\.spec\.[jt]s$/);
    const suite = m ? m[1] : (f.testFilePath ?? "unknown");
    for (const r of f.testResults ?? []) {
      const spec = [...(r.ancestorTitles ?? []), r.title].join(" › ");
      rows.push({
        tier: "Tier 3a — Integration (HTTP)",
        suite, spec,
        status: r.status === "passed" ? "PASS" : r.status === "pending" ? "SKIP" : "FAIL",
        duration: dur(r.duration),
        message: r.status !== "passed" && r.failureMessages?.length ? r.failureMessages[0].split("\n")[0] : "",
      });
    }
  }
  return rows;
}

function parsePw(pw) {
  if (!pw) return [];
  const rows = [];
  const walk = (s, parent) => {
    const title = [parent, s.title].filter(Boolean).join(" › ");
    for (const spec of s.specs ?? []) {
      const t = (spec.tests ?? [])[0] ?? {};
      const res = t.results?.[0] ?? {};
      rows.push({
        tier: "Tier 3b — E2E (Playwright)",
        suite: title || "root", spec: spec.title,
        status: spec.ok === true ? "PASS" : spec.ok === false ? "FAIL" : "SKIP",
        duration: dur(res.duration),
        message: res.error?.message ? res.error.message.split("\n")[0] : "",
      });
    }
    for (const c of s.suites ?? []) walk(c, title);
  };
  for (const s of pw.suites ?? []) walk(s, "");
  return rows;
}

function parseStatic(dir) {
  const p = join(dir, "static-results.log");
  if (!existsSync(p)) return [];
  const txt = readFileSync(p, "utf8");
  const errs = (txt.match(/error TS\d+/g) || []).length;
  return [{
    tier: "Tier 1 — Static (tsc/lint)",
    suite: "typecheck", spec: "tsc --noEmit (both apps)",
    status: errs === 0 ? "PASS" : "FAIL",
    duration: "—",
    message: errs === 0 ? "" : `${errs} TS error(s) — see static-results.log`,
  }];
}

const rows = [...parseStatic(reportDir), ...parseJest(readJson(join(reportDir, "jest-integration.json"))), ...parsePw(readJson(join(reportDir, "playwright-json-results.json")))];
const pass = rows.filter((r) => r.status === "PASS").length;
const fail = rows.filter((r) => r.status === "FAIL").length;
const skip = rows.filter((r) => r.status === "SKIP").length;
const total = rows.length;
const overall = fail > 0 ? "FAIL" : total === 0 ? "NO_DATA" : "PASS";
const gen = new Date().toISOString();

function byTier(rs) {
  const m = new Map();
  for (const r of rs) { if (!m.has(r.tier)) m.set(r.tier, []); m.get(r.tier).push(r); }
  return m;
}

let md = `# OceanSoft B2B Commerce — Test Report v1.1.0\n\nGenerated: ${gen}  \nOverall: **${overall}** | Pass: ${pass} | Fail: ${fail} | Skip: ${skip} | Total: ${total}\n\n---\n`;
if (rows.length === 0) {
  md += "\n_No test results found. Run `task test:integration` / `task test:all` first._\n";
} else {
  for (const [tier, trs] of byTier(rows)) {
    const tp = trs.filter((r) => r.status === "PASS").length;
    md += `\n## ${tier}\n\n**${trs.some((r) => r.status === "FAIL") ? "FAIL" : "PASS"}** — Pass ${tp}/${trs.length}\n\n| Suite | Spec | Status | Duration | Notes |\n|---|---|---|---|---|\n`;
    for (const r of trs) {
      const icon = r.status === "PASS" ? "✅" : r.status === "SKIP" ? "⏭" : "❌";
      md += `| ${r.suite} | ${r.spec} | ${icon} ${r.status} | ${r.duration} | ${r.message.replace(/\|/g, "\\|").slice(0, 100)} |\n`;
    }
  }
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const color = overall === "PASS" ? "#22c55e" : overall === "FAIL" ? "#ef4444" : "#94a3b8";
let sections = rows.length === 0 ? "<p><em>No results. Run <code>task test:all</code>.</em></p>" : "";
for (const [tier, trs] of byTier(rows)) {
  sections += `<section><h2>${esc(tier)}</h2><table><thead><tr><th>Suite</th><th>Spec</th><th>Status</th><th>Duration</th><th>Notes</th></tr></thead><tbody>` +
    trs.map((r) => {
      const icon = r.status === "PASS" ? "✅" : r.status === "SKIP" ? "⏭" : "❌";
      const cls = r.status === "FAIL" ? ' class="fail"' : r.status === "SKIP" ? ' class="skip"' : "";
      return `<tr${cls}><td>${esc(r.suite)}</td><td>${esc(r.spec)}</td><td>${icon} ${r.status}</td><td>${r.duration}</td><td><small>${esc(r.message).slice(0, 120)}</small></td></tr>`;
    }).join("") + `</tbody></table></section>`;
}
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>OceanSoft B2B — Test Report v1.1.0</title>
<style>body{font-family:-apple-system,Segoe UI,sans-serif;margin:0;padding:1.5rem;background:#0f172a;color:#e2e8f0}h1{font-size:1.4rem}h2{font-size:1.1rem;margin:2rem 0 .5rem;border-bottom:1px solid #334155;padding-bottom:.3rem}.badge{display:inline-block;padding:.25rem .75rem;border-radius:4px;font-weight:bold;background:${color};color:#fff;margin-left:.5rem}.meta{font-size:.8rem;color:#94a3b8;margin-bottom:1.5rem}table{width:100%;border-collapse:collapse;font-size:.82rem}th{background:#1e293b;padding:.4rem .6rem;text-align:left;color:#94a3b8}td{padding:.35rem .6rem;border-bottom:1px solid #1e293b;word-break:break-word}tr.fail td{background:rgba(239,68,68,.08)}tr.skip td{color:#64748b}section{margin-bottom:2rem}</style></head>
<body><h1>OceanSoft B2B Commerce — Test Report v1.1.0 <span class="badge">${overall}</span></h1><p class="meta">Generated: ${gen} | Pass: ${pass} Fail: ${fail} Skip: ${skip} Total: ${total}</p>${sections}</body></html>\n`;

writeFileSync(join(reportDir, "REPORT.md"), md, "utf8");
writeFileSync(join(reportDir, "REPORT.html"), html, "utf8");
console.log(`[report] ${overall}: ${pass} pass, ${fail} fail, ${skip} skip / ${total} total`);
console.log(`[report] -> ${join(reportDir, "REPORT.md")} + REPORT.html`);
process.exit(fail > 0 ? 1 : 0);
