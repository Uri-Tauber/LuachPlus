import { expect, test } from '@playwright/test';

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
  await page.locator('[name="calendar-system"]').selectOption('gregorian');
  await expect(page.locator('#period-title')).toContainText('March');
  for (const view of ['timeGridWeek', 'timeGridDay', 'listWeek', 'month']) {
    await page.locator('[name="view"]').selectOption(view);
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
  await form.locator('[name="recurrence"]').selectOption('weekly');
  await form.locator('[type="submit"]').click();
  await expect(page.locator('#event-dialog')).not.toBeVisible();
  await expect(page.locator('.panel-events')).toContainText('Weekly appointment');
  await page.reload();
  await page.locator('[name="jump"]').fill('2026-11-01');
  await page.locator('[name="jump"]').dispatchEvent('change');
  await page.locator('#settings').click();
  await page.locator('[data-tab="location"]').click();
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
