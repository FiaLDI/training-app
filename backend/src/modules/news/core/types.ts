export type NewsParagraphsSection = {
  type: 'paragraphs'
  heading: string
  paragraphs: string[]
}

export type NewsListSection = {
  type: 'list'
  heading: string
  items: string[]
}

export type NewsSection = NewsParagraphsSection | NewsListSection

export type NewsListItem = {
  id: string
  slug: string
  title: string
  excerpt: string
  publishedAt: string
}

export type News = NewsListItem & {
  sections: NewsSection[]
  createdAt: string
  updatedAt: string
}

export type CreateNewsInput = {
  slug: string
  title: string
  excerpt: string
  sections: NewsSection[]
  publishedAt: string
}

export type UpdateNewsInput = {
  slug?: string
  title?: string
  excerpt?: string
  sections?: NewsSection[]
  publishedAt?: string
}
