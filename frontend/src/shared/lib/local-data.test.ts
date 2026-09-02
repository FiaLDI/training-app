import { localData } from '@/shared/lib/local-data'
import { setStorageScope } from '@/shared/lib/storage-scope'

function seedTemplate() {
  const template = localData.templates.create({ id: 'tpl-1', name: 'PPL' })
  localData.templates.addExercise(template.id, {
    id: 'tex-a',
    exerciseId: 'ex-a',
    exerciseOrder: 0,
    targetSets: 3,
  })
  localData.templates.addExercise(template.id, {
    id: 'tex-b',
    exerciseId: 'ex-b',
    exerciseOrder: 1,
    targetSets: 3,
  })
  return template
}

describe('localData trainings groups and copies', () => {
  beforeEach(() => {
    localStorage.clear()
    setStorageScope('local')
  })

  it('does not copy template exercises twice into the same training', () => {
    seedTemplate()
    const training = localData.trainings.create({
      id: 'tr-1',
      templateId: 'tpl-1',
      status: 'planned',
      scheduledAt: '2026-08-31T12:00:00.000Z',
    })

    const first = localData.trainings.get(training.id)
    expect(first?.exercises).toHaveLength(2)

    const template = localData.templates.get('tpl-1')
    expect(template).not.toBeNull()
    localData.trainings.hydrateFromTemplate(training.id, template!)

    expect(localData.trainings.get(training.id)?.exercises).toHaveLength(2)
  })

  it('ungroups members when a group is deleted', () => {
    const training = localData.trainings.create({
      id: 'tr-2',
      status: 'in_progress',
      startedAt: '2026-08-31T12:00:00.000Z',
    })
    localData.trainings.addExercise(training.id, {
      id: 'row-a',
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })
    localData.trainings.addExercise(training.id, {
      id: 'row-b',
      exerciseId: 'ex-b',
      exerciseOrder: 1,
      targetSets: 3,
    })
    const group = localData.trainings.createGroup(training.id, {
      id: 'g-1',
      exerciseIds: ['row-a', 'row-b'],
      restSeconds: 90,
    })
    expect(group).not.toBeNull()
    expect(localData.trainings.get(training.id)?.exercises.every((item) => item.groupId === 'g-1')).toBe(
      true,
    )

    localData.trainings.deleteGroup('g-1')
    const after = localData.trainings.get(training.id)
    expect(after?.groups).toHaveLength(0)
    expect(after?.exercises.every((item) => item.groupId == null)).toBe(true)
  })

  it('rebinds an exercise id and moves its sets', () => {
    const training = localData.trainings.create({
      id: 'tr-3',
      status: 'planned',
      scheduledAt: '2026-08-31T12:00:00.000Z',
    })
    localData.trainings.addExercise(training.id, {
      id: 'local-row',
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })
    localData.trainings.addSet('local-row', { id: 'set-1', setNumber: 1, reps: 8 })

    localData.trainings.rebindExerciseId('local-row', 'remote-row')

    const after = localData.trainings.get(training.id)
    expect(after?.exercises.map((item) => item.id)).toEqual(['remote-row'])
    expect(after?.exercises[0].sets.map((item) => item.trainingExerciseId)).toEqual(['remote-row'])
  })

  it('replaceDetails drops local exercises that are not in the snapshot', () => {
    const training = localData.trainings.create({
      id: 'tr-4',
      status: 'planned',
      scheduledAt: '2026-08-31T12:00:00.000Z',
    })
    localData.trainings.addExercise(training.id, {
      id: 'local-only',
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })
    localData.trainings.addExercise(training.id, {
      id: 'keep',
      exerciseId: 'ex-b',
      exerciseOrder: 1,
      targetSets: 3,
    })

    const snapshot = localData.trainings.get(training.id)!
    localData.trainings.replaceDetails({
      ...snapshot,
      exercises: snapshot.exercises.filter((item) => item.id === 'keep'),
      groups: [],
    })

    expect(localData.trainings.get(training.id)?.exercises.map((item) => item.id)).toEqual(['keep'])
  })

  it('keeps templateId without copying plan rows when skipTemplateCopy is set', () => {
    seedTemplate()
    localData.trainings.create(
      {
        id: 'tr-import',
        templateId: 'tpl-1',
        status: 'finished',
        startedAt: '2026-08-31T12:00:00.000Z',
        finishedAt: '2026-08-31T13:00:00.000Z',
      },
      { skipTemplateCopy: true },
    )
    localData.trainings.addExercise('tr-import', {
      id: 'imported-row',
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })

    const after = localData.trainings.get('tr-import')
    expect(after?.templateId).toBe('tpl-1')
    expect(after?.exercises.map((item) => item.id)).toEqual(['imported-row'])
  })
})
