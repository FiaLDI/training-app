import { describe, expect, it } from 'vitest'

import { formatTimecodeSeconds, parseTimecodeInput } from './format-timecode'
import { extractYouTubeVideoId, buildYouTubeEmbedUrl } from './youtube'

describe('youtube', () => {
  it('extracts video id from watch url', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
  })

  it('extracts video id from youtu.be url', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts video id from embed url', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
  })

  it('builds embed url with optional start', () => {
    expect(buildYouTubeEmbedUrl('abc123')).toContain('/embed/abc123')
    expect(buildYouTubeEmbedUrl('abc123', 90)).toContain('start=90')
  })
})

describe('format-timecode', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTimecodeSeconds(0)).toBe('0:00')
    expect(formatTimecodeSeconds(65)).toBe('1:05')
    expect(formatTimecodeSeconds(3661)).toBe('61:01')
  })

  it('parses seconds and mm:ss input', () => {
    expect(parseTimecodeInput('90')).toBe(90)
    expect(parseTimecodeInput('1:30')).toBe(90)
    expect(parseTimecodeInput('bad')).toBeNull()
    expect(parseTimecodeInput('1:70')).toBeNull()
  })
})
