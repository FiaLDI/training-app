import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTemplateExerciseWeight1700000000003 implements MigrationInterface {
  name = 'AddTemplateExerciseWeight1700000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE template_exercises
      ADD COLUMN IF NOT EXISTS target_weight numeric(8,2) NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE template_exercises
      DROP COLUMN IF EXISTS target_weight
    `)
  }
}
