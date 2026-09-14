import { MigrationInterface, QueryRunner } from 'typeorm'

import { CATALOG_PROGRAM_SEEDS } from '../modules/catalog/core/seed-programs'

export class ShareCatalogCoach1700000000020 implements MigrationInterface {
  name = 'ShareCatalogCoach1700000000020'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS share_links (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        token varchar(32) NOT NULL,
        owner_id uuid NOT NULL,
        resource_type varchar(16) NOT NULL,
        resource_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        revoked_at timestamptz NULL,
        CONSTRAINT uq_share_links_token UNIQUE (token),
        CONSTRAINT fk_share_links_owner
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_share_links_active_resource
      ON share_links (owner_id, resource_type, resource_id)
      WHERE revoked_at IS NULL
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_share_links_token
      ON share_links (token)
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS catalog_programs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug varchar(80) NOT NULL,
        name text NOT NULL,
        author text NOT NULL,
        description text NOT NULL,
        tags jsonb NOT NULL DEFAULT '[]'::jsonb,
        verified boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        snapshot jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_catalog_programs_slug UNIQUE (slug)
      )
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_catalog_programs_sort
      ON catalog_programs (sort_order ASC, name ASC)
    `)

    for (const seed of CATALOG_PROGRAM_SEEDS) {
      await queryRunner.query(
        `
        INSERT INTO catalog_programs
          (id, slug, name, author, description, tags, verified, sort_order, snapshot)
        VALUES
          ($1, $2, $3, $4, $5, $6::jsonb, true, $7, $8::jsonb)
        ON CONFLICT (slug) DO NOTHING
        `,
        [
          seed.id,
          seed.slug,
          seed.name,
          seed.author,
          seed.description,
          JSON.stringify(seed.tags),
          seed.sortOrder,
          JSON.stringify(seed.snapshot),
        ],
      )
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coach_invites (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        coach_id uuid NOT NULL,
        code varchar(12) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz NULL,
        CONSTRAINT uq_coach_invites_code UNIQUE (code),
        CONSTRAINT fk_coach_invites_coach
          FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_coach_invites_coach
      ON coach_invites (coach_id)
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coach_relationships (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        coach_id uuid NOT NULL,
        trainee_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        ended_at timestamptz NULL,
        CONSTRAINT ck_coach_relationships_not_self CHECK (coach_id <> trainee_id),
        CONSTRAINT fk_coach_relationships_coach
          FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_coach_relationships_trainee
          FOREIGN KEY (trainee_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_coach_relationships_active
      ON coach_relationships (coach_id, trainee_id)
      WHERE ended_at IS NULL
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS program_assignments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        coach_id uuid NOT NULL,
        trainee_id uuid NOT NULL,
        source_program_id uuid NOT NULL,
        trainee_program_id uuid NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_program_assignments_coach
          FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_program_assignments_trainee
          FOREIGN KEY (trainee_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_program_assignments_trainee
      ON program_assignments (trainee_id, created_at DESC)
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS training_set_comments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        set_id uuid NOT NULL,
        author_id uuid NOT NULL,
        body text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_training_set_comments_set
          FOREIGN KEY (set_id) REFERENCES training_sets(id) ON DELETE CASCADE,
        CONSTRAINT fk_training_set_comments_author
          FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_training_set_comments_set
      ON training_set_comments (set_id, created_at ASC)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS training_set_comments')
    await queryRunner.query('DROP TABLE IF EXISTS program_assignments')
    await queryRunner.query('DROP TABLE IF EXISTS coach_relationships')
    await queryRunner.query('DROP TABLE IF EXISTS coach_invites')
    await queryRunner.query('DROP TABLE IF EXISTS catalog_programs')
    await queryRunner.query('DROP TABLE IF EXISTS share_links')
  }
}
