import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'program_days' })
export class ProgramDayEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'program_id', type: 'uuid' })
  programId!: string

  @Column({ name: 'day_of_week', type: 'integer' })
  dayOfWeek!: number

  @Column({ name: 'slot_order', type: 'integer', default: 0 })
  slotOrder!: number

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
