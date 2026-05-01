import { mkdirSync, writeFileSync, chmodSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { WizardConfig } from '../types/config.js'
import { recipeMap } from '../recipes/registry.js'
import type { Recipe, SeedContext } from '../recipes/types.js'
import { renderCompose } from './compose.js'
import { renderEnv, renderGlobalEnv } from './env.js'
import { writeSeedConfigs } from './seed.js'
import { renderSetupMd } from './docs.js'

export interface ScaffoldOptions {
  dryRun: boolean
  onProgress?: (label: string, status: 'running' | 'done' | 'error', detail?: string) => void
}

export async function runScaffold(config: WizardConfig, options: ScaffoldOptions): Promise<void> {
  const { dryRun, onProgress } = options
  const report = (label: string, status: 'running' | 'done' | 'error', detail?: string) =>
    onProgress?.(label, status, detail)

  const selectedRecipes = config.selectedServices
    .map(id => recipeMap.get(id))
    .filter((r): r is Recipe => r !== undefined)

  // 1 — System checks (already done in preflight, just report)
  report('System checks', 'done')

  // 2 — Create base directories
  report('Creating directories', 'running')
  if (!dryRun) {
    mkdirSync(config.baseDir, { recursive: true })
    mkdirSync(config.stacksDir, { recursive: true })
  }
  report('Creating directories', 'done')

  // 3 — Write _global.env
  report('Writing _global.env', 'running')
  if (!dryRun) {
    writeFileSync(join(config.stacksDir, '_global.env'), renderGlobalEnv(config), 'utf-8')
  }
  report('Writing _global.env', 'done')

  // 4 — Pre-generate one API key per recipe that has seed configs
  const peers = new Map<string, string>()
  for (const recipe of selectedRecipes) {
    if (recipe.seedConfigs.length > 0) {
      peers.set(recipe.id, uuidv4())
    }
  }

  // 5 — Scaffold each selected recipe as its own stack
  for (const recipe of selectedRecipes) {
    report(recipe.id, 'running')

    try {
      const stackDir = join(config.stacksDir, recipe.id)

      if (!dryRun) {
        mkdirSync(stackDir, { recursive: true })
        mkdirSync(join(config.baseDir, recipe.id), { recursive: true })
      }

      // compose.yml
      const composeYml = renderCompose([recipe], config)
      if (!dryRun) {
        writeFileSync(join(stackDir, 'compose.yml'), composeYml, 'utf-8')
      }

      // .env
      const envContent = renderEnv([recipe], config)
      if (!dryRun) {
        writeFileSync(join(stackDir, '.env'), envContent, 'utf-8')
        writeFileSync(join(stackDir, '.gitignore'), '.env\n', 'utf-8')
      }

      // SETUP.md
      const setupMd = renderSetupMd(recipe, config)
      if (!dryRun) {
        writeFileSync(join(stackDir, 'SETUP.md'), setupMd, 'utf-8')
      }

      // Seed configs with full SeedContext (peers map for cross-service key injection)
      const ctx: SeedContext = {
        config,
        apiKey: peers.get(recipe.id) ?? uuidv4(),
        peers,
      }
      const seeded = await writeSeedConfigs(recipe, ctx, stackDir, dryRun)

      // Make wire-services.sh executable
      if (!dryRun && seeded.includes('wire-services.sh')) {
        const wireScriptPath = join(stackDir, 'wire-services.sh')
        chmodSync(wireScriptPath, 0o755)
      }

      const detail = seeded.length > 0 ? `seeded: ${seeded.join(', ')}` : undefined
      report(recipe.id, 'done', detail)
    } catch (err) {
      report(recipe.id, 'error', err instanceof Error ? err.message : String(err))
    }
  }
}
