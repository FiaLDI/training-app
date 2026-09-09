import {
  clearPrimaryImage,
  getPrimaryImageUrls,
  getSourceImageUrls,
  withPrimaryImage,
} from './primary-image'

describe('primary-image', () => {
  it('copies variant urls from the source into exercise metadata', () => {
    const metadata = withPrimaryImage(
      { keep: true },
      {
        id: 'src-1',
        url: '/upload/abc.jpg',
        metadata: {
          thumbUrl: '/upload/abc-thumb.webp',
          mediumUrl: '/upload/abc-md.webp',
        },
      },
    )
    expect(metadata).toEqual({
      keep: true,
      primaryImageSourceId: 'src-1',
      primaryImageUrl: '/upload/abc.jpg',
      primaryImageThumbUrl: '/upload/abc-thumb.webp',
      primaryImageMediumUrl: '/upload/abc-md.webp',
    })
  })

  it('clears variant keys when the source has no variants', () => {
    const metadata = withPrimaryImage(
      {
        primaryImageThumbUrl: '/upload/old-thumb.webp',
        primaryImageMediumUrl: '/upload/old-md.webp',
      },
      { id: 'src-2', url: '/upload/new.jpg', metadata: {} },
    )
    expect(metadata.primaryImageUrl).toBe('/upload/new.jpg')
    expect(metadata.primaryImageThumbUrl).toBeUndefined()
    expect(metadata.primaryImageMediumUrl).toBeUndefined()
  })

  it('reads primary and source image urls', () => {
    expect(
      getPrimaryImageUrls({
        id: 'ex-1',
        isSystem: false,
        name: 'Жим',
        description: null,
        muscleGroup: null,
        difficulty: null,
        createdAt: '',
        updatedAt: '',
        metadata: {
          primaryImageUrl: '/upload/abc.jpg',
          primaryImageThumbUrl: '/upload/abc-thumb.webp',
        },
      }),
    ).toEqual({
      src: '/upload/abc.jpg',
      thumbUrl: '/upload/abc-thumb.webp',
      mediumUrl: null,
    })

    expect(
      getSourceImageUrls({
        url: '/upload/abc.jpg',
        metadata: { thumbUrl: '/upload/abc-thumb.webp' },
      }),
    ).toEqual({
      src: '/upload/abc.jpg',
      thumbUrl: '/upload/abc-thumb.webp',
      mediumUrl: null,
    })
  })

  it('clears all primary image keys', () => {
    expect(
      clearPrimaryImage({
        keep: 1,
        primaryImageSourceId: 'src',
        primaryImageUrl: '/upload/a.jpg',
        primaryImageThumbUrl: '/upload/a-thumb.webp',
        primaryImageMediumUrl: '/upload/a-md.webp',
      }),
    ).toEqual({ keep: 1 })
  })
})
