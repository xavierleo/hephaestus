import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, statSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { renderEnv, renderGlobalEnv } from '../scaffold/env.js'
import { runScaffold } from '../scaffold/index.js'
import { renderCifsCredentials, renderFstabEntry, credentialsPathForMount } from '../system/nas.js'
import type { WizardConfig } from '../types/config.js'

function makeConfig(overrides: Partial<WizardConfig> = {}): WizardConfig {
  return {
    baseDir: '/tmp/hephaestus-hardening/data',
    stacksDir: '/tmp/hephaestus-hardening/stacks',
    puid: 1000,
    pgid: 1000,
    tz: 'UTC',
    hostIp: '192.168.1.100',
    domain: '',
    dockerRootless: false,
    dockerSocketPath: '/var/run/docker.sock',
    mediaDir: '/tmp/hephaestus-hardening/media',
    hasNas: false,
    nasMountPath: '/mnt/nas',
    hasGpu: false,
    gpuCard: '/dev/dri/card1',
    gpuRender: '/dev/dri/renderD128',
    renderGid: 993,
    selectedServices: ['jellyfin'],
    ...overrides,
  }
}

describe('NAS credential hardening', () => {
  it('renders CIFS credentials separately from fstab entries', () => {
    const credentialsPath = credentialsPathForMount('/mnt/synology-media')
    const credentials = renderCifsCredentials('nas-user', 'super-secret')
    const fstab = renderFstabEntry({
      nasIp: '192.168.1.2',
      nasShare: 'media',
      mountPath: '/mnt/synology-media',
      nasUser: 'nas-user',
      nasPass: 'super-secret',
    }, credentialsPath)

    expect(credentials).toContain('username=nas-user')
    expect(credentials).toContain('password=super-secret')
    expect(fstab).toContain(`credentials=${credentialsPath}`)
    expect(fstab).not.toContain('super-secret')
    expect(fstab).not.toContain('username=nas-user')
  })
})

describe('secret rendering hardening', () => {
  it('rejects newline injection in generated env values', () => {
    const config = makeConfig({ tz: 'UTC\nEVIL=true' })

    expect(() => renderEnv([], config)).toThrow(/Unsafe env value/)
  })

  it('does not include NAS passwords in generated docs or global env', async () => {
    const tmpBase = mkdtempSync(join(tmpdir(), 'heph-hardening-data-'))
    const tmpStacks = mkdtempSync(join(tmpdir(), 'heph-hardening-stacks-'))
    try {
      const config = makeConfig({
        baseDir: tmpBase,
        stacksDir: tmpStacks,
        mediaDir: join(tmpBase, 'media'),
        hasNas: true,
        nasUser: 'nas-user',
        nasPass: 'super-secret',
        selectedServices: ['jellyfin'],
      })

      await runScaffold(config, { dryRun: false })

      expect(renderGlobalEnv(config)).not.toContain('super-secret')
      expect(readFileSync(join(tmpStacks, 'jellyfin', 'SETUP.md'), 'utf-8')).not.toContain('super-secret')
      expect(readFileSync(join(tmpStacks, 'jellyfin', '.env'), 'utf-8')).not.toContain('super-secret')
    } finally {
      rmSync(tmpBase, { recursive: true, force: true })
      rmSync(tmpStacks, { recursive: true, force: true })
    }
  })
})

describe('scaffold path and seed hardening', () => {
  it('rejects relative top-level scaffold paths before writing', async () => {
    await expect(
      runScaffold(makeConfig({ baseDir: 'relative-data' }), { dryRun: false }),
    ).rejects.toThrow(/must be absolute/)
  })

  it('fails instead of rotating API keys when an existing seed cannot be read', async () => {
    const tmpBase = mkdtempSync(join(tmpdir(), 'heph-hardening-data-'))
    const tmpStacks = mkdtempSync(join(tmpdir(), 'heph-hardening-stacks-'))
    try {
      mkdirSync(join(tmpBase, 'sonarr', 'config', 'config.xml'), { recursive: true })

      await expect(
        runScaffold(makeConfig({
          baseDir: tmpBase,
          stacksDir: tmpStacks,
          mediaDir: join(tmpBase, 'media'),
          selectedServices: ['sonarr'],
        }), { dryRun: false }),
      ).rejects.toThrow(/Could not read existing seed config/)
    } finally {
      rmSync(tmpBase, { recursive: true, force: true })
      rmSync(tmpStacks, { recursive: true, force: true })
    }
  })

  it('keeps env files owner-only readable', async () => {
    const tmpBase = mkdtempSync(join(tmpdir(), 'heph-hardening-data-'))
    const tmpStacks = mkdtempSync(join(tmpdir(), 'heph-hardening-stacks-'))
    try {
      await runScaffold(makeConfig({
        baseDir: tmpBase,
        stacksDir: tmpStacks,
        mediaDir: join(tmpBase, 'media'),
      }), { dryRun: false })

      expect(existsSync(join(tmpStacks, 'jellyfin', '.env'))).toBe(true)
      expect(statSync(join(tmpStacks, 'jellyfin', '.env')).mode & 0o777).toBe(0o600)
    } finally {
      rmSync(tmpBase, { recursive: true, force: true })
      rmSync(tmpStacks, { recursive: true, force: true })
    }
  })
})

describe('review risk acknowledgement gate', () => {
  it('requires a separate acknowledgement key before risky non-dry-run scaffolds', () => {
    const reviewSource = readFileSync('src/tui/screens/Review.tsx', 'utf-8')

    expect(reviewSource).toContain('requiresRiskAck')
    expect(reviewSource).toContain("input.toLowerCase() === 'a'")
    expect(reviewSource).toContain('Press a to acknowledge these risks before scaffolding.')
  })
})
