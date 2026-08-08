import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'training_exercises' })
export class TrainingExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'training_id', type: 'uuid' })
  trainingId!: string

  @Column({ name: 'exercise_id', type: 'uuid' })
  exerciseId!: string

  @Column({ name: 'exercise_order', type: 'integer' })
  exerciseOrder!: number

  @Column({ name: 'target_sets', type: 'integer' })
  targetSets!: number

  @Column({ name: 'is_warmup', type: 'boolean', default: false })
  isWarmup!: boolean

  @Column({ name: 'min_reps', type: 'integer', nullable: true })
  minReps!: number | null

  @Column({ name: 'max_reps', type: 'integer', nullable: true })
  maxReps!: number | null

  @Column({ name: 'rest_seconds', type: 'integer', nullable: true })
  restSeconds!: number | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>
}
