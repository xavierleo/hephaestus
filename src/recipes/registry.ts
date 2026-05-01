import type { Recipe, Category } from './types.js'

// Infrastructure
import { dockge } from './infra/dockge.js'
import { portainer } from './infra/portainer.js'
import { npm } from './infra/npm.js'
import { beszel } from './infra/beszel.js'

// Media
import { jellyfin } from './media/jellyfin.js'
import { plex } from './media/plex.js'
import { emby } from './media/emby.js'
import { seerr } from './media/seerr.js'

// Download
import { gluetun } from './download/gluetun.js'
import { sabnzbd } from './download/sabnzbd.js'
import { qbittorrent } from './download/qbittorrent.js'
import { nzbget } from './download/nzbget.js'
import { transmission } from './download/transmission.js'

// Arr
import { prowlarr } from './arr/prowlarr.js'
import { sonarr } from './arr/sonarr.js'
import { radarr } from './arr/radarr.js'
import { lidarr } from './arr/lidarr.js'
import { readarr } from './arr/readarr.js'
import { bazarr } from './arr/bazarr.js'
import { whisparr } from './arr/whisparr.js'

// Management
import { fileflows } from './management/fileflows.js'
import { huntarr } from './management/huntarr.js'
import { profilarr } from './management/profilarr.js'
import { tdarr } from './management/tdarr.js'

// Books
import { calibreweb } from './books/calibreweb.js'
import { booklore } from './books/booklore.js'
import { kavita } from './books/kavita.js'
import { komga } from './books/komga.js'

// Dashboard
import { homarr } from './dashboard/homarr.js'
import { homepage } from './dashboard/homepage.js'
import { dashy } from './dashboard/dashy.js'

// Monitoring
import { uptimekuma } from './monitoring/uptime-kuma.js'
import { netdata } from './monitoring/netdata.js'

// Home Automation
import { homeassistant } from './homeauto/homeassistant.js'
import { nodered } from './homeauto/nodered.js'
import { mosquitto } from './homeauto/mosquitto.js'

// Networking
import { pihole } from './networking/pihole.js'
import { adguard } from './networking/adguard.js'
import { wireguard } from './networking/wireguard.js'

// Dev
import { gitea } from './dev/gitea.js'
import { drone } from './dev/drone.js'
import { dockerRegistry } from './dev/docker-registry.js'
import { vscode } from './dev/vscode.js'

// Productivity
import { nextcloud } from './productivity/nextcloud.js'
import { vaultwarden } from './productivity/vaultwarden.js'
import { paperless } from './productivity/paperless.js'
import { mealie } from './productivity/mealie.js'
import { immich } from './productivity/immich.js'

export const allRecipes: Recipe[] = [
  // Infra
  dockge, portainer, npm, beszel,
  // Media
  jellyfin, plex, emby, seerr,
  // Download
  gluetun, sabnzbd, qbittorrent, nzbget, transmission,
  // Arr
  prowlarr, sonarr, radarr, lidarr, readarr, bazarr, whisparr,
  // Management
  fileflows, huntarr, profilarr, tdarr,
  // Books
  calibreweb, booklore, kavita, komga,
  // Dashboard
  homarr, homepage, dashy,
  // Monitoring
  uptimekuma, netdata,
  // Home Automation
  homeassistant, nodered, mosquitto,
  // Networking
  pihole, adguard, wireguard,
  // Dev
  gitea, drone, dockerRegistry, vscode,
  // Productivity
  nextcloud, vaultwarden, paperless, mealie, immich,
]

export const recipeMap: Map<string, Recipe> = new Map(
  allRecipes.map(r => [r.id, r]),
)

export const recipesByCategory: Map<Category, Recipe[]> = new Map()
for (const recipe of allRecipes) {
  const existing = recipesByCategory.get(recipe.category) ?? []
  existing.push(recipe)
  recipesByCategory.set(recipe.category, existing)
}
