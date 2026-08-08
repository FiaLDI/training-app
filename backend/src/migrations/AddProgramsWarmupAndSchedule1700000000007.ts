import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddProgramsWarmupAndSchedule1700000000007 implements MigrationInterface {
  name = 'AddProgramsWarmupAndSchedule1700000000007'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        name text NOT NULL,
        description text NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_programs_user'
        ) THEN
          ALTER TABLE programs
          ADD CONSTRAINT fk_programs_user
          FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_programs_user_id ON programs (user_id)
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS program_days (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        program_id uuid NOT NULL,
        day_of_week integer NOT NULL,
        slot_order integer NOT NULL DEFAULT 0,
        template_id uuid NULL,
        notes text NULL
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_program_days_program'
        ) THEN
          ALTER TABLE program_days
          ADD CONSTRAINT fk_program_days_program
          FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_program_days_template'
        ) THEN
          ALTER TABLE program_days
          ADD CONSTRAINT fk_program_days_template
          FOREIGN KEY (template_id) REFERENCES workout_templates(id);
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE program_days
        ADD CONSTRAINT chk_program_days_day_of_week
        CHECK (day_of_week BETWEEN 1 AND 7);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_program_days_program_id ON program_days (program_id)
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NULL
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      ALTER COLUMN started_at DROP NOT NULL
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      ADD COLUMN IF NOT EXISTS program_id uuid NULL
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      ADD COLUMN IF NOT EXISTS program_day_id uuid NULL
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_trainings_program'
        ) THEN
          ALTER TABLE trainings
          ADD CONSTRAINT fk_trainings_program
          FOREIGN KEY (program_id) REFERENCES programs(id);
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_trainings_program_day'
        ) THEN
          ALTER TABLE trainings
          ADD CONSTRAINT fk_trainings_program_day
          FOREIGN KEY (program_day_id) REFERENCES program_days(id);
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_trainings_scheduled_at ON trainings (scheduled_at)
    `)

    await queryRunner.query(`
      ALTER TABLE template_exercises
      ADD COLUMN IF NOT EXISTS is_warmup boolean NOT NULL DEFAULT false
    `)

    await queryRunner.query(`
      ALTER TABLE training_exercises
      ADD COLUMN IF NOT EXISTS is_warmup boolean NOT NULL DEFAULT false
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE training_exercises
      DROP COLUMN IF EXISTS is_warmup
    `)

    await queryRunner.query(`
      ALTER TABLE template_exercises
      DROP COLUMN IF EXISTS is_warmup
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      DROP CONSTRAINT IF EXISTS fk_trainings_program_day
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      DROP CONSTRAINT IF EXISTS fk_trainings_program
    `)

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_trainings_scheduled_at
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      DROP COLUMN IF EXISTS program_day_id
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      DROP COLUMN IF EXISTS program_id
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      DROP COLUMN IF EXISTS scheduled_at
    `)

    await queryRunner.query(`
      UPDATE trainings SET started_at = COALESCE(started_at, created_at) WHERE started_at IS NULL
    `)

    await queryRunner.query(`
      ALTER TABLE trainings
      ALTER COLUMN started_at SET NOT NULL
    `)

    await queryRunner.query(`DROP TABLE IF EXISTS program_days`)
    await queryRunner.query(`DROP TABLE IF EXISTS programs`)
  }
}
