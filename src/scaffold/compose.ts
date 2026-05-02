import { stringify } from 'yaml'
import type { Recipe } from '../recipes/types.js'
import type { WizardConfig } from '../types/config.js'

const SHARED_NETWORK = 'cerebro-net'

export interface ComposeFile {
  services: Record<string, object>
  networks?: Record<string, object>
  volumes?: Record<string, object>
}

export function renderCompose(recipes: Recipe[], config: WizardConfig): string {
  const services: Record<string, object> = {}

  for (const recipe of recipes) {
    services[recipe.composeService.container_name] = buildServiceDefinition(recipe, config)
  }

  const composeFile: ComposeFile = { services }

  // Add the shared app network to every stack that can join Docker bridge networks.
  // Host-network and container-network services cannot also declare networks.
  if (Object.values(services).some(serviceCanJoinSharedNetwork)) {
    composeFile.networks = {
      [SHARED_NETWORK]: { external: true },
    }
    for (const key of Object.keys(services)) {
      const svc = services[key] as Record<string, unknown>
      if (serviceCanJoinSharedNetwork(svc)) {
        svc['networks'] = uniqueNetworks([...(toStringArray(svc['networks']) ?? []), SHARED_NETWORK])
      }
    }
  }

  return stringify(composeFile, {
    lineWidth: 120,
    defaultKeyType: 'PLAIN',
    defaultStringType: 'QUOTE_DOUBLE',
  })
}

function serviceCanJoinSharedNetwork(service: object): boolean {
  const svc = service as Record<string, unknown>
  return typeof svc['network_mode'] !== 'string'
}

function toStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined
}

function uniqueNetworks(networks: string[]): string[] {
  return [...new Set(networks)]
}

function buildServiceDefinition(recipe: Recipe, config: WizardConfig): Record<string, unknown> {
  const svc: Record<string, unknown> = { ...recipe.composeService }

  // Resolve volumes with substituted paths for Portainer compatibility
  // Portainer does not expand ${VARS} in volume definitions, so we substitute
  // literal paths at generation time
  if (Array.isArray(svc['volumes'])) {
    svc['volumes'] = (svc['volumes'] as string[]).map(v => substituteEnvVars(v, recipe, config))
  }

  if (shouldRouteThroughGluetun(recipe, config)) {
    svc['network_mode'] = 'container:gluetun'
    delete svc['ports']
  } else if (svc['network_mode'] === 'service:gluetun' || svc['network_mode'] === 'container:gluetun') {
    delete svc['network_mode']
  }

  // Apply GPU group_add if recipe needs GPU and config has GPU
  if (recipe.tags.includes('needs-gpu') && config.hasGpu) {
    svc['group_add'] = [String(config.renderGid)]
    svc['devices'] = ['/dev/dri:/dev/dri']
  }

  return svc
}

function shouldRouteThroughGluetun(recipe: Recipe, config: WizardConfig): boolean {
  return recipe.category === 'download' &&
    recipe.id !== 'gluetun' &&
    config.selectedServices.includes('gluetun')
}

function substituteEnvVars(value: string, recipe: Recipe, config: WizardConfig): string {
  let result = value
  for (const envVar of recipe.envVars) {
    const resolved = typeof envVar.defaultValue === 'function'
      ? envVar.defaultValue(config)
      : envVar.defaultValue
    result = result.replace(new RegExp(`\\$\\{${envVar.key}\\}`, 'g'), resolved)
  }
  // Substitute common shared vars
  result = result.replace(/\$\{TZ\}/g, config.tz)
  result = result.replace(/\$\{PUID\}/g, String(config.puid))
  result = result.replace(/\$\{PGID\}/g, String(config.pgid))
  result = result.replace(/\$\{MEDIA_DIR\}/g, config.mediaDir)
  return result
}
