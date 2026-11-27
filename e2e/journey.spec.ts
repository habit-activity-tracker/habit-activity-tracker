import dotenv from 'dotenv';
import { expect, test } from '@playwright/test';
dotenv.config();
const password = process.env.SEED_DEMO_PASSWORD || 'replace-with-a-local-demo-password';
const login = async (page: import('@playwright/test').Page, email: string) => { await page.goto('http://127.0.0.1:5173'); await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(password); await page.getByRole('button', { name: 'Sign in' }).click(); };
const bangkokDate = (daysFromToday: number): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(`${values.year}-${values.month}-${values.day}T12:00:00+07:00`);
  date.setDate(date.getDate() + daysFromToday);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
};
test('TEST-06.6: persisted participant journey shows progress, history, and duplicate feedback', async ({ page }) => {
  const recordDate = bangkokDate(-1);
  await login(page, 'pm1@example.com');
  const name = `Journey ${Date.now()}`;
  await page.getByLabel('Name').fill(name); await page.getByLabel('Unit').fill('pages'); await page.getByLabel('Minimum value').fill('0'); await page.getByLabel('Maximum value').fill('100'); await page.getByRole('button', { name: 'Save template' }).click();
  await page.getByRole('button', { name: 'Logout' }).click(); await login(page, 'alice@example.com');
  await page.getByRole('button', { name: new RegExp(name) }).click(); await page.getByLabel('Target').fill('100'); await page.getByLabel('Start date').fill(recordDate); await page.getByLabel('End date').fill(recordDate); await page.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByText('Goal created.')).toBeVisible();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await page.getByLabel('Record daily activity').getByLabel('Activity value').fill('50'); await page.getByLabel('Record daily activity').getByLabel('Record date').fill(recordDate); await page.getByRole('button', { name: 'Save activity' }).click();
  await expect(page.getByLabel('Goal progress')).toContainText('50.0%'); await expect(page.getByRole('table', { name: 'Activity history' })).toContainText(recordDate);
  await page.getByLabel('Activity value').fill('50'); await page.getByRole('button', { name: 'Save activity' }).click(); await expect(page.getByText('A record already exists for this date.')).toBeVisible();
  await page.reload(); await expect(page.getByText('50.0%')).toBeVisible(); await expect(page.getByRole('table', { name: 'Activity history' })).toContainText(recordDate); await page.getByRole('button', { name: 'Logout' }).click();
});
