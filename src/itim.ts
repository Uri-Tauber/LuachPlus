import { ComplexZmanimCalendar } from 'kosher-zmanim';
import type { DateTime } from 'luxon';

type Definition = { en: string; he: string; compute: (c: ComplexZmanimCalendar) => DateTime | null };
const sunrise = (c: ComplexZmanimCalendar) => c.isUseElevation() ? c.getSunrise() : c.getSeaLevelSunrise();
const sunset = (c: ComplexZmanimCalendar) => c.isUseElevation() ? c.getSunset() : c.getSeaLevelSunset();
const dayHour = (c: ComplexZmanimCalendar, hour: number) => c.getShaahZmanisBasedZman(sunrise(c), sunset(c), hour);
const offset = (date: DateTime | null, minutes: number) => date?.plus({ minutes }) ?? null;
const degrees = (c: ComplexZmanimCalendar, dip: number, hour: number) => c.getShaahZmanisBasedZman(c.getSunriseOffsetByDegrees(90 + dip), c.getSunsetOffsetByDegrees(90 + dip), hour);

// Itim Labina 5786, Emanuel edition, p. 3. Only library primitives; terrain horizon is deferred.
export const itimMethods: Record<string, Definition> = {
  itimDawn90: { en: 'Dawn A · Itim 19.75°', he: 'עמוד השחר א׳ · עתים 19.75°', compute: c => c.getSunriseOffsetByDegrees(109.75) },
  itimDawn72: { en: 'Dawn B · Itim 16.02°', he: 'עמוד השחר ב׳ · עתים 16.02°', compute: c => c.getSunriseOffsetByDegrees(106.02) },
  itimShemaStringent: { en: 'Latest Shema · stringent, Itim', he: 'סוף ק״ש לחומרא · עתים', compute: c => c.getSofZmanShma(c.getSunriseOffsetByDegrees(109.75), c.getTzaisGeonim6Point45Degrees()) },
  itimShema90: { en: 'Latest Shema · MGA 90°, Itim', he: 'סוף ק״ש מג״א 90 במעלות · עתים', compute: c => degrees(c, 19.75, 3) },
  itimShema72: { en: 'Latest Shema · MGA 72°, Itim', he: 'סוף ק״ש מג״א 72 במעלות · עתים', compute: c => degrees(c, 16.02, 3) },
  itimTfila90: { en: 'Latest Shacharit · MGA 90°, Itim', he: 'סוף תפילה מג״א 90 במעלות · עתים', compute: c => degrees(c, 19.75, 4) },
  itimTfila72: { en: 'Latest Shacharit · MGA 72°, Itim', he: 'סוף תפילה מג״א 72 במעלות · עתים', compute: c => degrees(c, 16.02, 4) },
  itimNoon: { en: 'Midday · sunrise/sunset midpoint, Itim', he: 'חצות היום · אמצע היום, עתים', compute: c => dayHour(c, 6) },
  itimMidnight: { en: 'Midnight · 12 hours after midday, Itim', he: 'חצות הלילה · עתים', compute: c => offset(dayHour(c, 6), 720) },
  itimMinchaGedola: { en: 'Mincha gedola · later of seasonal / 30 min, Itim', he: 'מנחה גדולה · עתים', compute: c => {
    const seasonal = dayHour(c, 6.5), fixed = offset(dayHour(c, 6), 30);
    return seasonal && fixed ? (seasonal.toMillis() > fixed.toMillis() ? seasonal : fixed) : null;
  } },
  itimTzaisChazonIsh: { en: 'Nightfall · Chazon Ish 9.28°, Itim', he: 'צאת הכוכבים לחזו״א 9.28° · עתים', compute: c => c.getSunsetOffsetByDegrees(99.28) },
};
