import { z } from 'zod'
import type { WizardConfig } from '../types/config.js'

export type Category =
  | 'infra'
  | 'media'
  | 'download'
  | 'arr'
  | 'management'
  | 'books'
  | 'dashboard'
  | 'monitoring'
  | 'security'
  | 'homeauto'
  | 'networking'
  | 'dev'
  | 'productivity'

export const CATEGORY_LABELS: Record<Category, string> = {
  infra: 'Infra',
  media: 'Media',
  download: 'Download',
  arr: 'Arr',
  management: 'Management',
  books: 'Books',
  dashboard: 'Dashboard',
  monitoring: 'Monitoring',
  security: 'Security',
  homeauto: 'Home Auto',
  networking: 'Networking',
  dev: 'Dev',
  productivity: 'Productivity',
}

export type Tag =
  | 'arr'
  | 'sqlite'
  | 'needs-gpu'
  | 'needs-gluetun'
  | 'needs-nas'
  | 'rootless-limited'
  | 'network-host'
  | 'privileged'

export interface EnvVar {
  key: string
  description: string
  defaultValue: string | ((config: WizardConfig) => string)
  secret: boolean
  required: boolean
}

export interface ComposeService {
  image: string
  container_name: string
  restart: string
  environment?: string[]
  volumes?: string[]
  ports?: string[]
  network_mode?: string
  networks?: string[]
  devices?: string[]
  group_add?: string[]
  cap_add?: string[]
  cap_drop?: string[]
  security_opt?: string[]
  depends_on?: string[]
  labels?: string[]
  extra_hosts?: string[]
  healthcheck?: {
    test: string[]
    interval: string
    timeout: string
    retries: number
    start_period?: string
  }
  [key: string]: unknown
}

export interface SeedContext {
  config: WizardConfig
  apiKey: string
  peers: ReadonlyMap<string, string>  // serviceId → pre-generated UUID apiKey
}

export interface SeedConfig {
  path: string | ((config: WizardConfig) => string)
  generate: (ctx: SeedContext) => string
}

export interface PostInstallStep {
  title: string
  description: string
  url?: (config: WizardConfig) => string
}

export interface Recipe {
  id: string
  name: string
  description: string
  category: Category
  port: number
  tags: Tag[]
  envVars: EnvVar[]
  composeService: ComposeService
  seedConfigs: SeedConfig[]
  dependsOn: string[]
  postInstall: PostInstallStep[]
  schemaVersion?: string  // bump this when envVars or composeService structure changes
}

// Zod schema for runtime validation of recipe shape
export const EnvVarSchema = z.object({
  key: z.string().min(1),
  description: z.string(),
  defaultValue: z.union([z.string(), z.function()]),
  secret: z.boolean(),
  required: z.boolean(),
})

export const ComposeServiceSchema = z.object({
  image: z.string().min(1),
  container_name: z.string().min(1),
  restart: z.string(),
}).passthrough()

export const RecipeSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Recipe ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['infra', 'media', 'download', 'arr', 'management', 'books', 'dashboard', 'monitoring', 'security', 'homeauto', 'networking', 'dev', 'productivity']),
  port: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  envVars: z.array(EnvVarSchema),
  composeService: ComposeServiceSchema,
  seedConfigs: z.array(z.object({ path: z.union([z.string(), z.function()]), generate: z.function() })),
  dependsOn: z.array(z.string()),
  postInstall: z.array(z.object({ title: z.string(), description: z.string(), url: z.function().optional() })),
  schemaVersion: z.string().optional(),
})

export function validateRecipe(recipe: unknown): Recipe {
  return RecipeSchema.parse(recipe) as Recipe
}

export function resolveEnvValue(envVar: EnvVar, config: WizardConfig): string {
  if (typeof envVar.defaultValue === 'function') {
    return envVar.defaultValue(config)
  }
  return envVar.defaultValue
}
