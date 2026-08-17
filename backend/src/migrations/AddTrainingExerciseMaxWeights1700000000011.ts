import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTrainingExerciseMaxWeights1700000000011 implements MigrationInterface {
  name = 'AddTrainingExerciseMaxWeights1700000000011'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE training_exercises
      ADD COLUMN IF NOT EXISTS max_weight numeric(8,2) NULL
    `)
    await queryRunner.query(`
      ALTER TABLE training_exercises
      ADD COLUMN IF NOT EXISTS previous_max_weight numeric(8,2) NULL
    `)

    await queryRunner.query(`
      UPDATE training_exercises AS te
      SET max_weight = sub.max_weight
      FROM (
        SELECT
          te2.id AS exercise_id,
          MAX(ts.weight)::numeric(8,2) AS max_weight
        FROM training_exercises te2
        INNER JOIN trainings t ON t.id = te2.training_id
        INNER JOIN training_sets ts ON ts.training_exercise_id = te2.id
        WHERE t.status = 'finished'
          AND COALESCE(te2.is_warmup, false) = false
          AND COALESCE(ts.is_warmup, false) = false
          AND ts.completed = true
          AND ts.weight IS NOT NULL
        GROUP BY te2.id
      ) AS sub
      WHERE te.id = sub.exercise_id
    `)

    await queryRunner.query(`
      UPDATE training_exercises AS te
      SET previous_max_weight = src.max_weight
      FROM (
        SELECT DISTINCT ON (current_te.id)
          current_te.id AS exercise_row_id,
          prev_te.max_weight
        FROM training_exercises AS current_te
        INNER JOIN trainings AS current_t ON current_t.id = current_te.training_id
        INNER JOIN training_exercises AS prev_te
          ON prev_te.exercise_id = current_te.exercise_id
        INNER JOIN trainings AS prev_t ON prev_t.id = prev_te.training_id
        WHERE prev_t.user_id = current_t.user_id
          AND prev_t.id <> current_t.id
          AND prev_t.status = 'finished'
          AND prev_te.max_weight IS NOT NULL
          AND COALESCE(prev_t.finished_at, prev_t.started_at, prev_t.scheduled_at, prev_t.created_at)
            < COALESCE(current_t.finished_at, current_t.started_at, current_t.scheduled_at, current_t.created_at)
        ORDER BY
          current_te.id,
          COALESCE(prev_t.finished_at, prev_t.started_at, prev_t.scheduled_at, prev_t.created_at) DESC
      ) AS src
      WHERE te.id = src.exercise_row_id
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE training_exercises
      DROP COLUMN IF EXISTS previous_max_weight
    `)
    await queryRunner.query(`
      ALTER TABLE training_exercises
      DROP COLUMN IF EXISTS max_weight
    `)
  }
}
