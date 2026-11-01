import { DateTime } from 'luxon';
import { addDays, civil, daysInHebrewMonth, fromHebrew, hebrew, isLeap, type CalendarSystem } from './dates';

export interface UserEvent {
  id: string;
  title: string;
  description: string;
  kind: 'event' | 'birthday' | 'yahrzeit';
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  recurrence: 'none' | 'weekly' | 'monthly' | 'yearly';
  calendar: CalendarSystem;
  missingDay: 'last' | 'skip';
  adar: 'second' | 'first' | 'both' | 'skip';
  until: string;
  reminderMinutes: number | null;
}
export interface Occurrence { id: string; title: string; start: string; end: string; allDay: boolean; extendedProps: { seriesId: string } }

export function newEvent(date: string): UserEvent {
  return { id: crypto.randomUUID(), title: '', description: '', kind: 'event', startDate: date, endDate: date,
    allDay: true, startTime: '09:00', endTime: '10:00', recurrence: 'none', calendar: 'hebrew',
    missingDay: 'last', adar: 'second', until: '', reminderMinutes: null };
}
export function validateEvent(event: UserEvent): void {
  if (!event || typeof event !== 'object' || typeof event.id !== 'string' || !event.id || event.id.length > 100 ||
    typeof event.title !== 'string' || !event.title.trim() || event.title.length > 300 ||
    typeof event.description !== 'string' || event.description.length > 10000 ||
    !['event', 'birthday', 'yahrzeit'].includes(event.kind) || !['none', 'weekly', 'monthly', 'yearly'].includes(event.recurrence) ||
    !['hebrew', 'gregorian'].includes(event.calendar) || !['last', 'skip'].includes(event.missingDay) ||
    !['second', 'first', 'both', 'skip'].includes(event.adar) || typeof event.allDay !== 'boolean') throw new Error('Invalid event');
  civil(event.startDate); civil(event.endDate);
  if (event.startDate < '1900-01-01' || event.endDate > '2200-12-31' || event.endDate < event.startDate ||
    civil(event.endDate).diff(civil(event.startDate), 'days').days > 366) throw new Error('Event dates must be between 1900 and 2200, and span at most one year');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.endTime)) throw new Error('Invalid event time');
  if (!event.allDay && `${event.endDate}T${event.endTime}` <= `${event.startDate}T${event.startTime}`) throw new Error('End must be after start');
  if (event.until) { civil(event.until); if (event.until < event.startDate) throw new Error('Repeat end must be after start'); }
  if (event.reminderMinutes !== null && (!Number.isInteger(event.reminderMinutes) || event.reminderMinutes < 0 || event.reminderMinutes > 10080)) throw new Error('Invalid reminder');
}

function matches(event: UserEvent, date: string): boolean {
  if (date < event.startDate || (event.until && date > event.until)) return false;
  if (event.recurrence === 'none') return date === event.startDate;
  if (event.recurrence === 'weekly') return civil(date).diff(civil(event.startDate), 'days').days % 7 === 0;
  if (event.calendar === 'gregorian') {
    const target = civil(date), anchor = civil(event.startDate);
    return target.day === anchor.day && (event.recurrence === 'monthly' || target.month === anchor.month);
  }
  const anchor = hebrew(event.startDate), target = hebrew(date);
  if (event.recurrence === 'yearly') {
    let months = [anchor.month];
    if (anchor.month === 13 && !isLeap(target.year)) months = event.adar === 'skip' ? [] : [12];
    else if (anchor.month === 12 && isLeap(anchor.year) && !isLeap(target.year)) months = event.adar === 'skip' ? [] : [12];
    else if (anchor.month === 12 && !isLeap(anchor.year) && isLeap(target.year)) {
      months = event.adar === 'both' ? [12, 13] : event.adar === 'skip' ? [] : [event.adar === 'first' ? 12 : 13];
    }
    if (!months.includes(target.month)) return false;
  }
  const last = daysInHebrewMonth(target.year, target.month);
  return target.day === (event.missingDay === 'last' ? Math.min(anchor.day, last) : anchor.day);
}

export function expandEvents(events: UserEvent[], from: string, to: string): Occurrence[] {
  const result: Occurrence[] = [];
  for (const event of events) {
    const durationDays = Math.round(civil(event.endDate).diff(civil(event.startDate), 'days').days);
    const first = addDays(from, -durationDays - 1);
    for (let date = first; date < to; date = addDays(date, 1)) {
      if (!matches(event, date)) continue;
      const endDate = addDays(date, durationDays + (event.allDay ? 1 : 0));
      const start = event.allDay ? date : `${date}T${event.startTime}:00`;
      const end = event.allDay ? endDate : `${endDate}T${event.endTime}:00`;
      if (end <= from) continue;
      result.push({ id: `${event.id}/${date}`, title: event.title, start, end, allDay: event.allDay, extendedProps: { seriesId: event.id } });
    }
  }
  return result;
}

export function dueReminders(events: UserEvent[], previous: number, now: number): Occurrence[] {
  const from = DateTime.fromMillis(now).minus({ days: 1 }).toISODate();
  const to = DateTime.fromMillis(now).plus({ days: 9 }).toISODate();
  return expandEvents(events.filter(e => e.reminderMinutes !== null), from, to).filter(occurrence => {
    const event = events.find(e => e.id === occurrence.extendedProps.seriesId)!;
    const instant = DateTime.fromISO(occurrence.allDay ? `${occurrence.start}T09:00` : occurrence.start).toMillis() - event.reminderMinutes! * 60000;
    return instant > previous && instant <= now;
  });
}

export function eventHebrewAnchor(event: UserEvent): string {
  const h = hebrew(event.startDate);
  return fromHebrew(h);
}
