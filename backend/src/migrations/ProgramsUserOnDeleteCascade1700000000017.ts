import { MigrationInterface, QueryRunner } from 'typeorm'

export class ProgramsUserOnDeleteCascade1700000000017 implements MigrationInterface {
  name = 'ProgramsUserOnDeleteCascade1700000000017'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE programs DROP CONSTRAINT IF EXISTS fk_programs_user
    `)
    await queryRunner.query(`
      ALTER TABLE programs
      ADD CONSTRAINT fk_programs_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE programs DROP CONSTRAINT IF EXISTS fk_programs_user
    `)
    await queryRunner.query(`
      ALTER TABLE programs
      ADD CONSTRAINT fk_programs_user
      FOREIGN KEY (user_id) REFERENCES users(id)
    `)
  }
}
