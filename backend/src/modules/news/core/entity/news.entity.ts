import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import type { NewsSection } from '../types'

@Entity({ name: 'news' })
export class NewsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 80, unique: true })
  slug!: string

  @Column({ type: 'text' })
  title!: string

  @Column({ type: 'text' })
  excerpt!: string

  @Column({ type: 'jsonb' })
  sections!: NewsSection[]

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt!: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
