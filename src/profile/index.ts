import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { WizardConfig } from '../types/config.js'
import { deriveDockerSocketPath } from '../types/config.js'
import type { Profile, ProfileConfig, ProfileStore } from './types.js'
import { emptyStore } from './types.js'

export type { Profile, ProfileConfig, ProfileStore }

const DEFAULT_PROFILES_PATH = path.join(
  os.homedir(), '.config', 'hephaestus', 'profiles.json',
)
const LEGACY_DEFAULT_STACKS_DIR = '/opt/stacks'

function atomicWrite(filePath: string, content: string): void {
  const tmp = `${filePath}.tmp`
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(tmp, content, 'utf-8')
  renameSync(tmp, filePath)
  chmodSync(filePath, 0o600)
}

export function loadProfiles(profilesPath = DEFAULT_PROFILES_PATH): ProfileStore {
  if (!existsSync(profilesPath)) return emptyStore()
  try {
    const raw = readFileSync(profilesPath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('version' in parsed) ||
      (parsed as Record<string, unknown>)['version'] !== 1
    ) {
      console.warn('[hephaestus] profiles.json has unexpected format — starting fresh')
      return emptyStore()
    }
    return parsed as ProfileStore
  } catch {
    console.warn('[hephaestus] Could not read profiles.json — starting fresh')
    return emptyStore()
  }
}

export function getActiveProfile(profilesPath = DEFAULT_PROFILES_PATH): Profile | null {
  const store = loadProfiles(profilesPath)
  if (!store.activeProfile) return null
  return store.profiles[store.activeProfile] ?? null
}

export function getProfile(name: string, profilesPath = DEFAULT_PROFILES_PATH): Profile | null {
  const store = loadProfiles(profilesPath)
  return store.profiles[name] ?? null
}

export function listProfiles(profilesPath = DEFAULT_PROFILES_PATH): string[] {
  return Object.keys(loadProfiles(profilesPath).profiles)
}

export function saveProfile(
  name: string,
  config: Partial<WizardConfig>,
  services: string[],
  description = '',
  profilesPath = DEFAULT_PROFILES_PATH,
  recipeVersions?: Record<string, string>,
): void {
  const store = loadProfiles(profilesPath)
  const now = new Date().toISOString()
  const existing = store.profiles[name]

  const profileConfig: ProfileConfig = {
    baseDir: config.baseDir ?? '',
    stacksDir: config.stacksDir ?? '',
    domain: config.domain ?? '',
    hostIp: config.hostIp ?? '',
    puid: config.puid ?? 1000,
    pgid: config.pgid ?? 1000,
    tz: config.tz ?? 'UTC',
    mediaDir: config.mediaDir ?? '',
    hasNas: config.hasNas ?? false,
    nasMountPath: config.nasMountPath ?? '',
    nasIp: config.nasIp,
    nasShare: config.nasShare,
    nasUser: config.nasUser,
    // nasPass: intentionally omitted — never persisted
    dockerRootless: config.dockerRootless ?? false,
    hasGpu: config.hasGpu ?? false,
    gpuCard: config.gpuCard,
    gpuRender: config.gpuRender,
    renderGid: config.renderGid,
  }

  store.profiles[name] = {
    name,
    description: description || existing?.description || '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    config: profileConfig,
    defaultServices: services,
    recipeVersions: recipeVersions ?? existing?.recipeVersions,
  }

  atomicWrite(profilesPath, JSON.stringify(store, null, 2))
}

export function setActiveProfile(name: string, profilesPath = DEFAULT_PROFILES_PATH): void {
  const store = loadProfiles(profilesPath)
  if (!store.profiles[name]) throw new Error(`Profile "${name}" does not exist`)
  store.activeProfile = name
  atomicWrite(profilesPath, JSON.stringify(store, null, 2))
}

export function deleteProfile(name: string, profilesPath = DEFAULT_PROFILES_PATH): void {
  const store = loadProfiles(profilesPath)
  delete store.profiles[name]
  if (store.activeProfile === name) store.activeProfile = null
  atomicWrite(profilesPath, JSON.stringify(store, null, 2))
}

// Merge a saved profile config with live-detected values.
// Detected values win for hardware/system fields: puid, pgid, tz, gpuCard, gpuRender, renderGid
// Saved values win for user-specified config: baseDir, stacksDir, domain, hostIp, mediaDir, nas*, dockerRootless, hasGpu
export function mergeWithDetected(
  profile: Profile,
  detected: Partial<WizardConfig>,
): WizardConfig {
  const p = profile.config
  const puid = detected.puid ?? p.puid
  const dockerRootless = p.dockerRootless
  const stacksDir = normalizeStacksDir(p.stacksDir, p.baseDir)

  return {
    // saved values win — user explicitly configured these
    baseDir:          p.baseDir,
    stacksDir,
    domain:           p.domain,
    hostIp:           p.hostIp,
    mediaDir:         p.mediaDir,
    hasNas:           p.hasNas,
    nasMountPath:     p.nasMountPath,
    nasIp:            p.nasIp,
    nasShare:         p.nasShare,
    nasUser:          p.nasUser,
    nasPass:          undefined,
    dockerRootless,
    hasGpu:           p.hasGpu,

    // detected values win — reflect current machine's reality
    puid,
    pgid:             detected.pgid      ?? p.pgid,
    tz:               detected.tz        ?? p.tz,
    gpuCard:          detected.gpuCard   ?? p.gpuCard   ?? '',
    gpuRender:        detected.gpuRender ?? p.gpuRender ?? '',
    renderGid:        detected.renderGid ?? p.renderGid ?? 0,

    // derived + from profile
    dockerSocketPath: deriveDockerSocketPath(dockerRootless, puid),
    selectedServices: profile.defaultServices,
  }
}

function normalizeStacksDir(stacksDir: string, baseDir: string): string {
  if (stacksDir !== LEGACY_DEFAULT_STACKS_DIR) return stacksDir
  const parent = path.dirname(baseDir || os.homedir())
  return path.join(parent, 'stacks')
}
