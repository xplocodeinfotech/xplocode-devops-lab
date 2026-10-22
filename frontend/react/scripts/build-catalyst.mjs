// Prepares Web Client Hosting files locally; does not upload or deploy anything.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { validateConfig } from '../src/config.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist-catalyst');
const source = JSON.parse(readFileSync(join(root, 'public/config.json'), 'utf8'));
const config = { mode: 'api', apiBaseUrl: '/server/student_api', requestTimeoutMs: source.requestTimeoutMs ?? 15000 };
validateConfig(config, 'https:', 'https://workshop.example');
const manifest = JSON.parse(readFileSync(join(root, 'public/client-package.json'), 'utf8'));
if (!manifest.name || !/^\d+\.\d+\.\d+$/.test(manifest.version) || manifest.homepage !== 'index.html') {
  throw new Error('client-package.json needs a name, numeric major.minor.patch version, and homepage index.html.');
}

await build({ root, base: '/app/', build: { outDir: output } });
// The development proxy and instructor-specific public URL must not enter this deployment configuration.
writeFileSync(join(output, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
console.log(`Prepared ${output}. Zip its CONTENTS, including client-package.json, for the same Catalyst project as student_api.`);
console.log('No upload performed. Verify /app/config.json, /server/student_api/api/health, and browser login after deployment.');
