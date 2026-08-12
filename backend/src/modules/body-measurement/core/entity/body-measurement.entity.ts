import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'body_measurements' })
export class BodyMeasurementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  weight!: string | null

  @Column({ name: 'body_fat', type: 'numeric', precision: 5, scale: 2, nullable: true })
  bodyFat!: string | null

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  chest!: string | null

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  waist!: string | null

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  hips!: string | null

  @Column({ name: 'left_biceps', type: 'numeric', precision: 5, scale: 2, nullable: true })
  leftBiceps!: string | null

  @Column({ name: 'right_biceps', type: 'numeric', precision: 5, scale: 2, nullable: true })
  rightBiceps!: string | null

  @Column({ name: 'left_thigh', type: 'numeric', precision: 5, scale: 2, nullable: true })
  leftThigh!: string | null

  @Column({ name: 'right_thigh', type: 'numeric', precision: 5, scale: 2, nullable: true })
  rightThigh!: string | null

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt!: Date
}
