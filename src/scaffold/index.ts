import { mkdirSync, writeFileSync, chmodSync, renameSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { parse as parseYaml } from 'yaml'
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

// Write to .tmp then rename so a failed run never leaves partial files
function atomicWrite(filePath: string, content: string): void {
  const tmp = `${filePath}.tmp`
  writeFileSync(tmp, content, 'utf-8')
  renameSync(tmp, filePath)
}

// Parse an existing .env file into a key→value map (skips comments and blank lines)
function parseEnvFile(filePath: string): Map<string, string> {
  const result = new Map<string, string>()
  if (!existsSync(filePath)) return result
  try {
    for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      result.set(trimmed.slice(0, eq), trimmed.slice(eq + 1))
    }
  } catch { /* ignore unreadable file */ }
  return result
}

// Merge freshly generated .env content with existing values.
// Existing non-empty values win so user edits are never clobbered on re-run.
function mergeEnvContent(newContent: string, existing: Map<string, string>): string {
  return newContent.split('\n').map(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const eq = trimmed.indexOf('=')
    if (eq < 0) return line
    const key = trimmed.slice(0, eq)
    const existingVal = existing.get(key)
    if (existingVal !== undefined && existingVal !== '') {
      return `${key}=${existingVal}`
    }
    return line
  }).join('\n')
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
    try {
      mkdirSync(config.baseDir, { recursive: true })
      mkdirSync(config.stacksDir, { recursive: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isPermission = msg.includes('EACCES') || msg.includes('EPERM')
      throw new Error(
        isPermission
          ? `Permission denied creating ${config.baseDir} or ${config.stacksDir}. ` +
            `Run with sudo, or choose a directory you own (e.g. ~/docker-services).`
          : `Could not create directories: ${msg}`,
      )
    }
  }
  report('Creating directories', 'done')

  // 3 — Write _global.env
  report('Writing _global.env', 'running')
  if (!dryRun) {
    atomicWrite(join(config.stacksDir, '_global.env'), renderGlobalEnv(config))
  }
  report('Writing _global.env', 'done')

  // 4 — Pre-generate one API key per recipe that has seed configs.
  //     If a seed config already exists on disk, read its embedded key so
  //     a re-run doesn't rotate keys for already-running containers.
  const peers = new Map<string, string>()
  for (const recipe of selectedRecipes) {
    if (recipe.seedConfigs.length === 0) continue
    const existingKey = readExistingApiKey(recipe, config)
    peers.set(recipe.id, existingKey ?? crypto.randomUUID())
  }

  // 5 — Scaffold each selected recipe as its own stack
  for (const recipe of selectedRecipes) {
    report(recipe.id, 'running')

    try {
      const stackDir = join(config.stacksDir, recipe.id)

      if (!dryRun) {
        try {
          mkdirSync(stackDir, { recursive: true })
          mkdirSync(join(config.baseDir, recipe.id), { recursive: true })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          const isPermission = msg.includes('EACCES') || msg.includes('EPERM')
          throw new Error(
            isPermission
              ? `Permission denied creating directory for ${recipe.id}. ` +
                `Check that you own ${config.baseDir} and ${config.stacksDir}.`
              : `Could not create directory for ${recipe.id}: ${msg}`,
          )
        }
      }

      // compose.yml — validate YAML before writing to catch generation bugs
      const composeYml = renderCompose([recipe], config)
      if (!dryRun) {
        try {
          parseYaml(composeYml)
        } catch (yamlErr) {
          throw new Error(
            `Generated compose.yml for ${recipe.id} is not valid YAML — this is a bug in Hephaestus. ` +
            `Please report it. Error: ${yamlErr instanceof Error ? yamlErr.message : String(yamlErr)}`,
          )
        }
        atomicWrite(join(stackDir, 'compose.yml'), composeYml)
      }

      // .env — merge with existing values to preserve user edits on re-run
      const envContent = renderEnv([recipe], config)
      if (!dryRun) {
        const envPath = join(stackDir, '.env')
        const existing = parseEnvFile(envPath)
        const finalEnv = existing.size > 0 ? mergeEnvContent(envContent, existing) : envContent
        atomicWrite(envPath, finalEnv)
        // Secrets live here — never world-readable
        chmodSync(envPath, 0o600)
        atomicWrite(join(stackDir, '.gitignore'), '.env\n')
      }

      // SETUP.md
      const setupMd = renderSetupMd(recipe, config)
      if (!dryRun) {
        atomicWrite(join(stackDir, 'SETUP.md'), setupMd)
      }

      // Seed configs with full SeedContext (peers map for cross-service key injection)
      const ctx: SeedContext = {
        config,
        apiKey: peers.get(recipe.id) ?? crypto.randomUUID(),
        peers,
      }
      const seeded = await writeSeedConfigs(recipe, ctx, stackDir, dryRun)

      // Make wire-services.sh executable
      if (!dryRun && seeded.includes('wire-services.sh')) {
        chmodSync(join(stackDir, 'wire-services.sh'), 0o755)
      }

      const detail = seeded.length > 0 ? `seeded: ${seeded.join(', ')}` : undefined
      report(recipe.id, 'done', detail)
    } catch (err) {
      report(recipe.id, 'error', err instanceof Error ? err.message : String(err))
    }
  }
}

// Try to read the API key already embedded in the first seed config on disk,
// so a re-run doesn't rotate keys that already-running containers know about.
function readExistingApiKey(recipe: Recipe, config: WizardConfig): string | null {
  const firstSeed = recipe.seedConfigs[0]
  if (!firstSeed) return null

  try {
    const seedPath = typeof firstSeed.path === 'function'
      ? firstSeed.path(config)
      : join(config.stacksDir, recipe.id, firstSeed.path)

    if (!existsSync(seedPath)) return null
    const content = readFileSync(seedPath, 'utf-8')

    // arr config.xml
    const xmlMatch = content.match(/<ApiKey>([^<]+)<\/ApiKey>/)
    if (xmlMatch?.[1]) return xmlMatch[1]

    // sabnzbd.ini
    const iniMatch = content.match(/^apikey\s*=\s*(.+)$/m)
    if (iniMatch?.[1]) return iniMatch[1].trim()

    // bazarr config.yaml
    const yamlMatch = content.match(/^apikey:\s*(.+)$/m)
    if (yamlMatch?.[1]) return yamlMatch[1].trim()
  } catch { /* seed file unreadable — generate fresh key */ }

  return null
}
