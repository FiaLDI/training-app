import { AdminUserDetailPage } from '@/views/admin/ui/admin-user-detail-page'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <AdminUserDetailPage id={id} />
}
