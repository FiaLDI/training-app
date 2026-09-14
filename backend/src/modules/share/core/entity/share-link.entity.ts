import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity({ name: 'share_links' })
export class ShareLinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 32, unique: true })
  token!: string

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string

  @Column({ name: 'resource_type', type: 'varchar', length: 16 })
  resourceType!: 'template' | 'program'

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null
}
