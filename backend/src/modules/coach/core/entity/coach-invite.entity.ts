import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity({ name: 'coach_invites' })
export class CoachInviteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'coach_id', type: 'uuid' })
  coachId!: string

  @Column({ type: 'varchar', length: 12, unique: true })
  code!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null
}
