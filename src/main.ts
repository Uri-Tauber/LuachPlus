import { Calendar, type CalendarOptions, type DayCellInfo } from 'fullcalendar';
import dayGrid from 'fullcalendar/daygrid';
import timeGrid from 'fullcalendar/timegrid';
import list from 'fullcalendar/list';
import interaction from 'fullcalendar/interaction';
import adaptive from 'fullcalendar-scheduler/adaptive';
import heLocale from 'fullcalendar/locales/he';
import { DateTime } from 'luxon';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { JewishCalendar } from 'kosher-zmanim';
import { addDays, calendarDay, civil, dayFacts, formatter, fromHebrew, hebrew, hebrewLabel, localDate, monthRange, monthTitle, shiftMonth, shiftYear, isLeap } from './dates';
import { dueReminders, expandEvents, newEvent, validateEvent, type UserEvent } from './events';
import { presets, validateSettings, type Settings } from './settings';
import { loadData, saveData, validateData, type AppData } from './storage';
import { currentHebrewCivilDate, defaultMethods, schedule, studies, zmanLabel, zmanMethods, type ScheduleRow } from './zmanim';
import { themes, applyPalette } from './themes';
import { paletteOptions, paletteFor } from './palettes';
import { icon, type Icon } from './icons';
import { hebrewMonthPlugin } from './hebrew-month';
import { zmanGroups, zmanGroup, specialMethodChoices } from './zmanim-catalog';
import './style.css';

const root = document.querySelector<HTMLDivElement>('#app')!;
let data: AppData;
let selected = DateTime.local().toISODate();
let anchor = selected;
let view = 'month';
let calendar: Calendar | undefined;
let busy = false;
let trayLanguage = '';
let messageTimer: ReturnType<typeof setTimeout> | undefined;
const t = (en: string, he: string) => data.settings.language === 'he' ? he : en;
const escape = (value: unknown): string => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const $ = <T extends HTMLElement = HTMLElement>(selector: string, scope: ParentNode = document): T => scope.querySelector<T>(selector)!;
const option = (value: string, label: string, current: string) => `<option value="${escape(value)}" ${value === current ? 'selected' : ''}>${escape(label)}</option>`;
const checkbox = (name: string, label: string, checked: boolean) => `<label class="check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>${escape(label)}</label>`;
const field = (label: string, control: string) => `<label class="field"><span>${escape(label)}</span>${control}</label>`;
const input = (name: string, value: string | number, type = 'text', attrs = '') => `<input name="${name}" type="${type}" value="${escape(value)}" ${attrs}>`;
const select = (name: string, entries: [string, string][], current: string) => `<select name="${name}">${entries.map(([v, l]) => option(v, l, current)).join('')}</select>`;
const errorText = (e: unknown) => e instanceof Error ? e.message : String(e);
function iconButton(id: string, symbol: Icon, label: string, directional = false) {
  return `<button type="button" id="${id}" class="icon-button" aria-label="${escape(label)}" title="${escape(label)}">${icon(symbol, directional)}</button>`;
}
function segments(name: string, label: string, items: [string, string, Icon][], current: string) {
  return `<div class="segmented ${name}-segments" role="group" aria-label="${escape(label)}">${items.map(([value, text, symbol]) => `<button type="button" data-${name}="${value}" aria-pressed="${value === current}" title="${escape(text)}" aria-label="${escape(text)}">${icon(symbol)}<span class="segment-label">${escape(text)}</span></button>`).join('')}</div>`;
}
function decorateActions(scope: ParentNode) {
  const actions: [string, Icon][] = [
    ['button[type="submit"]', 'save'], ['.close-dialog, #close-about', 'close'],
    ['#delete-event, #confirm-delete', 'delete'], ['#reset-zmanim', 'reset'],
    ['#export', 'download'], ['#confirm-restore', 'upload'], ['#configure-zmanim', 'settings'], ['#panel-add', 'add'],
  ];
  for (const [selector, symbol] of actions) scope.querySelectorAll<HTMLButtonElement>(selector).forEach(button => {
    if (!button.querySelector('svg')) button.insertAdjacentHTML('afterbegin', icon(symbol));
  });
}

function showMessage(message: string, error = false) {
  clearTimeout(messageTimer);
  const status = $('#status');
  status.textContent = message;
  status.classList.toggle('error', error);
  if (!error) messageTimer = setTimeout(() => { status.textContent = ''; }, 5000);
}
async function persist(next: AppData): Promise<boolean> {
  if (busy) return false;
  busy = true;
  try { await saveData(next); data = next; return true; }
  catch (e) { showMessage(`${t('Could not save. Your previous data is intact.', 'לא ניתן לשמור. הנתונים הקודמים נשמרו.')} ${errorText(e)}`, true); return false; }
  finally { busy = false; }
}
function viewName() { return view === 'month' ? (data.settings.calendar === 'hebrew' ? 'hebrewMonth' : 'dayGridMonth') : view; }
function colorScheme(): 'light' | 'dark' {
  return data.settings.colorScheme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : data.settings.colorScheme;
}
function configureAppearance() {
  const s = data.settings, html = document.documentElement;
  applyPalette(s.theme, s.palette);
  if (isTauri() && trayLanguage !== s.language) {
    trayLanguage = s.language;
    void invoke('set_tray_language', { language: s.language }).catch(() => { trayLanguage = ''; });
  }
  html.lang = s.language;
  html.dir = s.direction === 'auto' ? (s.language === 'he' ? 'rtl' : 'ltr') : s.direction;
  html.dataset.colorScheme = colorScheme();
  html.dataset.theme = s.theme;
  html.classList.toggle('print-schedule', s.printSchedule);
  const keys = { background: 'background', foreground: 'foreground', muted: 'muted', border: 'border', primary: 'primary', contrast: 'primary-foreground' };
  for (const [key, token] of Object.entries(keys)) html.style.setProperty(`--app-${key}`, `var(--fc-${s.theme}-${token})`);
}
function dayCell(info: DayCellInfo) {
  const date = localDate(info.date);
  const s = data.settings, h = hebrew(date), f = formatter(s.language);
  const facts = dayFacts(date, s.language, s.location.inIsrael);
  const hd = s.language === 'he' ? f.formatHebrewNumber(h.day) : `${h.day}`;
  const primary = s.calendar === 'hebrew' ? hd : String(civil(date).day);
  const secondary = s.calendar === 'hebrew' ? civil(date).toFormat('d') : `${hd} ${f.formatMonth(calendarDay(date))}`;
  return { html: `<div class="day-content"><div class="day-heading"><button class="day-select"${info.isToday ? ' aria-current="date"' : ''} tabindex="${date === selected ? 0 : -1}" aria-pressed="${date === selected}" data-date="${date}" aria-label="${escape([civil(date).setLocale(s.language).toLocaleString({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), hebrewLabel(date, s.language), facts.holiday, facts.parasha, facts.omer].filter(Boolean).join(' · '))}">${escape(primary)}</button><span class="secondary-date">${escape(secondary)}</span></div>
    <div class="day-facts">${[facts.holiday, facts.parasha, facts.omer].filter(Boolean).map(v => `<span title="${escape(v)}">${escape(v)}</span>`).join('')}</div></div>` };
}

function render() {
  calendar?.destroy();
  configureAppearance();
  root.innerHTML = `
    <div id="status" role="status" aria-live="polite"></div>
    <main class="workspace">
      <section class="calendar-section" aria-label="${t('Calendar', 'לוח שנה')}">
        <div class="calendar-controls">
          <div class="navigation">${iconButton('prev-year', 'previousYear', t('Previous year', 'שנה אחורה'), true)}${iconButton('prev', 'previous', t('Previous period', 'לתקופה הקודמת'), true)}${iconButton('today', 'today', t('Today', 'היום'))}${iconButton('next', 'next', t('Next period', 'לתקופה הבאה'), true)}${iconButton('next-year', 'nextYear', t('Next year', 'שנה קדימה'), true)}</div>
          <h2 id="period-title"></h2>
          <div class="view-controls">${segments('system', t('Calendar', 'לוח שנה'), [['hebrew', t('Hebrew', 'עברי'), 'hebrew'], ['gregorian', t('Gregorian', 'לועזי'), 'gregorian']], data.settings.calendar)}${segments('view', t('Calendar view', 'תצוגת הלוח'), [['month', t('Month', 'חודש'), 'month'], ['timeGridWeek', t('Week', 'שבוע'), 'week'], ['timeGridDay', t('Day', 'יום'), 'day'], ['listWeek', t('Agenda', 'סדר יום'), 'agenda']], view)}</div>
        </div>
        <div class="jump-date">${field(t('Go to date', 'מעבר לתאריך'), input('jump', selected, 'date', 'min="1900-01-01" max="2200-12-31"'))}<button id="jump-hebrew">${t('Hebrew date…', 'תאריך עברי…')}</button><span id="secondary-title"></span><span id="live-date"></span></div>
        <div id="calendar"></div>
      </section>
      <aside id="day-panel" aria-label="${t('Selected day schedule', 'סדר היום הנבחר')}"></aside>
    </main>
    <footer class="app-footer"><div class="app-actions">${iconButton('about', 'about', t('About', 'אודות'))}${iconButton('search-events', 'search', t('Search events', 'חיפוש אירועים'))}${iconButton('print', 'print', t('Print', 'הדפסה'))}${iconButton('settings', 'settings', t('Settings', 'הגדרות'))}${iconButton('keyboard-help', 'keyboard', t('Keyboard shortcuts', 'קיצורי מקלדת'))}</div><button id="add-event" class="primary">${icon('add')}${t('Add event', 'הוספת אירוע')}</button></footer>
    <dialog id="search-dialog" aria-labelledby="search-title"></dialog><dialog id="jump-dialog" aria-labelledby="jump-title"></dialog><dialog id="settings-dialog" aria-labelledby="settings-title"></dialog><dialog id="event-dialog" aria-labelledby="event-title"></dialog><dialog id="about-dialog" aria-labelledby="about-title"></dialog>`;

  const options: CalendarOptions = {
    plugins: [themes[data.settings.theme], dayGrid, hebrewMonthPlugin, timeGrid, list, interaction, adaptive],
    schedulerLicenseKey: 'AGPL-My-Frontend-And-Backend-Are-Open-Source',
    initialView: viewName(), initialDate: anchor, locales: [heLocale], locale: data.settings.language,
    direction: document.documentElement.dir as 'ltr' | 'rtl', colorScheme: colorScheme(), timeZone: 'local',
    headerToolbar: false, height: '100%', expandRows: true, firstDay: 0, fixedWeekCount: false, showNonCurrentDates: true,
    nowIndicator: true, dayMaxEvents: 3, selectable: true, editable: false,
    validRange: { start: '1900-01-01', end: '2201-01-01' },
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    views: { hebrewMonth: { visibleRange: (date: Date) => monthRange(localDate(date), 'hebrew') } },
    dayCellTopContent: dayCell,
    dayCellTopClass: 'luach-cell-top',
    dayCellTopInnerClass: 'luach-cell-inner',
    dayCellClass: info => {
      const date = localDate(info.date), classes = ['calendar-day'];
      if (date === selected) classes.push('selected-day');
      if (view === 'month') { const r = monthRange(anchor, data.settings.calendar); if (date < r.start || date >= r.end) classes.push('outside-month'); }
      if (dayFacts(date, data.settings.language, data.settings.location.inIsrael).holy) classes.push('holy-day');
      return classes.join(' ');
    },
    datesSet: info => {
      $('#period-title').textContent = view === 'month' ? monthTitle(anchor, data.settings.calendar, data.settings.language) : info.view.title;
      $('#secondary-title').textContent = view === 'month' ? monthTitle(anchor, data.settings.calendar === 'hebrew' ? 'gregorian' : 'hebrew', data.settings.language) : '';
    },
    dateClick: info => selectDay(info.dateStr.slice(0, 10)),
    select: info => {
      if (info.allDay && civil(info.endStr.slice(0, 10)).diff(civil(info.startStr.slice(0, 10)), 'days').days === 1) return;
      const e = newEvent(info.startStr.slice(0, 10));
      e.allDay = info.allDay;
      e.endDate = info.allDay ? addDays(info.endStr.slice(0, 10), -1) : info.endStr.slice(0, 10);
      if (!info.allDay) { e.startTime = info.startStr.slice(11, 16); e.endTime = info.endStr.slice(11, 16); }
      openEvent(e);
      calendar?.unselect();
    },
    eventClick: info => { const event = data.events.find(e => e.id === info.event.extendedProps.seriesId); if (event) openEvent(event); },
    events: (info, success, failure) => {
      try { success(expandEvents(data.events, info.startStr.slice(0, 10), info.endStr.slice(0, 10))); } catch (e) { failure(e as Error); }
    },
  };
  calendar = new Calendar($('#calendar'), options);
  calendar.render();
  $('#calendar').tabIndex = document.querySelector('.day-select[tabindex="0"]') ? -1 : 0;
  $('#calendar').onfocus = () => { if (!document.querySelector('.day-select[tabindex="0"]')) selectDay(anchor); };
  $('#add-event').onclick = () => openEvent(newEvent(selected));
  $('#settings').onclick = () => openSettings();
  $('#search-events').onclick = openEventSearch;
  $('#jump-hebrew').onclick = openHebrewJump;
  $('#keyboard-help').onclick = openKeyboardHelp;
  $('#about').onclick = () => openAbout();
  $('#print').onclick = () => void printCalendar();
  $('#today').onclick = () => { anchor = selected = DateTime.local().toISODate(); render(); };
  $('#prev').onclick = () => navigate(-1);
  $('#next').onclick = () => navigate(1);
  for (const [id, direction] of [['prev-year', -1], ['next-year', 1]] as const) $(`#${id}`).onclick = () => {
    const next = shiftYear(anchor, direction, data.settings.calendar);
    if (next < '1900-01-01' || next > '2200-12-31') return;
    anchor = next; render();
  };
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.onclick = () => {
    anchor = localDate(calendar!.getDate()); view = button.dataset.view!; render();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-system]').forEach(button => button.onclick = async () => {
    const system = button.dataset.system as Settings['calendar'];
    if (await persist({ ...data, settings: { ...data.settings, calendar: system } })) render();
  });
  $<HTMLInputElement>('[name="jump"]').onchange = e => {
    const input = e.target as HTMLInputElement;
    if (!input.value || !input.validity.valid) return;
    anchor = selected = input.value; render();
  };
  $('#calendar').addEventListener('click', e => {
    const button = (e.target as Element).closest<HTMLButtonElement>('.day-select');
    if (button) selectDay(button.dataset.date!);
  });
  // Selection overlays are replaced between clicks, so native dblclick is unreliable.
  let pressedDay: { date: string; x: number; y: number } | undefined;
  let lastDayClick = { date: '', at: 0 };
  const dayAt = (e: PointerEvent) => document.elementsFromPoint(e.clientX, e.clientY)
    .find(el => el.matches('.calendar-day[data-date]')) as HTMLElement | undefined;
  $('#calendar').addEventListener('pointerdown', e => {
    const target = e.target as Element;
    const day = dayAt(e);
    pressedDay = e.button === 0 && day && !target.closest('a, [role="listitem"]')
      ? { date: day.dataset.date!, x: e.clientX, y: e.clientY } : undefined;
  }, true);
  $('#calendar').addEventListener('pointerup', e => {
    const down = pressedDay; pressedDay = undefined;
    if (!down || dayAt(e)?.dataset.date !== down.date || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    const now = performance.now();
    if (lastDayClick.date === down.date && now - lastDayClick.at < 500) {
      lastDayClick = { date: '', at: 0 };
      selectDay(down.date); openEvent(newEvent(down.date));
    } else lastDayClick = { date: down.date, at: now };
  }, true);
  updateHeader(); renderPanel();
}
function navigate(direction: number) {
  const next = view === 'month' ? shiftMonth(anchor, direction, data.settings.calendar) : addDays(anchor, direction * (view === 'timeGridDay' ? 1 : 7));
  if (next < '1900-01-01' || next > '2200-12-31') return;
  anchor = next; render();
}
function selectDay(date: string) {
  selected = date;
  document.querySelectorAll('.selected-day').forEach(el => el.classList.remove('selected-day'));
  document.querySelectorAll(`[data-date="${date}"]`).forEach(el => { const cell = el.closest('.calendar-day'); if (cell) cell.classList.add('selected-day'); });
  $<HTMLInputElement>('[name="jump"]').value = date;
  document.querySelectorAll<HTMLButtonElement>('.day-select').forEach(button => {
    const active = button.dataset.date === selected;
    button.tabIndex = active ? 0 : -1;
    button.setAttribute('aria-pressed', String(active));
  });
  renderPanel();
}
function focusDate(date: string) {
  if (date < '1900-01-01' || date > '2200-12-31') return;
  const range = monthRange(anchor, data.settings.calendar);
  if (view !== 'month' || date < range.start || date >= range.end) { anchor = date; selected = date; render(); }
  else selectDay(date);
  ($<HTMLButtonElement>(`.day-select[data-date="${date}"]`) ?? $('#calendar')).focus();
}
function calendarKeys(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  if (event.defaultPrevented || event.isComposing || target.closest('dialog, input, textarea, select, [contenteditable="true"]') || event.altKey || event.ctrlKey || event.metaKey) return;
  // Letter shortcuts belong to the focused calendar, leaving other controls' keys intact.
  const inCalendar = !!target.closest('#calendar');
  const key = event.key, rtl = document.documentElement.dir === 'rtl';
  let date: string | undefined;
  if (key.startsWith('Arrow')) {
    const delta: Record<string, number> = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7 };
    if (key in delta) date = addDays(selected, delta[key]);
  } else if (inCalendar && (key === 'PageUp' || key === 'PageDown')) {
    date = (event.shiftKey ? shiftYear : shiftMonth)(selected, key === 'PageUp' ? -1 : 1, data.settings.calendar);
  } else if (inCalendar && (key === 'Home' || key === 'End')) {
    const weekday = civil(selected).weekday % 7;
    date = addDays(selected, (key === 'Home' ? 0 : 6) - weekday);
  } else if (inCalendar) {
    const views: Record<string, string> = { d: 'timeGridDay', '1': 'timeGridDay', w: 'timeGridWeek', '2': 'timeGridWeek', m: 'month', '3': 'month', a: 'listWeek', '5': 'listWeek' };
    const letter = key.toLowerCase();
    if (views[letter]) { view = views[letter]; anchor = selected; render(); focusDate(selected); }
    else if (letter === 't') focusDate(DateTime.local().toISODate());
    else if (letter === 'c') openEvent(newEvent(selected));
    else if (key === '/') openEventSearch();
    else if (letter === 'g') $('[name="jump"]').focus();
    else if (letter === 's') openSettings();
    else if (letter === 'n' || letter === 'j' || letter === 'p' || letter === 'k') { navigate(letter === 'n' || letter === 'j' ? 1 : -1); $('#calendar').focus(); }
    else if (key === '?') openKeyboardHelp();
    else return;
    event.preventDefault(); return;
  }
  if (date) { event.preventDefault(); focusDate(date); }
}
function openEventSearch() {
  const dialog = $<HTMLDialogElement>('#search-dialog');
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="search-title">${t('Search events', 'חיפוש אירועים')}</h2><button type="button" class="close-dialog">${t('Close', 'סגירה')}</button></div>
    ${field(t('Title or notes', 'כותרת או הערות'), '<input type="search" id="event-query" autofocus autocomplete="off">')}
    <p class="hint">${t('Repeating events appear once, with their series start date.', 'אירועים חוזרים מוצגים פעם אחת, עם תאריך תחילת הסדרה.')}</p>
    <p id="search-count" class="hint" role="status"></p><div id="event-results"></div>`;
  const results = $('#event-results', dialog);
  function update() {
    const query = $<HTMLInputElement>('#event-query').value.trim().toLocaleLowerCase(data.settings.language);
    const matches = data.events.filter(event => `${event.title} ${event.description}`.toLocaleLowerCase(data.settings.language).includes(query))
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
    $('#search-count').textContent = matches.length ? `${matches.length} ${t('events', 'אירועים')}` : t('No matching events.', 'לא נמצאו אירועים מתאימים.');
    results.innerHTML = matches.map(event => `<button class="search-result" data-id="${escape(event.id)}"><span>${escape(event.title)}</span><small>${escape(hebrewLabel(event.startDate, data.settings.language))} · ${escape(civil(event.startDate).setLocale(data.settings.language).toLocaleString(DateTime.DATE_MED))}${event.recurrence !== 'none' ? ` · ${t('Repeats', 'חוזר')}` : ''}</small></button>`).join('');
  }
  $('#event-query').oninput = update;
  results.onclick = event => {
    const id = (event.target as Element).closest<HTMLElement>('[data-id]')?.dataset.id;
    const found = data.events.find(item => item.id === id);
    if (found) { dialog.close(); openEvent(found); }
  };
  $('.close-dialog', dialog).onclick = () => dialog.close();
  update(); decorateActions(dialog); dialog.showModal();
}

function hebrewMonthOptions(year: number, current: string): string {
  const f = formatter(data.settings.language);
  return [7, 8, 9, 10, 11, 12, ...(isLeap(year) ? [13] : []), 1, 2, 3, 4, 5, 6]
    .map(month => option(String(month), f.formatMonth(new JewishCalendar(year, month, 1)), current)).join('');
}
function openHebrewJump() {
  const dialog = $<HTMLDialogElement>('#jump-dialog'), h = hebrew(selected);
  dialog.innerHTML = `<form id="jump-form"><div class="dialog-heading"><h2 id="jump-title">${t('Go to Hebrew date', 'מעבר לתאריך עברי')}</h2><button type="button" class="close-dialog">${t('Close', 'סגירה')}</button></div>
    <div class="form-grid three">${field(t('Day', 'יום'), input('jumpDay', h.day, 'number', 'required min="1" max="30" autofocus'))}${field(t('Month', 'חודש'), `<select name="jumpMonth">${hebrewMonthOptions(h.year, String(h.month))}</select>`)}${field(t('Year', 'שנה'), input('jumpYear', h.year, 'number', 'required min="5660" max="5961"'))}</div>
    <p id="jump-equivalent" class="hint" aria-live="polite"></p><p class="form-error" role="alert"></p>
    <div class="dialog-actions"><button type="button" class="close-dialog">${t('Cancel', 'ביטול')}</button><button type="submit" class="primary">${t('Go to date', 'מעבר לתאריך')}</button></div></form>`;
  const form = $<HTMLFormElement>('#jump-form'), value = (name: string) => $<HTMLInputElement>(`[name="${name}"]`, form).value;
  const readDate = () => {
    const date = fromHebrew({ day: +value('jumpDay'), month: +value('jumpMonth'), year: +value('jumpYear') });
    if (date < '1900-01-01' || date > '2200-12-31') throw new Error('range');
    return date;
  };
  form.oninput = event => {
    if ((event.target as HTMLInputElement).name === 'jumpYear' && $<HTMLInputElement>('[name="jumpYear"]', form).validity.valid) {
      const month = $<HTMLSelectElement>('[name="jumpMonth"]', form);
      month.innerHTML = hebrewMonthOptions(+value('jumpYear'), month.value === '13' && !isLeap(+value('jumpYear')) ? '12' : month.value);
    }
    $('.form-error', form).textContent = '';
    try { $('#jump-equivalent').textContent = civil(readDate()).setLocale(data.settings.language).toLocaleString(DateTime.DATE_FULL); }
    catch { $('#jump-equivalent').textContent = t('Choose a valid date between 1900 and 2200.', 'בחרו תאריך תקין בין 1900 ל־2200.'); }
  };
  form.onsubmit = event => {
    event.preventDefault();
    try { anchor = selected = readDate(); dialog.close(); render(); ($<HTMLButtonElement>(`.day-select[data-date="${selected}"]`) ?? $('#jump-hebrew')).focus(); }
    catch { $('.form-error', form).textContent = t('This date does not exist or is outside 1900–2200. Check the day, month and year.', 'התאריך אינו קיים או שאינו בין 1900 ל־2200. בדקו את היום, החודש והשנה.'); }
  };
  dialog.querySelectorAll<HTMLButtonElement>('.close-dialog').forEach(button => button.onclick = () => dialog.close());
  $('#jump-equivalent').textContent = civil(selected).setLocale(data.settings.language).toLocaleString(DateTime.DATE_FULL);
  decorateActions(dialog); dialog.showModal();
}

function updateHeader() {
  const date = currentHebrewCivilDate(DateTime.local(), data.settings);
  $('#live-date').textContent = hebrewLabel(date, data.settings.language);
}
function timeText(row: ScheduleRow) {
  if (!row.time) return t('Unavailable', 'לא זמין');
  const time = row.time.setZone(data.settings.location.timezone);
  return (data.settings.seconds ? time : time.plus({ seconds: 30 })).toFormat(data.settings.seconds ? 'HH:mm:ss' : 'HH:mm');
}
function renderPanel() {
  const s = data.settings, facts = dayFacts(selected, s.language, s.location.inIsrael);
  const times = schedule(selected, s, s.language), learning = studies(selected, s, s.language);
  const occurrences = expandEvents(data.events, selected, addDays(selected, 1));
  $('#day-panel').innerHTML = `<div class="panel-heading"><h2>${escape(hebrewLabel(selected, s.language))}</h2><p>${escape(civil(selected).setLocale(s.language).toLocaleString({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</p><p>${escape([facts.holiday, facts.parasha, facts.omer].filter(Boolean).join(' · '))}</p></div>
    <div class="panel-location"><span>${t('Times for', 'זמנים עבור')} ${escape(s.location.name)}</span><button class="quiet" id="change-location">${t('Change', 'שינוי')}</button></div>
    ${times.some(row => row.special) ? `<section class="priority-times" aria-label="${t('Special times', 'זמנים מיוחדים')}"><dl class="schedule">${times.filter(row => row.special).map(row => `<div class="schedule-row special-time"><dt>${escape(row.label)}</dt><dd><time dir="ltr">${escape(timeText(row))}</time></dd></div>`).join('')}</dl></section>` : ''}
    <section class="panel-events"><div class="section-heading"><h3>${t('Events', 'אירועים')}</h3><button class="quiet" id="panel-add">${t('Add', 'הוספה')}</button></div>${occurrences.length ? occurrences.map(o => `<button class="event-row" data-series="${escape(o.extendedProps.seriesId)}"><span>${escape(o.title)}</span><small>${o.allDay ? t('All day', 'כל היום') : escape(o.start.slice(11, 16))}</small></button>`).join('') : `<p class="empty">${t('No events for this day', 'אין אירועים ביום זה')}</p>`}</section>
    <section aria-labelledby="zmanim-heading"><div class="section-heading"><h3 id="zmanim-heading">${t('Zmanim', 'זמני היום')}</h3><button class="quiet" id="configure-zmanim">${t('Configure', 'התאמה')}</button></div>
    <dl class="schedule">${times.filter(row => !row.special).map(row => `<div class="schedule-row ${row.special ? 'special-time' : ''}"><dt>${escape(row.label)}</dt><dd><time dir="ltr">${escape(timeText(row))}</time></dd></div>`).join('')}</dl></section>
    ${learning.length ? `<section><h3>${t('Daily learning', 'לימוד יומי')}</h3><dl class="learning">${learning.map(row => `<div><dt>${escape(row.label)}</dt><dd>${escape(row.value)}</dd></div>`).join('')}</dl></section>` : ''}

    <p class="panel-note">${escape(s.location.name)} · ${s.location.elevation} ${t('m', 'מ׳')}<br>${t('Times shown in the location’s timezone', 'הזמנים לפי אזור הזמן של המיקום')}</p>`;
  $('#change-location').onclick = () => openSettings('location');
  $('#configure-zmanim').onclick = () => openSettings('zmanim');
  $('#panel-add').onclick = () => openEvent(newEvent(selected));
  decorateActions($('#day-panel'));
  document.querySelectorAll<HTMLButtonElement>('[data-series]').forEach(b => b.onclick = () => openEvent(data.events.find(e => e.id === b.dataset.series)!));
}

function openEvent(event: UserEvent) {
  const dialog = $<HTMLDialogElement>('#event-dialog'), existing = data.events.some(e => e.id === event.id);
  dialog.innerHTML = `<form id="event-form"><div class="dialog-heading"><h2 id="event-title">${existing ? t('Edit event · entire series', 'עריכת אירוע · כל הסדרה') : t('New event', 'אירוע חדש')}</h2><button type="button" class="close-dialog">${t('Close', 'סגירה')}</button></div>
    ${field(t('Title', 'כותרת'), input('title', event.title, 'text', 'required maxlength="300" autofocus'))}
    <div class="event-date-heading"><span>${t('Date', 'תאריך')}</span>${field(t('Date calendar', 'לוח לתאריך'), select('calendar', [['hebrew', t('Hebrew', 'עברי')], ['gregorian', t('Gregorian', 'לועזי')]], event.calendar))}</div>
    <div id="gregorian-entry">${field(t('Start date', 'תאריך התחלה'), input('startDate', event.startDate, 'date', 'required min="1900-01-01" max="2200-12-31"'))}</div>
    <fieldset id="hebrew-entry"><legend>${t('Hebrew date', 'תאריך עברי')}</legend><div class="form-grid three">${field(t('Day', 'יום'), input('hebrewDay', hebrew(event.startDate).day, 'number', 'required min="1" max="30"'))}${field(t('Month', 'חודש'), `<select name="hebrewMonth"></select>`)}${field(t('Year', 'שנה'), input('hebrewYear', hebrew(event.startDate).year, 'number', 'required min="5660" max="5961"'))}</div></fieldset>
    <p id="event-date-caption" class="hint"></p>
    <div class="event-date-options">${checkbox('allDay', t('All day', 'כל היום'), event.allDay)}${checkbox('multiDay', t('Multiple days', 'מספר ימים'), event.endDate !== event.startDate)}</div>
    <div id="event-end-date">${field(t('End date · inclusive (Gregorian)', 'תאריך סיום · כולל (לועזי)'), input('endDate', event.endDate, 'date', 'required min="1900-01-01" max="2200-12-31"'))}</div>
    <div class="form-grid" id="event-times">${field(t('Starts at', 'שעת התחלה'), input('startTime', event.startTime, 'time', 'required'))}${field(t('Ends at', 'שעת סיום'), input('endTime', event.endTime, 'time', 'required'))}</div>
    <details class="event-option" id="event-repeat" ${event.recurrence !== 'none' ? 'open' : ''}><summary>${t('Repeat', 'חזרה')}<span id="repeat-summary"></span></summary>
      ${field(t('Repeat', 'חזרה'), select('recurrence', [['none', t('Does not repeat', 'ללא חזרה')], ['weekly', t('Weekly', 'כל שבוע')], ['monthly', t('Monthly', 'כל חודש')], ['yearly', t('Yearly', 'כל שנה')]], event.recurrence))}
      <div id="repeat-until">${field(t('Repeat until · optional (Gregorian)', 'חזרה עד · לא חובה (לועזי)'), input('until', event.until, 'date', 'max="2200-12-31"'))}<p class="hint">${t('Leave empty to repeat indefinitely.', 'להמשך חזרה ללא הגבלה, השאירו ריק.')}</p></div>
      <details id="hebrew-policies" ${event.missingDay !== 'last' || event.adar !== 'second' ? 'open' : ''}><summary>${t('Hebrew date rules', 'כללי תאריך עברי')}</summary><p class="hint">${t('Choose how this series handles dates that do not exist in every year or month.', 'בחרו כיצד הסדרה תטפל בתאריכים שאינם קיימים בכל שנה או חודש.')}</p>
      ${field(t('If the day is missing', 'אם היום אינו קיים'), select('missingDay', [['last', t('Last day of month', 'היום האחרון בחודש')], ['skip', t('Skip that occurrence', 'דילוג על המופע')]], event.missingDay))}<div id="adar-policy">${field(t('Adar mapping', 'התאמת חודש אדר'), select('adar', [['second', t('Common Adar → Adar II', 'אדר רגיל ← אדר ב׳')], ['first', t('Common Adar → Adar I', 'אדר רגיל ← אדר א׳')], ['both', t('Common Adar → both Adars', 'אדר רגיל ← שני חודשי אדר')], ['skip', t('Skip when month is missing', 'דילוג כשהחודש אינו קיים')]], event.adar))}</div></details>
    </details>
    <details class="event-option" id="event-reminder" ${event.reminderMinutes !== null ? 'open' : ''}><summary>${t('Reminder', 'תזכורת')}<span id="reminder-summary"></span></summary>
      ${field(t('Remind me', 'מועד התזכורת'), select('reminder', [['', t('No reminder', 'ללא תזכורת')], ...[...new Set([0, 5, 10, 15, 30, 60, 1440, ...(event.reminderMinutes === null ? [] : [event.reminderMinutes])])].map(n => [String(n), n === 0 ? t('At event time', 'במועד האירוע') : n === 60 ? t('1 hour before', 'שעה לפני') : n === 1440 ? t('1 day before', 'יום לפני') : `${n} ${t('minutes before', 'דקות לפני')}`] as [string, string])], event.reminderMinutes === null ? '' : String(event.reminderMinutes)))}
      <p class="hint">${t('Reminders run while Luach+ is open. All-day reminders use 09:00 on your computer’s clock.', 'תזכורות פועלות כשהיישום פתוח. תזכורת לאירוע יום שלם בשעה 09:00 לפי שעון המחשב.')}</p>
    </details>
    <details class="event-option" id="event-notes" ${event.description ? 'open' : ''}><summary>${t('Notes', 'הערות')}<span id="notes-summary"></span></summary>${field(t('Description', 'תיאור'), `<textarea name="description" maxlength="10000">${escape(event.description)}</textarea>`)}</details>
    <p class="form-error" role="alert"></p><div class="dialog-actions">${existing ? `<button type="button" id="delete-event" class="danger">${t('Delete entire series', 'מחיקת כל הסדרה')}</button>` : ''}<button type="button" class="close-dialog">${t('Cancel', 'ביטול')}</button><button type="submit" class="primary">${t('Save event', 'שמירת אירוע')}</button></div>
    <div id="delete-confirmation" hidden><p>${t('Delete this event and all its occurrences?', 'למחוק אירוע זה ואת כל המופעים שלו?')}</p><button type="button" id="confirm-delete" class="danger">${t('Confirm deletion', 'אישור מחיקה')}</button></div></form>`;
  const form = $<HTMLFormElement>('#event-form'), value = (name: string) => ($<HTMLInputElement>(`[name="${name}"]`, form)).value;
  const dateInput = $<HTMLInputElement>('[name="startDate"]', form), endInput = $<HTMLInputElement>('[name="endDate"]', form);
  function updateHebrewMonths() {
    const year = Number(value('hebrewYear'));
    if (!Number.isInteger(year) || year < 5660 || year > 5961) return;
    const current = value('hebrewMonth') || String(hebrew(dateInput.value).month);
    $<HTMLSelectElement>('[name="hebrewMonth"]', form).innerHTML = hebrewMonthOptions(year, current === '13' && !isLeap(year) ? '12' : current);
  }
  function updateConditionalFields() {
    const allDay = $<HTMLInputElement>('[name="allDay"]', form).checked;
    $('#event-times', form).hidden = allDay;
    for (const name of ['startTime', 'endTime']) {
      const control = $<HTMLInputElement>(`[name="${name}"]`, form);
      control.disabled = allDay;
      if (allDay && !control.value) control.value = name === 'startTime' ? '09:00' : '10:00';
    }
    const multiDay = $<HTMLInputElement>('[name="multiDay"]', form).checked;
    $('#event-end-date', form).hidden = !multiDay;
    endInput.disabled = !multiDay;
    if (!multiDay) endInput.value = dateInput.value;
    const isHebrew = value('calendar') === 'hebrew';
    $('#gregorian-entry', form).hidden = isHebrew;
    dateInput.disabled = isHebrew;
    const repeating = value('recurrence') !== 'none';
    $('#repeat-until', form).hidden = !repeating;
    $<HTMLInputElement>('[name="until"]', form).disabled = !repeating;
    const hebrewFields = $<HTMLFieldSetElement>('#hebrew-entry', form);
    hebrewFields.hidden = value('calendar') !== 'hebrew';
    hebrewFields.disabled = hebrewFields.hidden;
    $('#hebrew-policies', form).hidden = value('calendar') !== 'hebrew' || !['monthly', 'yearly'].includes(value('recurrence'));
    $('#adar-policy', form).hidden = value('recurrence') !== 'yearly';
    if (dateInput.value && dateInput.validity.valid) $('#event-date-caption', form).textContent = isHebrew
      ? civil(dateInput.value).setLocale(data.settings.language).toLocaleString(DateTime.DATE_FULL)
      : hebrewLabel(dateInput.value, data.settings.language);
    const selectedLabel = (name: string) => $<HTMLSelectElement>(`[name="${name}"]`, form).selectedOptions[0].textContent;
    $('#repeat-summary', form).textContent = selectedLabel('recurrence');
    $('#reminder-summary', form).textContent = selectedLabel('reminder');
    $('#notes-summary', form).textContent = value('description') ? t('Added', 'נוספו') : t('Add notes', 'הוספת הערות');
  }
  dateInput.onchange = () => {
    if (!dateInput.validity.valid) return;
    if (endInput.value < dateInput.value) endInput.value = dateInput.value;
    const h = hebrew(dateInput.value);
    $<HTMLInputElement>('[name="hebrewYear"]', form).value = String(h.year);
    $<HTMLInputElement>('[name="hebrewDay"]', form).value = String(h.day);
    updateHebrewMonths(); $<HTMLSelectElement>('[name="hebrewMonth"]', form).value = String(h.month);
    updateConditionalFields();
  };
  for (const name of ['hebrewYear', 'hebrewMonth', 'hebrewDay']) $(`[name="${name}"]`, form).onchange = () => {
    try {
      if (name === 'hebrewYear') updateHebrewMonths();
      dateInput.value = fromHebrew({ year: +value('hebrewYear'), month: +value('hebrewMonth'), day: +value('hebrewDay') });
      if (endInput.value < dateInput.value) endInput.value = dateInput.value;
      $('.form-error', form).textContent = ''; updateConditionalFields();
    } catch { $('.form-error', form).textContent = t('That Hebrew date does not exist.', 'התאריך העברי אינו קיים.'); }
  };
  for (const name of ['allDay', 'multiDay', 'calendar', 'recurrence', 'reminder']) $(`[name="${name}"]`, form).onchange = () => {
    updateConditionalFields();
  };
  $('[name="description"]', form).oninput = updateConditionalFields;
  form.addEventListener('invalid', e => {
    let parent = (e.target as HTMLElement).parentElement;
    while (parent && parent !== form) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
  }, true);
  form.onsubmit = async e => {
    e.preventDefault();
    const next: UserEvent = { ...event, title: value('title').trim(), description: value('description'),
      startDate: value('startDate'), endDate: value('endDate'), allDay: $<HTMLInputElement>('[name="allDay"]', form).checked,
      startTime: value('startTime'), endTime: value('endTime'), calendar: value('calendar') as UserEvent['calendar'], recurrence: value('recurrence') as UserEvent['recurrence'],
      missingDay: value('missingDay') as UserEvent['missingDay'], adar: value('adar') as UserEvent['adar'], until: value('recurrence') === 'none' ? '' : value('until'), reminderMinutes: value('reminder') === '' ? null : +value('reminder') };
    try {
      if (next.calendar === 'hebrew') {
        const entered = fromHebrew({ year: +value('hebrewYear'), month: +value('hebrewMonth'), day: +value('hebrewDay') });
        if (entered !== next.startDate) throw new Error(t('Check the Hebrew date.', 'יש לבדוק את התאריך העברי.'));
      }
      validateEvent(next);
      if (next.reminderMinutes !== null) await requestNotificationPermission();
      if (!(await persist({ ...data, events: [...data.events.filter(e => e.id !== event.id), next] }))) {
        $('.form-error', form).textContent = t('Could not save. Try again or export a backup.', 'לא ניתן לשמור. נסו שוב או ייצאו גיבוי.'); return;
      }
      dialog.close(); calendar?.refetchEvents(); renderPanel(); showMessage(t('Event saved', 'האירוע נשמר'));
    } catch (err) { $('.form-error', form).textContent = errorText(err); }
  };
  if (existing) {
    $('#delete-event', form).onclick = () => { $('#delete-confirmation', form).hidden = false; $('#confirm-delete', form).focus(); };
    $('#confirm-delete', form).onclick = async () => { if (await persist({ ...data, events: data.events.filter(e => e.id !== event.id) })) { dialog.close(); calendar?.refetchEvents(); renderPanel(); } };
  }
  dialog.querySelectorAll<HTMLButtonElement>('.close-dialog').forEach(b => b.onclick = () => dialog.close());
  updateHebrewMonths(); updateConditionalFields(); decorateActions(dialog); dialog.showModal();
}

function openSettings(tab = 'display') {
  const dialog = $<HTMLDialogElement>('#settings-dialog'), s = structuredClone(data.settings);
  const methodOptions = (kind: 'dawn' | 'night', current: string) => specialMethodChoices(kind, current, zmanMethods).map(m => option(m, zmanLabel(m, s.language), current)).join('');
  const choice = (m: string) => `<label class="check zman-choice" data-search="${escape(`${zmanLabel(m, 'en')} ${zmanLabel(m, 'he')} ${m}`.toLowerCase())}"><input type="checkbox" name="zman" value="${m}" ${s.zmanMethods.includes(m) ? 'checked' : ''}><span>${escape(zmanLabel(m, s.language))}${defaultMethods.includes(m) ? `<small class="method-default">${t('Default', 'ברירת מחדל')}</small>` : ''}</span></label>`;
  const groupedChoices = zmanGroups.map(group => {
    const methods = zmanMethods.filter(m => m !== 'getCandleLighting' && zmanGroup(m) === group.id);
    if (!methods.length) return '';
    const basic = methods.filter(m => defaultMethods.includes(m)), extra = methods.filter(m => !defaultMethods.includes(m));
    return `<details class="zman-group" ${extra.some(m => s.zmanMethods.includes(m)) ? 'open' : ''}><summary>${escape(group[s.language])}<span class="group-count"></span></summary><p class="hint">${escape(s.language === 'he' ? group.hintHe : group.hintEn)}</p>${basic.map(choice).join('')}${extra.length ? `<details class="zman-advanced" ${extra.some(m => s.zmanMethods.includes(m)) ? 'open' : ''}><summary>${t('Additional methods', 'שיטות נוספות')} (${extra.length})</summary>${extra.map(choice).join('')}</details>` : ''}</details>`;
  }).join('');
  dialog.innerHTML = `<form id="settings-form" novalidate><div class="dialog-heading"><h2 id="settings-title">${t('Settings', 'הגדרות')}</h2><button type="button" class="close-dialog">${t('Close', 'סגירה')}</button></div>
    <div class="settings-tabs" role="tablist">${([['display', t('Display', 'תצוגה'), 'palette'], ['location', t('Location', 'מיקום'), 'location'], ['zmanim', t('Zmanim & learning', 'זמנים ולימוד'), 'clock'], ['backup', t('Backup', 'גיבוי'), 'backup']] as [string, string, Icon][]).map(([id, label, symbol]) => `<button type="button" role="tab" id="tab-${id}" aria-controls="settings-${id}" data-tab="${id}">${icon(symbol)}${label}</button>`).join('')}</div>
    <section id="settings-display" role="tabpanel" aria-labelledby="tab-display">
      <div class="form-grid">${field(t('Language', 'שפה'), select('language', [['en', 'English'], ['he', 'עברית']], s.language))}${field(t('Direction', 'כיוון'), select('direction', [['auto', t('Follow language', 'לפי השפה')], ['ltr', t('Left to right', 'משמאל לימין')], ['rtl', t('Right to left', 'מימין לשמאל')]], s.direction))}
      ${field(t('Theme', 'ערכת נושא'), select('theme', Object.keys(themes).map(k => [k, k[0].toUpperCase() + k.slice(1)]), s.theme))}${field(t('Color palette', 'פלטת צבעים'), '<select name="palette"></select>')}${field(t('Appearance', 'מראה'), select('colorScheme', [['system', t('Follow system', 'לפי המערכת')], ['light', t('Light', 'בהיר')], ['dark', t('Dark', 'כהה')]], s.colorScheme))}</div>
      ${checkbox('seconds', t('Show seconds in zmanim', 'הצגת שניות בזמנים'), s.seconds)}${checkbox('printSchedule', t('Append selected day schedule when printing', 'צירוף סדר היום הנבחר להדפסה'), s.printSchedule)}
    </section>
    <section id="settings-location" role="tabpanel" aria-labelledby="tab-location">
      <div class="section-heading"><h3>${t('Location', 'מיקום')}</h3><button type="button" id="toggle-location-search" class="icon-button" aria-label="${t('Search locations', 'חיפוש מיקום')}" title="${t('Search locations', 'חיפוש מיקום')}" aria-expanded="false" aria-controls="location-search-field">${icon('search')}</button></div>
      <div id="location-search-field" hidden>${field(t('Search city', 'חיפוש עיר'), '<input type="search" id="location-search" autocomplete="off">')}</div>
      ${field(t('Location presets', 'מיקומים מוגדרים'), `<select id="location-presets" size="5"></select>`)}
      <div class="form-grid">${field(t('Location name', 'שם המיקום'), input('locationName', s.location.name, 'text', 'required maxlength="150"'))}${field(t('Timezone', 'אזור זמן'), input('timezone', s.location.timezone, 'text', 'required list="timezones" dir="ltr"'))}
      ${field(t('Latitude', 'קו רוחב'), input('latitude', s.location.latitude, 'number', 'required min="-90" max="90" step="any" dir="ltr"'))}${field(t('Longitude', 'קו אורך'), input('longitude', s.location.longitude, 'number', 'required min="-180" max="180" step="any" dir="ltr"'))}
      ${field(t('Elevation · metres', 'גובה · מטרים'), input('elevation', s.location.elevation, 'number', 'required min="-500" max="9000" step="any"'))}${field(t('Candle lighting · minutes before sunset', 'הדלקת נרות · דקות לפני השקיעה'), input('candleMinutes', s.location.candleMinutes, 'number', 'required min="0" max="120" step="1"'))}</div>
      ${checkbox('inIsrael', t('Israel holiday observance', 'מנהגי החגים בארץ ישראל'), s.location.inIsrael)}${checkbox('useElevation', t('Adjust zmanim for elevation', 'התאמת הזמנים לגובה המיקום'), s.useElevation)}
      <datalist id="timezones">${Intl.supportedValuesOf('timeZone').map(zone => `<option value="${zone}"></option>`).join('')}</datalist>
    </section>
    <section id="settings-zmanim" role="tabpanel" aria-labelledby="tab-zmanim">
      <div class="section-heading"><h3>${t('Zmanim', 'זמני היום')}</h3><button type="button" id="reset-zmanim">${t('Reset selection', 'איפוס הבחירה')}</button></div>
      <p class="hint">${t('Degrees (°) describe the sun’s angle below the horizon. Seasonal minutes vary with day length. Default methods are marked; expand additional methods to compare alternatives.', 'מעלות (°) מציינות את זווית השמש מתחת לאופק. דקות זמניות משתנות לפי אורך היום. שיטות ברירת המחדל מסומנות; פתחו שיטות נוספות להשוואת חלופות.')}</p>
      ${field(t('Filter zmanim', 'סינון זמנים'), '<input type="search" id="zman-search">')}
      <div class="zman-choices">${groupedChoices}</div><p id="zman-empty" class="hint" hidden>${t('No matching methods. Try a different name.', 'לא נמצאו שיטות מתאימות. נסו שם אחר.')}</p>
      <h3>${t('Special days', 'ימים מיוחדים')}</h3>
      ${field(t('Shabbos / Yom Tov ends', 'צאת שבת וחג'), `<select name="endMethod">${methodOptions('night', s.endMethod)}</select>`)}
      ${field(t('Minor fast begins', 'תחילת צום קל'), `<select name="fastStartMethod">${methodOptions('dawn', s.fastStartMethod)}</select>`)}${field(t('Fast ends', 'סוף הצום'), `<select name="fastEndMethod">${methodOptions('night', s.fastEndMethod)}</select>`)}
      <h3>${t('Daily learning', 'לימוד יומי')}</h3>${checkbox('bavli', t('Daf Yomi Bavli', 'דף יומי בבלי'), s.bavli)}${checkbox('yerushalmi', t('Daf Yomi Yerushalmi', 'דף יומי ירושלמי'), s.yerushalmi)}
    </section>
    <section id="settings-backup" role="tabpanel" aria-labelledby="tab-backup"><h3>${t('Keep a copy of your calendar', 'שמירת עותק של הלוח')}</h3><p>${t('Backups include all events and saved settings.', 'הגיבוי כולל את כל האירועים וההגדרות השמורות.')}</p><button type="button" id="export">${t('Export backup', 'ייצוא גיבוי')}</button>
      ${field(t('Restore a Luach+ backup', 'שחזור גיבוי Luach+'), '<input type="file" id="import" accept="application/json,.json">')}<div id="restore-preview" hidden></div>
    </section>
    <p class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="close-dialog">${t('Cancel', 'ביטול')}</button><button type="submit" class="primary">${t('Save settings', 'שמירת הגדרות')}</button></div></form>`;
  const form = $<HTMLFormElement>('#settings-form'), value = (name: string) => $<HTMLInputElement>(`[name="${name}"]`, form).value;
  function updatePalettes() {
    const theme = value('theme') as Settings['theme'];
    const current = paletteFor(theme, value('palette') || s.palette);
    const hebrewNames: Record<string, string> = { blue: 'כחול', green: 'ירוק', purple: 'סגול', red: 'אדום', yellow: 'צהוב', amber: 'ענבר', emerald: 'אמרלד', indigo: 'אינדיגו', rose: 'ורוד', default: 'ברירת מחדל' };
    $<HTMLSelectElement>('[name="palette"]', form).innerHTML = paletteOptions[theme].map(p => option(p, t(p[0].toUpperCase() + p.slice(1), hebrewNames[p]), current)).join('');
  }
  $('[name="theme"]', form).onchange = updatePalettes; updatePalettes();
  function activate(id: string) {
    dialog.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b => { const active = b.dataset.tab === id; b.setAttribute('aria-selected', String(active)); b.tabIndex = active ? 0 : -1; });
    for (const name of ['display', 'location', 'zmanim', 'backup']) $(`#settings-${name}`, dialog).hidden = name !== id;
  }
  dialog.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b, index, buttons) => {
    b.onclick = () => activate(b.dataset.tab!);
    b.onkeydown = e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      activate(buttons[next].dataset.tab!); buttons[next].focus();
    };
  });
  function filterLocations() {
    const filter = $<HTMLInputElement>('#location-search').value.toLowerCase();
    $('#location-presets').innerHTML = `<option value="">${t('Choose a location', 'בחירת מיקום')}</option>` + presets.map((p, i) => ({ p, i })).filter(({ p }) => `${p.name} ${p.country}`.toLowerCase().includes(filter)).map(({ p, i }) => option(String(i), `${p.name}, ${p.country}`, '')).join('');
  }
  $('#location-search').oninput = filterLocations; filterLocations();
  $('#toggle-location-search').onclick = () => {
    const field = $('#location-search-field'), button = $('#toggle-location-search'), search = $<HTMLInputElement>('#location-search');
    field.hidden = !field.hidden;
    button.setAttribute('aria-expanded', String(!field.hidden));
    if (!field.hidden) search.focus();
    else { search.value = ''; filterLocations(); }
  };
  $('#location-presets').onchange = e => {
    const index = (e.target as HTMLSelectElement).value;
    if (index === '') return;
    const p = presets[+index];
    for (const [name, v] of Object.entries({ locationName: p.name, timezone: p.timezone, latitude: p.latitude, longitude: p.longitude, elevation: p.elevation, candleMinutes: p.candleMinutes })) $<HTMLInputElement>(`[name="${name}"]`, form).value = String(v);
    $<HTMLInputElement>('[name="inIsrael"]', form).checked = p.inIsrael;
  };
  function updateZmanChoices() {
    const query = $<HTMLInputElement>('#zman-search').value.trim().toLowerCase();
    form.querySelectorAll<HTMLElement>('.zman-choice').forEach(el => el.hidden = !el.dataset.search!.includes(query));
    form.querySelectorAll<HTMLDetailsElement>('.zman-group, .zman-advanced').forEach(group => {
      const choices = [...group.querySelectorAll<HTMLElement>('.zman-choice')];
      group.hidden = !choices.some(choice => !choice.hidden);
      if (query) { group.dataset.beforeSearch ??= String(group.open); group.open = true; }
      else if (group.dataset.beforeSearch !== undefined) { group.open = group.dataset.beforeSearch === 'true'; delete group.dataset.beforeSearch; }
      const count = group.querySelector('.group-count');
      if (count) count.textContent = ` · ${group.querySelectorAll('[name="zman"]:checked').length} ${t('selected', 'נבחרו')}`;
    });
    $('#zman-empty').hidden = !!form.querySelector('.zman-choice:not([hidden])');
  }
  $('#zman-search').oninput = updateZmanChoices;
  form.querySelectorAll<HTMLInputElement>('[name="zman"]').forEach(input => input.onchange = updateZmanChoices);
  $('#reset-zmanim').onclick = () => {
    form.querySelectorAll<HTMLInputElement>('[name="zman"]').forEach(input => input.checked = defaultMethods.includes(input.value));
    updateZmanChoices();
  };
  updateZmanChoices();
  $('#export').onclick = async () => {
    if (isTauri()) {
      try { await invoke('export_backup', { data: JSON.stringify(data, null, 2) }); }
      catch (err) { $('.form-error', form).textContent = errorText(err); }
      return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `luach-plus-${DateTime.local().toISODate()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $<HTMLInputElement>('#import').onchange = async e => {
    const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error(t('Backup is too large.', 'קובץ הגיבוי גדול מדי.'));
      const restored = validateData(JSON.parse(await file.text()));
      const preview = $('#restore-preview'); preview.hidden = false;
      preview.innerHTML = `<p>${t('Replace current events and settings with this backup?', 'להחליף את האירועים וההגדרות בגיבוי זה?')} (${restored.events.length} ${t('events', 'אירועים')})</p><button type="button" id="confirm-restore" class="danger">${t('Replace with backup', 'החלפה בגיבוי')}</button>`;
      decorateActions(preview);
      $('#confirm-restore').onclick = async () => { if (await persist(restored)) { dialog.close(); render(); showMessage(t('Backup restored', 'הגיבוי שוחזר')); } };
    } catch (err) { $('.form-error', form).textContent = errorText(err); }
  };
  form.onsubmit = async e => {
    e.preventDefault();
    const invalid = form.querySelector<HTMLInputElement>('input:invalid, select:invalid, textarea:invalid');
    if (invalid) {
      const panel = invalid.closest<HTMLElement>('[role="tabpanel"]');
      if (panel) activate(panel.id.replace('settings-', ''));
      invalid.reportValidity(); return;
    }
    const next = structuredClone(data.settings);
    next.palette = value('palette');
    for (const name of ['language', 'direction', 'theme', 'colorScheme', 'endMethod', 'fastStartMethod', 'fastEndMethod'] as const) (next as unknown as Record<string, unknown>)[name] = value(name);
    for (const name of ['seconds', 'printSchedule', 'useElevation', 'bavli', 'yerushalmi'] as const) next[name] = $<HTMLInputElement>(`[name="${name}"]`, form).checked;
    next.location = { name: value('locationName').trim(), timezone: value('timezone').trim(), latitude: +value('latitude'), longitude: +value('longitude'), elevation: +value('elevation'), candleMinutes: +value('candleMinutes'), inIsrael: $<HTMLInputElement>('[name="inIsrael"]', form).checked };
    next.zmanMethods = Array.from(form.querySelectorAll<HTMLInputElement>('[name="zman"]:checked'), input => input.value);
    try { validateSettings(next); if (await persist({ ...data, settings: next })) { dialog.close(); render(); } else $('.form-error', form).textContent = t('Could not save settings. Try again.', 'לא ניתן לשמור הגדרות. נסו שוב.'); }
    catch (err) { $('.form-error', form).textContent = errorText(err); }
  };
  dialog.querySelectorAll<HTMLButtonElement>('.close-dialog').forEach(b => b.onclick = () => dialog.close());
  activate(tab); decorateActions(dialog); dialog.showModal();
}

function openKeyboardHelp() {
  const dialog = $<HTMLDialogElement>('#about-dialog');
  const rows = [
    ['← / →', t('Previous / next day (mirrored in Hebrew)', 'יום קודם / הבא (לפי כיוון הלוח)')],
    ['↑ / ↓', t('One week back / forward', 'שבוע אחורה / קדימה')],
    ['Page Up / Page Down', t('Previous / next month', 'חודש קודם / הבא')],
    ['Shift + Page Up / Page Down', t('Previous / next year', 'שנה קודמת / הבאה')],
    ['Home / End', t('First / last day of the week', 'יום ראשון / אחרון בשבוע')],
    ['T', t('Today', 'היום')], ['C', t('New event', 'אירוע חדש')],
    ['D / W / M / A', t('Day / week / month / agenda', 'יום / שבוע / חודש / סדר יום')],
    ['N / P', t('Next / previous period', 'תקופה הבאה / קודמת')],
    ['/', t('Search events', 'חיפוש אירועים')], ['G', t('Go to date', 'מעבר לתאריך')], ['S', t('Settings', 'הגדרות')], ['?', t('Keyboard shortcuts', 'קיצורי מקלדת')],
  ];
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="about-title">${t('Keyboard shortcuts', 'קיצורי מקלדת')}</h2><button class="close-dialog">${t('Close', 'סגירה')}</button></div><p>${t('Tab to the selected date to use these shortcuts. Escape closes dialogs.', 'עברו עם Tab לתאריך הנבחר כדי להשתמש בקיצורים. Escape סוגר חלונות.')}</p><dl class="schedule">${rows.map(([key, label]) => `<div class="schedule-row"><dt>${label}</dt><dd dir="ltr"><kbd>${key}</kbd></dd></div>`).join('')}</dl>`;
  $('.close-dialog', dialog).onclick = () => dialog.close(); decorateActions(dialog); dialog.showModal();
}
function openAbout() {
  const dialog = $<HTMLDialogElement>('#about-dialog');
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="about-title">${t('About Luach+', 'אודות Luach+')}</h2><button id="close-about">${t('Close', 'סגירה')}</button></div>
    <p>${t('Free Hebrew calendar · AGPLv3', 'לוח שנה עברי חופשי · AGPLv3')}</p>
    <p>${t('Zmanim use your saved location and timezone. Choose which times and opinions to display in Settings.', 'זמני היום מחושבים לפי המיקום ואזור הזמן שהגדרתם. ניתן לבחור את הזמנים והשיטות בהגדרות.')}</p>
    <p>${t('Minutes round to the nearest minute. Enable seconds for the calculated clock time.', 'הדקות מעוגלות לדקה הקרובה. הצגת שניות מאפשרת לראות את שעת החישוב.')}</p>
    <h3>${t('Credits', 'תודות')}</h3><p>FullCalendar · KosherZmanim · Tauri · Luxon</p><p>${t('Application icon designed by', 'סמל היישום עוצב על ידי')} <a href="https://www.flaticon.com/free-icon/schedule_3652267" target="_blank" rel="noopener noreferrer">Freepik · Flaticon</a></p><p>${t('Location data: MyZman (LGPL-2.1). Candle-lighting customs: ItimHebrewCalendar.', 'נתוני מיקום: MyZman ‏(LGPL-2.1). מנהגי הדלקת נרות: ItimHebrewCalendar.')}</p>`;
  $('#close-about').onclick = () => dialog.close(); decorateActions(dialog); dialog.showModal();
}
async function printCalendar() {
  try {
    if (isTauri()) await invoke('print_window');
    else window.print();
  } catch (e) { showMessage(`${t('Printing failed:', 'ההדפסה נכשלה:')} ${errorText(e)}`, true); }
}
async function requestNotificationPermission() {
  if (isTauri()) {
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
    if (!(await isPermissionGranted())) await requestPermission();
  } else if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
}
let lastReminderCheck = Date.now();
async function checkReminders() {
  if (!data) return;
  const now = Date.now(), previous = lastReminderCheck; lastReminderCheck = now;
  // Sleep/resume and closed-app gaps do not replay old reminders.
  if (now - previous > 120000) return;
  for (const occurrence of dueReminders(data.events, previous, now)) {
    showMessage(`${t('Reminder', 'תזכורת')}: ${occurrence.title}`);
    try {
      if (isTauri()) { const { sendNotification } = await import('@tauri-apps/plugin-notification'); sendNotification({ title: 'Luach+', body: occurrence.title }); }
      else if ('Notification' in window && Notification.permission === 'granted') new Notification('Luach+', { body: occurrence.title });
    } catch { /* The in-app reminder remains visible if OS notifications are unavailable. */ }
  }
}
async function start() {
  try { data = await loadData(); render(); }
  catch (e) {
    root.innerHTML = `<main class="load-error"><h1>Luach+</h1><p>Could not read saved data / לא ניתן לקרוא את הנתונים השמורים</p><p>${escape(errorText(e))}</p><button id="recover">Download saved data / הורדת הנתונים</button><p>Your saved data has not been overwritten. / הנתונים השמורים לא הוחלפו.</p></main>`;
    $('#recover').onclick = async () => {
      const raw = isTauri() ? await invoke<string>('load_data') : localStorage.getItem('luach-plus-v1');
      if (!raw) return;
      if (isTauri()) { await invoke('export_backup', { data: raw }); return; }
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'luach-plus-recovery.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return;
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (data.settings.colorScheme === 'system') render(); });
  document.addEventListener('keydown', calendarKeys);
  window.addEventListener('beforeprint', () => calendar?.setOption('height', 'auto'));
  window.addEventListener('afterprint', () => calendar?.setOption('height', '100%'));
  setInterval(() => { updateHeader(); void checkReminders(); }, 1000);
}
void start();
