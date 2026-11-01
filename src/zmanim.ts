import { DateTime } from 'luxon';
import { ComplexZmanimCalendar, GeoLocation, JewishCalendar, NOAACalculator, YomiCalculator, YerushalmiYomiCalculator } from 'kosher-zmanim';
import methods from './data/zman-methods.json';
import { addDays, calendarDay, formatter, type Language } from './dates';
import { itimMethods } from './itim';

export interface Location {
  name: string; latitude: number; longitude: number; elevation: number;
  timezone: string; inIsrael: boolean; candleMinutes: number; country?: string;
}
export interface ZmanSettings {
  location: Location; useElevation: boolean; zmanMethods: string[]; endMethod: string;
  fastStartMethod: string; fastEndMethod: string; bavli: boolean; yerushalmi: boolean;
}
export const zmanMethods: readonly string[] = [...Object.keys(itimMethods), ...methods];
export const defaultMethods = [
  'itimDawn90', 'itimDawn72', 'getMisheyakir11Point5Degrees',
  'getSunrise', 'itimShemaStringent', 'itimShema90', 'getSofZmanShmaGRA',
  'itimTfila90', 'getSofZmanTfilaGRA', 'itimNoon',
  'itimMinchaGedola', 'getMinchaKetana', 'getPlagHamincha',
  'getSunset', 'getTzaisGeonim6Point45Degrees', 'itimTzaisChazonIsh', 'itimMidnight',
];

const terms: [string, string, string][] = [
  ['SofZmanAchilasChametz', 'Latest chametz meal', 'סוף זמן אכילת חמץ'],
  ['SofZmanBiurChametz', 'Chametz disposal', 'סוף זמן ביעור חמץ'],
  ['SofZmanShma', 'Latest Shema', 'סוף זמן קריאת שמע'],
  ['SofZmanTfila', 'Latest Shacharit', 'סוף זמן תפילה'],
  ['SamuchLeMinchaKetana', 'Before mincha ketana', 'סמוך למנחה קטנה'],
  ['MinchaGedola', 'Mincha gedola', 'מנחה גדולה'], ['MinchaKetana', 'Mincha ketana', 'מנחה קטנה'],
  ['PlagHamincha', 'Plag hamincha', 'פלג המנחה'], ['Misheyakir', 'Tallit and tefillin', 'זמן טלית ותפילין'],
  ['Alos', 'Dawn', 'עלות השחר'], ['Tzais', 'Nightfall', 'צאת הכוכבים'],
  ['SeaLevelSunrise', 'Sea-level sunrise', 'הנץ במישור'], ['SeaLevelSunset', 'Sea-level sunset', 'שקיעה במישור'],
  ['Sunrise', 'Sunrise', 'הנץ החמה'], ['Sunset', 'Sunset', 'שקיעת החמה'],
  ['SolarMidnight', 'Solar midnight', 'חצות הלילה'], ['SunLowerTransit', 'Lower solar transit', 'מעבר שמש תחתון'],
  ['FixedLocalChatzos', 'Fixed local noon', 'חצות מקומי קבוע'], ['Chatzos', 'Midday', 'חצות היום'],
  ['SunTransit', 'Solar noon', 'חצות אסטרונומי'], ['CandleLighting', 'Candle lighting', 'הדלקת נרות'],
  ['TchilasZmanKidushLevana', 'Earliest kiddush levana', 'תחילת זמן קידוש לבנה'],
  ['SofZmanKidushLevana', 'Latest kiddush levana', 'סוף זמן קידוש לבנה'], ['ZmanMolad', 'Molad', 'מולד'],
  ['BeginCivilTwilight', 'Civil dawn', 'תחילת דמדומים אזרחיים'], ['EndCivilTwilight', 'Civil dusk', 'סוף דמדומים אזרחיים'],
  ['BeginNauticalTwilight', 'Nautical dawn', 'תחילת דמדומים ימיים'], ['EndNauticalTwilight', 'Nautical dusk', 'סוף דמדומים ימיים'],
  ['BeginAstronomicalTwilight', 'Astronomical dawn', 'תחילת דמדומים אסטרונומיים'], ['EndAstronomicalTwilight', 'Astronomical dusk', 'סוף דמדומים אסטרונומיים'],
];
export function zmanLabel(method: string, language: Language): string {
  if (itimMethods[method]) return itimMethods[method][language];
  const base = method.replace(/^get/, '');
  const term = terms.find(([key]) => base.startsWith(key));
  if (!term) return base.replace(/([a-z])([A-Z])/g, '$1 $2');
  const suffix = base.slice(term[0].length).replace(/(\d+)Point(\d+)/g, '$1.$2').replace(/point/g, '.')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/GRA/g, language === 'he' ? 'גר״א' : 'GRA')
    .replace(/MGA/g, language === 'he' ? 'מג״א' : 'MGA').replace(/Degrees/g, '°')
    .replace(/Minutes/g, language === 'he' ? 'דקות' : 'min').replace(/Zmanis/g, language === 'he' ? 'זמניות' : 'seasonal')
    .replace(/Baal Hatanya/g, language === 'he' ? 'בעל התניא' : 'Baal Hatanya');
  const translated = language === 'he' ? suffix.replace(/Geonim/g, 'גאונים').replace(/Ateret Torah/g, 'עטרת תורה')
    .replace(/Ahavat Shalom/g, 'אהבת שלום').replace(/Fixed Local Chatzos/g, 'חצות מקומי קבוע')
    .replace(/Greater Than/g, 'המאוחר מבין').replace(/Half Day/g, 'חצי היום').replace(/To Sunset/g, 'עד השקיעה')
    .replace(/To/g, 'עד').replace(/Before Chatzos/g, 'לפני חצות').replace(/Hours/g, 'שעות').replace(/Hashachar/g, '') : suffix;
  return `${term[language === 'he' ? 2 : 1]}${translated ? ` · ${translated}` : ''}`;
}
export function makeZmanCalendar(date: string, settings: ZmanSettings): ComplexZmanimCalendar {
  const p = settings.location;
  const result = new ComplexZmanimCalendar(new GeoLocation(p.name, p.latitude, p.longitude, Math.max(0, p.elevation), p.timezone));
  result.setDate(DateTime.fromISO(date, { zone: p.timezone }));
  result.setAstronomicalCalculator(new NOAACalculator());
  result.setUseElevation(settings.useElevation);
  result.setCandleLightingOffset(p.candleMinutes);
  return result;
}
export function computeMethod(calendar: ComplexZmanimCalendar, method: string): DateTime | null {
  if (itimMethods[method]) return itimMethods[method].compute(calendar);
  if (!methods.includes(method)) throw new Error(`Unknown zman: ${method}`);
  const fn = (calendar as unknown as Record<string, () => DateTime | null>)[method];
  const result = fn.call(calendar);
  return result?.isValid ? result : null;
}
export interface ScheduleRow { id: string; label: string; time: DateTime | null; special?: boolean }
export function schedule(date: string, settings: ZmanSettings, language: Language): ScheduleRow[] {
  const calendar = makeZmanCalendar(date, settings);
  const day = calendarDay(date, settings.location.inIsrael);
  const next = calendarDay(addDays(date, 1), settings.location.inIsrael);
  const rows: ScheduleRow[] = [];
  const push = (id: string, en: string, he: string, time: DateTime | null) => rows.push({ id, label: language === 'he' ? he : en, time, special: true });
  const isCandleDay = day.hasCandleLighting();
  const lateCandles = isCandleDay && day.isAssurBemelacha() && day.getDayOfWeek() !== 6;
  for (const method of settings.zmanMethods) {
    if (method === 'getCandleLighting') continue;
    const time = computeMethod(calendar, method);
    // Lunar and chametz getters return null outside their relevant dates.
    if (!time && /KidushLevana|Molad|Chametz/.test(method)) continue;
    rows.push({ id: method, label: zmanLabel(method, language), time });
  }
  if (isCandleDay) {
    push('candles', lateCandles ? 'Candle lighting after nightfall · existing flame' : 'Candle lighting',
      lateCandles ? 'הדלקת נרות לאחר צאת הכוכבים · מאש קיימת' : 'הדלקת נרות',
      lateCandles ? computeMethod(calendar, settings.endMethod) : calendar.getCandleLighting());
  }
  if (day.isAssurBemelacha() && !day.isTomorrowShabbosOrYomTov()) push('holy-end', 'Shabbos / Yom Tov ends', 'צאת שבת / חג', computeMethod(calendar, settings.endMethod));
  const majorFast = (d: JewishCalendar) => d.getYomTovIndex() === JewishCalendar.YOM_KIPPUR || d.getYomTovIndex() === JewishCalendar.TISHA_BEAV;
  if (majorFast(next)) push('fast-start', 'Fast begins', 'תחילת הצום', calendar.getSunset());
  if (day.isTaanis()) {
    if (!majorFast(day)) push('fast-start', 'Fast begins', 'תחילת הצום', computeMethod(calendar, settings.fastStartMethod));
    push('fast-end', 'Fast ends', 'סוף הצום', computeMethod(calendar, settings.fastEndMethod));
  }
  return rows.sort((a, b) => (a.time?.toMillis() ?? Infinity) - (b.time?.toMillis() ?? Infinity));
}
export function studies(date: string, settings: ZmanSettings, language: Language): { label: string; value: string }[] {
  const day = calendarDay(date, settings.location.inIsrael), f = formatter(language);
  const rows = [];
  if (settings.bavli) rows.push({ label: language === 'he' ? 'דף יומי בבלי' : 'Daf Yomi Bavli', value: date < '1923-09-11' ? (language === 'he' ? 'טרם התחיל המחזור' : 'Cycle has not started') : f.formatDafYomiBavli(YomiCalculator.getDafYomiBavli(day)) });
  if (settings.yerushalmi) {
    const daf = date < '1980-02-02' ? null : YerushalmiYomiCalculator.getDafYomiYerushalmi(day);
    rows.push({ label: language === 'he' ? 'דף יומי ירושלמי' : 'Daf Yomi Yerushalmi', value: daf ? f.formatDafYomiYerushalmi(daf) : (language === 'he' ? 'אין לימוד היום' : 'No assignment today') });
  }
  return rows;
}
export function currentHebrewCivilDate(now: DateTime, settings: ZmanSettings): string {
  const date = now.setZone(settings.location.timezone).toISODate();
  const sunset = makeZmanCalendar(date, settings).getSunset();
  return sunset && now.toMillis() >= sunset.toMillis() ? addDays(date, 1) : date;
}
