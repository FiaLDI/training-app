import { newsLoadErrorMessage } from './format'

describe('newsLoadErrorMessage', () => {
  it('explains offline TypeError', () => {
    expect(newsLoadErrorMessage(new TypeError('Failed to fetch'), 'fallback')).toBe(
      'Нет сети, новости недоступны',
    )
  })

  it('uses the error message otherwise', () => {
    expect(newsLoadErrorMessage(new Error('Новость не найдена'), 'fallback')).toBe(
      'Новость не найдена',
    )
  })
})
