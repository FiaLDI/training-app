import { isNewsSection, isNewsSections } from './is-news-sections'

describe('isNewsSections', () => {
  it('accepts a paragraphs section and a list section', () => {
    expect(
      isNewsSections([
        {
          type: 'paragraphs',
          heading: 'Журнал',
          paragraphs: ['Сегодня и Неделя.'],
        },
        {
          type: 'list',
          heading: 'Планы',
          items: ['Шаблоны', 'Каталог'],
        },
      ]),
    ).toBe(true)
  })

  it('rejects an empty array', () => {
    expect(isNewsSections([])).toBe(false)
  })

  it('rejects a section without heading', () => {
    expect(
      isNewsSection({
        type: 'paragraphs',
        heading: '  ',
        paragraphs: ['Текст'],
      }),
    ).toBe(false)
  })

  it('rejects unknown section type', () => {
    expect(
      isNewsSection({
        type: 'quote',
        heading: 'Заголовок',
        paragraphs: ['Текст'],
      }),
    ).toBe(false)
  })
})
