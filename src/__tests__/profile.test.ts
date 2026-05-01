import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { WizardConfig } from '../types/config.js'
import type { Profile } from '../profile/types.js'
import {
  loadProfiles,
  saveProfile,
  setActiveProfile,
  deleteProfile,
  mergeWithDetected,
} from '../profile/index.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePartialConfig(overrides: Partial<WizardConfig> = {}): Partial<WizardConfig> {
  return {
    baseDir: '/home/user/docker',
    stacksDir: '/opt/stacks',
    domain: 'lab.local',
    hostIp: '192.168.1.10',
    puid: 1001,
    pgid: 1001,
    tz: 'America/New_York',
    mediaDir: '/mnt/nas/media',
    hasNas: true,
    nasMountPath: '/mnt/nas',
    nasIp: '192.168.1.20',
    nasShare: 'media',
    nasUser: 'user',
    dockerRootless: false,
    dockerSocketPath: '/var/run/docker.sock',
    hasGpu: true,
    gpuCard: '/dev/dri/card0',
    gpuRender: '/dev/dri/renderD127',
    renderGid: 994,
    selectedServices: ['jellyfin', 'sonarr'],
    ...overrides,
  }
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    name: 'test',
    description: 'Test profile',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    config: {
      baseDir: '/home/user/docker',
      stacksDir: '/opt/stacks',
      domain: 'lab.local',
      hostIp: '192.168.1.10',
      puid: 1001,
      pgid: 1001,
      tz: 'America/New_York',
      mediaDir: '/mnt/nas/media',
      hasNas: true,
      nasMountPath: '/mnt/nas',
      nasIp: '192.168.1.20',
      nasShare: 'media',
      nasUser: 'user',
      dockerRootless: false,
      hasGpu: true,
      gpuCard: '/dev/dri/card0',
      gpuRender: '/dev/dri/renderD127',
      renderGid: 994,
    },
    defaultServices: ['jellyfin', 'sonarr'],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let tmpDir: string
let profilesPath: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'heph-profile-'))
  profilesPath = join(tmpDir, 'profiles.json')
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// loadProfiles
// ---------------------------------------------------------------------------

describe('loadProfiles', () => {
  it('returns empty structure when file does not exist', () => {
    const store = loadProfiles(profilesPath)
    expect(store.version).toBe(1)
    expect(store.activeProfile).toBeNull()
    expect(store.profiles).toEqual({})
  })

  it('returns empty structure and warns when file contains corrupted JSON', () => {
    writeFileSync(profilesPath, '{ this is not json }', 'utf-8')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const store = loadProfiles(profilesPath)

    expect(store.version).toBe(1)
    expect(store.activeProfile).toBeNull()
    expect(store.profiles).toEqual({})
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not read'))

    warnSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// saveProfile
// ---------------------------------------------------------------------------

describe('saveProfile', () => {
  it('creates the profiles file when it does not exist', () => {
    const config = makePartialConfig()
    saveProfile('home', config, ['jellyfin'], 'Home lab', profilesPath)

    const store = loadProfiles(profilesPath)
    expect(store.profiles).toHaveProperty('home')
    expect(store.profiles['home']!.name).toBe('home')
    expect(store.profiles['home']!.defaultServices).toEqual(['jellyfin'])
  })

  it('updates an existing profile without touching other profiles', () => {
    // Save two profiles
    saveProfile('alpha', makePartialConfig({ baseDir: '/alpha' }), ['jellyfin'], 'Alpha', profilesPath)
    saveProfile('beta', makePartialConfig({ baseDir: '/beta' }), ['sonarr'], 'Beta', profilesPath)

    // Update only alpha
    saveProfile('alpha', makePartialConfig({ baseDir: '/alpha-updated' }), ['jellyfin', 'radarr'], 'Alpha updated', profilesPath)

    const store = loadProfiles(profilesPath)
    expect(store.profiles['alpha']!.config.baseDir).toBe('/alpha-updated')
    expect(store.profiles['alpha']!.defaultServices).toEqual(['jellyfin', 'radarr'])
    // beta must be untouched
    expect(store.profiles['beta']!.config.baseDir).toBe('/beta')
    expect(store.profiles['beta']!.defaultServices).toEqual(['sonarr'])
  })

  it('never writes nasPass to disk even when provided in config', () => {
    const config = makePartialConfig({ nasPass: 'supersecret' })
    saveProfile('secured', config, [], '', profilesPath)

    // Re-load the raw file content and check it literally
    const raw = readFileSync(profilesPath, 'utf-8')
    expect(raw).not.toContain('nasPass')
    expect(raw).not.toContain('supersecret')

    // Also verify via the typed store
    const store = loadProfiles(profilesPath)
    const savedConfig = store.profiles['secured']!.config as Record<string, unknown>
    expect(savedConfig).not.toHaveProperty('nasPass')
  })
})

// ---------------------------------------------------------------------------
// setActiveProfile / deleteProfile
// ---------------------------------------------------------------------------

describe('setActiveProfile and deleteProfile', () => {
  it('marks an existing profile as active', () => {
    saveProfile('home', makePartialConfig(), ['jellyfin'], '', profilesPath)
    setActiveProfile('home', profilesPath)

    const store = loadProfiles(profilesPath)
    expect(store.activeProfile).toBe('home')
  })

  it('throws when trying to set a non-existent profile as active', () => {
    expect(() => setActiveProfile('ghost', profilesPath)).toThrow(/"ghost"/)
  })

  it('deleting the active profile clears the activeProfile pointer', () => {
    saveProfile('home', makePartialConfig(), ['jellyfin'], '', profilesPath)
    setActiveProfile('home', profilesPath)

    deleteProfile('home', profilesPath)

    const store = loadProfiles(profilesPath)
    expect(store.activeProfile).toBeNull()
    expect(store.profiles).not.toHaveProperty('home')
  })

  it('deleting a non-active profile does not affect the activeProfile pointer', () => {
    saveProfile('alpha', makePartialConfig(), [], '', profilesPath)
    saveProfile('beta', makePartialConfig(), [], '', profilesPath)
    setActiveProfile('alpha', profilesPath)

    deleteProfile('beta', profilesPath)

    const store = loadProfiles(profilesPath)
    expect(store.activeProfile).toBe('alpha')
    expect(store.profiles).not.toHaveProperty('beta')
  })
})

// ---------------------------------------------------------------------------
// mergeWithDetected
// ---------------------------------------------------------------------------

describe('mergeWithDetected', () => {
  it('detected values win for puid, pgid, tz, gpuCard, gpuRender, renderGid', () => {
    const profile = makeProfile()
    const detected: Partial<WizardConfig> = {
      puid: 2000,
      pgid: 2000,
      tz: 'Europe/London',
      gpuCard: '/dev/dri/card1',
      gpuRender: '/dev/dri/renderD128',
      renderGid: 999,
    }

    const result = mergeWithDetected(profile, detected)

    expect(result.puid).toBe(2000)
    expect(result.pgid).toBe(2000)
    expect(result.tz).toBe('Europe/London')
    expect(result.gpuCard).toBe('/dev/dri/card1')
    expect(result.gpuRender).toBe('/dev/dri/renderD128')
    expect(result.renderGid).toBe(999)
  })

  it('saved values win for baseDir, stacksDir, domain, hostIp, mediaDir', () => {
    const profile = makeProfile()
    const detected: Partial<WizardConfig> = {
      // even if detected had these (unusual, but guard against it)
      puid: 1001,
    }

    const result = mergeWithDetected(profile, detected)

    expect(result.baseDir).toBe(profile.config.baseDir)
    expect(result.stacksDir).toBe(profile.config.stacksDir)
    expect(result.domain).toBe(profile.config.domain)
    expect(result.hostIp).toBe(profile.config.hostIp)
    expect(result.mediaDir).toBe(profile.config.mediaDir)
  })

  it('selectedServices comes from profile.defaultServices', () => {
    const profile = makeProfile({ defaultServices: ['jellyfin', 'sonarr', 'radarr'] })
    const detected: Partial<WizardConfig> = { puid: 1001 }

    const result = mergeWithDetected(profile, detected)

    expect(result.selectedServices).toEqual(['jellyfin', 'sonarr', 'radarr'])
  })

  it('nasPass is undefined in the merged result', () => {
    const profile = makeProfile()
    const detected: Partial<WizardConfig> = { puid: 1001 }

    const result = mergeWithDetected(profile, detected)

    expect(result.nasPass).toBeUndefined()
  })
})
