import { fireEvent, render, screen } from '@testing-library/react'

import { ExerciseImage } from './exercise-image'

describe('ExerciseImage', () => {
  it('falls back to the original url when the thumb fails', () => {
    const onUnavailable = vi.fn()
    render(
      <ExerciseImage
        src="/upload/abc.jpg"
        thumbUrl="/upload/abc-thumb.webp"
        alt="Жим"
        sizes="100vw"
        onUnavailable={onUnavailable}
      />,
    )

    const img = screen.getByAltText('Жим')
    expect(img).toHaveAttribute('src', '/upload/abc-thumb.webp')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')

    fireEvent.error(img)
    expect(screen.getByAltText('Жим')).toHaveAttribute('src', '/upload/abc.jpg')
    expect(onUnavailable).not.toHaveBeenCalled()

    fireEvent.error(screen.getByAltText('Жим'))
    expect(onUnavailable).toHaveBeenCalledTimes(1)
    expect(screen.queryByAltText('Жим')).not.toBeInTheDocument()
  })
})
