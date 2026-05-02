import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, statSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import { renderCompose } from '../scaffold/compose.js'
import { renderEnv, renderGlobalEnv } from '../scaffold/env.js'
import { runScaffold } from '../scaffold/index.js'
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
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })
    await runScaffold(config, { dryRun: false })

    const stackDir = join(tmpStacks, 'jellyfin')
    expect(existsSync(join(stackDir, 'compose.yml'))).toBe(true)
    expect(existsSync(join(stackDir, '.env'))).toBe(true)
    expect(existsSync(join(stackDir, 'SETUP.md'))).toBe(true)
  })

  it('.env file has mode 0o600 (owner-read/write only)', async () => {
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })
    await runScaffold(config, { dryRun: false })

    const envPath = join(tmpStacks, 'jellyfin', '.env')
    const mode = statSync(envPath).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('leaves no .tmp files behind after a successful scaffold', async () => {
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })
    await runScaffold(config, { dryRun: false })

    const allFiles = readdirSync(join(tmpStacks, 'jellyfin'))
    const tmpFiles = allFiles.filter(f => f.endsWith('.tmp'))
    expect(tmpFiles).toHaveLength(0)
  })

  it('dryRun mode writes no files', async () => {
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })
    await runScaffold(config, { dryRun: true })

    expect(existsSync(join(tmpStacks, 'jellyfin'))).toBe(false)
  })

  it('re-running scaffold preserves user-edited recipe env var values', async () => {
    const config = makeTestConfig({ baseDir: tmpBase, stacksDir: tmpStacks, selectedServices: ['jellyfin'] })

    // First run
    await runScaffold(config, { dryRun: false })

    // Simulate a user changing a recipe env var value (e.g. overriding the default port)
    const envPath = join(tmpStacks, 'jellyfin', '.env')
    const { readFileSync, writeFileSync, chmodSync } = await import('fs')
    const original = readFileSync(envPath, 'utf-8')
    const modified = original.replace(/^JELLYFIN_PORT=.+$/m, 'JELLYFIN_PORT=9999')
    writeFileSync(envPath, modified, 'utf-8')
    chmodSync(envPath, 0o600)

    // Second run — the custom value should survive the merge
    await runScaffold(config, { dryRun: false })
    const afterRerun = readFileSync(envPath, 'utf-8')
    expect(afterRerun).toContain('JELLYFIN_PORT=9999')
  })
})
