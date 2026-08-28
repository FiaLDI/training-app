import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'template_exercise_groups' })
export class TemplateExerciseGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string

  @Column({ type: 'text', default: 'superset' })
  type!: string

  @Column({ name: 'group_order', type: 'integer' })
  groupOrder!: number

  @Column({ name: 'rest_seconds', type: 'integer', nullable: true })
  restSeconds!: number | null

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>
}
