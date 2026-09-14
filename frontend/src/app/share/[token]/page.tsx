import { SharePage } from '@/views/share/ui/share-page'

type Props = {
  params: Promise<{ token: string }>
}

export default async function Page({ params }: Props) {
  const { token } = await params
  return <SharePage token={token} />
}
