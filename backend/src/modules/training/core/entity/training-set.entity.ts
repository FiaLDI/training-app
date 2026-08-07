import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity({ name: 'training_sets' })
export class TrainingSetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'training_exercise_id', type: 'uuid' })
  trainingExerciseId!: string

  @Column({ name: 'set_number', type: 'integer' })
  setNumber!: number

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  weight!: string | null

  @Column({ type: 'integer', nullable: true })
  reps!: number | null

  @Column({ type: 'integer', nullable: true })
  rir!: number | null

  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  rpe!: string | null

  @Column({ type: 'boolean', default: true })
  completed!: boolean

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
