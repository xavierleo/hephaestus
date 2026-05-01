import type { Recipe } from '../recipes/types.js'
import type { WizardConfig } from '../types/config.js'

export interface WireResult {
  injections: string[]
}

// Phase 2 implementation: cross-inject API keys between services
// e.g. prowlarr → sonarr, radarr; sabnzbd → sonarr, radarr
export async function wireServices(
  _recipes: Recipe[],
  _config: WizardConfig,
  _dryRun: boolean,
): Promise<WireResult> {
  // TODO Phase 2: read generated API keys from seed configs and inject
  // into dependent services' config files
  return { injections: [] }
}
