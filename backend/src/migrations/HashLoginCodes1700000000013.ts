import { createHmac } from 'crypto'

import * as bcrypt from 'bcryptjs'
import { MigrationInterface, QueryRunner } from 'typeorm'

type LegacyUser = { id: string; login_code: string }

/**
 * Replaces plaintext `login_code` with:
 * - `login_code_lookup` — HMAC-SHA256(pepper, code) for indexed search
 * - `login_code_hash` — bcrypt hash for verification
 * Also adds `last_login_at` and durable `sessions_revoked_at`.
 *
 * Pepper: LOGIN_CODE_PEPPER, falling back to JWT_SECRET (same rule as LoginCodeService).
 * Existing plaintext codes are hashed in place so users keep working after migrate.
 */
export class HashLoginCodes1700000000013 implements MigrationInterface {
  name = 'HashLoginCodes1700000000013'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS login_code_hash text,
      ADD COLUMN IF NOT EXISTS login_code_lookup text,
      ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
      ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz
    `)

    const hasPlain = await queryRunner.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'login_code'
      LIMIT 1
    `)

    if (Array.isArray(hasPlain) && hasPlain.length > 0) {
      const pepper =
        process.env.LOGIN_CODE_PEPPER?.trim() ||
        process.env.JWT_SECRET?.trim() ||
        'dev-pepper-change-me'

      const rows = (await queryRunner.query(
        `SELECT id, login_code FROM users WHERE login_code_hash IS NULL`,
      )) as LegacyUser[]

      for (const row of rows) {
        const code = row.login_code
        const lookup = createHmac('sha256', pepper).update(code.trim()).digest('hex')
        const hash = await bcrypt.hash(code.trim(), 12)
        await queryRunner.query(
          `UPDATE users SET login_code_hash = $1, login_code_lookup = $2 WHERE id = $3`,
          [hash, lookup, row.id],
        )
      }

      await queryRunner.query(`DROP INDEX IF EXISTS ux_users_login_code`)
      await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS login_code`)
    }

    // Rows that never had a plaintext code get unreachable credentials (admin must reset).
    const orphans = (await queryRunner.query(`
      SELECT id FROM users
      WHERE login_code_hash IS NULL OR login_code_lookup IS NULL
    `)) as Array<{ id: string }>
    for (const row of orphans) {
      const hash = await bcrypt.hash(`orphaned-${row.id}-${Date.now()}`, 12)
      await queryRunner.query(
        `UPDATE users
         SET login_code_hash = COALESCE(login_code_hash, $1),
             login_code_lookup = COALESCE(login_code_lookup, $2)
         WHERE id = $3`,
        [hash, `migrated-missing-${row.id}`, row.id],
      )
    }

    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN login_code_hash SET NOT NULL,
      ALTER COLUMN login_code_lookup SET NOT NULL
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_users_login_code_lookup
      ON users(login_code_lookup)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Irreversible: plaintext codes are gone. Restore a column so the schema
    // matches older code, but force a reset (random placeholder values).
    await queryRunner.query(`DROP INDEX IF EXISTS ux_users_login_code_lookup`)
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS login_code text
    `)
    await queryRunner.query(`
      UPDATE users
      SET login_code = substr(md5(random()::text || id::text), 1, 12)
      WHERE login_code IS NULL
    `)
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN login_code SET NOT NULL
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_users_login_code
      ON users(login_code)
    `)
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS login_code_hash,
      DROP COLUMN IF EXISTS login_code_lookup,
      DROP COLUMN IF EXISTS last_login_at,
      DROP COLUMN IF EXISTS sessions_revoked_at
    `)
  }
}
