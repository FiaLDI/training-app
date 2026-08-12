import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFeedback1700000000010 implements MigrationInterface {
  name = 'AddFeedback1700000000010'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NULL,
        category varchar(16) NOT NULL,
        message text NOT NULL,
        rating smallint NULL,
        status varchar(16) NOT NULL DEFAULT 'new',
        client_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id_created_at
      ON feedbacks (user_id, created_at DESC)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_feedbacks_user_id_created_at`)
    await queryRunner.query(`DROP TABLE IF EXISTS feedbacks`)
  }
}
