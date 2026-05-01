import type { Recipe, SeedContext } from '../recipes/types.js'
import type { WizardConfig } from '../types/config.js'
import { mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'

function resolvePath(path: string | ((config: WizardConfig) => string), config: WizardConfig, stackDir: string): string {
  if (typeof path === 'function') return path(config)
  return join(stackDir, path)
}

export async function writeSeedConfigs(
  recipe: Recipe,
  ctx: SeedContext,
  stackDir: string,
  dryRun: boolean,
): Promise<string[]> {
  if (recipe.seedConfigs.length === 0) return []

  const written: string[] = []

  for (const seedConfig of recipe.seedConfigs) {
    const content = seedConfig.generate(ctx)
    const targetPath = resolvePath(seedConfig.path, ctx.config, stackDir)

    if (!dryRun) {
      mkdirSync(dirname(targetPath), { recursive: true })
      writeFileSync(targetPath, content, 'utf-8')
    }

    written.push(targetPath.split('/').pop() ?? targetPath)
  }

  return written
}
