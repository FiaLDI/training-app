import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExerciseIsSystem1700000000018 implements MigrationInterface {
  name = 'ExerciseIsSystem1700000000018'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE exercises
      ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false
    `)

    await queryRunner.query(`
      UPDATE exercises
      SET is_system = true
      WHERE user_id IS NULL
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_exercises_is_system_owner'
        ) THEN
          ALTER TABLE exercises
          ADD CONSTRAINT chk_exercises_is_system_owner
          CHECK (
            (is_system AND user_id IS NULL)
            OR (NOT is_system AND user_id IS NOT NULL)
          );
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_exercises_is_system
      ON exercises(is_system)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_exercises_is_system`)
    await queryRunner.query(`
      ALTER TABLE exercises DROP CONSTRAINT IF EXISTS chk_exercises_is_system_owner
    `)
    await queryRunner.query(`
      ALTER TABLE exercises DROP COLUMN IF EXISTS is_system
    `)
  }
}
