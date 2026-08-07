import { MigrationInterface, QueryRunner } from 'typeorm'

export class UniqueLoginCode1700000000006 implements MigrationInterface {
  name = 'UniqueLoginCode1700000000006'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_users_login_code_email`)

    // Deduplicate login codes if any collisions exist.
    await queryRunner.query(`
      WITH duplicates AS (
        SELECT id, row_number() OVER (PARTITION BY login_code ORDER BY created_at) AS rn
        FROM users
      )
      UPDATE users u
      SET login_code = substr(md5(random()::text || u.id::text), 1, 8)
      FROM duplicates d
      WHERE u.id = d.id AND d.rn > 1
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_users_login_code
      ON users(login_code)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_users_login_code`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_users_login_code_email
      ON users(email, login_code)
    `)
  }
}
