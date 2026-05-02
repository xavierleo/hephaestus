import { readdirSync, statSync } from 'fs'
import * as path from 'path'

export interface MediaFolderHints {
  mediaDir?: string
  usenetDir?: string
  torrentsDir?: string
}

const MAX_DEPTH = 2
const MAX_VISITED = 500

const MEDIA_NAMES = new Set(['media', 'library', 'libraries'])
const MEDIA_CHILD_NAMES = new Set(['tv', 'television', 'series', 'shows', 'movies', 'films', 'anime', 'music', 'books'])
const USENET_NAMES = new Set(['usenet', 'nzb', 'nzbs'])
const TORRENT_NAMES = new Set(['torrents', 'torrent'])

export function deriveDefaultMediaFolders(root: string): Required<MediaFolderHints> {
  return {
    mediaDir: path.join(root, 'media'),
    usenetDir: path.join(root, 'usenet'),
    torrentsDir: path.join(root, 'torrents'),
  }
}

export function detectMediaFolders(root: string): MediaFolderHints {
  const discovered: MediaFolderHints = {}
  const candidates = walkDirectories(root)

  discovered.mediaDir = findBestMediaDir(candidates)
  discovered.usenetDir = findNamedDir(candidates, USENET_NAMES)
  discovered.torrentsDir = findNamedDir(candidates, TORRENT_NAMES)

  return discovered
}

export function detectMediaFoldersWithFallback(root: string): Required<MediaFolderHints> {
  const detected = detectMediaFolders(root)
  const fallback = deriveDefaultMediaFolders(root)

  return {
    mediaDir: detected.mediaDir ?? fallback.mediaDir,
    usenetDir: detected.usenetDir ?? fallback.usenetDir,
    torrentsDir: detected.torrentsDir ?? fallback.torrentsDir,
  }
}

function walkDirectories(root: string): string[] {
  const found: string[] = []
  const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }]
  let visited = 0

  while (queue.length > 0 && visited < MAX_VISITED) {
    const current = queue.shift()
    if (!current) break
    visited += 1

    let entries: string[]
    try {
      entries = readdirSync(current.dir)
    } catch {
      continue
    }

    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const fullPath = path.join(current.dir, entry)
      try {
        if (!statSync(fullPath).isDirectory()) continue
      } catch {
        continue
      }
      found.push(fullPath)
      if (current.depth < MAX_DEPTH) {
        queue.push({ dir: fullPath, depth: current.depth + 1 })
      }
    }
  }

  return found
}

function findNamedDir(candidates: string[], names: Set<string>): string | undefined {
  return candidates
    .filter(candidate => names.has(path.basename(candidate).toLowerCase()))
    .sort(byShallowestThenName)[0]
}

function findBestMediaDir(candidates: string[]): string | undefined {
  const named = findNamedDir(candidates, MEDIA_NAMES)
  if (named) return named

  return candidates
    .map(candidate => ({ candidate, score: countMediaChildren(candidate) }))
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score || byShallowestThenName(a.candidate, b.candidate))[0]
    ?.candidate
}

function countMediaChildren(candidate: string): number {
  try {
    return readdirSync(candidate).filter(entry => MEDIA_CHILD_NAMES.has(entry.toLowerCase())).length
  } catch {
    return 0
  }
}

function byShallowestThenName(a: string, b: string): number {
  const depthDelta = a.split(path.sep).length - b.split(path.sep).length
  if (depthDelta !== 0) return depthDelta
  return a.localeCompare(b)
}
