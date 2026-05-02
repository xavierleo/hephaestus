export interface ProfileConfig {
  baseDir: string
  stacksDir: string
  domain: string
  hostIp: string
  puid: number
  pgid: number
  tz: string
  mediaDir: string
  usenetDir?: string
  torrentsDir?: string
  hasNas: boolean
  nasMountPath: string
  nasIp?: string
  nasShare?: string
  nasUser?: string
  // nasPass is NEVER stored
  dockerRootless: boolean
  hasGpu: boolean
  gpuCard?: string
  gpuRender?: string
  renderGid?: number
}

export interface Profile {
  name: string
  description: string
  createdAt: string         // ISO 8601
  updatedAt: string         // ISO 8601
  config: ProfileConfig
  defaultServices: string[] // Recipe IDs selected at last run
  recipeVersions?: Record<string, string> // recipeId → schemaVersion at last save
}

export interface ProfileStore {
  version: 1
  activeProfile: string | null
  profiles: Record<string, Profile>
}

export function emptyStore(): ProfileStore {
  return { version: 1, activeProfile: null, profiles: {} }
}
