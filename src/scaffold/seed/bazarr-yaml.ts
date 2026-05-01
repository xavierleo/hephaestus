import type { SeedContext } from '../../recipes/types.js'

export function generateBazarrConfig(ctx: SeedContext): string {
  const { config, apiKey, peers } = ctx
  const sonarrKey = peers.get('sonarr') ?? ''
  const radarrKey = peers.get('radarr') ?? ''

  return `---
analytics:
  enabled: false

auth:
  apikey: ${apiKey}
  type: none

general:
  ip: 0.0.0.0
  port: 6767
  base_url: /
  tz: ${config.tz}
  use_sonarr: true
  use_radarr: true

sonarr:
  host: sonarr
  port: 8989
  apikey: ${sonarrKey}
  base_url: /
  ssl: false

radarr:
  host: radarr
  port: 7878
  apikey: ${radarrKey}
  base_url: /
  ssl: false
`
}
