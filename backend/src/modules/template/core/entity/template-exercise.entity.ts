import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'template_exercises' })
export class TemplateExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string

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

  @Column({ name: 'target_weight', type: 'numeric', precision: 8, scale: 2, nullable: true })
  targetWeight!: string | null

  @Column({ name: 'rest_seconds', type: 'integer', nullable: true })
  restSeconds!: number | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>
}
