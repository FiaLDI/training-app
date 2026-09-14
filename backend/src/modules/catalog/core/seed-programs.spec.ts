import { CATALOG_PROGRAM_SEEDS, systemProgramIdForSlug, systemTemplateIdForDay } from './seed-programs'

describe('catalog program seeds', () => {
  it('has unique slugs for the four verified programs', () => {
    const slugs = CATALOG_PROGRAM_SEEDS.map((item) => item.slug)
    expect(slugs.sort()).toEqual(['531', 'ppl', 'starting-strength', 'upper-lower'].sort())
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('assigns stable system program and template ids', () => {
    const ids = CATALOG_PROGRAM_SEEDS.map((item) => systemProgramIdForSlug(item.slug))
    expect(new Set(ids).size).toBe(ids.length)
    expect(systemTemplateIdForDay('ppl', 0)).not.toBe(systemTemplateIdForDay('ppl', 1))
  })

  it('keeps dayOfWeek in 1..7 and non-empty exercises', () => {
    for (const program of CATALOG_PROGRAM_SEEDS) {
      expect(program.snapshot.days.length).toBeGreaterThan(0)
      for (const day of program.snapshot.days) {
        expect(day.dayOfWeek).toBeGreaterThanOrEqual(1)
        expect(day.dayOfWeek).toBeLessThanOrEqual(7)
        expect(day.template?.exercises.length).toBeGreaterThan(0)
      }
    }
  })
})
