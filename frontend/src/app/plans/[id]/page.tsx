import { TemplateDetailPage } from '@/views/templates/ui/template-detail-page'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <TemplateDetailPage id={id} />
}
