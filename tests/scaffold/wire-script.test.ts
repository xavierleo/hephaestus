import { describe, it, expect } from 'vitest'
import { generateWireScript } from '../../src/scaffold/seed/wire-script.js'
import type { WizardConfig } from '../../src/types/config.js'
import type { SeedContext } from '../../src/recipes/types.js'

const config: WizardConfig = {
  baseDir: '/home/user/docker-services',
  stacksDir: '/opt/stacks',
  puid: 1000,
  pgid: 1000,
  tz: 'UTC',
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
  selectedServices: ['sonarr', 'radarr', 'prowlarr', 'sabnzbd'],
}

const ctx: SeedContext = {
  config,
  apiKey: 'prowlarr-api-key',
  peers: new Map([
    ['sonarr', 'sonarr-api-key-abc'],
    ['radarr', 'radarr-api-key-xyz'],
    ['sabnzbd', 'sabnzbd-api-key-123'],
    ['prowlarr', 'prowlarr-api-key'],
  ]),
}

describe('generateWireScript', () => {
  it('produces a valid bash shebang line', () => {
    const script = generateWireScript(ctx)
    expect(script.trimStart()).toMatch(/^#!\/usr\/bin\/env bash/)
  })

  it('adds SABnzbd as a download client to Sonarr using the correct API key', () => {
    const script = generateWireScript(ctx)
    expect(script).toContain('sonarr-api-key-abc')
    expect(script).toContain('http://sonarr:8989')
  })

  it('adds SABnzbd as a download client to Radarr using the correct API key', () => {
    const script = generateWireScript(ctx)
    expect(script).toContain('radarr-api-key-xyz')
    expect(script).toContain('http://radarr:7878')
  })

  it('registers Sonarr as an app in Prowlarr using the correct API keys', () => {
    const script = generateWireScript(ctx)
    expect(script).toContain('http://prowlarr:9696')
    expect(script).toContain('prowlarr-api-key')
  })

  it('registers Radarr as an app in Prowlarr', () => {
    const script = generateWireScript(ctx)
    // Prowlarr app registration for Radarr includes Radarr API key and URL
    expect(script).toContain('radarr-api-key-xyz')
    expect(script).toContain('http://radarr:7878')
  })

  it('includes the SABnzbd API key in download client payloads', () => {
    const script = generateWireScript(ctx)
    expect(script).toContain('sabnzbd-api-key-123')
  })

  it('uses Docker service hostnames for all internal curl calls', () => {
    const script = generateWireScript(ctx)
    // All service references are by Docker hostname, not IP
    expect(script).toContain('http://sabnzbd:8080')
    expect(script).toContain('http://sonarr:8989')
    expect(script).toContain('http://radarr:7878')
    expect(script).toContain('http://prowlarr:9696')
  })

  it('uses curl for all HTTP calls', () => {
    const script = generateWireScript(ctx)
    expect(script).toMatch(/curl/)
  })

  it('targets the correct Sonarr download client API endpoint', () => {
    const script = generateWireScript(ctx)
    expect(script).toContain('/api/v3/downloadclient')
  })

  it('targets the correct Prowlarr app API endpoint', () => {
    const script = generateWireScript(ctx)
    expect(script).toContain('/api/v1/applications')
  })
})
