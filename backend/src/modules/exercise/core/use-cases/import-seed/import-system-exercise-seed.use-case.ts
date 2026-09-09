import { UseCase } from '../../../../../common/core/use-case'
import {
  classifySeedImport,
  PRIMARY_IMAGE_SOURCE_ID_KEY,
  PRIMARY_IMAGE_URL_KEY,
} from '../../lib/system-exercise-archive'
import { unpackSeedZip, type UnpackedSeedZip } from '../../lib/system-exercise-archive.zip'
import { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import { SourceRepositoryPort } from '../../../../source/core/ports/source-repository.port'
import { UploadFileStore } from '../../../infrastructure/upload-file-store'
import {
  ImportSystemExerciseSeedInput,
  ImportSystemExerciseSeedOutput,
} from './interfaces/import-system-exercise-seed.input'

export class ImportSystemExerciseSeedUseCase
  implements UseCase<ImportSystemExerciseSeedInput, ImportSystemExerciseSeedOutput>
{
  constructor(
    private readonly exercises: ExerciseRepositoryPort,
    private readonly sources: SourceRepositoryPort,
    private readonly files: UploadFileStore,
  ) {}

  async execute(input: ImportSystemExerciseSeedInput): Promise<ImportSystemExerciseSeedOutput> {
    return this.apply(await unpackSeedZip(input.bytes))
  }

  async apply({ archive, images }: UnpackedSeedZip): Promise<ImportSystemExerciseSeedOutput> {
    const existing = await this.exercises.listCatalogKeys()
    const { toCreate, skipped } = classifySeedImport(archive.items, existing)
    let imagesAttached = 0

    for (const item of toCreate) {
      const created = await this.exercises.create({
        id: item.id,
        userId: null,
        isSystem: true,
        name: item.name,
        description: item.description,
        muscleGroup: item.muscleGroup,
        difficulty: item.difficulty,
        metadata: item.metadata,
      })

      if (!item.primaryImage) continue
      const bytes = images.get(item.primaryImage)
      if (!bytes) {
        console.warn(`seed import: missing image ${item.primaryImage} for ${item.name}`)
        continue
      }

      const stored = await this.files.writeImage(item.primaryImage, bytes)
      const source = await this.sources.create({
        exerciseId: created.id,
        type: 'image',
        title: item.name,
        url: stored.url,
      })
      await this.exercises.update({
        id: created.id,
        metadata: {
          ...created.metadata,
          [PRIMARY_IMAGE_SOURCE_ID_KEY]: source.id,
          [PRIMARY_IMAGE_URL_KEY]: source.url,
        },
      })
      imagesAttached += 1
    }

    return {
      created: toCreate.length,
      skipped,
      imagesAttached,
    }
  }
}
