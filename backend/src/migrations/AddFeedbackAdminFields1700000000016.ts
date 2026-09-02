import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFeedbackAdminFields1700000000016 implements MigrationInterface {
  name = 'AddFeedbackAdminFields1700000000016'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE feedbacks
      ADD COLUMN IF NOT EXISTS priority varchar(16) NOT NULL DEFAULT 'normal'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE feedbacks
      DROP COLUMN IF EXISTS priority
    `)
  }
}
