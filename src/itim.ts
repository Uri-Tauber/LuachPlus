import { ComplexZmanimCalendar } from 'kosher-zmanim';
import type { DateTime } from 'luxon';

type Definition = { en: string; he: string; compute: (c: ComplexZmanimCalendar) => DateTime | null };
const sunrise = (c: ComplexZmanimCalendar) => c.isUseElevation() ? c.getSunrise() : c.getSeaLevelSunrise();
const sunset = (c: ComplexZmanimCalendar) => c.isUseElevation() ? c.getSunset() : c.getSeaLevelSunset();
const dayHour = (c: ComplexZmanimCalendar, hour: number) => c.getShaahZmanisBasedZman(sunrise(c), sunset(c), hour);
const offset = (date: DateTime | null, minutes: number) => date?.plus({ minutes }) ?? null;
const degrees = (c: ComplexZmanimCalendar, dip: number, hour: number) => c.getShaahZmanisBasedZman(c.getSunriseOffsetByDegrees(90 + dip), c.getSunsetOffsetByDegrees(90 + dip), hour);

// Formula reference: Itim Labina 5786, Emanuel edition, p. 3.
export const itimMethods: Record<string, Definition> = {
  itimDawn90: { en: 'Dawn A · 19.75°', he: 'עמוד השחר א׳ · 19.75°', compute: c => c.getSunriseOffsetByDegrees(109.75) },
  itimDawn72: { en: 'Dawn B · 16.02°', he: 'עמוד השחר ב׳ · 16.02°', compute: c => c.getSunriseOffsetByDegrees(106.02) },
  itimShemaStringent: { en: 'Latest Shema · stringent', he: 'סוף ק״ש לחומרא', compute: c => c.getSofZmanShma(c.getSunriseOffsetByDegrees(109.75), c.getTzaisGeonim6Point45Degrees()) },
  itimShema90: { en: 'Latest Shema · MGA 90 min in degrees', he: 'סוף ק״ש מג״א 90 במעלות', compute: c => degrees(c, 19.75, 3) },
  itimShema72: { en: 'Latest Shema · MGA 72 min in degrees', he: 'סוף ק״ש מג״א 72 במעלות', compute: c => degrees(c, 16.02, 3) },
  itimTfila90: { en: 'Latest Shacharit · MGA 90 min in degrees', he: 'סוף תפילה מג״א 90 במעלות', compute: c => degrees(c, 19.75, 4) },
  itimTfila72: { en: 'Latest Shacharit · MGA 72 min in degrees', he: 'סוף תפילה מג״א 72 במעלות', compute: c => degrees(c, 16.02, 4) },
  itimNoon: { en: 'Midday · sunrise/sunset midpoint', he: 'חצות היום · אמצע היום', compute: c => dayHour(c, 6) },
  itimMidnight: { en: 'Midnight · 12 hours after midday', he: 'חצות הלילה', compute: c => offset(dayHour(c, 6), 720) },
  itimMinchaGedola: { en: 'Mincha gedola · later of seasonal / 30 min', he: 'מנחה גדולה', compute: c => {
    const seasonal = dayHour(c, 6.5), fixed = offset(dayHour(c, 6), 30);
    return seasonal && fixed ? (seasonal.toMillis() > fixed.toMillis() ? seasonal : fixed) : null;
  } },
  itimTzaisChazonIsh: { en: 'Nightfall · Chazon Ish 9.28°', he: 'צאת הכוכבים לחזו״א 9.28°', compute: c => c.getSunsetOffsetByDegrees(99.28) },
};
