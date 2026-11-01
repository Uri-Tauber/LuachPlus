import { DateTime } from 'luxon';
import { HebrewDateFormatter, JewishCalendar, JewishDate } from 'kosher-zmanim';

export type Language = 'en' | 'he';
export type CalendarSystem = 'hebrew' | 'gregorian';
export interface HebrewDate { year: number; month: number; day: number }

export function civil(date: string): DateTime {
  const result = DateTime.fromISO(date, { zone: 'UTC' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !result.isValid) throw new Error('Invalid date');
  return result;
}
export const iso = (date: DateTime): string => date.toISODate();
export const addDays = (date: string, count: number): string => iso(civil(date).plus({ days: count }));
export const localDate = (date: Date): string => iso(DateTime.fromJSDate(date));
export const calendarDay = (date: string, inIsrael = true): JewishCalendar => {
  const result = new JewishCalendar(civil(date));
  result.setInIsrael(inIsrael);
  return result;
};
export function hebrew(date: string): HebrewDate {
  const d = calendarDay(date);
  return { year: d.getJewishYear(), month: d.getJewishMonth(), day: d.getJewishDayOfMonth() };
}
export const isLeap = (year: number): boolean => new JewishDate(year, 7, 1).isJewishLeapYear();
export const daysInHebrewMonth = (year: number, month: number): number => new JewishDate(year, month, 1).getDaysInJewishMonth();
export function fromHebrew({ year, month, day }: HebrewDate): string {
  if (year < 3762 || year > 13759 || month < 1 || month > (isLeap(year) ? 13 : 12) || day < 1 || day > daysInHebrewMonth(year, month)) {
    throw new Error('Invalid Hebrew date');
  }
  return iso(new JewishDate(year, month, day).getDate());
}
export function monthRange(date: string, system: CalendarSystem): { start: string; end: string } {
  if (system === 'gregorian') {
    const start = civil(date).startOf('month');
    return { start: iso(start), end: iso(start.plus({ months: 1 })) };
  }
  const h = hebrew(date);
  const start = fromHebrew({ ...h, day: 1 });
  return { start, end: addDays(start, daysInHebrewMonth(h.year, h.month)) };
}
export function shiftMonth(date: string, amount: number, system: CalendarSystem): string {
  let result = date;
  for (let i = 0; i < Math.abs(amount); i++) {
    const range = monthRange(result, system);
    result = amount > 0 ? range.end : monthRange(addDays(range.start, -1), system).start;
  }
  return result;
}
export function formatter(language: Language): HebrewDateFormatter {
  const result = new HebrewDateFormatter();
  result.setHebrewFormat(language === 'he');
  return result;
}
export function hebrewLabel(date: string, language: Language): string {
  return formatter(language).format(calendarDay(date));
}
export function monthTitle(date: string, system: CalendarSystem, language: Language): string {
  if (system === 'gregorian') return civil(date).setLocale(language).toLocaleString({ month: 'long', year: 'numeric' });
  const d = calendarDay(date);
  const f = formatter(language);
  return `${f.formatMonth(d)} ${language === 'he' ? f.formatHebrewNumber(d.getJewishYear()) : d.getJewishYear()}`;
}
export function dayFacts(date: string, language: Language, inIsrael: boolean) {
  const day = calendarDay(date, inIsrael);
  const f = formatter(language);
  return {
    holiday: [f.formatYomTov(day), f.formatRoshChodesh(day)].filter(Boolean).join(' · '),
    parasha: f.formatParsha(day),
    omer: day.getDayOfOmer() > 0 ? f.formatOmer(day) : '',
    holy: day.isAssurBemelacha(),
  };
}
