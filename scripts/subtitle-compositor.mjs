#!/usr/bin/env node
/**
 * Subtitle compositor: renders narration text over flow stills.
 * For each flow: reads narration timestamps → renders HTML→PNG per cue → writes stills.tsv
 * Usage: node scripts/subtitle-compositor.mjs [--flow <slug>]
 */
import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const REPO_ROOT = '/Volumes/Working/projects/Digital-Commerce';
const FLOWS_DIR = path.join(REPO_ROOT, 'docs/content/demo/flows');
const STILLS_ROOT = path.join(REPO_ROOT, 'tmp/Digital-Commerce/demo/flows');
const VIEWPORT = { width: 1280, height: 720 };

// Parse narration cues from a flow .md file.
// Format: **[MM:SS]** "text" (bold-wrapped timestamps, CA-verified regex)
function parseCues(mdPath) {
  if (!fs.existsSync(mdPath)) return [];
  const lines = fs.readFileSync(mdPath, 'utf8').split('\n');
  const cues = [];
  for (const line of lines) {
    const m = line.match(/^\*\*\[(\d{2}:\d{2})\]\*\*\s+"?(.+?)"?\s*$/);
    if (m) cues.push({ time: m[1], text: m[2].trim() });
  }
  return cues;
}

// Render a subtitle HTML overlay over a base PNG, return composite PNG buffer.
// Base image is inlined as a data URI — no file:// or running server required.
async function renderSubtitle(page, basePngPath, text) {
  const imgData = fs.readFileSync(basePngPath);
  const b64 = imgData.toString('base64');
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const html = `<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:1280px;height:720px;overflow:hidden;position:relative}
    .frame{width:1280px;height:720px;background:url("data:image/png;base64,${b64}") center/cover no-repeat}
    .sub{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.72);color:#fff;font:bold 22px/1.4 system-ui,sans-serif;
      padding:10px 24px;border-radius:6px;text-align:center;max-width:1100px;white-space:pre-wrap}
  </style></head><body>
    <div class="frame"></div>
    <div class="sub">${escaped}</div>
  </body></html>`;
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return await page.screenshot({ type: 'png' });
}

async function processFlow(slug) {
  const flowNum = slug.split('-')[0];
  const bareSlug = slug.replace(/^\d+-/, '');
  const fullSlug = `${flowNum}-${bareSlug}`;

  // Resolve stills directory (try full numeric-prefixed slug first, then plain)
  const candidates = [
    path.join(STILLS_ROOT, fullSlug),
    path.join(STILLS_ROOT, slug),
  ];
  const stillsDir = candidates.find(d => fs.existsSync(d));
  if (!stillsDir) {
    console.log(`  SKIP ${slug}: no stills dir found`);
    return null;
  }

  const basePng = path.join(stillsDir, 'step-01.png');
  if (!fs.existsSync(basePng)) {
    console.log(`  SKIP ${slug}: step-01.png missing in ${stillsDir}`);
    return null;
  }

  // Resolve narration markdown (try both slug forms)
  const mdCandidates = [
    path.join(FLOWS_DIR, `${slug}.md`),
    path.join(FLOWS_DIR, `${fullSlug}.md`),
  ];
  const mdPath = mdCandidates.find(f => fs.existsSync(f));
  if (!mdPath) {
    console.log(`  SKIP ${slug}: narration .md not found`);
    return null;
  }

  const cues = parseCues(mdPath);
  if (cues.length === 0) {
    console.log(`  SKIP ${slug}: 0 narration cues found in ${mdPath}`);
    return null;
  }

  console.log(`  ${slug}: ${cues.length} cues, base=${basePng}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  const tsvLines = [];
  try {
    for (let i = 0; i < cues.length; i++) {
      const { time, text } = cues[i];
      const outPng = path.join(stillsDir, `step-01-subtitle-${i}.png`);
      const buf = await renderSubtitle(page, basePng, text);
      fs.writeFileSync(outPng, buf);
      tsvLines.push(`${outPng}\t${text}\t0`);
      console.log(`    cue ${i}: ${time} → ${outPng}`);
    }
  } finally {
    await browser.close();
  }

  const tsvPath = path.join(stillsDir, 'stills.tsv');
  fs.writeFileSync(tsvPath, tsvLines.join('\n') + '\n');
  console.log(`  Wrote TSV: ${tsvPath}`);
  return tsvPath;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const targetSlug = args.includes('--flow') ? args[args.indexOf('--flow') + 1] : null;

// Discover flows from FLOWS_DIR (numeric-prefixed .md files, sorted)
const flowFiles = fs.readdirSync(FLOWS_DIR)
  .filter(f => f.endsWith('.md') && /^\d{2}-/.test(f))
  .sort();

const flows = flowFiles.map(f => f.replace('.md', ''));
const toProcess = targetSlug ? flows.filter(f => f.includes(targetSlug)) : flows;

console.log(`Subtitle compositor: ${toProcess.length} flows to process`);
for (const slug of toProcess) {
  await processFlow(slug);
}
console.log('Done.');
