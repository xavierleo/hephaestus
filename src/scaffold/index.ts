import { mkdirSync, writeFileSync, chmodSync, renameSync, readFileSync, existsSync } from 'fs'
import { isAbsolute, join, relative, resolve } from 'path'
import { parse as parseYaml, stringify } from 'yaml'
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

export interface ScaffoldResult {
  newEnvVars: Map<string, string[]>  // recipeId → list of newly-added env var keys
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
function mergeEnvContent(
  newContent: string,
  existing: Map<string, string>,
  migratableDefaults = new Map<string, Set<string>>(),
): string {
  return newContent.split('\n').map(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const eq = trimmed.indexOf('=')
    if (eq < 0) return line
    const key = trimmed.slice(0, eq)
    const existingVal = existing.get(key)
    if (existingVal !== undefined && existingVal !== '') {
      if (migratableDefaults.get(key)?.has(existingVal)) return line
      return `${key}=${existingVal}`
    }
    return line
  }).join('\n')
}

function findNewEnvKeys(newContent: string, existing: Map<string, string>): string[] {
  const added: string[] = []
  for (const line of newContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq)
    if (!existing.has(key)) added.push(key)
  }
  return added
}

function renderParentCompose(recipes: Recipe[]): string {
  return stringify({
    include: recipes.map(recipe => `./${recipe.id}/compose.yml`),
  })
}

export async function runScaffold(config: WizardConfig, options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { dryRun, onProgress } = options
  const report = (label: string, status: 'running' | 'done' | 'error', detail?: string) =>
    onProgress?.(label, status, detail)
  const newEnvVars = new Map<string, string[]>()

  const selectedRecipes = config.selectedServices
    .map(id => recipeMap.get(id))
    .filter((r): r is Recipe => r !== undefined)

  validateScaffoldConfig(config, selectedRecipes)

  // 1 — System checks (already done in preflight, just report)
  report('System checks', 'done')

  // 2 — Create base directories
  report('Creating directories', 'running')
  if (!dryRun) {
    createDirectoryOrThrow(config.baseDir, 'base data directory')
    createDirectoryOrThrow(config.stacksDir, 'stacks directory')
  }
  report('Creating directories', 'done')

  // 3 — Write _global.env
  report('Writing _global.env', 'running')
  if (!dryRun) {
    atomicWrite(join(config.stacksDir, '_global.env'), renderGlobalEnv(config))
  }
  report('Writing _global.env', 'done')

  // Parent compose file lets `docker compose up -d` work from the stacks directory.
  report('Writing parent compose.yml', 'running')
  if (!dryRun) {
    const composeYml = renderParentCompose(selectedRecipes)
    try {
      parseYaml(composeYml)
    } catch (yamlErr) {
      throw new Error(
        `Generated parent compose.yml is not valid YAML — this is a bug in Hephaestus. ` +
        `Please report it. Error: ${yamlErr instanceof Error ? yamlErr.message : String(yamlErr)}`,
      )
    }
    atomicWrite(join(config.stacksDir, 'compose.yml'), composeYml)
  }
  report('Writing parent compose.yml', 'done')

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
        const existingEnv = parseEnvFile(envPath)
        const addedKeys = findNewEnvKeys(envContent, existingEnv)
        const migratableDefaults = findMigratableEnvDefaults(recipe, config)
        const finalEnv = existingEnv.size > 0 ? mergeEnvContent(envContent, existingEnv, migratableDefaults) : envContent
        if (addedKeys.length > 0) newEnvVars.set(recipe.id, addedKeys)
        atomicWrite(envPath, finalEnv)
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

  return { newEnvVars }
}

function findMigratableEnvDefaults(recipe: Recipe, config: WizardConfig): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  const add = (key: string, value: string | undefined) => {
    if (!value || value === getGeneratedEnvValue(recipe, config, key)) return
    const values = result.get(key) ?? new Set<string>()
    values.add(value)
    result.set(key, values)
  }

  if (config.hasNas) {
    add('MEDIA_DIR', join(config.baseDir, 'media'))
  }

  if (config.usenetDir || config.torrentsDir) {
    add('COMPLETE_DIR', join(config.baseDir, 'media', 'downloads', 'complete'))
    add('COMPLETE_DIR', join(config.mediaDir, 'downloads', 'complete'))
  }

  return result
}

function getGeneratedEnvValue(recipe: Recipe, config: WizardConfig, key: string): string | undefined {
  if (key === 'MEDIA_DIR') return config.mediaDir
  if (key === 'USENET_DIR') return config.usenetDir
  if (key === 'TORRENTS_DIR') return config.torrentsDir

  const envVar = recipe.envVars.find(candidate => candidate.key === key)
  if (!envVar) return undefined
  return typeof envVar.defaultValue === 'function'
    ? envVar.defaultValue(config)
    : envVar.defaultValue
}

export function createDirectoryOrThrow(path: string, label: string): void {
  try {
    mkdirSync(path, { recursive: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isPermission = msg.includes('EACCES') || msg.includes('EPERM')
    throw new Error(
      isPermission
        ? `Permission denied creating ${label} at ${path}. ` +
          `Choose a directory your user owns, or create it first with the right permissions.`
        : `Could not create ${label} at ${path}: ${msg}`,
    )
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
  } catch (err) {
    throw new Error(
      `Could not read existing seed config for ${recipe.id}; refusing to rotate generated API keys. ` +
      `${err instanceof Error ? err.message : String(err)}`,
    )
  }

  return null
}

export function validateScaffoldConfig(config: WizardConfig, recipes: Recipe[]): void {
  for (const [label, value] of Object.entries({
    baseDir: config.baseDir,
    stacksDir: config.stacksDir,
    mediaDir: config.mediaDir,
  })) {
    if (!isAbsolute(value)) {
      throw new Error(`${label} must be absolute: ${value}`)
    }
  }

  for (const recipe of recipes) {
    assertPathInside(join(config.stacksDir, recipe.id), config.stacksDir, `stack path for ${recipe.id}`)
    for (const seed of recipe.seedConfigs) {
      const seedPath = typeof seed.path === 'function'
        ? seed.path(config)
        : join(config.stacksDir, recipe.id, seed.path)
      if (
        !isPathInside(seedPath, config.baseDir) &&
        !isPathInside(seedPath, config.stacksDir)
      ) {
        throw new Error(`Seed path for ${recipe.id} must stay inside baseDir or stacksDir: ${seedPath}`)
      }
    }
  }
}

function assertPathInside(path: string, root: string, label: string): void {
  if (!isPathInside(path, root)) {
    throw new Error(`${label} must stay inside ${root}: ${path}`)
  }
}

function isPathInside(path: string, root: string): boolean {
  const rel = relative(resolve(root), resolve(path))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}
