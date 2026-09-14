import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import type { ProgramSnapshot } from '../../../program/core/lib/program-snapshot'

@Entity({ name: 'catalog_programs' })
export class CatalogProgramEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 80, unique: true })
  slug!: string

  @Column({ type: 'text' })
  name!: string

  @Column({ type: 'text' })
  author!: string

  @Column({ type: 'text' })
  description!: string

  @Column({ type: 'jsonb', default: [] })
  tags!: string[]

  @Column({ type: 'boolean', default: true })
  verified!: boolean

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number

  @Column({ type: 'jsonb' })
  snapshot!: ProgramSnapshot

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
