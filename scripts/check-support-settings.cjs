const { chromium, expect } = require('@playwright/test');
const base = process.argv[2] || 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByTitle('Business reputation — all settings in one place', { exact: true }).click();
    const nav = page.getByRole('navigation', { name: 'Business reputation sections' });
    expect((await nav.getByRole('button').allTextContents()).map(value => value.trim())).toEqual(['Protection & Settings', 'Reviews', 'Reminders', 'Queue']);
    await expect(nav.getByRole('button', { name: 'Protection & Settings', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Customer support contacts' })).toBeVisible();
    await expect(page.getByLabel('Support email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Support chat URL', { exact: true })).toBeVisible();
    console.log('PASS: Protection & Settings is first and contains shared support email/chat URL');

    const emailHelp = page.getByRole('button', { name: 'Help: Support email' });
    await emailHelp.hover();
    await expect(page.getByRole('tooltip')).toContainText('email address used by the Email customer support button');
    await page.mouse.move(1, 1);
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await emailHelp.focus();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await emailHelp.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await emailHelp.click();
    await expect(page.getByRole('tooltip')).toBeVisible();
    console.log('PASS: ? tooltip works on hover, keyboard focus, Escape, and click');

    await nav.getByRole('button', { name: 'Reviews', exact: true }).click();
    await page.getByRole('radio', { name: 'Neutral', exact: true }).click();
    await expect(page.getByLabel('Support email', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Support chat URL', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Support after submission' })).toBeVisible();
    const emailSwitch = page.getByRole('switch', { name: 'Offer to email customer support' });
    const chatSwitch = page.getByRole('switch', { name: 'Offer to chat with customer support' });
    const enable = async (button, desired) => {
      if ((await button.getAttribute('aria-checked')) !== String(desired)) await button.click();
      await expect(button).toHaveAttribute('aria-checked', String(desired));
    };
    await enable(emailSwitch, false);
    await enable(chatSwitch, false);
    await expect(page.getByLabel('Support message', { exact: true })).toHaveCount(0);
    await enable(emailSwitch, true);
    await expect(page.getByLabel('Support message', { exact: true })).toHaveCount(0);
    await enable(chatSwitch, true);
    await expect(page.getByLabel('Support message', { exact: true })).toBeVisible();
    await enable(emailSwitch, false);
    await expect(page.getByLabel('Support message', { exact: true })).toHaveCount(0);
    await enable(chatSwitch, false);
    await expect(page.getByLabel('Support message', { exact: true })).toHaveCount(0);
    console.log('PASS: message appears only when both email and chat support are enabled');

    await page.getByRole('button', { name: /Configure support email and chat URL/ }).click();
    await expect(nav.getByRole('button', { name: 'Protection & Settings', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#rep-support-contacts')).toBeInViewport();
    await page.getByLabel('Support email', { exact: true }).fill('support@example.com');
    await page.getByLabel('Support chat URL', { exact: true }).fill('https://wa.me/15550101010');
    await nav.getByRole('button', { name: 'Reviews', exact: true }).click();
    await page.getByRole('radio', { name: 'Neutral', exact: true }).click();
    await enable(page.getByRole('switch', { name: 'Offer to email customer support' }), true);
    await enable(page.getByRole('switch', { name: 'Offer to chat with customer support' }), true);
    await page.locator('.reputation-ref .rep-top').getByRole('button', { name: 'Widget preview' }).click();
    const drawer = page.getByRole('dialog', { name: 'Widget preview', exact: true });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('tab', { name: 'After submission' }).click();
    await drawer.getByRole('button', { name: 'neutral', exact: true }).click();
    await expect(drawer.getByText('Email customer support', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Chat with support', { exact: true })).toBeVisible();
    await expect(drawer.getByText(/contact details are missing/i)).toHaveCount(0);
    await drawer.getByRole('button', { name: 'Close widget preview' }).click();
    console.log('PASS: category shortcut lands on contact settings; draft contacts affect live preview without saving');

    await nav.getByRole('button', { name: 'Reminders', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Review invitations', exact: true })).toHaveCount(0);
    await nav.getByRole('button', { name: 'Queue', exact: true }).click();
    await expect(page.getByRole('switch', { name: 'Shuffle within each category' })).toHaveCount(0);
    await expect(page.getByRole('switch', { name: 'Peak-hour priority' })).toHaveCount(0);
    await nav.getByRole('button', { name: 'Reviews', exact: true }).click();
    await page.getByRole('radio', { name: 'Negative', exact: true }).click();
    await expect(page.getByRole('switch', { name: 'Hide the comment until a reply' })).toHaveCount(0);
    console.log('PASS: removed controls are absent from reminders, queue, and negative reviews');
    expect(errors).toEqual([]);
    console.log('PASS: no browser errors; project settings were not saved or modified');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
