import type { Recipe } from '../recipes/types.js'
import type { Preset } from './types.js'

export const allPresets: Preset[] = [
  {
    id: 'media',
    name: 'Media',
    description: 'Streaming, requests, Usenet downloads, indexers, TV, movies, and subtitles.',
    services: ['jellyfin', 'seerr', 'gluetun', 'sabnzbd', 'prowlarr', 'sonarr', 'radarr', 'bazarr'],
    notes: ['Includes Gluetun and SABnzbd; VPN credentials are filled in after scaffold.'],
  },
  {
    id: 'home-automation',
    name: 'Home Automation',
    description: 'Home Assistant with Node-RED automations and MQTT messaging.',
    services: ['homeassistant', 'nodered', 'mosquitto'],
  },
  {
    id: 'security-nvr',
    name: 'Security/NVR',
    description: 'Frigate camera NVR with Home Assistant and MQTT integration points.',
    services: ['frigate', 'homeassistant', 'mosquitto'],
    notes: ['Frigate needs camera and detector configuration after scaffold.'],
  },
  {
    id: 'productivity',
    name: 'Productivity',
    description: 'Files, passwords, documents, recipes, and photos.',
    services: ['nextcloud', 'vaultwarden', 'paperless', 'mealie', 'immich'],
  },
  {
    id: 'dev',
    name: 'Dev',
    description: 'Self-hosted git, CI, registry, and browser-based coding.',
    services: ['gitea', 'drone', 'docker-registry', 'vscode'],
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    description: 'Uptime checks, lightweight server monitoring, metrics, and a dashboard.',
    services: ['uptimekuma', 'beszel', 'netdata', 'homepage'],
  },
]

export const presetMap: Map<string, Preset> = new Map(
  allPresets.map(p => [p.id, p]),
)

export function validatePresetServices(recipeMap: ReadonlyMap<string, Recipe>): void {
  const seen = new Set<string>()
  for (const preset of allPresets) {
    if (!/^[a-z0-9-]+$/.test(preset.id)) {
      throw new Error(`Preset "${preset.id}" has an invalid id`)
    }
    if (seen.has(preset.id)) {
      throw new Error(`Duplicate preset id: ${preset.id}`)
    }
    seen.add(preset.id)
    if (preset.services.length === 0) {
      throw new Error(`Preset "${preset.id}" must include at least one service`)
    }
    for (const serviceId of preset.services) {
      if (!recipeMap.has(serviceId)) {
        throw new Error(`Preset "${preset.id}" references unknown service "${serviceId}"`)
      }
    }
  }
}
