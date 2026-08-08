import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity({ name: 'trainings' })
export class TrainingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId!: string | null

  @Column({ name: 'program_id', type: 'uuid', nullable: true })
  programId!: string | null

  @Column({ name: 'program_day_id', type: 'uuid', nullable: true })
  programDayId!: string | null

  @Column({ type: 'text' })
  status!: string

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt!: Date | null

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
