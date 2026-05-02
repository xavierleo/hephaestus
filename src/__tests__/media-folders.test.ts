import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { detectMediaFolders, deriveDefaultMediaFolders } from '../system/media-folders.js'

describe('media folder discovery', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'heph-nas-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('finds media, usenet, and torrent folders across a common NAS layout', () => {
    mkdirSync(join(root, 'media', 'tv'), { recursive: true })
    mkdirSync(join(root, 'media', 'movies'), { recursive: true })
    mkdirSync(join(root, 'media', 'anime'), { recursive: true })
    mkdirSync(join(root, 'torrents'), { recursive: true })
    mkdirSync(join(root, 'usenet'), { recursive: true })

    expect(detectMediaFolders(root)).toEqual({
      mediaDir: join(root, 'media'),
      torrentsDir: join(root, 'torrents'),
      usenetDir: join(root, 'usenet'),
    })
  })

  it('uses sensible fallback paths when a mounted NAS has not been populated yet', () => {
    expect(deriveDefaultMediaFolders(root)).toEqual({
      mediaDir: join(root, 'media'),
      torrentsDir: join(root, 'torrents'),
      usenetDir: join(root, 'usenet'),
    })
  })

  it('does not wander arbitrarily deep through large NAS trees', () => {
    mkdirSync(join(root, 'archive', 'old', 'deep', 'media', 'tv'), { recursive: true })
    mkdirSync(join(root, 'media', 'movies'), { recursive: true })

    expect(detectMediaFolders(root)).toEqual({
      mediaDir: join(root, 'media'),
      torrentsDir: undefined,
      usenetDir: undefined,
    })
  })
})
