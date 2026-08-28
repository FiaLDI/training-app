import { formatPendingSummary } from './pending-summary'

describe('formatPendingSummary', () => {
  it('formats Russian plural strings for pending entities', () => {
    expect(
      formatPendingSummary({ trainings: 0, templates: 0, exercises: 0, total: 0 }),
    ).toBe('')

    expect(
      formatPendingSummary({ trainings: 1, templates: 1, exercises: 1, total: 3 }),
    ).toBe('1 план, 1 тренировка, 1 упражнение')

    expect(
      formatPendingSummary({ trainings: 2, templates: 3, exercises: 5, total: 10 }),
    ).toBe('3 планов, 2 тренировок, 5 упражнений')
  })
})
