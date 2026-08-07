import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserProgress1700000000001 implements MigrationInterface {
  name = 'AddUserProgress1700000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    //
    // users
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        email text UNIQUE,
        username text NOT NULL,

        metadata jsonb NOT NULL DEFAULT '{}',

        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    //
    // favorite_exercises
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS favorite_exercises (
        user_id uuid NOT NULL,
        exercise_id uuid NOT NULL,

        created_at timestamptz NOT NULL DEFAULT now(),

        PRIMARY KEY (user_id, exercise_id)
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_favorite_exercises_user'
        ) THEN
          ALTER TABLE favorite_exercises
          ADD CONSTRAINT fk_favorite_exercises_user
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
          WHERE conname = 'fk_favorite_exercises_exercise'
        ) THEN
          ALTER TABLE favorite_exercises
          ADD CONSTRAINT fk_favorite_exercises_exercise
          FOREIGN KEY (exercise_id)
          REFERENCES exercises(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    //
    // body_measurements
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS body_measurements (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        user_id uuid NOT NULL,

        weight numeric(5,2),

        body_fat numeric(5,2),

        chest numeric(5,2),

        waist numeric(5,2),

        hips numeric(5,2),

        left_biceps numeric(5,2),
        right_biceps numeric(5,2),

        left_thigh numeric(5,2),
        right_thigh numeric(5,2),

        metadata jsonb NOT NULL DEFAULT '{}',

        measured_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_body_measurements_user'
        ) THEN
          ALTER TABLE body_measurements
          ADD CONSTRAINT fk_body_measurements_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    //
    // personal_records
    //
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS personal_records (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        user_id uuid NOT NULL,

        exercise_id uuid NOT NULL,

        training_set_id uuid NOT NULL,

        weight numeric(8,2),

        reps integer,

        one_rep_max numeric(8,2),

        achieved_at timestamptz NOT NULL,

        metadata jsonb NOT NULL DEFAULT '{}'
      )
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_personal_records_user'
        ) THEN
          ALTER TABLE personal_records
          ADD CONSTRAINT fk_personal_records_user
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
          WHERE conname = 'fk_personal_records_exercise'
        ) THEN
          ALTER TABLE personal_records
          ADD CONSTRAINT fk_personal_records_exercise
          FOREIGN KEY (exercise_id)
          REFERENCES exercises(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_personal_records_training_set'
        ) THEN
          ALTER TABLE personal_records
          ADD CONSTRAINT fk_personal_records_training_set
          FOREIGN KEY (training_set_id)
          REFERENCES training_sets(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    //
    // indexes
    //
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_body_measurements_user
      ON body_measurements(user_id)
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_personal_records_user
      ON personal_records(user_id)
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_personal_records_exercise
      ON personal_records(exercise_id)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS personal_records CASCADE')
    await queryRunner.query('DROP TABLE IF EXISTS body_measurements CASCADE')
    await queryRunner.query('DROP TABLE IF EXISTS favorite_exercises CASCADE')
    await queryRunner.query('DROP TABLE IF EXISTS users CASCADE')
  }
}
