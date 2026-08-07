import { TrainingSessionPage } from '@/views/trainings/ui/training-session-page'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <TrainingSessionPage id={id} />
}
