export const zmanGroups = [
  { id: 'dawn', en: 'Dawn & sunrise', he: 'עלות השחר והנץ', hintEn: 'Dawn, tallit and tefillin, and sunrise.', hintHe: 'עלות השחר, זמן טלית ותפילין והנץ החמה.' },
  { id: 'shema', en: 'Latest Shema', he: 'סוף זמן קריאת שמע', hintEn: 'Compare the calculation methods for the latest Shema.', hintHe: 'השוואת שיטות לחישוב סוף זמן קריאת שמע.' },
  { id: 'prayer', en: 'Latest Shacharit', he: 'סוף זמן תפילה', hintEn: 'Compare the calculation methods for the latest morning prayer.', hintHe: 'השוואת שיטות לחישוב סוף זמן תפילת שחרית.' },
  { id: 'midday', en: 'Midday & midnight', he: 'חצות היום והלילה', hintEn: 'Solar midday, fixed local noon and midnight calculations.', hintHe: 'חצות היום, חצות מקומי קבוע וחצות הלילה.' },
  { id: 'afternoon', en: 'Mincha & plag', he: 'מנחה ופלג המנחה', hintEn: 'Earliest and later Mincha times, and plag hamincha.', hintHe: 'מנחה גדולה, מנחה קטנה ופלג המנחה.' },
  { id: 'evening', en: 'Sunset & nightfall', he: 'שקיעה וצאת הכוכבים', hintEn: 'Sunset, twilight and different definitions of nightfall.', hintHe: 'שקיעה, בין השמשות ושיטות שונות לצאת הכוכבים.' },
  { id: 'chametz', en: 'Chametz', he: 'זמני חמץ', hintEn: 'Eating and disposal deadlines, shown when applicable.', hintHe: 'סוף זמן אכילת חמץ וביעורו, בתאריכים המתאימים.' },
  { id: 'lunar', en: 'Moon & molad', he: 'קידוש לבנה ומולד', hintEn: 'Kiddush levana boundaries and the molad, shown when available.', hintHe: 'תחילת וסוף זמן קידוש לבנה והמולד, כאשר זמינים.' },
  { id: 'other', en: 'Other times', he: 'זמנים נוספים', hintEn: 'Additional library calculations.', hintHe: 'חישובים נוספים מהספרייה.' },
] as const;
export function zmanGroup(method: string): typeof zmanGroups[number]['id'] {
  if (/^(itimShema|getSofZmanShma)/.test(method)) return 'shema';
  if (/^(itimTfila|getSofZmanTfil)/.test(method)) return 'prayer';
  if (/Chametz/.test(method)) return 'chametz';
  if (/KidushLevana|Molad/.test(method)) return 'lunar';
  if (/^(itim(Dawn)|get(Alos|Misheyakir|Begin|Sunrise|SeaLevelSunrise))/.test(method)) return 'dawn';
  if (/^(itim(Mincha)|get(Mincha|SamuchLeMincha|Plag))/.test(method)) return 'afternoon';
  if (/^(itim(Tzais)|get(Sunset|SeaLevelSunset|Tzais|BainHashmashos|BainHasmashos|End|CandleLighting))/.test(method)) return 'evening';
  if (/^(itim(Noon|Midnight)|get(Chatzos|FixedLocalChatzos|SunTransit|SolarMidnight|SunLowerTransit))/.test(method)) return 'midday';
  return 'other';
}
export function specialMethodChoices(kind: 'dawn' | 'night', current: string, methods: readonly string[]): string[] {
  const choices = methods.filter(method => kind === 'dawn' ? /^(itimDawn|getAlos)/.test(method) : /^(itimTzais|getTzais)/.test(method));
  // Preserve older custom selections until the user explicitly changes them.
  return choices.includes(current) ? choices : [current, ...choices];
}
