import { existsSync, readFileSync } from 'fs'

export interface MountInfo {
  source: string
  mountPoint: string
  fsType: string
}

export type MountPathStatus =
  | { kind: 'mounted'; message: string; mount: MountInfo }
  | { kind: 'exists'; message: string }
  | { kind: 'missing'; message: string }

export function parseProcMounts(content: string): MountInfo[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [source = '', mountPoint = '', fsType = ''] = line.split(/\s+/)
      return {
        source: decodeMountField(source),
        mountPoint: decodeMountField(mountPoint),
        fsType: decodeMountField(fsType),
      }
    })
    .filter(mount => mount.mountPoint !== '')
}

export function readCurrentMounts(mountsPath = '/proc/mounts'): MountInfo[] {
  try {
    return parseProcMounts(readFileSync(mountsPath, 'utf-8'))
  } catch {
    return []
  }
}

export function findMountAtPath(mounts: readonly MountInfo[], path: string): MountInfo | undefined {
  return mounts.find(mount => mount.mountPoint === path)
}

export function describeMountPath(
  path: string,
  mounts: readonly MountInfo[],
  pathExists: (path: string) => boolean = existsSync,
): MountPathStatus | null {
  if (!path.startsWith('/')) return null
  const mount = findMountAtPath(mounts, path)
  if (mount) {
    return {
      kind: 'mounted',
      mount,
      message: `Already mounted as ${mount.fsType} from ${mount.source}`,
    }
  }
  if (pathExists(path)) {
    return { kind: 'exists', message: 'Path exists but is not mounted yet' }
  }
  return { kind: 'missing', message: 'Path does not exist yet; Hephaestus will create it' }
}

function decodeMountField(value: string): string {
  return value
    .replace(/\\040/g, ' ')
    .replace(/\\011/g, '\t')
    .replace(/\\012/g, '\n')
    .replace(/\\134/g, '\\')
}
