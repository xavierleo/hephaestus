import type { SeedContext } from '../../recipes/types.js'

export function generateWireScript(ctx: SeedContext): string {
  const { peers } = ctx
  const sonarrKey = peers.get('sonarr') ?? ''
  const radarrKey = peers.get('radarr') ?? ''
  const prowlarrKey = peers.get('prowlarr') ?? ''
  const sabnzbdKey = peers.get('sabnzbd') ?? ''

  const sabnzbdClientPayload = JSON.stringify({
    name: 'SABnzbd',
    enable: true,
    protocol: 'usenet',
    priority: 1,
    removeCompletedDownloads: true,
    removeFailedDownloads: true,
    fields: [
      { name: 'host', value: 'sabnzbd' },
      { name: 'port', value: 8080 },
      { name: 'apiKey', value: sabnzbdKey },
      { name: 'tvCategory', value: 'tv' },
      { name: 'recentTvPriority', value: -100 },
      { name: 'olderTvPriority', value: -100 },
      { name: 'useSsl', value: false },
    ],
    implementationName: 'Sabnzbd',
    implementation: 'Sabnzbd',
    configContract: 'SabnzbdSettings',
    infoLink: 'https://wiki.servarr.com/sonarr/supported#sabnzbd',
    tags: [],
  })

  const prowlarrSonarrPayload = JSON.stringify({
    syncLevel: 'addOnly',
    name: 'Sonarr',
    fields: [
      { name: 'prowlarrUrl', value: 'http://prowlarr:9696' },
      { name: 'baseUrl', value: 'http://sonarr:8989' },
      { name: 'apiKey', value: sonarrKey },
      { name: 'syncCategories', value: [5000, 5010, 5020, 5030, 5040, 5045, 5050] },
    ],
    implementationName: 'Sonarr',
    implementation: 'Sonarr',
    configContract: 'SonarrSettings',
    tags: [],
  })

  const prowlarrRadarrPayload = JSON.stringify({
    syncLevel: 'addOnly',
    name: 'Radarr',
    fields: [
      { name: 'prowlarrUrl', value: 'http://prowlarr:9696' },
      { name: 'baseUrl', value: 'http://radarr:7878' },
      { name: 'apiKey', value: radarrKey },
      { name: 'syncCategories', value: [2000, 2010, 2020, 2030, 2040, 2045, 2050, 2060, 2070, 2080] },
    ],
    implementationName: 'Radarr',
    implementation: 'Radarr',
    configContract: 'RadarrSettings',
    tags: [],
  })

  return `#!/usr/bin/env bash
set -euo pipefail

# Wire arr stack services together via REST APIs.
# Run this script after all containers are healthy.
# Safe to re-run — existing entries are not duplicated (APIs return 400 on conflict).

SONARR_URL="http://sonarr:8989"
SONARR_KEY="${sonarrKey}"
RADARR_URL="http://radarr:7878"
RADARR_KEY="${radarrKey}"
PROWLARR_URL="http://prowlarr:9696"
PROWLARR_KEY="${prowlarrKey}"
SABNZBD_URL="http://sabnzbd:8080"

echo "Registering SABnzbd as download client in Sonarr..."
curl -sf -X POST "$SONARR_URL/api/v3/downloadclient" \\
  -H "X-Api-Key: $SONARR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${sabnzbdClientPayload}' || echo "  (already registered or failed, continuing)"

echo "Registering SABnzbd as download client in Radarr..."
curl -sf -X POST "$RADARR_URL/api/v3/downloadclient" \\
  -H "X-Api-Key: $RADARR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${sabnzbdClientPayload}' || echo "  (already registered or failed, continuing)"

echo "Registering Sonarr as app in Prowlarr..."
curl -sf -X POST "$PROWLARR_URL/api/v1/applications" \\
  -H "X-Api-Key: $PROWLARR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${prowlarrSonarrPayload}' || echo "  (already registered or failed, continuing)"

echo "Registering Radarr as app in Prowlarr..."
curl -sf -X POST "$PROWLARR_URL/api/v1/applications" \\
  -H "X-Api-Key: $PROWLARR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${prowlarrRadarrPayload}' || echo "  (already registered or failed, continuing)"

echo "Done. Verify connections in each service's UI."
`
}
