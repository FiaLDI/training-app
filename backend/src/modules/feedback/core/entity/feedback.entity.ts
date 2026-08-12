import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'feedbacks' })
export class FeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null

  @Column({ type: 'varchar', length: 16 })
  category!: string

  @Column({ type: 'text' })
  message!: string

  @Column({ type: 'smallint', nullable: true })
  rating!: number | null

  @Column({ type: 'varchar', length: 16, default: 'new' })
  status!: string

  @Column({ name: 'client_meta', type: 'jsonb', default: {} })
  clientMeta!: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
