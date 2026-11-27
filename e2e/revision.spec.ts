import { expect, test } from '@playwright/test';

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

test('TEST-S2-R02/R03/R04/R06: owner revises a goal, sees history, and keeps daily records', async ({ page }) => {
  const recordDate = bangkokDate(-1);
  const beforeStartDate = bangkokDate(-2);
  const endDate = bangkokDate(1);
  const goal = {
    id: '00000000-0000-4000-8000-000000000001',
    template_id: '00000000-0000-4000-8000-000000000002',
    target: 100,
    start_date: recordDate,
    end_date: recordDate,
    version: 1,
  };
  const records = [{
    id: '00000000-0000-4000-8000-000000000003',
    activity_date: recordDate,
    quantity: 25,
  }];
  const revisions = [{
    id: '00000000-0000-4000-8000-000000000004',
    goal_id: goal.id,
    version_number: 1,
    target: goal.target,
    end_date: goal.end_date,
    effective_date: goal.start_date,
  }];
  let submittedRevision: Record<string, unknown> | undefined;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/auth/me') {
      await route.fulfill({ json: { user: { id: 'alice', email: 'alice@example.com', role: 'participant' } } });
    } else if (url.pathname === '/api/auth/logout') {
      await route.fulfill({ status: 204, body: '' });
    } else if (url.pathname === '/api/activity-templates') {
      await route.fulfill({ json: { templates: [{ id: goal.template_id, name: 'Reading', unit: 'pages', min_value: 1, max_value: 100, is_active: true }] } });
    } else if (url.pathname === '/api/goals' && request.method() === 'GET') {
      await route.fulfill({ json: { goals: [goal] } });
    } else if (url.pathname === `/api/goals/${goal.id}/summary`) {
      await route.fulfill({
        json: {
          goal,
          summary: { total_recorded: 25, percent: 25, streak_days: 1 },
          records,
          revisions,
        },
      });
    } else if (url.pathname === `/api/goals/${goal.id}/revisions` && request.method() === 'POST') {
      submittedRevision = request.postDataJSON() as Record<string, unknown>;
      goal.target = Number(submittedRevision.target);
      goal.end_date = String(submittedRevision.end_date);
      goal.version += 1;
      revisions.push({
        id: '00000000-0000-4000-8000-000000000005',
        goal_id: goal.id,
        version_number: goal.version,
        target: goal.target,
        end_date: goal.end_date,
        effective_date: bangkokDate(0),
      });
      await route.fulfill({ status: 201, json: { goal, revision: revisions.at(-1) } });
    } else {
      await route.fulfill({ status: 404, json: { error: { message: 'Unexpected API request.' } } });
    }
  });

  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Record activity' }).click();

  await page.getByRole('button', { name: 'Revise goal' }).click();
  const target = page.getByLabel('New target');
  const revisedEndDate = page.getByLabel('New end date');
  await target.fill('0');
  await expect(page.getByText('Target must be greater than zero.')).toBeVisible();
  await revisedEndDate.fill(beforeStartDate);
  await expect(page.getByText('End date cannot be earlier than the start date.')).toBeVisible();

  await target.fill('200');
  await revisedEndDate.fill(endDate);
  await page.getByRole('button', { name: 'Save revision' }).click();
  await expect(page.getByText('Goal revision saved.')).toBeVisible();
  await expect(page.getByText('Version 2')).toBeVisible();
  await expect(page.getByText('200', { exact: true })).toBeVisible();
  expect(submittedRevision).toEqual({ target: 200, end_date: endDate });
  await expect(page.getByRole('table', { name: 'Revision history' })).toContainText('Version 1');
  await expect(page.getByRole('table', { name: 'Revision history' })).toContainText('Version 2');
  await expect(page.getByRole('table', { name: 'Activity history' })).toContainText(recordDate);

  await page.reload();
  await expect(page.getByText('Version 2')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Revision history' })).toContainText('Version 2');
  await expect(page.getByRole('table', { name: 'Activity history' })).toContainText(recordDate);
});
