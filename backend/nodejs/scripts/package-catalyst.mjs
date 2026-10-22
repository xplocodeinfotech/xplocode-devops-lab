// Builds catalyst-function.zip for the Catalyst console's Create Function > File Upload (no Catalyst CLI needed).
// Usage: npm run package:catalyst [-- node20]   (the optional argument is the stack name chosen in the console; default node22)
// The zip has catalyst-config.json at its root and includes production node_modules, because the docs do not say whether the
// console runs npm install for an uploaded zip. The dependencies are plain JavaScript, so a zip built on Windows runs on Linux.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const FUNCTION_NAME = 'student_api'; // the console asks for this name and it must match package.json and catalyst-config.json
const stack = process.argv[2] ?? 'node22';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stage = mkdtempSync(join(tmpdir(), 'catalyst-function-'));

try {
  for (const name of ['index.cjs', 'src', 'package-lock.json']) cpSync(join(root, name), join(stage, name), { recursive: true });
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  writeFileSync(join(stage, 'package.json'), JSON.stringify({ ...pkg, name: FUNCTION_NAME, scripts: undefined }, null, 2));
  const config = JSON.parse(readFileSync(join(root, 'catalyst-config.json'), 'utf8'));
  config.deployment.name = FUNCTION_NAME;
  config.deployment.stack = stack;
  writeFileSync(join(stage, 'catalyst-config.json'), JSON.stringify(config, null, 2));

  const install = spawnSync('npm ci --omit=dev --no-audit --no-fund', { cwd: stage, shell: true, stdio: 'inherit' });
  if (install.status !== 0) throw new Error('npm ci failed; run it once in backend/nodejs to see why.');

  const files = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  })(stage);

  // Minimal zip writer: deflate-compressed entries with forward-slash names (Compress-Archive on Windows can write backslashes).
  const parts = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.slice(stage.length + 1).split('\\').join('/'));
    const data = readFileSync(file);
    const packed = deflateRawSync(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0, 10); header.writeUInt16LE(0x21, 12); // fixed time 00:00, date 1980-01-01
    header.writeUInt32LE(crc32(data), 14); header.writeUInt32LE(packed.length, 18); header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    parts.push(header, name, packed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10); entry.writeUInt16LE(0, 12); entry.writeUInt16LE(0x21, 14);
    entry.writeUInt32LE(crc32(data), 16); entry.writeUInt32LE(packed.length, 20); entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += header.length + name.length + packed.length;
  }
  const centralBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  const out = join(root, 'catalyst-function.zip');
  writeFileSync(out, Buffer.concat([...parts, centralBytes, end]));
  console.log(`Created ${out} (${files.length} files, ${(statSync(out).size / 1048576).toFixed(1)} MB, stack ${stack}).`);
  console.log(`In the Catalyst console: Functions > Create Function > File Upload > Advanced I/O > name "${FUNCTION_NAME}" > stack "${stack}" > this zip.`);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
