import { emptyNewsSection, prepareNewsSections } from './news-form'

describe('prepareNewsSections', () => {
  it('drops empty headings and blank lines', () => {
    expect(
      prepareNewsSections([
        { type: 'paragraphs', heading: '  Журнал  ', paragraphs: ['  Сегодня.  ', ''] },
        { type: 'list', heading: '', items: ['не должно попасть'] },
        emptyNewsSection(),
      ]),
    ).toEqual([
      { type: 'paragraphs', heading: 'Журнал', paragraphs: ['Сегодня.'] },
    ])
  })

  it('returns null when nothing remains', () => {
    expect(prepareNewsSections([emptyNewsSection()])).toBeNull()
  })
})
