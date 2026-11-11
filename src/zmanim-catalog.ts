export const zmanGroups = [
  { id: "dawn", en: "Dawn", he: "עלות השחר", pattern: /^(itimDawn|getAlos)/ },
  { id: "misheyakir", en: "Tallit and tefillin", he: "זמן טלית ותפילין", pattern: /^getMisheyakir/ },
  { id: "sunrise", en: "Sunrise", he: "הנץ החמה", pattern: /^get(SeaLevelSunrise|Sunrise)/ },
  { id: "shema", en: "Latest Shema", he: "סוף זמן קריאת שמע", pattern: /^(itimShema|getSofZmanShma)/ },
  { id: "prayer", en: "Latest Shacharit", he: "סוף זמן תפילה", pattern: /^(itimTfila|getSofZmanTfil)/ },
  { id: "chametz-meal", en: "Latest chametz meal", he: "סוף זמן אכילת חמץ", pattern: /^getSofZmanAchilasChametz/ },
  { id: "chametz-disposal", en: "Chametz disposal", he: "סוף זמן ביעור חמץ", pattern: /^getSofZmanBiurChametz/ },
  { id: "midday", en: "Midday", he: "חצות היום", pattern: /^(itimNoon|get(Chatzos|FixedLocalChatzos|SunTransit))/ },
  { id: "mincha-gedola", en: "Mincha gedola", he: "מנחה גדולה", pattern: /^(itimMincha|getMinchaGedola)/ },
  { id: "before-mincha", en: "Before mincha ketana", he: "סמוך למנחה קטנה", pattern: /^getSamuchLeMinchaKetana/ },
  { id: "mincha-ketana", en: "Mincha ketana", he: "מנחה קטנה", pattern: /^getMinchaKetana/ },
  { id: "plag", en: "Plag hamincha", he: "פלג המנחה", pattern: /^getPlag/ },
  { id: "sunset", en: "Sunset", he: "שקיעת החמה", pattern: /^get(SeaLevelSunset|Sunset)/ },
  { id: "twilight", en: "Twilight", he: "בין השמשות", pattern: /^get(BainHashmashos|BainHasmashos)/ },
  { id: "nightfall", en: "Nightfall", he: "צאת הכוכבים", pattern: /^(itimTzais|getTzais)/ },
  { id: "midnight", en: "Midnight", he: "חצות הלילה", pattern: /^(itimMidnight|get(SolarMidnight|SunLowerTransit))/ },
  { id: "earliest-levana", en: "Earliest kiddush levana", he: "תחילת זמן קידוש לבנה", pattern: /^getTchilasZmanKidushLevana/ },
  { id: "latest-levana", en: "Latest kiddush levana", he: "סוף זמן קידוש לבנה", pattern: /^getSofZmanKidushLevana/ },
  { id: "molad", en: "Molad", he: "מולד", pattern: /^getZmanMolad/ },
  { id: "civil-dawn", en: "Civil dawn", he: "תחילת דמדומים אזרחיים", pattern: /^getBeginCivilTwilight/ },
  { id: "nautical-dawn", en: "Nautical dawn", he: "תחילת דמדומים ימיים", pattern: /^getBeginNauticalTwilight/ },
  { id: "astronomical-dawn", en: "Astronomical dawn", he: "תחילת דמדומים אסטרונומיים", pattern: /^getBeginAstronomicalTwilight/ },
  { id: "civil-dusk", en: "Civil dusk", he: "סוף דמדומים אזרחיים", pattern: /^getEndCivilTwilight/ },
  { id: "nautical-dusk", en: "Nautical dusk", he: "סוף דמדומים ימיים", pattern: /^getEndNauticalTwilight/ },
  { id: "astronomical-dusk", en: "Astronomical dusk", he: "סוף דמדומים אסטרונומיים", pattern: /^getEndAstronomicalTwilight/ },
  { id: "candle-lighting", en: "Candle lighting", he: "הדלקת נרות", pattern: /^getCandleLighting/ },
] as const;
export function zmanGroup(method: string): typeof zmanGroups[number]['id'] | undefined {
  return zmanGroups.find(group => group.pattern.test(method))?.id;
}
export function specialMethodChoices(kind: 'dawn' | 'night', current: string, methods: readonly string[]): string[] {
  const choices = methods.filter(method => kind === 'dawn' ? /^(itimDawn|getAlos)/.test(method) : /^(itimTzais|getTzais)/.test(method));
  // Preserve older custom selections until the user explicitly changes them.
  return choices.includes(current) ? choices : [current, ...choices];
}
