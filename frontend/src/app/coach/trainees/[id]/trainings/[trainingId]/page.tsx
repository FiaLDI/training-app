import { TraineeTrainingPage } from '@/views/coach/ui/trainee-training-page'

type Props = {
  params: Promise<{ id: string; trainingId: string }>
}

export default async function Page({ params }: Props) {
  const { id, trainingId } = await params
  return <TraineeTrainingPage traineeId={id} trainingId={trainingId} />
}
