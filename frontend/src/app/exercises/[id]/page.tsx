import { ExerciseDetailPage } from '@/views/exercises/ui/exercise-detail-page'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <ExerciseDetailPage id={id} />
}
