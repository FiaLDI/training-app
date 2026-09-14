import { MigrationInterface, QueryRunner } from 'typeorm'

import { seedSystemCatalogPrograms } from '../modules/catalog/core/seed-system-catalog'

export class SystemProgramsTemplates1700000000021 implements MigrationInterface {
  name = 'SystemProgramsTemplates1700000000021'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workout_templates
      ALTER COLUMN user_id DROP NOT NULL
    `)
    await queryRunner.query(`
      ALTER TABLE workout_templates
      ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false
    `)
    await queryRunner.query(`
      UPDATE workout_templates
      SET is_system = true
      WHERE user_id IS NULL
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_workout_templates_is_system_owner'
        ) THEN
          ALTER TABLE workout_templates
          ADD CONSTRAINT chk_workout_templates_is_system_owner
          CHECK (
            (is_system AND user_id IS NULL)
            OR (NOT is_system AND user_id IS NOT NULL)
          );
        END IF;
      END $$;
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_workout_templates_is_system
      ON workout_templates(is_system)
    `)

    await queryRunner.query(`
      ALTER TABLE programs
      ALTER COLUMN user_id DROP NOT NULL
    `)
    await queryRunner.query(`
      ALTER TABLE programs
      ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false
    `)
    await queryRunner.query(`
      UPDATE programs
      SET is_system = true
      WHERE user_id IS NULL
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_programs_is_system_owner'
        ) THEN
          ALTER TABLE programs
          ADD CONSTRAINT chk_programs_is_system_owner
          CHECK (
            (is_system AND user_id IS NULL)
            OR (NOT is_system AND user_id IS NOT NULL)
          );
        END IF;
      END $$;
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_programs_is_system
      ON programs(is_system)
    `)

    await queryRunner.query(`
      ALTER TABLE catalog_programs
      ADD COLUMN IF NOT EXISTS program_id uuid NULL
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_catalog_programs_program'
        ) THEN
          ALTER TABLE catalog_programs
          ADD CONSTRAINT fk_catalog_programs_program
          FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `)

    await seedSystemCatalogPrograms(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE catalog_programs DROP CONSTRAINT IF EXISTS fk_catalog_programs_program
    `)
    await queryRunner.query(`
      ALTER TABLE catalog_programs DROP COLUMN IF EXISTS program_id
    `)

    await queryRunner.query(`
      DELETE FROM programs WHERE is_system = true
    `)
    await queryRunner.query(`
      DELETE FROM workout_templates WHERE is_system = true
    `)

    await queryRunner.query(`DROP INDEX IF EXISTS ix_programs_is_system`)
    await queryRunner.query(`
      ALTER TABLE programs DROP CONSTRAINT IF EXISTS chk_programs_is_system_owner
    `)
    await queryRunner.query(`
      ALTER TABLE programs DROP COLUMN IF EXISTS is_system
    `)
    await queryRunner.query(`
      ALTER TABLE programs ALTER COLUMN user_id SET NOT NULL
    `)

    await queryRunner.query(`DROP INDEX IF EXISTS ix_workout_templates_is_system`)
    await queryRunner.query(`
      ALTER TABLE workout_templates DROP CONSTRAINT IF EXISTS chk_workout_templates_is_system_owner
    `)
    await queryRunner.query(`
      ALTER TABLE workout_templates DROP COLUMN IF EXISTS is_system
    `)
    await queryRunner.query(`
      ALTER TABLE workout_templates ALTER COLUMN user_id SET NOT NULL
    `)
  }
}
