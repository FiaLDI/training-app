import { TraineePage } from '@/views/coach/ui/trainee-page'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <TraineePage traineeId={id} />
}
