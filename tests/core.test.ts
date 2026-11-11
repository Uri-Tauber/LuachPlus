import { describe, expect, test } from 'vitest';
import { DateTime } from 'luxon';
import { addDays, calendarDay, fromHebrew, hebrew, monthRange, shiftMonth, shiftYear } from '../src/dates';
import { dueReminders, expandEvents, newEvent, validateEvent, changeEventRange } from '../src/events';
import { defaultSettings, presets, validateSettings } from '../src/settings';
import { validateData } from '../src/storage';
import { currentHebrewCivilDate, makeZmanCalendar, schedule, zmanLabel } from '../src/zmanim';
import libraryMethods from '../src/data/zman-methods.json';

describe('calendar boundaries', () => {
  test('year jumps preserve named Hebrew months and handle missing leap dates', () => {
    expect(shiftYear('2024-02-29', 1, 'gregorian')).toBe('2025-02-28');
    expect(hebrew(shiftYear(fromHebrew({ year: 5787, month: 13, day: 15 }), 1, 'hebrew'))).toEqual({ year: 5788, month: 12, day: 15 });
    expect(hebrew(shiftYear(fromHebrew({ year: 5786, month: 12, day: 15 }), 1, 'hebrew'))).toEqual({ year: 5787, month: 13, day: 15 });
    expect(hebrew(shiftYear(fromHebrew({ year: 5787, month: 1, day: 15 }), 1, 'hebrew'))).toEqual({ year: 5788, month: 1, day: 15 });
  });
  test('known new year and reversible conversions across leap Adar', () => {
    expect(fromHebrew({ year: 5786, month: 7, day: 1 })).toBe('2025-09-23');
    for (let date = '2026-01-01'; date < '2029-01-01'; date = addDays(date, 11)) expect(fromHebrew(hebrew(date))).toBe(date);
  });
  test('Hebrew month ranges and navigation visit both Adars', () => {
    const adar1 = fromHebrew({ year: 5787, month: 12, day: 15 });
    const next = shiftMonth(adar1, 1, 'hebrew');
    expect(hebrew(next)).toEqual({ year: 5787, month: 13, day: 1 });
    expect(hebrew(shiftMonth(next, 1, 'hebrew'))).toEqual({ year: 5787, month: 1, day: 1 });
    expect(hebrew(shiftMonth(next, -1, 'hebrew'))).toEqual({ year: 5787, month: 12, day: 1 });
    expect(monthRange('2026-02-28', 'gregorian')).toEqual({ start: '2026-02-01', end: '2026-03-01' });
  });
});

describe('whole-series recurrence', () => {
  test('clamps missing Hebrew days without changing the original requested day', () => {
    const event = { ...newEvent(fromHebrew({ year: 5786, month: 7, day: 30 })), title: 'Monthly', recurrence: 'monthly' as const };
    const occurrences = expandEvents([event], event.startDate, fromHebrew({ year: 5786, month: 11, day: 1 }));
    expect(occurrences.map(o => hebrew(o.start).day)).toEqual([30, 29, 30, 29]);
    event.missingDay = 'skip';
    expect(expandEvents([event], event.startDate, fromHebrew({ year: 5786, month: 11, day: 1 }))).toHaveLength(2);
  });
  test('common Adar supports first, second and both in a leap year', () => {
    const event = { ...newEvent(fromHebrew({ year: 5786, month: 12, day: 15 })), title: 'Birthday', recurrence: 'yearly' as const };
    const from = fromHebrew({ year: 5787, month: 7, day: 1 }), to = fromHebrew({ year: 5788, month: 7, day: 1 });
    expect(expandEvents([event], from, to).map(o => hebrew(o.start).month)).toEqual([13]);
    event.adar = 'both';
    expect(expandEvents([event], from, to).map(o => hebrew(o.start).month)).toEqual([12, 13]);
    event.adar = 'first';
    expect(expandEvents([event], from, to).map(o => hebrew(o.start).month)).toEqual([12]);
  });
  test('named months after Adar do not move across leap years; leap Adar maps to common Adar', () => {
    for (const month of [1, 2, 3, 12, 13]) {
      const event = { ...newEvent(fromHebrew({ year: 5787, month, day: 15 })), title: 'Yearly', recurrence: 'yearly' as const };
      const from = fromHebrew({ year: 5788, month: 7, day: 1 }), to = fromHebrew({ year: 5789, month: 7, day: 1 });
      expect(expandEvents([event], from, to).map(o => hebrew(o.start).month)).toEqual([month === 13 ? 12 : month]);
    }
  });
  test('Gregorian month ends skip; multi-day occurrences overlap the view boundary', () => {
    const event = { ...newEvent('2026-01-31'), title: 'Month end', calendar: 'gregorian' as const, recurrence: 'monthly' as const, endDate: '2026-02-02' };
    expect(expandEvents([event], '2026-02-01', '2026-04-01').map(o => o.start)).toEqual(['2026-01-31', '2026-03-31']);
  });
  test('timed overnight events keep floating clock times and duration across DST dates', () => {
    const event = { ...newEvent('2026-03-01'), title: 'Night', allDay: false, startTime: '23:00', endTime: '01:00', endDate: '2026-03-02', recurrence: 'weekly' as const };
    validateEvent(event);
    const occurrences = expandEvents([event], '2026-03-01', '2026-04-01');
    expect(occurrences.every(o => o.start.endsWith('T23:00:00') && o.end.endsWith('T01:00:00'))).toBe(true);
  });
  test('reminders fire only when crossing a due instant', () => {
    const event = { ...newEvent('2026-11-01'), title: 'Reminder', allDay: false, startTime: '12:00', endTime: '13:00', reminderMinutes: 10 };
    const due = DateTime.fromISO('2026-11-01T11:50').toMillis();
    expect(dueReminders([event], due - 1000, due)).toHaveLength(1);
    expect(dueReminders([event], due, due + 1000)).toHaveLength(0);
  });
});

describe('zmanim and settings', () => {
  test('fixed-local calculation labels are translated', () => {
    expect(zmanLabel('getSofZmanTfilaFixedLocal', 'he')).toContain('חצות מקומי קבוע');
    expect(zmanLabel('getSofZmanTfilaFixedLocal', 'he')).not.toMatch(/[a-z]/i);
  });
  test('all presets and default methods are valid', () => {
    const settings = defaultSettings();
    validateSettings(settings);
    for (const location of presets) validateSettings({ ...settings, location });
    const cal = makeZmanCalendar('2026-11-01', settings);
    for (const method of libraryMethods) expect(typeof (cal as unknown as Record<string, unknown>)[method]).toBe('function');
  });
  test('candle lighting appears on Friday, not an ordinary Sunday', () => {
    const s = defaultSettings();
    expect(schedule('2026-11-01', s, 'en').some(r => r.id === 'candles')).toBe(false);
    expect(schedule('2026-11-06', s, 'en').some(r => r.id === 'candles')).toBe(true);
    expect(schedule('2026-11-07', s, 'en').some(r => r.id === 'holy-end')).toBe(true);
  });
  test('Friday Yom Tov candles precede sunset; second-night candles follow nightfall', () => {
    const s = defaultSettings(); s.location.inIsrael = false;
    for (let date = '2025-01-01'; date < '2028-01-01'; date = addDays(date, 1)) {
      const day = calendarDay(date, false);
      if (!day.hasCandleLighting() || !day.isAssurBemelacha()) continue;
      const candle = schedule(date, s, 'en').find(r => r.id === 'candles')!;
      const sunset = makeZmanCalendar(date, s).getSunset()!;
      if (day.getDayOfWeek() === 6) expect(candle.time!.toMillis()).toBeLessThan(sunset.toMillis());
      else expect(candle.time!.toMillis()).toBeGreaterThan(sunset.toMillis());
    }
  });
  test('sunset changes only the live Hebrew date', () => {
    const s = defaultSettings(), date = '2026-11-01';
    const sunset = makeZmanCalendar(date, s).getSunset()!;
    expect(currentHebrewCivilDate(sunset.minus({ seconds: 1 }), s)).toBe(date);
    expect(currentHebrewCivilDate(sunset.plus({ seconds: 1 }), s)).toBe(addDays(date, 1));
  });
  test('polar unavailable times are retained as unavailable; negative ground elevation works', () => {
    const s = defaultSettings();
    s.location = { ...s.location, latitude: 69.65, longitude: 18.96, timezone: 'Europe/Oslo', elevation: 0 };
    expect(schedule('2026-06-21', s, 'en').find(r => r.id === 'getSunset')!.time).toBeNull();
    s.location.elevation = -400;
    expect(() => makeZmanCalendar('2026-11-01', s)).not.toThrow();
  });
  test('rejects malformed backups and duplicate event IDs', () => {
    const event = { ...newEvent('2026-11-01'), title: 'Example' };
    expect(() => validateData({ version: 1, settings: defaultSettings(), events: [event, event] })).toThrow();
    expect(() => validateData({ version: 1, settings: { ...defaultSettings(), location: { timezone: 'Mars' } }, events: [] })).toThrow();
  });
});

test('calendar edits preserve inclusive dates, overnight times, series and validation', () => {
  const event = { ...newEvent('2026-11-01'), title: 'Plan', recurrence: 'weekly' as const, until: '2026-12-01' };
  const before = { startStr: '2026-11-08', endStr: '2026-11-09', allDay: true };
  const moved = changeEventRange(event, before, { startStr: '2026-11-09', endStr: '2026-11-10', allDay: true });
  expect([moved.startDate, moved.endDate, moved.until]).toEqual(['2026-11-02', '2026-11-02', '2026-12-02']);
  const resized = changeEventRange(event, before, { ...before, endStr: '2026-11-11' });
  expect(resized.endDate).toBe('2026-11-03');
  const timed = changeEventRange(event, before, { startStr: '2026-11-08T23:00:00+02:00', endStr: '2026-11-09T01:00:00+02:00', allDay: false });
  expect([timed.startDate, timed.endDate, timed.startTime, timed.endTime]).toEqual(['2026-11-01', '2026-11-02', '23:00', '01:00']);
  expect(event.startDate).toBe('2026-11-01');
  expect(() => changeEventRange(event, before, { ...before, endStr: '2026-11-08' })).toThrow();
});

test('moving later monthly occurrences maps the drop day through the recurrence calendar', () => {
  const event = { ...newEvent('2026-01-30'), title: 'Monthly', recurrence: 'monthly' as const, calendar: 'gregorian' as const };
  const next = changeEventRange(event, { startStr: '2026-04-30', endStr: '2026-05-01', allDay: true }, { startStr: '2026-05-01', endStr: '2026-05-02', allDay: true });
  expect(expandEvents([next], '2026-05-01', '2026-05-02')).toHaveLength(1);
  const anchor = fromHebrew({ year: 5786, month: 7, day: 29 });
  const before = fromHebrew({ year: 5786, month: 8, day: 29 });
  const after = fromHebrew({ year: 5786, month: 9, day: 1 });
  const hebrewEvent = { ...newEvent(anchor), title: 'Hebrew monthly', recurrence: 'monthly' as const };
  const moved = changeEventRange(hebrewEvent, { startStr: before, endStr: addDays(before, 1), allDay: true }, { startStr: after, endStr: addDays(after, 1), allDay: true });
  expect(expandEvents([moved], after, addDays(after, 1))).toHaveLength(1);
});
