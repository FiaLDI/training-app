import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity({ name: 'program_assignments' })
export class ProgramAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'coach_id', type: 'uuid' })
  coachId!: string

  @Column({ name: 'trainee_id', type: 'uuid' })
  traineeId!: string

  @Column({ name: 'source_program_id', type: 'uuid' })
  sourceProgramId!: string

  @Column({ name: 'trainee_program_id', type: 'uuid' })
  traineeProgramId!: string

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: 'active' | 'archived'

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
