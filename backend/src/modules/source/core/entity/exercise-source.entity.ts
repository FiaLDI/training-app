import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity({ name: 'exercise_sources' })
export class ExerciseSourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'exercise_id', type: 'uuid' })
  exerciseId!: string

  @Column({ type: 'text' })
  type!: string

  @Column({ type: 'text', nullable: true })
  title!: string | null

  @Column({ type: 'text' })
  url!: string

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
