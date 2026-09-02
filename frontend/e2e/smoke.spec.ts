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

  test('continue locally opens dashboard without returning to login', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Продолжить локально' }).click()
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Сегодня' })).toBeVisible()

    await page.getByRole('link', { name: 'Неделя' }).click()
    await expect(page).toHaveURL(/\/week/)
    await expect(page.locator('h1')).toBeVisible()

    await page.getByRole('button', { name: 'Ещё' }).click()
    await page.getByRole('link', { name: 'Планы' }).click()
    await expect(page).toHaveURL(/\/plans/)
    await expect(page.getByRole('heading', { name: 'Планы' })).toBeVisible()

    await page.getByRole('link', { name: 'Упражнения' }).click()
    await expect(page).toHaveURL(/\/exercises/)
    await expect(page.getByRole('heading', { name: 'Упражнения' })).toBeVisible()
    await expect(page.getByText('Пока нет упражнений.')).toBeVisible()

    await page.getByRole('button', { name: 'Новое упражнение' }).click()
    await page.getByPlaceholder('Название').fill('Приседания e2e')
    await page.getByRole('button', { name: 'Создать' }).click()
    await expect(page.getByText('Приседания e2e')).toBeVisible()

    await page.reload()
    await expect(page).toHaveURL(/\/exercises/)
    await expect(page.getByText('Приседания e2e')).toBeVisible()
  })
})
