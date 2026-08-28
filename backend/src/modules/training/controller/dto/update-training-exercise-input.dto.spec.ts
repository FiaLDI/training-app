import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { UpdateTrainingExerciseInputDto } from './update-training-exercise-input.dto'

/** Mirrors Nest ValidationPipe: whitelist + forbidNonWhitelisted (sync contract). */
async function validateSyncPayload(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdateTrainingExerciseInputDto, payload)
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true })
}

describe('UpdateTrainingExerciseInputDto (sync whitelist)', () => {
  it('accepts allowed exercise update fields', async () => {
    const errors = await validateSyncPayload({
      exerciseOrder: 1,
      targetSets: 3,
      isWarmup: false,
      minReps: 8,
      maxReps: 12,
      maxWeight: 100,
      previousMaxWeight: 95,
      restSeconds: 90,
      notes: 'felt good',
      metadata: { dropGroupId: 'drop-1' },
    })

    expect(errors).toHaveLength(0)
  })

  it('rejects group membership fields — groups sync via dedicated endpoints', async () => {
    const errors = await validateSyncPayload({
      exerciseOrder: 1,
      groupId: 'group-1',
    })

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((error) => error.property === 'groupId')).toBe(true)
  })

  it('rejects positionInGroup', async () => {
    const errors = await validateSyncPayload({
      targetSets: 3,
      positionInGroup: 2,
    })

    expect(errors.some((error) => error.property === 'positionInGroup')).toBe(true)
  })
})
