import { stringify } from 'yaml'
import type { Recipe } from '../recipes/types.js'
import type { WizardConfig } from '../types/config.js'

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

  // Add shared network if multiple services
  if (recipes.length > 1) {
    composeFile.networks = {
      'cerebro-net': { external: true },
    }
    for (const key of Object.keys(services)) {
      const svc = services[key] as Record<string, unknown>
      svc['networks'] = ['cerebro-net']
    }
  }

  return stringify(composeFile, {
    lineWidth: 120,
    defaultKeyType: 'PLAIN',
    defaultStringType: 'QUOTE_DOUBLE',
  })
}

function buildServiceDefinition(recipe: Recipe, config: WizardConfig): Record<string, unknown> {
  const svc: Record<string, unknown> = { ...recipe.composeService }

  // Resolve volumes with substituted paths for Portainer compatibility
  // Portainer does not expand ${VARS} in volume definitions, so we substitute
  // literal paths at generation time
  if (Array.isArray(svc['volumes'])) {
    svc['volumes'] = (svc['volumes'] as string[]).map(v => substituteEnvVars(v, recipe, config))
  }

  // Apply GPU group_add if recipe needs GPU and config has GPU
  if (recipe.tags.includes('needs-gpu') && config.hasGpu) {
    svc['group_add'] = [String(config.renderGid)]
    svc['devices'] = [
      `${config.gpuRender}:${config.gpuRender}`,
      `${config.gpuCard}:${config.gpuCard}`,
    ]
  }

  return svc
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
