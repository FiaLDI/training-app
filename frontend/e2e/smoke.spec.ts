import { expect, test } from '@playwright/test'

test.describe('app shell', () => {
  test('login page is reachable', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Продолжить локально')).toBeVisible()
  })

  test('offline fallback page loads', async ({ page }) => {
    await page.goto('/~offline')
    await expect(page.getByText('Нет сети')).toBeVisible()
  })
})
