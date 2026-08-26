import 'reflect-metadata'

import { readFileSync } from 'fs'
import { resolve } from 'path'

import dataSource from '../../data-source'
import { ExerciseEntity } from '../modules/exercise/core/entity/exercise.entity'

type SeedExercise = {
  id: string
  name: string
  description: string | null
  muscleGroup: string | null
  difficulty: string | null
  metadata?: Record<string, unknown>
}

type SeedFile = {
  items: SeedExercise[]
}

/** Compare muscle groups ignoring order / whitespace. */
function normalizeMuscleGroup(value: string | null | undefined): string | null {
  if (value == null || value.trim() === '') return null
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'ru'))
  return parts.length > 0 ? parts.join(',') : null
}

function loadSeed(): SeedExercise[] {
  const path = resolve(__dirname, 'exercises.json')
  const raw = JSON.parse(readFileSync(path, 'utf8')) as SeedFile
  if (!Array.isArray(raw.items)) {
    throw new Error(`Invalid seed file: ${path}`)
  }
  return raw.items
}

async function seedExercises() {
  const items = loadSeed()
  await dataSource.initialize()

  const repo = dataSource.getRepository(ExerciseEntity)
  let created = 0
  let updated = 0
  let skipped = 0

  try {
    for (const seed of items) {
      const existing = await repo.findOne({ where: { id: seed.id } })

      if (!existing) {
        await repo.save(
          repo.create({
            id: seed.id,
            name: seed.name.trim(),
            description: seed.description,
            muscleGroup: seed.muscleGroup,
            difficulty: seed.difficulty,
            metadata: seed.metadata ?? {},
          }),
        )
        created += 1
        console.log(`created  ${seed.name}`)
        continue
      }

      const beforeNorm = normalizeMuscleGroup(existing.muscleGroup)
      const afterNorm = normalizeMuscleGroup(seed.muscleGroup)

      if (beforeNorm === afterNorm) {
        skipped += 1
        console.log(`skip     ${seed.name} (muscleGroup ok)`)
        continue
      }

      const beforeRaw = existing.muscleGroup
      existing.muscleGroup = seed.muscleGroup
      await repo.save(existing)
      updated += 1
      console.log(
        `updated  ${seed.name}: "${beforeRaw ?? ''}" → "${seed.muscleGroup ?? ''}"`,
      )
    }

    console.log(
      `\nDone. created=${created} updated=${updated} skipped=${skipped} total=${items.length}`,
    )
  } finally {
    await dataSource.destroy()
  }
}

seedExercises().catch((error) => {
  console.error('seed:exercises failed', error)
  process.exit(1)
})
