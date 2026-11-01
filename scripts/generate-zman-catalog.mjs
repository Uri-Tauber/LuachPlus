import fs from 'node:fs';

// These support no-argument calls in JS; 0.9.0 declarations omit that overload.
const methods = new Set(['getMinchaKetana', 'getPlagHamincha']);
for (const name of ['AstronomicalCalendar', 'ZmanimCalendar', 'ComplexZmanimCalendar']) {
  const source = fs.readFileSync(`node_modules/kosher-zmanim/dist/types/${name}.d.ts`, 'utf8');
  for (const [, method, args] of source.matchAll(/^    (get\w+)\(([^)]*)\): DateTime(?: \| null)?;/gm)) {
    if (method !== 'getDate' && (!args || args.split(',').every(arg => arg.split(':')[0].includes('?')))) methods.add(method);
  }
}
fs.writeFileSync('src/data/zman-methods.json', JSON.stringify([...methods].sort(), null, 2) + '\n');
console.log(`Catalogued ${methods.size} supported time-producing methods`);
