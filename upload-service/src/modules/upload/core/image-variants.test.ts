import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  generateImageVariants,
  isGeneratedVariantFilename,
  isRasterImageMime,
  variantFilenames,
} from './image-variants'

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

describe('image-variants', () => {
  it('recognizes raster images and generated filenames', () => {
    assert.equal(isRasterImageMime('image/jpeg'), true)
    assert.equal(isRasterImageMime('image/svg+xml'), false)
    assert.equal(isRasterImageMime('video/mp4'), false)
    assert.equal(isGeneratedVariantFilename('abc-thumb.webp'), true)
    assert.equal(isGeneratedVariantFilename('abc-md.webp'), true)
    assert.equal(isGeneratedVariantFilename('abc.jpg'), false)
  })

  it('names variants from the original id', () => {
    assert.deepEqual(variantFilenames('file-id'), {
      thumb: 'file-id-thumb.webp',
      medium: 'file-id-md.webp',
    })
  })

  it('builds webp thumb and medium from a png', async () => {
    const variants = await generateImageVariants({
      id: 'abc',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    })
    assert.equal(variants.length, 2)
    assert.equal(variants[0]?.filename, 'abc-thumb.webp')
    assert.equal(variants[1]?.filename, 'abc-md.webp')
    assert.ok((variants[0]?.buffer.length ?? 0) > 0)
    assert.ok((variants[1]?.buffer.length ?? 0) > 0)
  })

  it('skips video and svg', async () => {
    const variants = await generateImageVariants({
      id: 'abc',
      mimeType: 'video/mp4',
      buffer: PNG_1X1,
    })
    assert.equal(variants.length, 0)
  })
})
