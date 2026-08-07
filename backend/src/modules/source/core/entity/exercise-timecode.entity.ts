import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'exercise_timecodes' })
export class ExerciseTimecodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string

  @Column({ type: 'integer' })
  seconds!: number

  @Column({ type: 'text', nullable: true })
  title!: string | null

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>
}
