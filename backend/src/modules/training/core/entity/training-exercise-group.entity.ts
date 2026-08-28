import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'training_exercise_groups' })
export class TrainingExerciseGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'training_id', type: 'uuid' })
  trainingId!: string

  @Column({ type: 'text', default: 'superset' })
  type!: string

  @Column({ name: 'group_order', type: 'integer' })
  groupOrder!: number

  @Column({ name: 'rest_seconds', type: 'integer', nullable: true })
  restSeconds!: number | null

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>
}
