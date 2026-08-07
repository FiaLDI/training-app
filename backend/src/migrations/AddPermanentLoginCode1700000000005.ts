import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPermanentLoginCode1700000000005 implements MigrationInterface {
  name = 'AddPermanentLoginCode1700000000005'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS login_code text
    `)

    // Move latest unused auth_code onto users if present.
    await queryRunner.query(`
      UPDATE users u
      SET login_code = c.code
      FROM (
        SELECT DISTINCT ON (user_id) user_id, code
        FROM auth_codes
        WHERE used_at IS NULL
        ORDER BY user_id, created_at DESC
      ) c
      WHERE u.id = c.user_id
        AND u.login_code IS NULL
    `)

    await queryRunner.query(`
      UPDATE users
      SET login_code = substr(md5(random()::text || id::text), 1, 8)
      WHERE login_code IS NULL
    `)

    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN login_code SET NOT NULL
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_users_login_code_email
      ON users(email, login_code)
    `)

    await queryRunner.query(`DROP TABLE IF EXISTS auth_codes CASCADE`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
      INSERT INTO auth_codes (user_id, code, expires_at)
      SELECT id, login_code, now() + interval '100 years'
      FROM users
      WHERE login_code IS NOT NULL
    `)

    await queryRunner.query(`DROP INDEX IF EXISTS ux_users_login_code_email`)
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS login_code`)
  }
}
