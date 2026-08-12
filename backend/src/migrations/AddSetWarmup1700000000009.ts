import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSetWarmup1700000000009 implements MigrationInterface {
  name = 'AddSetWarmup1700000000009'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE training_sets
      ADD COLUMN IF NOT EXISTS is_warmup boolean NOT NULL DEFAULT false
    `)
    await queryRunner.query(`
      UPDATE training_sets ts
      SET is_warmup = true
      FROM training_exercises te
      WHERE ts.training_exercise_id = te.id
        AND COALESCE(te.is_warmup, false) = true
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE training_sets
      DROP COLUMN IF EXISTS is_warmup
    `)
  }
}
