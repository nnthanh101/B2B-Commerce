#!/usr/bin/env node
// mdx-preflight.mjs — fast MDX-compile gate.
// Compiles every content/**/*.{md,mdx} with the engine's @mdx-js/mdx (the same
// MDX v3 compiler Docusaurus 3.10 uses) and EXITS NON-ZERO with `file:line: message`
// on the FIRST compile error. Exits 0 if every file compiles. Dependency-light, ESM.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const CONTENT = process.env.CONTENT_DIR ?? join(ROOT, "content");

// This script SHIPS in the PUBLIC repo (scripts/mdx-preflight.mjs) but @mdx-js/mdx
// is installed only in the private ENGINE's node_modules (npm ci'd in CI). Node ESM
// resolves bare specifiers relative to THIS file's location — the public repo root,
// which has no node_modules — so a plain `import "@mdx-js/mdx"` fails. Resolve the
// package against the engine's node_modules via MDX_RESOLVE_BASE (a path inside the
// engine dir), then dynamic-import the resolved absolute URL.
const resolveBase = process.env.MDX_RESOLVE_BASE ?? join(ROOT, "package.json");
const require = createRequire(resolveBase);
let compile;
try {
  ({ compile } = await import(pathToFileURL(require.resolve("@mdx-js/mdx")).href));
} catch (e) {
  console.error(
    `mdx-preflight: cannot resolve @mdx-js/mdx from base ${resolveBase}: ${e.message}`,
  );
  process.exit(2);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.mdx?$/.test(name)) out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(CONTENT);
} catch (e) {
  console.error(`mdx-preflight: cannot read ${CONTENT}: ${e.message}`);
  process.exit(2);
}

for (const file of files) {
  const rel = relative(ROOT, file);
  try {
    // Docusaurus compiles BOTH .md and .mdx as MDX (default markdown.format='mdx'),
    // so use the stricter mdx format for every file — a raw `<=` in a .md file is the
    // exact breaker this gate guards against. Strip HTML comments first to match the
    // real Docusaurus pipeline, which tolerates `<!-- -->` (raw @mdx-js/mdx does not).
    const src = readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
    await compile(src, { format: "mdx" });
  } catch (e) {
    const line = e?.line ?? e?.position?.start?.line ?? "?";
    console.error(`${rel}:${line}: ${e.reason ?? e.message}`);
    process.exit(1);
  }
}

console.log(`mdx-preflight: ${files.length} files compiled OK`);
process.exit(0);
