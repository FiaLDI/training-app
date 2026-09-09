import { UseCase } from '../../../../../common/core/use-case'
import {
  buildSeedArchive,
  dedupeSeedItems,
  parseUploadFilename,
  seedImagePath,
  toSeedExercise,
  PRIMARY_IMAGE_URL_KEY,
} from '../../lib/system-exercise-archive'
import { packSeedZip } from '../../lib/system-exercise-archive.zip'
import { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import { UploadFileStore } from '../../../infrastructure/upload-file-store'
import { ExportSystemExerciseSeedOutput } from './interfaces/export-system-exercise-seed.output'

export class ExportSystemExerciseSeedUseCase
  implements UseCase<void, ExportSystemExerciseSeedOutput>
{
  constructor(
    private readonly exercises: ExerciseRepositoryPort,
    private readonly files: UploadFileStore,
  ) {}

  async execute(): Promise<ExportSystemExerciseSeedOutput> {
    const system = await this.exercises.listSystem()
    const { items: unique } = dedupeSeedItems(system)
    const images = new Map<string, Buffer>()
    const seedItems = []

    for (const exercise of unique) {
      const url = exercise.metadata?.[PRIMARY_IMAGE_URL_KEY]
      const publicUrl = typeof url === 'string' ? url : null
      let primaryImage: string | undefined
      if (publicUrl && parseUploadFilename(publicUrl)) {
        const file = await this.files.readByPublicUrl(publicUrl)
        if (file) {
          primaryImage = seedImagePath(exercise.id, file.filename)
          images.set(primaryImage, file.bytes)
        } else {
          console.warn(`seed export: missing file for ${exercise.name} (${publicUrl})`)
        }
      }
      seedItems.push(
        toSeedExercise({
          id: exercise.id,
          name: exercise.name,
          description: exercise.description,
          muscleGroup: exercise.muscleGroup,
          difficulty: exercise.difficulty,
          metadata: exercise.metadata,
          primaryImage,
        }),
      )
    }

    const archive = buildSeedArchive(seedItems)
    const buffer = await packSeedZip(archive, images)
    const day = archive.exportedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
    return {
      buffer,
      filename: `ironlog-system-exercises-${day}.zip`,
    }
  }
}
