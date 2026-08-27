import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'text', unique: true })
  email!: string

  @Column({ type: 'text' })
  username!: string

  @Column({ name: 'login_code_hash', type: 'text' })
  loginCodeHash!: string

  @Column({ name: 'login_code_lookup', type: 'text', unique: true })
  loginCodeLookup!: string

  @Column({ type: 'varchar', length: 16, default: 'user' })
  role!: 'user' | 'admin'

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null

  @Column({ name: 'sessions_revoked_at', type: 'timestamptz', nullable: true })
  sessionsRevokedAt!: Date | null
}
