#!/usr/bin/env bash
# Discovers where 'playwright' package lives in the MCR playwright image.
set -euo pipefail

IMAGE="mcr.microsoft.com/playwright:v1.60.0-jammy"

docker run --rm "${IMAGE}" node -e "
const {execSync} = require('child_process');
const paths = [
  '/usr/lib/node_modules',
  '/usr/local/lib/node_modules',
  '/ms-playwright-agent/node_modules',
];

// Check each known path
for (const p of paths) {
  try {
    require.resolve(p + '/playwright');
    console.log('FOUND at:', p);
    process.exit(0);
  } catch(e) {}
}

// Try npm root -g
try {
  const npmRoot = execSync('npm root -g').toString().trim();
  console.log('npm root -g:', npmRoot);
  try {
    require.resolve(npmRoot + '/playwright');
    console.log('FOUND at npm root:', npmRoot);
    process.exit(0);
  } catch(e) {
    console.log('not at npm root');
  }
} catch(e) {
  console.log('npm root failed:', e.message);
}

// List available node_modules
try { console.log('/usr/lib/nm:', execSync('ls /usr/lib/node_modules 2>/dev/null').toString().trim()); } catch(e) {}
try { console.log('/usr/local/lib/nm:', execSync('ls /usr/local/lib/node_modules 2>/dev/null').toString().trim()); } catch(e) {}
try { console.log('find playwright:', execSync('find / -name playwright -type d -maxdepth 8 2>/dev/null | head -5').toString().trim()); } catch(e) { console.log('find failed'); }
"
