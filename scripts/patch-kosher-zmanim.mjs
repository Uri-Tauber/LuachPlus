import fs from 'node:fs';

// 0.9.0 port fixes verified against KosherJava 04dc839. Remove when upstream incorporates them.
const version = JSON.parse(fs.readFileSync('node_modules/kosher-zmanim/package.json')).version;
if (version !== '0.9.0') throw new Error('Review KosherZmanim patches before changing its version');
function replace(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`KosherZmanim patch no longer applies: ${path}`);
  fs.writeFileSync(path, source.replace(before, after));
}
for (const format of ['lib-cjs', 'lib-es6']) {
  const base = `node_modules/kosher-zmanim/dist/${format}`;
  replace(`${base}/polyfills/Utils.js`,
    'rawOffsetMinutes = max < 0\r\n                ? 0 - max\r\n                : 0 - Math.min(janDateTime.offset, julyDateTime.offset);',
    'rawOffsetMinutes = Math.min(janDateTime.offset, julyDateTime.offset);');
  replace(`${base}/ComplexZmanimCalendar.js`,
    `this.getShaahZmanisAlos16Point1ToTzais3Point7() === ${format === 'lib-cjs' ? 'Utils_1.' : ''}Long_MIN_VALUE`,
    'Number.isNaN(this.getShaahZmanisAlos16Point1ToTzais3Point7())');
}
