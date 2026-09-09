import { NewsDetailPage } from '@/views/news/ui/news-detail-page'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <NewsDetailPage slug={slug} />
}
