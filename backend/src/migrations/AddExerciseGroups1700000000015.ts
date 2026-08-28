import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddExerciseGroups1700000000015 implements MigrationInterface {
  name = 'AddExerciseGroups1700000000015'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_exercise_groups (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id uuid NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
        type text NOT NULL DEFAULT 'superset',
        group_order integer NOT NULL,
        rest_seconds integer NULL,
        metadata jsonb NOT NULL DEFAULT '{}'
      )
    `)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS training_exercise_groups (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
        type text NOT NULL DEFAULT 'superset',
        group_order integer NOT NULL,
        rest_seconds integer NULL,
        metadata jsonb NOT NULL DEFAULT '{}'
      )
    `)
    await queryRunner.query(`
      ALTER TABLE template_exercises
      ADD COLUMN IF NOT EXISTS group_id uuid NULL REFERENCES template_exercise_groups(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS position_in_group integer NULL
    `)
    await queryRunner.query(`
      ALTER TABLE training_exercises
      ADD COLUMN IF NOT EXISTS group_id uuid NULL REFERENCES training_exercise_groups(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS position_in_group integer NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE training_exercises
      DROP COLUMN IF EXISTS position_in_group,
      DROP COLUMN IF EXISTS group_id
    `)
    await queryRunner.query(`
      ALTER TABLE template_exercises
      DROP COLUMN IF EXISTS position_in_group,
      DROP COLUMN IF EXISTS group_id
    `)
    await queryRunner.query(`DROP TABLE IF EXISTS training_exercise_groups`)
    await queryRunner.query(`DROP TABLE IF EXISTS template_exercise_groups`)
  }
}
