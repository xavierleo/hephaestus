import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, existsSync, statSync, readdirSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import { execa } from 'execa'
import { renderCompose } from '../scaffold/compose.js'
import { renderEnv, renderGlobalEnv } from '../scaffold/env.js'
import { createDirectoryOrThrow, runScaffold } from '../scaffold/index.js'
import { allRecipes } from '../recipes/registry.js'
import type { WizardConfig } from '../types/config.js'

function makeTestConfig(overrides: Partial<WizardConfig> = {}): WizardConfig {
  return {
    baseDir: '/tmp/hephaestus-test/data',
    stacksDir: '/tmp/hephaestus-test/stacks',
    puid: 1000,
    pgid: 1000,
    tz: 'UTC',
    hostIp: '192.168.1.100',
    domain: '',
    dockerRootless: false,
    dockerSocketPath: '/var/run/docker.sock',
    mediaDir: '/tmp/hephaestus-test/data/media',
    usenetDir: '/tmp/hephaestus-test/downloads/usenet',
    torrentsDir: '/tmp/hephaestus-test/downloads/torrents',
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

function runTestScaffold(
  config: WizardConfig,
  options: Omit<Parameters<typeof runScaffold>[1], 'ensureNetwork'> = { dryRun: false },
) {
  return runScaffold(config, { ensureNetwork: async () => undefined, ...options })
}

describe('Scaffold: compose.yml YAML validity', () => {
  it('renders valid parseable YAML for every recipe individually', () => {
    const config = makeTestConfig()
    for (const recipe of allRecipes) {
      const yaml = renderCompose([recipe], config)
      expect(
        () => parseYaml(yaml),
        `renderCompose("${recipe.id}") produced invalid YAML`,
      ).not.toThrow()
    }
  })

  it('includes the services key at the top level', () => {
    const config = makeTestConfig()
    const yaml = renderCompose([allRecipes[0]!], config)
    const doc = parseYaml(yaml) as Record<string, unknown>
    expect(doc).toHaveProperty('services')
  })

  it('uses the container_name as the service key', () => {
    const config = makeTestConfig()
    const recipe = allRecipes.find(r => r.id === 'jellyfin')!
    const doc = parseYaml(renderCompose([recipe], config)) as Record<string, Record<string, unknown>>
    expect(Object.keys(doc.services)).toContain(recipe.composeService.container_name)
  })

  it('attaches single-service app stacks to the shared external Docker network', () => {
    const config = makeTestConfig({ selectedServices: ['jellyfin'] })
    const recipe = allRecipes.find(r => r.id === 'jellyfin')!
    const doc = parseYaml(renderCompose([recipe], config)) as {
      services: Record<string, Record<string, unknown>>
      networks?: Record<string, unknown>
    }

    expect(doc.networks).toEqual({ 'cerebro-net': { external: true } })
    expect(doc.services.jellyfin?.networks).toEqual(['cerebro-net'])
  })

  it('does not attach host-network app stacks to Docker bridge networks', () => {
    const config = makeTestConfig({ selectedServices: ['homeassistant'] })
    const recipe = allRecipes.find(r => r.id === 'homeassistant')!
    const doc = parseYaml(renderCompose([recipe], config)) as {
      services: Record<string, Record<string, unknown>>
      networks?: Record<string, unknown>
    }

    expect(doc.networks).toBeUndefined()
    expect(doc.services.homeassistant?.network_mode).toBe('host')
    expect(doc.services.homeassistant?.networks).toBeUndefined()
  })

  it('renders download clients as standalone services unless Gluetun is selected', () => {
    const config = makeTestConfig({ selectedServices: ['sabnzbd'] })
    const recipe = allRecipes.find(r => r.id === 'sabnzbd')!
    const doc = parseYaml(renderCompose([recipe], config)) as Record<string, Record<string, Record<string, unknown>>>
    const service = doc.services.sabnzbd

    expect(service.network_mode).toBeUndefined()
    expect(service.ports).toEqual(['8080:8080'])
  })

  it('routes download clients through the Gluetun container when Gluetun is selected', () => {
    const config = makeTestConfig({ selectedServices: ['gluetun', 'sabnzbd'] })
    const recipe = allRecipes.find(r => r.id === 'sabnzbd')!
    const doc = parseYaml(renderCompose([recipe], config)) as Record<string, Record<string, Record<string, unknown>>>
    const service = doc.services.sabnzbd

    expect(service.network_mode).toBe('container:gluetun')
    expect(service.ports).toBeUndefined()
  })

  it('applies optional Gluetun routing to every non-Gluetun download client', () => {
    const downloadClients = allRecipes.filter(r => r.category === 'download' && r.id !== 'gluetun')

    for (const recipe of downloadClients) {
      const standaloneConfig = makeTestConfig({ selectedServices: [recipe.id] })
      const standalone = parseYaml(renderCompose([recipe], standaloneConfig)) as Record<string, Record<string, Record<string, unknown>>>
      expect(standalone.services[recipe.composeService.container_name]?.network_mode).toBeUndefined()

      const vpnConfig = makeTestConfig({ selectedServices: ['gluetun', recipe.id] })
      const vpnRouted = parseYaml(renderCompose([recipe], vpnConfig)) as Record<string, Record<string, Record<string, unknown>>>
      const service = vpnRouted.services[recipe.composeService.container_name]
      expect(service?.network_mode, `${recipe.id} should route through Gluetun when selected`).toBe('container:gluetun')
      expect(service?.ports, `${recipe.id} should expose UI through Gluetun when selected`).toBeUndefined()
    }
  })

  it('mounts the whole /dev/dri directory for Jellyfin GPU access', () => {
    const config = makeTestConfig({ hasGpu: true, selectedServices: ['jellyfin'] })
    const recipe = allRecipes.find(r => r.id === 'jellyfin')!
    const doc = parseYaml(renderCompose([recipe], config)) as Record<string, Record<string, Record<string, unknown>>>
    const service = doc.services.jellyfin

    expect(service.devices).toEqual(['/dev/dri:/dev/dri'])
    expect(service.devices).not.toContain('/dev/dri/renderD128:/dev/dri/renderD128')
    expect(service.devices).not.toContain('/dev/dri/card1:/dev/dri/card1')
  })

  it('uses the discovered Usenet folder for SABnzbd completed downloads', () => {
    const config = makeTestConfig({ selectedServices: ['sabnzbd'] })
    const recipe = allRecipes.find(r => r.id === 'sabnzbd')!
    const env = renderEnv([recipe], config)

    expect(env).toContain('COMPLETE_DIR=/tmp/hephaestus-test/downloads/usenet')
  })

  it('uses the discovered torrent folder for qBittorrent completed downloads', () => {
    const config = makeTestConfig({ selectedServices: ['qbittorrent'] })
    const recipe = allRecipes.find(r => r.id === 'qbittorrent')!
    const env = renderEnv([recipe], config)

    expect(env).toContain('COMPLETE_DIR=/tmp/hephaestus-test/downloads/torrents')
  })
})

describe('Scaffold: .env format', () => {
  it('renderEnv produces KEY=VALUE lines (no spaces around =)', () => {
    const config = makeTestConfig()
    for (const recipe of allRecipes) {
      const env = renderEnv([recipe], config)
      const dataLines = env.split('\n').filter(l => l && !l.startsWith('#'))
      for (const line of dataLines) {
        expect(line, `Bad .env line in "${recipe.id}": "${line}"`).toMatch(/^[A-Z_][A-Z0-9_]*=/)
      }
    }
  })

  it('renderEnv always includes the shared TZ, PUID, PGID, MEDIA_DIR vars', () => {
    const config = makeTestConfig({ tz: 'Europe/London', puid: 1234, pgid: 5678 })
    const env = renderEnv([], config)
    expect(env).toContain('TZ=Europe/London')
    expect(env).toContain('PUID=1234')
    expect(env).toContain('PGID=5678')
  })

  it('renderGlobalEnv includes all top-level config keys', () => {
    const config = makeTestConfig({ hostIp: '10.0.0.1', domain: 'lab.example.com' })
    const env = renderGlobalEnv(config)
    expect(env).toContain('HOST_IP=10.0.0.1')
    expect(env).toContain('DOMAIN=lab.example.com')
    expect(env).toContain('BASE_DIR=')
    expect(env).toContain('STACKS_DIR=')
  })

  it('secret envVars have an empty value in the .env output', () => {
    const config = makeTestConfig()
    // Find a recipe with a secret envVar
    const withSecret = allRecipes.find(r => r.envVars.some(e => e.secret))
    if (!withSecret) return // no secret envVars in registry — skip

    const env = renderEnv([withSecret], config)
    const secretKey = withSecret.envVars.find(e => e.secret)!.key
    const line = env.split('\n').find(l => l.startsWith(`${secretKey}=`))
    expect(line, `Secret key "${secretKey}" should have empty value`).toBe(`${secretKey}=`)
  })
})

describe('Scaffold: atomic write (integration)', () => {
  let tmpBase: string
  let tmpStacks: string

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'heph-data-'))
    tmpStacks = mkdtempSync(join(tmpdir(), 'heph-stacks-'))
  })

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true })
    rmSync(tmpStacks, { recursive: true, force: true })
  })

  it('writes compose.yml, .env, SETUP.md into a stack subdirectory', async () => {
    const ensureNetwork = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })
    await runScaffold(config, { dryRun: false, ensureNetwork })

    const stackDir = join(tmpStacks, 'jellyfin')
    expect(existsSync(join(stackDir, 'compose.yml'))).toBe(true)
    expect(existsSync(join(stackDir, '.env'))).toBe(true)
    expect(existsSync(join(stackDir, 'SETUP.md'))).toBe(true)
    expect(ensureNetwork).toHaveBeenCalledWith('cerebro-net')
  })

  it('does not create the shared Docker network during dry runs', async () => {
    const ensureNetwork = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })

    await runScaffold(config, { dryRun: true, ensureNetwork })

    expect(ensureNetwork).not.toHaveBeenCalled()
    expect(existsSync(join(tmpStacks, 'jellyfin'))).toBe(false)
  })

  it('fails clearly when the shared Docker network cannot be created', async () => {
    const ensureNetwork = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('docker unavailable'))
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })

    await expect(runScaffold(config, { dryRun: false, ensureNetwork })).rejects.toThrow(
      /Could not create Docker network cerebro-net: docker unavailable/,
    )
  })

  it('creates local docker-services folders referenced by generated app env files', async () => {
    const config = makeTestConfig({
      baseDir: tmpBase,
      stacksDir: tmpStacks,
      selectedServices: ['jellyfin', 'paperless', 'sabnzbd'],
    })

    await runTestScaffold(config, { dryRun: false })

    expect(existsSync(join(tmpBase, 'jellyfin', 'config'))).toBe(true)
    expect(existsSync(join(tmpBase, 'jellyfin', 'cache'))).toBe(true)
    expect(existsSync(join(tmpBase, 'paperless', 'data'))).toBe(true)
    expect(existsSync(join(tmpBase, 'paperless', 'media'))).toBe(true)
    expect(existsSync(join(tmpBase, 'paperless', 'consume'))).toBe(true)
    expect(existsSync(join(tmpBase, 'sabnzbd', 'config'))).toBe(true)
    expect(existsSync(join(tmpBase, 'sabnzbd', 'incomplete'))).toBe(true)
  })

  it('does not create NAS media or download folders while preparing local app directories', async () => {
    const nasRoot = join(tmpBase, '..', 'nas')
    const config = makeTestConfig({
      baseDir: tmpBase,
      stacksDir: tmpStacks,
      hasNas: true,
      mediaDir: join(nasRoot, 'media'),
      usenetDir: join(nasRoot, 'usenet'),
      torrentsDir: join(nasRoot, 'torrents'),
      selectedServices: ['jellyfin', 'sabnzbd', 'qbittorrent'],
    })

    await runTestScaffold(config, { dryRun: false })

    expect(existsSync(join(tmpBase, 'jellyfin', 'config'))).toBe(true)
    expect(existsSync(join(tmpBase, 'sabnzbd', 'config'))).toBe(true)
    expect(existsSync(join(tmpBase, 'qbittorrent', 'config'))).toBe(true)
    expect(existsSync(join(nasRoot, 'media'))).toBe(false)
    expect(existsSync(join(nasRoot, 'usenet'))).toBe(false)
    expect(existsSync(join(nasRoot, 'torrents'))).toBe(false)
  })

  it('writes a parent compose.yml that includes every selected stack', async () => {
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin', 'bazarr'] })
    await runTestScaffold(config, { dryRun: false })

    const rootCompose = join(tmpStacks, 'compose.yml')
    expect(existsSync(rootCompose)).toBe(true)

    const doc = parseYaml(readFileSync(rootCompose, 'utf-8')) as Record<string, unknown>
    expect(doc.include).toEqual([
      './jellyfin/compose.yml',
      './bazarr/compose.yml',
    ])
  })

  it('.env file has mode 0o600 (owner-read/write only)', async () => {
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })
    await runTestScaffold(config, { dryRun: false })

    const envPath = join(tmpStacks, 'jellyfin', '.env')
    const mode = statSync(envPath).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('leaves no .tmp files behind after a successful scaffold', async () => {
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })
    await runTestScaffold(config, { dryRun: false })

    const allFiles = readdirSync(join(tmpStacks, 'jellyfin'))
    const tmpFiles = allFiles.filter(f => f.endsWith('.tmp'))
    expect(tmpFiles).toHaveLength(0)
  })

  it('dryRun mode writes no files', async () => {
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })
    await runTestScaffold(config, { dryRun: true })

    expect(existsSync(join(tmpStacks, 'jellyfin'))).toBe(false)
  })

  it('rejects when an individual recipe cannot be scaffolded after reporting the recipe error', async () => {
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })
    const onProgress = vi.fn()
    const { writeFileSync } = await import('fs')
    writeFileSync(join(tmpBase, 'jellyfin'), 'not a directory', 'utf-8')

    await expect(runScaffold(config, { dryRun: false, onProgress, ensureNetwork: async () => undefined })).rejects.toThrow(
      /Could not create directory for jellyfin/,
    )
    expect(onProgress).toHaveBeenCalledWith('jellyfin', 'error', expect.stringMatching(/Could not create directory/))
  })

  it('re-running scaffold preserves user-edited recipe env var values', async () => {
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })

    // First run
    await runTestScaffold(config, { dryRun: false })

    // Simulate a user changing a recipe env var value (e.g. overriding the default port)
    const envPath = join(tmpStacks, 'jellyfin', '.env')
    const { readFileSync, writeFileSync, chmodSync } = await import('fs')
    const original = readFileSync(envPath, 'utf-8')
    const modified = original.replace(/^JELLYFIN_PORT=.+$/m, 'JELLYFIN_PORT=9999')
    writeFileSync(envPath, modified, 'utf-8')
    chmodSync(envPath, 0o600)

    // Second run — the custom value should survive the merge
    await runTestScaffold(config, { dryRun: false })
    const afterRerun = readFileSync(envPath, 'utf-8')
    expect(afterRerun).toContain('JELLYFIN_PORT=9999')
  })

  it('updates stale generated media and download defaults when NAS folders change', async () => {
    const config = makeTestConfig({
      baseDir: tmpBase,
      stacksDir: tmpStacks,
      hasNas: true,
      nasMountPath: '/mnt/synology-media',
      mediaDir: '/mnt/synology-media/media',
      usenetDir: '/mnt/synology-media/usenet',
      torrentsDir: '/mnt/synology-media/torrents',
      selectedServices: ['sabnzbd', 'qbittorrent'],
    })

    await runTestScaffold(config, { dryRun: false })

    const { readFileSync, writeFileSync, chmodSync } = await import('fs')
    const sabEnvPath = join(tmpStacks, 'sabnzbd', '.env')
    const qbitEnvPath = join(tmpStacks, 'qbittorrent', '.env')

    writeFileSync(
      sabEnvPath,
      readFileSync(sabEnvPath, 'utf-8')
        .replaceAll('/mnt/synology-media/media', `${tmpBase}/media`)
        .replace('COMPLETE_DIR=/mnt/synology-media/usenet', `COMPLETE_DIR=${tmpBase}/media/downloads/complete`),
      'utf-8',
    )
    writeFileSync(
      qbitEnvPath,
      readFileSync(qbitEnvPath, 'utf-8')
        .replaceAll('/mnt/synology-media/media', `${tmpBase}/media`)
        .replace('COMPLETE_DIR=/mnt/synology-media/torrents', `COMPLETE_DIR=${tmpBase}/media/downloads/complete`),
      'utf-8',
    )
    chmodSync(sabEnvPath, 0o600)
    chmodSync(qbitEnvPath, 0o600)

    await runTestScaffold(config, { dryRun: false })

    expect(readFileSync(sabEnvPath, 'utf-8')).toContain('MEDIA_DIR=/mnt/synology-media/media')
    expect(readFileSync(sabEnvPath, 'utf-8')).toContain('COMPLETE_DIR=/mnt/synology-media/usenet')
    expect(readFileSync(qbitEnvPath, 'utf-8')).toContain('MEDIA_DIR=/mnt/synology-media/media')
    expect(readFileSync(qbitEnvPath, 'utf-8')).toContain('COMPLETE_DIR=/mnt/synology-media/torrents')
  })

  it('passes docker compose config for representative generated stack shapes when Docker Compose is available', async () => {
    try {
      await execa('docker', ['compose', 'version'])
    } catch (err) {
      console.warn(`Skipping docker compose config validation: ${err instanceof Error ? err.message : String(err)}`)
      return
    }

    const config = makeTestConfig({
      baseDir: tmpBase,
      stacksDir: tmpStacks,
      hasGpu: true,
      selectedServices: [
        'jellyfin',
        'homeassistant',
        'gluetun',
        'sabnzbd',
        'homepage',
      ],
    })

    await runScaffold(config, { dryRun: false, ensureNetwork: async () => undefined })
    await expect(execa('docker', ['compose', '-f', join(tmpStacks, 'compose.yml'), 'config'])).resolves.toBeDefined()
  })
})

describe('Scaffold: directory errors', () => {
  it('names the exact directory that could not be created', () => {
    expect(() => createDirectoryOrThrow('/dev/null/stacks', 'stacks directory')).toThrow(
      /Could not create stacks directory at \/dev\/null\/stacks:/,
    )
  })
})
