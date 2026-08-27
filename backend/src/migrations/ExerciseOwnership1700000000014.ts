import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExerciseOwnership1700000000014 implements MigrationInterface {
  name = 'ExerciseOwnership1700000000014'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nullable user_id: NULL = system (shared). Existing rows get NULL on ADD COLUMN
    // → весь текущий каталог (seed и ранее созданные) становится системным.
    await queryRunner.query(`
      ALTER TABLE exercises
      ADD COLUMN IF NOT EXISTS user_id uuid
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_exercises_user'
        ) THEN
          ALTER TABLE exercises
          ADD CONSTRAINT fk_exercises_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_exercises_user
      ON exercises(user_id)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_exercises_user`)
    await queryRunner.query(`
      ALTER TABLE exercises DROP CONSTRAINT IF EXISTS fk_exercises_user
    `)
    await queryRunner.query(`
      ALTER TABLE exercises DROP COLUMN IF EXISTS user_id
    `)
  }
}
