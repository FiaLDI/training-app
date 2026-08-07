import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuthAndUserOwnership1700000000004 implements MigrationInterface {
  name = 'AddAuthAndUserOwnership1700000000004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE users
      SET email = 'user-' || id::text || '@local.invalid'
      WHERE email IS NULL
    `)

    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN email SET NOT NULL
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_codes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        code text NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_auth_codes_user'
        ) THEN
          ALTER TABLE auth_codes
          ADD CONSTRAINT fk_auth_codes_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_auth_codes_user
      ON auth_codes(user_id)
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_auth_codes_lookup
      ON auth_codes(user_id, code)
      WHERE used_at IS NULL
    `)

    // Existing orphan data cannot be owned — wipe for clean ownership migration (dev-friendly).
    await queryRunner.query(`DELETE FROM training_sets`)
    await queryRunner.query(`DELETE FROM training_exercises`)
    await queryRunner.query(`DELETE FROM trainings`)
    await queryRunner.query(`DELETE FROM template_exercises`)
    await queryRunner.query(`DELETE FROM workout_templates`)

    await queryRunner.query(`
      ALTER TABLE workout_templates
      ADD COLUMN IF NOT EXISTS user_id uuid
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      ADD COLUMN IF NOT EXISTS user_id uuid
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_workout_templates_user'
        ) THEN
          ALTER TABLE workout_templates
          ADD CONSTRAINT fk_workout_templates_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_trainings_user'
        ) THEN
          ALTER TABLE trainings
          ADD CONSTRAINT fk_trainings_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      ALTER TABLE workout_templates
      ALTER COLUMN user_id SET NOT NULL
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      ALTER COLUMN user_id SET NOT NULL
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_workout_templates_user
      ON workout_templates(user_id)
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_trainings_user
      ON trainings(user_id)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_trainings_user`)
    await queryRunner.query(`DROP INDEX IF EXISTS ix_workout_templates_user`)

    await queryRunner.query(`
      ALTER TABLE trainings
      DROP CONSTRAINT IF EXISTS fk_trainings_user
    `)
    await queryRunner.query(`
      ALTER TABLE workout_templates
      DROP CONSTRAINT IF EXISTS fk_workout_templates_user
    `)

    await queryRunner.query(`ALTER TABLE trainings DROP COLUMN IF EXISTS user_id`)
    await queryRunner.query(`ALTER TABLE workout_templates DROP COLUMN IF EXISTS user_id`)

    await queryRunner.query(`DROP TABLE IF EXISTS auth_codes CASCADE`)

    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN email DROP NOT NULL
    `)
  }
}
