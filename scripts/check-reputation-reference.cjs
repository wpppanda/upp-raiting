const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const base = process.argv[2] || 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1175, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const initialResponse = await context.request.get(`${base}/api/project`);
  expect(initialResponse.ok()).toBeTruthy();
  const original = (await initialResponse.json()).project;
  let restoreRequired = false;
  fs.mkdirSync('.validation', { recursive: true });
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByTitle('Business reputation — all settings in one place', { exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    const nav = page.getByRole('navigation', { name: 'Business reputation sections' });
    expect(await nav.getByRole('button').allTextContents()).toEqual(['Reviews', 'Reminders', 'Queue', 'Protection']);
    await expect(nav.getByRole('button', { name: 'Reviews', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('button', { name: /Positive|Neutral|Negative|Replies|Rating scale/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Reviews', exact: true })).toBeVisible();
    await expect(page.locator('.rep-sheet')).toHaveCount(1);
    await expect(page.locator('.rep-sheet section.card')).toHaveCount(0);
    expect(await page.locator('.rep-sheet').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Montserrat');
    expect(await page.locator('.rep-sheet').evaluate(el => getComputedStyle(el).boxShadow)).toBe('none');
    expect(await page.locator('.rep-sheet').evaluate(el => getComputedStyle(el).borderRadius)).toBe('7px');
    expect(await nav.getByRole('button', { name: 'Reviews', exact: true }).evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(215, 232, 255)');
    await page.screenshot({ path: '.validation/reference-reviews.png' });
    console.log('PASS: four-row menu, single Reviews item, locally hosted Montserrat, flat reference panel');

    for (const kind of ['Neutral', 'Negative', 'Positive']) {
      await page.getByRole('radio', { name: kind, exact: true }).click();
      await expect(page.getByRole('radio', { name: kind, exact: true })).toHaveAttribute('aria-checked', 'true');
      await expect(nav.getByRole('button', { name: 'Reviews', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(page.getByRole('heading', { name: 'Reviews', exact: true })).toBeVisible();
    }
    await page.getByRole('radio', { name: 'Positive', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Neutral', exact: true })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('radio', { name: 'Positive', exact: true }).click();
    const mode = page.getByLabel('Publication mode', { exact: true });
    await mode.selectOption('instant');
    await expect(page.getByLabel('Delay, minutes', { exact: true })).toHaveCount(0);
    await mode.selectOption('delayed');
    await expect(page.getByLabel('Delay, minutes', { exact: true })).toBeVisible();
    expect(await mode.locator('option').allTextContents()).toEqual(['Instantly', 'With a delay', 'Manual approval']);
    await expect(page.locator('.reputation-ref input[type="checkbox"]')).toHaveCount(0);
    const setSwitch = async (locator, value) => {
      if ((await locator.getAttribute('aria-checked')) !== String(value)) await locator.click();
      await expect(locator).toHaveAttribute('aria-checked', String(value));
    };
    await setSwitch(page.getByRole('switch', { name: 'Notify the administrator', exact: true }), false);
    await expect(page.getByText('Notification channel', { exact: true })).toHaveCount(0);
    await setSwitch(page.getByRole('switch', { name: 'Notify the administrator', exact: true }), true);
    await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
    await setSwitch(page.getByRole('switch', { name: 'Enable Email notifications', exact: true }), true);
    await page.getByLabel('Email address', { exact: true }).fill('style-check@example.com');
    await setSwitch(page.getByRole('switch', { name: 'Automatic company reply', exact: true }), false);
    await expect(page.getByLabel('Automatic reply template', { exact: true })).toHaveCount(0);
    await setSwitch(page.getByRole('switch', { name: 'Automatic company reply', exact: true }), true);
    await expect(page.getByLabel('Automatic reply template', { exact: true })).toBeVisible();
    await page.getByLabel('Automatic reply template', { exact: true }).fill('Thank you, {name}, for sharing your feedback.');
    const scoreGroup = page.getByRole('group', { name: 'Positive rating range' });
    await scoreGroup.getByRole('button', { name: /^4 stars/ }).click();
    await page.getByRole('radio', { name: 'Negative', exact: true }).click();
    await page.getByRole('group', { name: 'Negative rating range' }).getByRole('button', { name: /^2 stars/ }).click();
    restoreRequired = true;
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Reputation settings saved.');
    const saved = (await (await context.request.get(`${base}/api/project`)).json()).project;
    expect(saved.positiveThreshold).toBe(4);
    expect(saved.neutralThreshold).toBe(3);
    expect(saved.positiveNotify).toBe(true);
    expect(saved.positiveNotifyChannels.email.value).toBe('style-check@example.com');
    expect(saved.positiveAutoReplyEnabled).toBe(true);
    expect(saved.positiveAutoReplyTemplate).toBe('Thank you, {name}, for sharing your feedback.');
    expect(saved.name).toBe(original.name);
    expect(saved.brandColor).toBe(original.brandColor);
    expect(saved.timezone).toBe(original.timezone);
    console.log('PASS: category cards, keyboard selection, conditional controls, and PostgreSQL persistence');

    await nav.getByRole('button', { name: 'Reminders', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Reminders', exact: true })).toBeVisible();
    const table = page.getByRole('table', { name: 'Reminder schedule', exact: true });
    await expect(table).toBeVisible();
    expect(await table.locator('th').allTextContents()).toEqual(['Number', 'Unit', 'Channel', 'Recipient', 'Message', 'Active', 'Delete']);
    await page.getByRole('button', { name: 'Add reminder', exact: true }).click();
    const row = table.locator('tr[data-reminder-id]').last();
    const addedId = await row.getAttribute('data-reminder-id');
    await row.getByLabel(/delay unit/).selectOption('days');
    await row.getByLabel(/delay amount/).fill('7');
    await expect(row.getByLabel(/delay unit/)).toHaveValue('days');
    await row.getByLabel(/channel/).selectOption('whatsapp');
    await row.getByLabel(/recipient/).fill('+1 555 010 9900');
    await row.getByRole('button', { name: /Edit reminder/ }).click();
    const editor = page.getByRole('dialog', { name: 'Edit reminder message', exact: true });
    await expect(editor).toBeVisible();
    await editor.getByLabel('Message text', { exact: true }).fill('Hello {name}, share your experience: {link}');
    await editor.getByRole('button', { name: 'Save message', exact: true }).click();
    await expect(editor).not.toBeVisible();
    await setSwitch(row.getByRole('switch'), false);
    await page.screenshot({ path: '.validation/reference-reminders.png' });
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
    const reminders = (await (await context.request.get(`${base}/api/project`)).json()).project.reminders;
    const added = reminders.find(item => item.id === addedId);
    expect(added.delayMinutes).toBe(7 * 1440);
    expect(added.channel).toBe('whatsapp');
    expect(added.enabled).toBe(false);
    expect(added.message).toBe('Hello {name}, share your experience: {link}');
    console.log('PASS: reminder table, message drawer, unit choice stays Calendar days, and persistence');

    await nav.getByRole('button', { name: 'Queue', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Publication queue', exact: true })).toBeVisible();
    await expect(page.getByLabel('Maximum per hour', { exact: true })).toBeVisible();
    await nav.getByRole('button', { name: 'Protection', exact: true }).click();
    await expect(page.getByLabel('Blocked words', { exact: true })).toBeVisible();
    await expect(page.getByText(/Brand accent color|Project name|Time zone|CAPTCHA/)).toHaveCount(0);
    await page.locator('.reputation-ref').getByRole('button', { name: 'Preview & insert', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Preview & insert', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close preview and insert', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await nav.getByRole('button', { name: 'Reviews', exact: true }).click();
    await page.getByRole('radio', { name: 'Neutral', exact: true }).click();
    await page.screenshot({ path: '.validation/reference-settings-mobile.png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await expect(page.getByRole('switch', { name: 'Offer to chat with customer support', exact: true })).toBeVisible();
    await nav.getByRole('button', { name: 'Reminders', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add reminder', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    console.log('PASS: all sections and widget preview retained, mobile layout, no runtime errors');

    const many = Array.from({ length: 25 }, (_, i) => ({ ...original.reminders[0], id: `reference-limit-test-${i}`, delayMinutes: 1440, channel: 'email', target: '', message: 'Please share your experience.', enabled: false }));
    const manyResult = await context.request.patch(`${base}/api/project`, { data: { reminders: many } });
    expect(manyResult.ok()).toBeTruthy();
    expect((await manyResult.json()).project.reminders.length).toBe(25);
    console.log('PASS: no fixed 20-reminder limit');
  } catch (error) {
    await page.screenshot({ path: '.validation/reference-failure.png', fullPage: true }).catch(() => {});
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (restoreRequired) {
      const restore = await context.request.patch(`${base}/api/project`, { data: original });
      if (!restore.ok()) { console.error('Unable to restore test settings:', await restore.text()); process.exitCode = 1; }
      else console.log('Restored the original settings. Customer reviews were not changed.');
    }
    await browser.close();
  }
})();
