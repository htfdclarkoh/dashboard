import { copyFile, cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await mkdir('vendor', { recursive: true });
await mkdir('deptadmin/webfonts', { recursive: true });

const bundles = [
  ['./scripts/firebase-entry.js', 'vendor/firebase.js']
];

for (const [entry, outfile] of bundles) {
  await build({
    absWorkingDir: projectRoot,
    entryPoints: [path.join(projectRoot, entry)],
    outfile: path.join(projectRoot, outfile),
    nodePaths: [path.join(projectRoot, 'node_modules')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    minify: true
  });
}

await copyFile('node_modules/feather-icons/dist/feather.min.js', 'vendor/feather.min.js');
await copyFile('vendor/firebase.js', 'deptadmin/vendor/firebase.js');
await copyFile('node_modules/@fortawesome/fontawesome-free/css/all.min.css', 'deptadmin/vendor/fontawesome.min.css');
await cp('node_modules/@fortawesome/fontawesome-free/webfonts', 'deptadmin/webfonts', { recursive: true, force: true });

console.log('Local browser assets built.');
