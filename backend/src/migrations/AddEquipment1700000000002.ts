import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEquipment1700000000002 implements MigrationInterface {
  name = 'AddEquipment1700000000002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipment (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        name text NOT NULL,

        metadata jsonb NOT NULL DEFAULT '{}',

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_equipment_name_lower
      ON equipment (lower(name))
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS equipment CASCADE')
  }
}
