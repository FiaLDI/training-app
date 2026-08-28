# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> app shell >> primary tab navigation updates route and page title
- Location: e2e\smoke.spec.ts:14:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/week" until "load"
  navigated to "http://127.0.0.1:3001/login"
  navigated to "http://127.0.0.1:3001/login"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - button "Open Next.js Dev Tools" [ref=f1e7] [cursor=pointer]
  - alert [ref=f1e11]
  - generic [ref=f1e13]:
    - paragraph [ref=f1e14]: IronLog
    - paragraph [ref=f1e15]: Локальный режим без аккаунта или облачная синхронизация с постоянным кодом.
    - generic [ref=f1e16]:
      - button "Продолжить локально" [ref=f1e17]
      - button "Войти по коду" [ref=f1e18]
      - button "Зарегистрироваться по email" [ref=f1e19]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | test.describe('app shell', () => {
  4  |   test('login page is reachable', async ({ page }) => {
  5  |     await page.goto('/login')
  6  |     await expect(page.getByText('Продолжить локально')).toBeVisible()
  7  |   })
  8  | 
  9  |   test('offline fallback page loads', async ({ page }) => {
  10 |     await page.goto('/~offline')
  11 |     await expect(page.getByText('Нет сети')).toBeVisible()
  12 |   })
  13 | 
  14 |   test('primary tab navigation updates route and page title', async ({ page }) => {
  15 |     await page.goto('/login')
  16 |     await page.getByRole('button', { name: 'Продолжить локально' }).click()
  17 |     await page.waitForURL('/')
  18 |     await expect(page.getByRole('heading', { level: 1, name: 'Сегодня' })).toBeVisible({
  19 |       timeout: 15_000,
  20 |     })
  21 | 
  22 |     await Promise.all([
> 23 |       page.waitForURL('/week'),
     |            ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  24 |       page.locator('aside a[href="/week"]').click(),
  25 |     ])
  26 |     await expect(page.getByRole('heading', { level: 1, name: 'Текущая неделя' })).toBeVisible()
  27 | 
  28 |     await Promise.all([
  29 |       page.waitForURL('/stats'),
  30 |       page.locator('aside a[href="/stats"]').click(),
  31 |     ])
  32 |     await expect(page.getByRole('heading', { level: 1, name: 'Статистика' })).toBeVisible()
  33 |   })
  34 | })
  35 | 
```