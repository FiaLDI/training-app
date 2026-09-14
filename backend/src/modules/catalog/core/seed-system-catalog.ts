import { QueryRunner } from 'typeorm'

import { normalizeExerciseName } from '../../program/core/lib/normalize-exercise-name'
import {
  CATALOG_PROGRAM_SEEDS,
  systemProgramIdForSlug,
  systemTemplateIdForDay,
} from './seed-programs'

type ExerciseRow = { id: string; name: string }

function matchExerciseId(name: string, catalog: ExerciseRow[]): string | null {
  const target = normalizeExerciseName(name)
  if (!target) return null
  return catalog.find((item) => normalizeExerciseName(item.name) === target)?.id ?? null
}

export async function seedSystemCatalogPrograms(queryRunner: QueryRunner): Promise<void> {
  const exercises: ExerciseRow[] = await queryRunner.query(`SELECT id, name FROM exercises`)

  for (const seed of CATALOG_PROGRAM_SEEDS) {
    const programId = systemProgramIdForSlug(seed.slug)
    const existing = await queryRunner.query(`SELECT id FROM programs WHERE id = $1`, [programId])
    if (existing.length === 0) {
      await queryRunner.query(
        `
        INSERT INTO programs (id, user_id, name, description, metadata, is_system)
        VALUES ($1, NULL, $2, $3, $4::jsonb, true)
        `,
        [
          programId,
          seed.snapshot.name,
          seed.snapshot.description,
          JSON.stringify({ catalogSlug: seed.slug, source: 'catalog' }),
        ],
      )

      for (const [dayIndex, day] of seed.snapshot.days.entries()) {
        const template = day.template
        const templateId = systemTemplateIdForDay(seed.slug, dayIndex)
        await queryRunner.query(
          `
          INSERT INTO workout_templates (id, user_id, name, description, metadata, is_system)
          VALUES ($1, NULL, $2, $3, $4::jsonb, true)
          `,
          [
            templateId,
            template?.name ?? seed.name,
            template?.description ?? null,
            JSON.stringify({ catalogSlug: seed.slug, dayOfWeek: day.dayOfWeek }),
          ],
        )

        for (const item of template?.exercises ?? []) {
          const exerciseId = matchExerciseId(item.exerciseName, exercises)
          if (!exerciseId) continue
          await queryRunner.query(
            `
            INSERT INTO template_exercises
              (template_id, exercise_id, exercise_order, target_sets, is_warmup, min_reps, max_reps, notes, metadata)
            VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, '{}'::jsonb)
            `,
            [
              templateId,
              exerciseId,
              item.exerciseOrder,
              item.targetSets,
              item.isWarmup ?? false,
              item.minReps ?? null,
              item.maxReps ?? null,
              item.notes ?? null,
            ],
          )
        }

        await queryRunner.query(
          `
          INSERT INTO program_days (program_id, day_of_week, slot_order, template_id, notes)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [programId, day.dayOfWeek, day.slotOrder, templateId, day.notes],
        )
      }
    }

    await queryRunner.query(`UPDATE catalog_programs SET program_id = $1 WHERE slug = $2`, [
      programId,
      seed.slug,
    ])
  }
}
