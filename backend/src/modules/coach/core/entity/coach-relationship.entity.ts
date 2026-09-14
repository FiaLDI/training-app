import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity({ name: 'coach_relationships' })
export class CoachRelationshipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'coach_id', type: 'uuid' })
  coachId!: string

  @Column({ name: 'trainee_id', type: 'uuid' })
  traineeId!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null
}
