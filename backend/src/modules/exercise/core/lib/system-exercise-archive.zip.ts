import JSZip from 'jszip'

import {
  parseSeedArchive,
  parseSeedImagePath,
  type SeedArchive,
} from './system-exercise-archive'

export type UnpackedSeedZip = {
  archive: SeedArchive
  images: Map<string, Buffer>
}

export async function packSeedZip(
  archive: SeedArchive,
  images: Map<string, Buffer>,
): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('exercises.json', JSON.stringify(archive, null, 2))
  for (const [relativePath, bytes] of images) {
    if (!parseSeedImagePath(relativePath)) continue
    zip.file(relativePath, bytes)
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

export async function unpackSeedZip(bytes: Buffer): Promise<UnpackedSeedZip> {
  const zip = await JSZip.loadAsync(bytes)
  const jsonEntry = zip.file('exercises.json')
  if (!jsonEntry) {
    throw new Error('В архиве нет exercises.json')
  }
  const rawText = await jsonEntry.async('string')
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText) as unknown
  } catch {
    throw new Error('Не удалось разобрать exercises.json')
  }
  const archive = parseSeedArchive(parsed)
  const images = new Map<string, Buffer>()

  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue
    const relative = name.replace(/\\/g, '/')
    const parsedPath = parseSeedImagePath(relative)
    if (!parsedPath) continue
    const data = await file.async('nodebuffer')
    images.set(`images/${parsedPath.exerciseId}${parsedPath.ext}`, data)
  }

  return { archive, images }
}
