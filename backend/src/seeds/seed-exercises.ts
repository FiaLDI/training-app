import 'reflect-metadata'

import { readFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'

import dataSource from '../../data-source'
import { ExerciseEntity } from '../modules/exercise/core/entity/exercise.entity'
import { ImportSystemExerciseSeedUseCase } from '../modules/exercise/core/use-cases/import-seed/import-system-exercise-seed.use-case'
import { parseSeedArchive } from '../modules/exercise/core/lib/system-exercise-archive'
import { unpackSeedZip, type UnpackedSeedZip } from '../modules/exercise/core/lib/system-exercise-archive.zip'
import { ExerciseTypeormRepository } from '../modules/exercise/infrastructure/exercise.typeorm-repository'
import { UploadFileStore, resolveUploadDir } from '../modules/exercise/infrastructure/upload-file-store'
import { ExerciseSourceEntity } from '../modules/source/core/entity/exercise-source.entity'
import { ExerciseTimecodeEntity } from '../modules/source/core/entity/exercise-timecode.entity'
import { SourceTypeormRepository } from '../modules/source/infrastructure/source.typeorm-repository'

function loadFromSeedDir(dir: string): UnpackedSeedZip {
  const jsonPath = resolve(dir, 'exercises.json')
  if (!existsSync(jsonPath)) {
    throw new Error(`Нет файла ${jsonPath}`)
  }
  const archive = parseSeedArchive(JSON.parse(readFileSync(jsonPath, 'utf8')))
  const images = new Map<string, Buffer>()
  const imagesDir = resolve(dir, 'images')
  if (existsSync(imagesDir)) {
    for (const name of readdirSync(imagesDir)) {
      const relative = `images/${name}`
      images.set(relative, readFileSync(resolve(imagesDir, name)))
    }
  }
  for (const item of archive.items) {
    if (!item.primaryImage) continue
    const abs = resolve(dir, item.primaryImage)
    if (existsSync(abs) && !images.has(item.primaryImage)) {
      images.set(item.primaryImage, readFileSync(abs))
    }
  }
  return { archive, images }
}

async function loadInput(): Promise<UnpackedSeedZip> {
  const zipArg = process.argv[2]
  if (zipArg) {
    return unpackSeedZip(readFileSync(resolve(zipArg)))
  }
  return loadFromSeedDir(resolve(__dirname))
}

async function seedExercises() {
  const unpacked = await loadInput()
  await dataSource.initialize()

  try {
    const exercises = new ExerciseTypeormRepository(dataSource.getRepository(ExerciseEntity))
    const sources = new SourceTypeormRepository(
      dataSource.getRepository(ExerciseSourceEntity),
      dataSource.getRepository(ExerciseTimecodeEntity),
    )
    const files = new UploadFileStore(resolveUploadDir())
    const importer = new ImportSystemExerciseSeedUseCase(exercises, sources, files)
    const result = await importer.apply(unpacked)
    console.log(
      `Done. created=${result.created} skipped=${result.skipped.length} images=${result.imagesAttached}`,
    )
    for (const skip of result.skipped) {
      console.log(`skip  ${skip.name} (${skip.reason})`)
    }
  } finally {
    await dataSource.destroy()
  }
}

seedExercises().catch((error) => {
  console.error('seed:exercises failed', error)
  process.exit(1)
})
