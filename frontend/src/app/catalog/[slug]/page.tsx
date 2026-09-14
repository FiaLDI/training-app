import { CatalogDetailPage } from '@/views/catalog/ui/catalog-detail-page'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <CatalogDetailPage slug={slug} />
}
