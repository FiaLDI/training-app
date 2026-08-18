import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserRole1700000000012 implements MigrationInterface {
  name = 'AddUserRole1700000000012'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role varchar(16) NOT NULL DEFAULT 'user'
    `)
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check
    `)
    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'))
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`)
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS role`)
  }
}
