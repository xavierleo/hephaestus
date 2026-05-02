import { describe, it, expect } from 'vitest'
import { generateSabnzbdIni } from '../../src/scaffold/seed/sabnzbd-ini.js'
import type { WizardConfig } from '../../src/types/config.js'

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
  usenetDir: '/mnt/nas/usenet',
  torrentsDir: '/mnt/nas/torrents',
  hasNas: true,
  nasMountPath: '/mnt/nas',
  hasGpu: false,
  gpuCard: '',
  gpuRender: '',
  renderGid: 0,
  selectedServices: ['sabnzbd', 'sonarr', 'radarr'],
}

describe('generateSabnzbdIni', () => {
  it('embeds the API key in the misc section', () => {
    const ini = generateSabnzbdIni(config, 'my-sab-api-key')
    expect(ini).toContain('apikey = my-sab-api-key')
  })

  it('includes tv download category', () => {
    const ini = generateSabnzbdIni(config, 'any-key')
    expect(ini).toContain('[[tv]]')
  })

  it('includes movies download category', () => {
    const ini = generateSabnzbdIni(config, 'any-key')
    expect(ini).toContain('[[movies]]')
  })

  it('includes music download category', () => {
    const ini = generateSabnzbdIni(config, 'any-key')
    expect(ini).toContain('[[music]]')
  })

  it('includes books download category', () => {
    const ini = generateSabnzbdIni(config, 'any-key')
    expect(ini).toContain('[[books]]')
  })

  it('points tv category dir to the NAS-backed completed downloads subtree', () => {
    const ini = generateSabnzbdIni(config, 'any-key')
    expect(ini).toContain('dir = /mnt/nas/usenet/tv')
  })

  it('points movies category dir to the NAS-backed completed downloads subtree', () => {
    const ini = generateSabnzbdIni(config, 'any-key')
    expect(ini).toContain('dir = /mnt/nas/usenet/movies')
  })

  it('sets the incomplete download dir to the local baseDir — never NAS', () => {
    const ini = generateSabnzbdIni(config, 'any-key')
    // Incomplete dir must be local SSD, not NAS
    expect(ini).toContain('download_dir = /home/user/docker-services/sabnzbd/incomplete')
  })

  it('sets the global complete dir to the shared downloads location', () => {
    const ini = generateSabnzbdIni(config, 'any-key')
    expect(ini).toContain('complete_dir = /mnt/nas/usenet')
  })

  it('listens on port 8080', () => {
    const ini = generateSabnzbdIni(config, 'any-key')
    expect(ini).toContain('port = 8080')
  })

  it('binds to all interfaces so the Gluetun network can reach it', () => {
    const ini = generateSabnzbdIni(config, 'any-key')
    expect(ini).toContain('host = 0.0.0.0')
  })
})
