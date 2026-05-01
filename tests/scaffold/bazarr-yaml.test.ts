import { describe, it, expect } from 'vitest'
import { generateBazarrConfig } from '../../src/scaffold/seed/bazarr-yaml.js'
import type { WizardConfig } from '../../src/types/config.js'
import type { SeedContext } from '../../src/recipes/types.js'

const config: WizardConfig = {
  baseDir: '/home/user/docker-services',
  stacksDir: '/opt/stacks',
  puid: 1000,
  pgid: 1000,
  tz: 'Europe/London',
  hostIp: '192.168.1.10',
  domain: '',
  dockerRootless: false,
  dockerSocketPath: '/var/run/docker.sock',
  mediaDir: '/mnt/nas/media',
  hasNas: true,
  nasMountPath: '/mnt/nas',
  hasGpu: false,
  gpuCard: '',
  gpuRender: '',
  renderGid: 0,
  selectedServices: ['bazarr', 'sonarr', 'radarr'],
}

const ctx: SeedContext = {
  config,
  apiKey: 'bazarr-api-key-123',
  peers: new Map([
    ['sonarr', 'sonarr-api-key-abc'],
    ['radarr', 'radarr-api-key-xyz'],
  ]),
}

describe('generateBazarrConfig', () => {
  it('embeds the Bazarr API key', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('apikey: bazarr-api-key-123')
  })

  it('connects to Sonarr using the Docker service hostname', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('host: sonarr')
  })

  it('connects to Radarr using the Docker service hostname', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('host: radarr')
  })

  it('injects the Sonarr peer API key', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('sonarr-api-key-abc')
  })

  it('injects the Radarr peer API key', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('radarr-api-key-xyz')
  })

  it('uses port 8989 for Sonarr', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('port: 8989')
  })

  it('uses port 7878 for Radarr', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('port: 7878')
  })

  it('sets the correct timezone', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('tz: Europe/London')
  })

  it('enables Sonarr integration', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('use_sonarr: true')
  })

  it('enables Radarr integration', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('use_radarr: true')
  })

  it('uses http base URL for Sonarr and Radarr (no SSL within Docker network)', () => {
    const yaml = generateBazarrConfig(ctx)
    expect(yaml).toContain('base_url: /')
  })
})
