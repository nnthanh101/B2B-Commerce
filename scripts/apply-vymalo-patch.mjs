#!/usr/bin/env node
/**
 * apply-vymalo-patch.mjs
 * Applies the @vymalo/medusa-keycloak JWT fix directly to the installed package.
 *
 * The patch fixes: jwt.decode(token, {complete:true}) returns {header, payload, signature}
 * so email is at jwtData.payload.email, NOT jwtData.email.
 *
 * Usage (inside the ec container): node /server/scripts/apply-vymalo-patch.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// Find the service.js in pnpm store virtual or direct node_modules
const candidates = [
  '/server/node_modules/@vymalo/medusa-keycloak/dist/service.js',
  '/server/node_modules/.pnpm/@vymalo+medusa-keycloak@1.0.10/node_modules/@vymalo/medusa-keycloak/dist/service.js',
];

let servicePath = null;
for (const p of candidates) {
  if (existsSync(p)) {
    servicePath = p;
    break;
  }
}

if (!servicePath) {
  // Try find as fallback
  try {
    const found = execSync('find /server/node_modules -path "*vymalo*service.js" 2>/dev/null | head -1', {
      encoding: 'utf8'
    }).trim();
    if (found) servicePath = found;
  } catch (e) {
    // ignore
  }
}

if (!servicePath) {
  console.error('ERROR: Could not find @vymalo/medusa-keycloak/dist/service.js');
  process.exit(1);
}

console.log('Found service.js at:', servicePath);

const original = readFileSync(servicePath, 'utf8');

// Check if already patched
if (original.includes('payload?.email')) {
  console.log('ALREADY PATCHED: payload?.email found in service.js — no action needed.');
  process.exit(0);
}

// Apply the patch:
// 1. entity_id = jwtData.email  →  entity_id = jwtData?.payload?.email
// 2. metadata email/name/picture/given_name/family_name
const patched = original
  .replace('const entity_id = jwtData.email;', 'const entity_id = jwtData?.payload?.email;')
  .replace('email: jwtData.email,', 'email: jwtData?.payload?.email,')
  .replace('name: jwtData.name,', 'name: jwtData?.payload?.name,')
  .replace('picture: jwtData.picture,', 'picture: jwtData?.payload?.picture,')
  .replace('given_name: jwtData.given_name,', 'given_name: jwtData?.payload?.given_name,')
  .replace('family_name: jwtData.family_name,', 'family_name: jwtData?.payload?.family_name,');

if (patched === original) {
  console.error('ERROR: No replacements made — patch targets not found in service.js');
  console.error('       File may have an unexpected format. Check manually.');
  process.exit(1);
}

// Count changes
const entityIdFixed = patched.includes('jwtData?.payload?.email') && !original.includes('jwtData?.payload?.email');
console.log('Applying patches...');
console.log('  entity_id fix:', entityIdFixed ? 'APPLIED' : 'SKIPPED');

writeFileSync(servicePath, patched, 'utf8');
console.log('PATCHED: service.js written successfully.');

// Verify
const verify = readFileSync(servicePath, 'utf8');
if (verify.includes('payload?.email')) {
  console.log('VERIFY: patch confirmed in file.');
} else {
  console.error('VERIFY FAILED: patch not found after write!');
  process.exit(1);
}
