import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { defaultSettings, presets } from '../src/settings';
import { computeMethod, makeZmanCalendar, zmanMethods } from '../src/zmanim';

const classpath = process.env.KOSHERJAVA_CLASSPATH;
test.skipIf(!classpath || !existsSync(classpath))('matches the pinned Java upstream across locations and seasons', () => {
  const methods = zmanMethods;
  const mismatches: string[] = [];
  let comparisons = 0, maxDifference = 0;
  for (const city of ['Jerusalem', 'New York', 'London', 'Sydney', 'Dublin', 'Tromso']) {
    const settings = defaultSettings(); settings.location = presets.find(p => p.name === city)!;
    for (const date of ['2026-03-20', '2026-06-21', '2026-09-22', '2026-12-21']) {
      for (const elevation of [false, true]) {
        settings.useElevation = elevation;
        const p = settings.location, calendar = makeZmanCalendar(date, settings);
        const output = execFileSync('java', ['-cp', classpath!, 'KosherJavaReference', date, String(p.latitude), String(p.longitude), String(Math.max(0, p.elevation)), p.timezone, String(elevation), String(p.candleMinutes), ...methods], { encoding: 'utf8' });
        for (const line of output.trim().split('\n')) {
          const [method, raw] = line.split('=');
          if (raw === 'unsupported') { mismatches.push(`${method}: Java method missing`); continue; }
          const expected = raw === 'null' ? null : Number(raw), actual = computeMethod(calendar, method)?.toMillis() ?? null;
          comparisons++;
          if (actual !== null && expected !== null) maxDifference = Math.max(maxDifference, Math.abs(actual - expected));
          if ((actual === null) !== (expected === null) || (actual !== null && expected !== null && Math.abs(actual - expected) > 20)) {
            mismatches.push(`${city} ${date} elevation=${elevation} ${method}: JS=${actual}, Java=${expected}, delta=${actual !== null && expected !== null ? actual - expected : 'null mismatch'}`);
          }
        }
      }
    }
  }
  expect(mismatches).toEqual([]);
  console.info(`${comparisons} Java comparisons; maximum difference ${maxDifference.toFixed(3)} ms`);
}, 60000);
