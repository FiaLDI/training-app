import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity({ name: 'training_set_comments' })
export class TrainingSetCommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'set_id', type: 'uuid' })
  setId!: string

  @Column({ name: 'author_id', type: 'uuid' })
  authorId!: string

  @Column({ type: 'text' })
  body!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
