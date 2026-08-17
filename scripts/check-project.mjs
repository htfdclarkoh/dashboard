import { access, readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const required = [
  'assets/tailwind.css',
  'vendor/firebase.js',
  'vendor/feather.min.js',
  'deptadmin/vendor/fontawesome.min.css'
];

for (const file of required) await access(file);

const checks = [
  ['index.html', /cdn\.tailwindcss\.com/, 'production Tailwind CDN'],
  ['deptadmin/index.html', /cdn\.tailwindcss\.com/, 'production Tailwind CDN'],
  ['main.js', /webSecurity\s*:\s*false/, 'disabled Electron web security']
];

for (const [file, pattern, label] of checks) {
  const source = await readFile(file, 'utf8');
  if (pattern.test(source)) throw new Error(`${label} found in ${file}`);
}

const dashboardHtml = await readFile('index.html', 'utf8');
if (!/\.slide\s*>\s*iframe\s*\{[^}]*height:\s*100%\s*!important/i.test(dashboardHtml)) {
  throw new Error('Dashboard slide iframe must fill the available display area.');
}
if (!/locationEl\.textContent\s*=\s*configuredLocationName/.test(dashboardHtml)) {
  throw new Error('Toolbar weather label must use the configured display location.');
}
if (/SHEET_URL|Papa\.parse|papaparse\.min\.js/.test(dashboardHtml)) {
  throw new Error('Legacy spreadsheet news feed found in index.html.');
}
if (!/collection\(db,\s*['"]news['"]\)/.test(dashboardHtml)) {
  throw new Error('Dashboard news feed must read from Firestore.');
}
const adminSource = await readFile('deptadmin/main.js', 'utf8');
if (/MASTER_WEB_APP_URL|callNewsService/.test(adminSource)) {
  throw new Error('Legacy Apps Script news service found in administrator code.');
}
if (!/NEWS_COLLECTION\s*=\s*['"]news['"]/.test(adminSource)) {
  throw new Error('Administrator news feed must use the Firestore news collection.');
}
const firestoreRules = await readFile('firestore.rules', 'utf8');
if (!/match\s+\/news\/\{document\}[\s\S]*?allow read:\s*if true;[\s\S]*?allow write:\s*if isAdmin\(\);/.test(firestoreRules)) {
  throw new Error('Firestore news rules must allow public reads and administrator writes.');
}
const inlineModule = dashboardHtml.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if (!inlineModule) throw new Error('Dashboard module script not found.');
await transform(inlineModule, { loader: 'js' });
await transform(adminSource, { loader: 'js' });

console.log('Project safety checks passed.');
