import { MigrationInterface, QueryRunner } from 'typeorm'

const SEED_NEWS_ID = 'c4e8a1b0-7d2f-4a91-9c3e-1f5b8d6a2e70'

const SEED_SECTIONS = [
  {
    type: 'paragraphs',
    heading: 'Журнал',
    paragraphs: [
      'На вкладках «Сегодня» и «Неделя» ведётся журнал тренировок: подходы, суперсеты, круги и дропсы.',
      'После подхода можно запустить таймер отдыха — со звуком, вибрацией и уведомлением.',
    ],
  },
  {
    type: 'list',
    heading: 'Планы и упражнения',
    items: [
      'Шаблоны тренировок, чтобы не собирать сессию с нуля каждый раз.',
      'Системный каталог упражнений и свои упражнения с видео и заметками по технике.',
    ],
  },
  {
    type: 'paragraphs',
    heading: 'Прогресс',
    paragraphs: [
      'В статистике видно объём по мышечным группам, связь с весом тела и тепловую карту тренировок за год.',
    ],
  },
  {
    type: 'list',
    heading: 'Данные',
    items: [
      'Можно работать локально на устройстве или в облаке — записи синхронизируются между устройствами.',
      'В профиле есть импорт и экспорт истории, шаг веса и настройки таймера.',
    ],
  },
  {
    type: 'paragraphs',
    heading: 'Обратная связь',
    paragraphs: [
      'Ошибки и идеи можно отправить в разделе «Помощь» — это попадает команде и помогает улучшить IronLog.',
    ],
  },
]

export class AddNews1700000000019 implements MigrationInterface {
  name = 'AddNews1700000000019'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS news (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug varchar(80) NOT NULL,
        title text NOT NULL,
        excerpt text NOT NULL,
        sections jsonb NOT NULL,
        published_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_news_slug UNIQUE (slug)
      )
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_news_published_at
      ON news (published_at DESC)
    `)

    await queryRunner.query(
      `
      INSERT INTO news (id, slug, title, excerpt, sections, published_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz)
      ON CONFLICT (slug) DO NOTHING
      `,
      [
        SEED_NEWS_ID,
        'what-you-can-do',
        'Что можно делать в IronLog',
        'Журнал тренировок в зале без сети, планы, каталог и статистика.',
        JSON.stringify(SEED_SECTIONS),
        '2026-09-09T00:00:00.000Z',
      ],
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_news_published_at`)
    await queryRunner.query(`DROP TABLE IF EXISTS news`)
  }
}
