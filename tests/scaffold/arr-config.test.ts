import { describe, it, expect } from 'vitest'
import { generateArrConfig } from '../../src/scaffold/seed/arr-config.js'

describe('generateArrConfig', () => {
  it('embeds the service API key in the XML', () => {
    const xml = generateArrConfig('Sonarr', 8989, 'test-api-key-123')
    expect(xml).toContain('<ApiKey>test-api-key-123</ApiKey>')
  })

  it('disables authentication so the UI is accessible without login', () => {
    const xml = generateArrConfig('Sonarr', 8989, 'any-key')
    expect(xml).toContain('<AuthenticationMethod>None</AuthenticationMethod>')
  })

  it('disables SSL — TLS is handled by the reverse proxy', () => {
    const xml = generateArrConfig('Sonarr', 8989, 'any-key')
    expect(xml).toContain('<EnableSsl>False</EnableSsl>')
  })

  it('uses the given port number', () => {
    const xml = generateArrConfig('Radarr', 7878, 'any-key')
    expect(xml).toContain('<Port>7878</Port>')
  })

  it('sets the instance name so the window title shows the right app', () => {
    const xml = generateArrConfig('Prowlarr', 9696, 'any-key')
    expect(xml).toContain('<InstanceName>Prowlarr</InstanceName>')
  })

  it('binds to all interfaces so the container is reachable from Docker network', () => {
    const xml = generateArrConfig('Sonarr', 8989, 'any-key')
    expect(xml).toContain('<BindAddress>*</BindAddress>')
  })

  it('produces well-formed XML starting with a Config root element', () => {
    const xml = generateArrConfig('Sonarr', 8989, 'any-key')
    expect(xml.trimStart()).toMatch(/^<Config>/)
    expect(xml.trimEnd()).toMatch(/<\/Config>$/)
  })
})
