import { render, screen } from '@testing-library/react'

import { TrainingStatusBadge } from './training-status-badge'

describe('TrainingStatusBadge', () => {
  it.each([
    ['planned', 'Запланирована'],
    ['in_progress', 'В процессе'],
    ['finished', 'Завершена'],
    ['cancelled', 'Отменена'],
  ] as const)('renders %s as %s', (status, label) => {
    render(<TrainingStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
