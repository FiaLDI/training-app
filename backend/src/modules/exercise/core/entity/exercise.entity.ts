import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ name: 'exercises' })
export class ExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean

  @Column({ type: 'text' })
  name!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ name: 'muscle_group', type: 'text', nullable: true })
  muscleGroup!: string | null

  @Column({ type: 'text', nullable: true })
  difficulty!: string | null

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
