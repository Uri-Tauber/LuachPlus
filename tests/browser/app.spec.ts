import { expect, test } from '@playwright/test';

test('today badge stays on the date button across themes and languages', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00+02:00') });
  await page.goto('/');
  for (const language of ['en', 'he']) {
    for (const theme of ['forma', 'monarch', 'breezy', 'pulse', 'classic']) {
      await page.locator('#settings').click();
      await page.locator('[name="language"]').selectOption(language);
      await page.locator('[name="theme"]').selectOption(theme);
      await page.locator('#settings-form [type="submit"]').click();
      const today = page.locator('.day-select[data-date="2026-11-04"]');
      const wrapper = today.locator('xpath=ancestor::div[contains(@class,"luach-cell-inner")]');
      await expect(wrapper).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(today).toHaveAttribute('aria-current', 'date');
      await expect(today).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      const size = await today.boundingBox();
      expect(size!.width).toBeLessThanOrEqual(40);
      expect(size!.height).toBeLessThanOrEqual(40);
    }
  }
});

test('Hebrew month boundaries, navigation, Gregorian switch and all views', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('[name="jump"]').fill('2027-02-22');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await expect(page.locator('#period-title')).toContainText('Adar I');
  expect(await page.locator('#calendar .day-select').count()).toBeGreaterThanOrEqual(28);
  const rows = await page.locator('#calendar .day-select').evaluateAll(buttons => new Set(buttons.map(b => Math.round(b.getBoundingClientRect().y))).size);
  expect(rows).toBeGreaterThanOrEqual(4);
  expect(rows).toBeLessThanOrEqual(6);
  await page.locator('#next').click();
  await expect(page.locator('#period-title')).toContainText('Adar II');
  await page.locator('#next').click();
  await expect(page.locator('#period-title')).toContainText('Nissan');
  await page.locator('#prev').click();
  await expect(page.locator('#period-title')).toContainText('Adar II');
  await page.locator('[data-system="gregorian"]').click();
  await expect(page.locator('#period-title')).toContainText('March');
  for (const view of ['timeGridWeek', 'timeGridDay', 'listWeek', 'month']) {
    await page.locator(`[data-view="${view}"]`).click();
    await expect(page.locator('#calendar')).not.toBeEmpty();
  }
  expect(errors).toEqual([]);
});

test('event create, whole-series edit and delete persist; location does not change event clocks', async ({ page }) => {
  await page.goto('/');
  await page.locator('[name="jump"]').fill('2026-11-01');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('#add-event').click();
  const form = page.locator('#event-form');
  await form.locator('[name="title"]').fill('Weekly appointment');
  await form.locator('[name="allDay"]').uncheck();
  await form.locator('[name="startTime"]').fill('09:00');
  await form.locator('[name="endTime"]').fill('10:30');
  await form.locator('#event-repeat summary').first().click();
  await form.locator('[name="recurrence"]').selectOption('weekly');
  await form.locator('[type="submit"]').click();
  await expect(page.locator('#event-dialog')).not.toBeVisible();
  await expect(page.locator('.panel-events')).toContainText('Weekly appointment');
  await expect(page.locator('#status')).toHaveText('Event saved');
  await expect(page.locator('.app-footer')).toBeInViewport();
  await page.reload();
  await page.locator('[name="jump"]').fill('2026-11-01');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('#settings').click();
  await page.locator('[data-tab="location"]').click();
  await page.locator('#toggle-location-search').click();
  await page.locator('#location-search').fill('New York');
  await page.locator('#location-presets').selectOption({ label: 'New York, United States' });
  await page.locator('#settings-form [type="submit"]').click();
  await expect(page.locator('.panel-events')).toContainText('09:00');
  await page.locator('.event-row').click();
  await expect(form.locator('[name="startTime"]')).toHaveValue('09:00');
  await form.locator('[name="title"]').fill('Changed entire series');
  await form.locator('[type="submit"]').click();
  await page.locator('.event-row').click();
  await page.locator('#delete-event').click();
  await page.locator('#confirm-delete').click();
  await expect(page.locator('.panel-events')).toContainText('No events');
});

test('settings switch language immediately, filter zmanim and support stock themes', async ({ page }) => {
  await page.goto('/');
  for (const theme of ['monarch', 'breezy', 'pulse', 'classic', 'forma']) {
    await page.locator('#settings').click();
    await page.locator('[name="theme"]').selectOption(theme);
    await page.locator('[name="colorScheme"]').selectOption('dark');
    await page.locator('#settings-form [type="submit"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'dark');
  }
  await page.locator('#settings').click();
  await page.locator('[name="language"]').selectOption('he');
  await page.locator('#settings-form [type="submit"]').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#add-event')).toHaveText('הוספת אירוע');
  await page.locator('#configure-zmanim').click();
  await page.locator('#zman-search').fill('Baal');
  const count = await page.locator('.zman-choice:visible').count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(30);
});

test('backup export, validated restore and print schedule include complete content', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settings').click();
  await page.locator('[name="printSchedule"]').check();
  await page.locator('#settings-form [type="submit"]').click();
  await page.locator('#settings').click();
  await page.locator('[data-tab="backup"]').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const downloaded = await downloadPromise;
  const file = await downloaded.path();
  await page.locator('#import').setInputFiles(file!);
  await expect(page.locator('#restore-preview')).toBeVisible();
  await page.locator('#confirm-restore').click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#day-panel')).toBeVisible();
  await expect(page.locator('.app-actions')).not.toBeVisible();
  await page.pdf({ path: 'test-results/calendar.pdf', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('.app-footer')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(1000);
});

test('mobile layout and Hebrew RTL remain within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#settings').click();
  await page.locator('[name="language"]').selectOption('he');
  await page.locator('#settings-form [type="submit"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('hidden invalid fields do not strand Save and dialogs have accessible names', async ({ page }) => {
  await page.goto('/');
  await page.locator('#add-event').click();
  await expect(page.getByRole('dialog', { name: 'New event' })).toBeVisible();
  await page.locator('[name="title"]').fill('All-day after cleared time');
  await page.locator('[name="allDay"]').uncheck();
  await page.locator('[name="startTime"]').fill('');
  await page.locator('[name="allDay"]').check();
  await page.locator('#event-form [type="submit"]').click();
  await expect(page.locator('#event-dialog')).not.toBeVisible();
  await page.locator('#settings').click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await page.locator('[data-tab="location"]').click();
  await page.locator('[name="locationName"]').fill('');
  await page.locator('[data-tab="display"]').click();
  await page.locator('#settings-form [type="submit"]').click();
  await expect(page.locator('[name="locationName"]')).toBeVisible();
  await expect(page.locator('[name="locationName"]')).toBeFocused();
});

test('the app fits resized windows in both languages and every view', async ({ page }) => {
  await page.goto('/');
  await page.locator('[name="jump"]').fill('2026-05-02');
  await page.locator('[name="jump"]').dispatchEvent('change');
  for (const language of ['en', 'he']) {
    if (language === 'he') {
      await page.locator('#settings').click();
      await page.locator('[name="language"]').selectOption(language);
      await page.locator('#settings-form [type="submit"]').click();
    }
    for (const [width, height] of [[1440, 900], [1280, 720], [800, 600], [390, 844]]) {
      await page.setViewportSize({ width, height });
      for (const view of ['month', 'timeGridWeek', 'timeGridDay', 'listWeek']) {
        await page.locator(`[data-view="${view}"]`).click();
        await expect.poll(() => page.evaluate(currentView => {
          const within = (selector: string) => {
            const rect = document.querySelector(selector)!.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1;
          };
          const calendar = document.querySelector('#calendar')!.getBoundingClientRect();
          const datesFit = currentView !== 'month' || [...document.querySelectorAll('#calendar .day-select')].every(button => {
            const r = button.getBoundingClientRect();
            return r.top >= calendar.top && r.bottom <= calendar.bottom && r.left >= calendar.left && r.right <= calendar.right;
          });
          return datesFit && document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth &&
            ['.calendar-controls', '.jump-date', '#calendar', '#day-panel', '.app-footer'].every(within);
        }, view)).toBe(true);
      }
    }
  }
});

test('six-week months fit after resizing and returning from print', async ({ page }) => {
  await page.goto('/');
  for (const [system, date] of [['hebrew', '2026-09-26'], ['gregorian', '2026-08-15']]) {
    await page.locator(`[data-system="${system}"]`).click();
    await page.locator('[name="jump"]').fill(date);
    await page.locator('[name="jump"]').dispatchEvent('change');
    await expect(page.locator('.day-select')).toHaveCount(42);
    for (const [width, height] of [[1440, 900], [1280, 720], [800, 600]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => {
        window.dispatchEvent(new Event('beforeprint'));
        window.dispatchEvent(new Event('afterprint'));
      });
      await expect.poll(() => page.locator('#calendar').evaluate(calendar => {
        const bounds = calendar.getBoundingClientRect();
        return bounds.bottom <= innerHeight && [...calendar.querySelectorAll('.day-select')].every(button => {
          const rect = button.getBoundingClientRect();
          return rect.top >= bounds.top && rect.bottom <= bounds.bottom;
        });
      })).toBe(true);
      expect(await page.locator('.calendar-section').evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    }
  }
});

test('location is actionable and special times stay highlighted within the schedule', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/');
  await expect(page.locator('.panel-location')).toContainText('Jerusalem');
  await page.locator('#change-location').click();
  await expect(page.locator('#settings-location')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('[name="jump"]').fill('2026-09-26');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await expect(page.locator('.schedule .special-time')).toContainText(['Shabbos / Yom Tov ends']);
  await expect(page.locator('.panel-events')).toBeInViewport();
  const height = await page.locator('#calendar').evaluate(el => el.getBoundingClientRect().height);
  await page.locator('#add-event').click();
  await page.locator('[name="title"]').fill('Lunch');
  await page.locator('#event-form [type="submit"]').click();
  await expect(page.locator('#status')).toHaveText('Event saved');
  expect(await page.locator('#calendar').evaluate(el => el.getBoundingClientRect().height)).toBe(height);
});

test('long schedules scroll inside the day panel and labels contain no developer markers', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.locator('#configure-zmanim').click();
  await expect(page.locator('#settings-zmanim')).not.toContainText(/Itim|inspired|get[A-Z]/);
  await page.locator('[name="zman"]').evaluateAll(inputs => inputs.forEach(input => (input as HTMLInputElement).checked = true));
  await page.locator('#settings-form [type="submit"]').click();
  expect(await page.locator('.schedule-row').count()).toBeGreaterThan(100);
  await expect(page.locator('.schedule')).not.toContainText('Itim');
  await page.locator('.times-scroll').evaluate(panel => { panel.scrollTop = panel.scrollHeight; });
  await expect(page.locator('.panel-note')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(720);
  await page.locator('#about').click();
  await expect(page.locator('#about-dialog')).not.toContainText(/not.*verified|No exact|legacy|get[A-Z]/);
});

test('year arrows, selected view switches and calendar facts work', async ({ page }) => {
  await page.goto('/');
  await page.locator('[name="jump"]').fill('2026-05-02');
  await page.locator('[name="jump"]').dispatchEvent('change');
  const facts = page.locator('.day-content').filter({ has: page.locator('[data-date="2026-05-02"]') }).locator('.day-facts');
  await expect(facts).toContainText('Emor');
  await expect(facts).toContainText('Omer');
  await expect(facts).toBeInViewport({ ratio: 1 });
  await expect(page.locator('[data-view="month"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#next-year').click();
  await expect(page.locator('#period-title')).toContainText('5787');
  await page.locator('#prev-year').click();
  await expect(page.locator('#period-title')).toContainText('5786');
  await page.locator('[data-system="gregorian"]').click();
  await page.locator('#next-year').click();
  await expect(page.locator('#period-title')).toContainText('2027');
  await page.locator('#settings').click();
  await page.locator('[data-tab="location"]').click();
  await expect(page.locator('#location-search')).not.toBeVisible();
  await page.locator('#toggle-location-search').click();
  await expect(page.locator('#location-search')).toBeFocused();
  await page.locator('#toggle-location-search').click();
  await expect(page.locator('#location-search')).not.toBeVisible();
});

test('all bundled palettes apply and persist with light and dark appearance', async ({ page }) => {
  await page.goto('/');
  await page.locator('[name="jump"]').fill('2026-05-02');
  await page.locator('[name="jump"]').dispatchEvent('change');
  const palettes: Record<string, string[]> = {
    forma: ['blue', 'green', 'purple', 'red'], monarch: ['purple', 'blue', 'green', 'red', 'yellow'],
    breezy: ['indigo', 'amber', 'emerald', 'rose'], pulse: ['red', 'blue', 'green', 'purple'], classic: ['default'],
  };
  for (const [theme, colors] of Object.entries(palettes)) {
    for (const palette of colors) {
      await page.locator('#settings').click();
      await page.locator('[name="theme"]').selectOption(theme);
      await expect(page.locator('[name="palette"] option')).toHaveCount(colors.length);
      await page.locator('[name="palette"]').selectOption(palette);
      await page.locator('[name="colorScheme"]').selectOption('dark');
      await page.locator('#settings-form [type="submit"]').click();
      const facts = page.locator('.day-content').filter({ has: page.locator('[data-date="2026-05-02"]') }).locator('.day-facts');
      await expect(facts).toBeInViewport({ ratio: 1 });
      const css = await page.locator('#theme-palette').textContent();
      expect(css).toContain(`--fc-${theme}-primary`);
      expect(css).toContain('data-color-scheme=dark');
      const dark = await page.locator('body').evaluate(el => getComputedStyle(el).color);
      await page.locator('#settings').click();
      await expect(page.locator('[name="palette"]')).toHaveValue(palette);
      await page.locator('[name="colorScheme"]').selectOption('light');
      await page.locator('#settings-form [type="submit"]').click();
      expect(await page.locator('body').evaluate(el => getComputedStyle(el).color)).not.toBe(dark);
    }
  }
  await page.reload();
  await page.locator('#settings').click();
  await expect(page.locator('[name="theme"]')).toHaveValue('classic');
  await expect(page.locator('[name="palette"]')).toHaveValue('default');
});

test('keyboard navigation selects dates, crosses months, respects RTL and leaves forms alone', async ({ page }) => {
  await page.goto('/');
  await page.locator('[name="jump"]').fill('2026-05-02');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('.day-select[data-date="2026-05-02"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[name="jump"]')).toHaveValue('2026-05-03');
  await expect(page.locator('.day-select[data-date="2026-05-03"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[name="jump"]')).toHaveValue('2026-05-10');
  await page.keyboard.press('End');
  await expect(page.locator('[name="jump"]')).toHaveValue('2026-05-16');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#period-title')).toContainText('Sivan');
  await expect(page.locator('.day-select[data-date="2026-05-17"]')).toBeFocused();
  await page.keyboard.press('PageDown');
  await expect(page.locator('#period-title')).toContainText('Tammuz');
  await page.keyboard.press('Shift+PageDown');
  await expect(page.locator('#period-title')).toContainText('5787');
  await page.keyboard.press('w');
  await expect(page.locator('[data-view="timeGridWeek"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('m');
  await page.keyboard.press('c');
  await expect(page.locator('#event-dialog')).toBeVisible();
  await page.locator('[name="title"]').fill('testing');
  const date = await page.locator('[name="jump"]').inputValue();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('t');
  await expect(page.locator('[name="jump"]')).toHaveValue(date);
  await page.keyboard.press('Escape');
  await page.locator('#settings').click();
  await page.locator('[name="language"]').selectOption('he');
  await page.locator('#settings-form [type="submit"]').click();
  await page.locator('[name="jump"]').fill('2026-05-02');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('.day-select[data-date="2026-05-02"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[name="jump"]')).toHaveValue('2026-05-03');
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'קיצורי מקלדת' })).toBeVisible();
});

test('desktop bridge updates tray language at startup and after settings change', async ({ page }) => {
  await page.addInitScript(() => {
    const bridge = window as unknown as { isTauri: boolean; __TAURI_INTERNALS__: unknown; trayLanguages: string[] };
    bridge.isTauri = true;
    bridge.trayLanguages = [];
    bridge.__TAURI_INTERNALS__ = { invoke: async (command: string, args: { language?: string }) => {
      if (command === 'set_tray_language') bridge.trayLanguages.push(args.language!);
      return null;
    } };
  });
  await page.goto('/');
  const languages = () => page.evaluate(() => (window as unknown as { trayLanguages: string[] }).trayLanguages);
  await expect.poll(languages).toEqual(['en']);
  await page.locator('#settings').click();
  await page.locator('[name="language"]').selectOption('he');
  await page.locator('#settings-form [type="submit"]').click();
  await expect.poll(languages).toEqual(['en', 'he']);
  await page.locator('#next').click();
  expect(await languages()).toEqual(['en', 'he']);
});

test('quick event form reveals optional settings and keeps a single-day date in sync', async ({ page }) => {
  await page.goto('/');
  await page.locator('#add-event').click();
  const form = page.locator('#event-form');
  await expect(form.locator('[name="title"]')).toBeFocused();
  await expect(form.locator('[name="kind"]')).toHaveCount(0);
  for (const name of ['description', 'recurrence', 'reminder', 'endDate', 'startTime', 'startDate']) {
    await expect(form.locator(`[name="${name}"]`)).not.toBeVisible();
  }
  await form.locator('[name="calendar"]').selectOption('gregorian');
  await expect(form.locator('#hebrew-entry')).not.toBeVisible();
  await form.locator('[name="startDate"]').fill('2026-12-01');
  await form.locator('[name="title"]').fill('Quick plan');
  await form.locator('[type="submit"]').click();
  await expect(page.locator('#event-dialog')).not.toBeVisible();
  await page.locator('[name="jump"]').fill('2026-12-01');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('.event-row').click();
  await expect(form.locator('[name="startDate"]')).toHaveValue('2026-12-01');
  await expect(form.locator('[name="endDate"]')).toHaveValue('2026-12-01');
  await expect(form.locator('[name="multiDay"]')).not.toBeChecked();
});

test('Hebrew yearly event keeps its end of recurrence, rules and notes when edited', async ({ page }) => {
  await page.goto('/');
  await page.locator('[name="jump"]').fill('2026-11-04');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('#add-event').click();
  const form = page.locator('#event-form');
  await form.locator('[name="title"]').fill('Yearly Hebrew event');
  await form.locator('#event-repeat > summary').click();
  await expect(form.locator('[name="until"]')).not.toBeVisible();
  await form.locator('[name="recurrence"]').selectOption('yearly');
  await form.locator('[name="until"]').fill('2036-11-04');
  await form.locator('#hebrew-policies > summary').click();
  await form.locator('[name="missingDay"]').selectOption('skip');
  await form.locator('[name="adar"]').selectOption('both');
  await form.locator('#event-notes > summary').click();
  await form.locator('[name="description"]').fill('Remember this for ten years.');
  await form.locator('#event-repeat > summary').click();
  await form.locator('[type="submit"]').click();
  await expect(page.locator('#event-dialog')).not.toBeVisible();
  await page.reload();
  await page.locator('[name="jump"]').fill('2026-11-04');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('.event-row').click();
  await expect(form.locator('[name="recurrence"]')).toBeVisible();
  await expect(form.locator('[name="recurrence"]')).toHaveValue('yearly');
  await expect(form.locator('[name="until"]')).toHaveValue('2036-11-04');
  await expect(form.locator('[name="missingDay"]')).toHaveValue('skip');
  await expect(form.locator('[name="adar"]')).toHaveValue('both');
  await expect(form.locator('[name="description"]')).toBeVisible();
  await expect(form.locator('[name="description"]')).toHaveValue('Remember this for ten years.');
});

test('overnight event preserves its date range and reminder; invalid collapsed repeat field reopens', async ({ page }) => {
  await page.goto('/');
  await page.locator('[name="jump"]').fill('2026-11-04');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('#add-event').click();
  const form = page.locator('#event-form');
  await form.locator('[name="title"]').fill('Overnight plan');
  await form.locator('[name="allDay"]').uncheck();
  await form.locator('[name="multiDay"]').check();
  await form.locator('[name="endDate"]').fill('2026-11-05');
  await form.locator('[name="startTime"]').fill('23:00');
  await form.locator('[name="endTime"]').fill('01:00');
  await form.locator('#event-repeat > summary').click();
  await form.locator('[name="recurrence"]').selectOption('weekly');
  await form.locator('[name="until"]').fill('2300-01-01');
  await form.locator('#event-repeat > summary').click();
  await form.locator('[type="submit"]').click();
  await expect(form.locator('[name="until"]')).toBeVisible();
  await form.locator('[name="until"]').fill('2027-11-04');
  await form.locator('#event-reminder > summary').click();
  await form.locator('[name="reminder"]').selectOption('15');
  await form.locator('[type="submit"]').click();
  await expect(page.locator('#event-dialog')).not.toBeVisible();
  await page.locator('.event-row').click();
  await expect(form.locator('[name="multiDay"]')).toBeChecked();
  await expect(form.locator('[name="endDate"]')).toHaveValue('2026-11-05');
  await expect(form.locator('[name="startTime"]')).toHaveValue('23:00');
  await expect(form.locator('[name="endTime"]')).toHaveValue('01:00');
  await expect(form.locator('[name="reminder"]')).toBeVisible();
  await expect(form.locator('[name="reminder"]')).toHaveValue('15');
});

test('Hebrew date jump handles leap Adar and rejects missing days', async ({ page }) => {
  await page.goto('/');
  await page.locator('#jump-hebrew').click();
  await page.locator('[name="jumpYear"]').fill('5787');
  await page.locator('[name="jumpMonth"]').selectOption('13');
  await page.locator('[name="jumpDay"]').fill('15');
  await page.locator('#jump-form [type="submit"]').click();
  await expect(page.locator('#period-title')).toContainText('Adar II');
  await expect(page.locator('#day-panel h2')).toContainText('15 Adar II');
  await page.locator('#jump-hebrew').click();
  await page.locator('[name="jumpDay"]').fill('30');
  await page.locator('#jump-form [type="submit"]').click();
  await expect(page.locator('#jump-dialog .form-error')).not.toBeEmpty();
  await expect(page.locator('#jump-dialog')).toBeVisible();
  await page.locator('[name="jumpYear"]').fill('5786');
  await expect(page.locator('[name="jumpMonth"] option[value="13"]')).toHaveCount(0);
});

test('local search finds notes and opens a repeating series for editing', async ({ page }) => {
  await page.goto('/');
  await page.locator('#add-event').click();
  await page.locator('[name="title"]').fill('Family lunch');
  await page.locator('#event-notes summary').click();
  await page.locator('[name="description"]').fill('Bring challah');
  await page.locator('#event-repeat summary').first().click();
  await page.locator('[name="recurrence"]').selectOption('yearly');
  await page.locator('#event-form [type="submit"]').click();
  await page.locator('#search-events').click();
  await expect(page.locator('#event-query')).toBeFocused();
  await page.locator('#event-query').fill('CHALLAH');
  await expect(page.locator('.search-result')).toHaveCount(1);
  await expect(page.locator('.search-result')).toContainText('Repeats');
  await page.locator('.search-result').click();
  await expect(page.locator('[name="title"]')).toHaveValue('Family lunch');
  await expect(page.locator('[name="recurrence"]')).toHaveValue('yearly');
  await page.keyboard.press('Escape');
  await page.locator('#search-events').click();
  await page.locator('#event-query').fill('no such event');
  await expect(page.locator('#search-count')).toHaveText('No matching events.');
});

test('grouped zmanim search reveals alternatives and preserves them after save', async ({ page }) => {
  await page.goto('/');
  await page.locator('#configure-zmanim').click();
  await expect(page.locator('.zman-group')).toHaveCount(8);
  await expect(page.locator('[name="zman"][value="getAlos120"]')).not.toBeVisible();
  await page.locator('#zman-search').fill('Alos120');
  await expect(page.locator('[name="zman"][value="getAlos120"]')).toBeVisible();
  await page.locator('[name="zman"][value="getAlos120"]').check();
  await page.locator('#zman-search').fill('no matching formula');
  await expect(page.locator('#zman-empty')).toBeVisible();
  await page.locator('#zman-search').fill('');
  await expect(page.locator('[name="endMethod"] option[value="getSunrise"]')).toHaveCount(0);
  await page.locator('#settings-form [type="submit"]').click();
  await page.locator('#configure-zmanim').click();
  await expect(page.locator('[name="zman"][value="getAlos120"]')).toBeVisible();
  await expect(page.locator('[name="zman"][value="getAlos120"]')).toBeChecked();
  await page.locator('#reset-zmanim').click();
  await expect(page.locator('[name="zman"][value="getAlos120"]')).not.toBeChecked();
});

test('keyboard selection keeps its date visible in a small calendar', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/');
  await page.locator('[name="jump"]').fill('2026-09-26');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('.day-select[data-date="2026-09-26"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.day-select[data-date="2026-10-03"]')).toBeFocused();
  await expect(page.locator('.day-select[data-date="2026-10-03"]')).toBeInViewport();
});

test('whole day tiles highlight on hover and focus, and double click opens that date', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('.calendar-day[data-date]').filter({ has: page.locator('.day-select') }).nth(10);
  const date = await tile.getAttribute('data-date');
  const before = await tile.evaluate(el => getComputedStyle(el).backgroundColor);
  await tile.hover({ position: { x: 5, y: 50 } });
  expect(await tile.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(before);
  await tile.locator('.day-select').focus();
  await expect(tile).toHaveCSS('outline-style', 'solid');
  await tile.dblclick({ position: { x: 5, y: 50 } });
  await expect(page.locator('#event-dialog')).toBeVisible();
  await page.locator('#event-form [name="calendar"]').selectOption('gregorian');
  await expect(page.locator('#event-form [name="startDate"]')).toHaveValue(date!);
});

test('mouse drag and edge resize persist calendar event dates', async ({ page }) => {
  await page.goto('/');
  await page.locator('[name="jump"]').fill('2026-11-04');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('#add-event').click();
  await page.locator('[name="title"]').fill('Drag plan');
  await page.locator('#event-form [type="submit"]').click();
  const event = page.locator('#calendar [role="listitem"] [role="button"]').filter({ hasText: 'Drag plan' });
  const start = await event.boundingBox();
  const source = await page.locator('.calendar-day[data-date="2026-11-04"]').boundingBox();
  const target = await page.locator('.calendar-day[data-date="2026-11-05"]').boundingBox();
  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
  await page.mouse.down();
  await page.mouse.move(start!.x + start!.width / 2 + target!.x - source!.x, start!.y + start!.height / 2, { steps: 15 });
  await page.mouse.up();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('luach-plus-v1')!).events[0]);
  await expect.poll(async () => (await saved()).startDate).toBe('2026-11-05');
  const box = await event.boundingBox();
  await page.mouse.move(box!.x + box!.width - 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width - 2 + target!.width, box!.y + box!.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect.poll(async () => (await saved()).endDate).toBe('2026-11-06');
  await page.reload();
  expect((await saved()).startDate).toBe('2026-11-05');
  expect((await saved()).endDate).toBe('2026-11-06');
});

test('day events remain visible beside long independently scrolling times', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.locator('#configure-zmanim').click();
  await page.locator('[name="zman"]').evaluateAll(inputs => inputs.forEach(input => (input as HTMLInputElement).checked = true));
  await page.locator('#settings-form [type="submit"]').click();
  await page.locator('#add-event').click();
  await page.locator('[name="title"]').fill('Visible appointment');
  await page.locator('#event-form [type="submit"]').click();
  await expect(page.locator('.event-row')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.panel-location')).toBeInViewport({ ratio: 1 });
  const eventsTop = await page.locator('.panel-events').evaluate(el => el.getBoundingClientRect().top);
  await page.locator('.times-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect(await page.locator('.panel-events').evaluate(el => el.getBoundingClientRect().top)).toBe(eventsTop);
  await expect(page.locator('.event-row')).toBeInViewport({ ratio: 1 });
  for (const width of [700, 390]) {
    await page.setViewportSize({ width, height: 720 });
    await expect(page.locator('.event-row')).toBeInViewport({ ratio: 1 });
  }
});
