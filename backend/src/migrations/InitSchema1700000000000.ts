import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
    `)

    //
    // exercises
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        name text NOT NULL,
        description text NULL,

        muscle_group text NULL,
        equipment text NULL,
        difficulty text NULL,

        metadata jsonb NOT NULL DEFAULT '{}',

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_exercises_name
      ON exercises(name)
    `)

    //
    // exercise_sources
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exercise_sources (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        exercise_id uuid NOT NULL,

        type text NOT NULL,
        title text NULL,
        url text NOT NULL,

        metadata jsonb NOT NULL DEFAULT '{}',

        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_exercise_sources_exercise'
        ) THEN
          ALTER TABLE exercise_sources
          ADD CONSTRAINT fk_exercise_sources_exercise
          FOREIGN KEY (exercise_id)
          REFERENCES exercises(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    //
    // exercise_timecodes
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exercise_timecodes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        source_id uuid NOT NULL,

        seconds integer NOT NULL,

        title text NULL,

        metadata jsonb NOT NULL DEFAULT '{}'
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_timecodes_source'
        ) THEN
          ALTER TABLE exercise_timecodes
          ADD CONSTRAINT fk_timecodes_source
          FOREIGN KEY (source_id)
          REFERENCES exercise_sources(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    //
    // workout_templates
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workout_templates (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        name text NOT NULL,

        description text NULL,

        metadata jsonb NOT NULL DEFAULT '{}',

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    //
    // template_exercises
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_exercises (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        template_id uuid NOT NULL,
        exercise_id uuid NOT NULL,

        exercise_order integer NOT NULL,

        target_sets integer NOT NULL,

        min_reps integer NULL,
        max_reps integer NULL,

        rest_seconds integer NULL,

        notes text NULL,

        metadata jsonb NOT NULL DEFAULT '{}'
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_template_exercises_template'
        ) THEN
          ALTER TABLE template_exercises
          ADD CONSTRAINT fk_template_exercises_template
          FOREIGN KEY (template_id)
          REFERENCES workout_templates(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_template_exercises_exercise'
        ) THEN
          ALTER TABLE template_exercises
          ADD CONSTRAINT fk_template_exercises_exercise
          FOREIGN KEY (exercise_id)
          REFERENCES exercises(id);
        END IF;
      END $$;
    `)

    //
    // trainings
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trainings (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        template_id uuid NULL,

        status text NOT NULL,

        started_at timestamptz NOT NULL,

        finished_at timestamptz NULL,

        notes text NULL,

        metadata jsonb NOT NULL DEFAULT '{}',

        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_trainings_template'
        ) THEN
          ALTER TABLE trainings
          ADD CONSTRAINT fk_trainings_template
          FOREIGN KEY (template_id)
          REFERENCES workout_templates(id);
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE trainings
        ADD CONSTRAINT chk_training_status
        CHECK (status IN (
          'planned',
          'in_progress',
          'finished',
          'cancelled'
        ));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `)

    //
    // training_exercises
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS training_exercises (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        training_id uuid NOT NULL,
        exercise_id uuid NOT NULL,

        exercise_order integer NOT NULL,

        target_sets integer NOT NULL,

        min_reps integer NULL,
        max_reps integer NULL,

        rest_seconds integer NULL,

        notes text NULL,

        metadata jsonb NOT NULL DEFAULT '{}'
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_training_exercises_training'
        ) THEN
          ALTER TABLE training_exercises
          ADD CONSTRAINT fk_training_exercises_training
          FOREIGN KEY (training_id)
          REFERENCES trainings(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_training_exercises_exercise'
        ) THEN
          ALTER TABLE training_exercises
          ADD CONSTRAINT fk_training_exercises_exercise
          FOREIGN KEY (exercise_id)
          REFERENCES exercises(id);
        END IF;
      END $$;
    `)

    //
    // training_sets
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS training_sets (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        training_exercise_id uuid NOT NULL,

        set_number integer NOT NULL,

        weight numeric(8,2) NULL,

        reps integer NULL,

        rir integer NULL,

        rpe numeric(3,1) NULL,

        completed boolean NOT NULL DEFAULT true,

        metadata jsonb NOT NULL DEFAULT '{}',

        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_training_sets_training_exercise'
        ) THEN
          ALTER TABLE training_sets
          ADD CONSTRAINT fk_training_sets_training_exercise
          FOREIGN KEY (training_exercise_id)
          REFERENCES training_exercises(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_training_sets_training_exercise
      ON training_sets(training_exercise_id)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS training_sets CASCADE')
    await queryRunner.query('DROP TABLE IF EXISTS training_exercises CASCADE')
    await queryRunner.query('DROP TABLE IF EXISTS trainings CASCADE')
    await queryRunner.query('DROP TABLE IF EXISTS template_exercises CASCADE')
    await queryRunner.query('DROP TABLE IF EXISTS workout_templates CASCADE')
    await queryRunner.query('DROP TABLE IF EXISTS exercise_timecodes CASCADE')
    await queryRunner.query('DROP TABLE IF EXISTS exercise_sources CASCADE')
    await queryRunner.query('DROP TABLE IF EXISTS exercises CASCADE')
  }
}
