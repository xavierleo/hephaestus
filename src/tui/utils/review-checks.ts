import type { Recipe } from '../../recipes/types.js'

export const MUTEX_GROUPS: Record<string, string[]> = {
  MEDIA_SERVER:    ['jellyfin', 'plex', 'emby'],
  REQUEST_MANAGER: ['seerr'],
  REVERSE_PROXY:   ['npm', 'traefik', 'caddy'],
  STACK_MANAGER:   ['dockge', 'portainer'],
  USENET_CLIENT:   ['sabnzbd', 'nzbget'],
  TORRENT_CLIENT:  ['qbittorrent', 'transmission', 'deluge', 'rutorrent'],
  REENCODER:       ['fileflows', 'tdarr', 'unmanic'],
  DNS_BLOCKER:     ['pihole', 'adguard'],
  GIT_SERVER:      ['gitea', 'forgejo', 'gitlab'],
  PHOTO_MANAGER:   ['immich', 'photoprism', 'pigallery2'],
}

export interface PortConflict {
  port: number
  a: string
  b: string
}

export type RiskSeverity = 'medium' | 'high'

export type RecipeRiskKind =
  | 'privileged'
  | 'docker-socket'
  | 'host-network'
  | 'device'
  | 'capability'
  | 'security-opt'

export interface RecipeRiskFinding {
  recipeId: string
  recipeName: string
  severity: RiskSeverity
  kind: RecipeRiskKind
  message: string
}

export function findPortConflicts(
  selectedIds: string[],
  recipeMap: ReadonlyMap<string, Recipe>,
): PortConflict[] {
  const portOwners = new Map<number, string>()
  const conflicts: PortConflict[] = []

  for (const id of selectedIds) {
    const recipe = recipeMap.get(id)
    if (!recipe || recipe.port === 0) continue
    const existing = portOwners.get(recipe.port)
    if (existing) {
      conflicts.push({ port: recipe.port, a: existing, b: id })
    } else {
      portOwners.set(recipe.port, id)
    }
  }

  return conflicts
}

export function findMutexViolations(
  selectedIds: string[],
  mutexGroups: Record<string, string[]> = MUTEX_GROUPS,
): string[] {
  const violations: string[] = []
  for (const [groupId, members] of Object.entries(mutexGroups)) {
    const selected = members.filter(m => selectedIds.includes(m))
    if (selected.length > 1) {
      violations.push(`${groupId}: ${selected.join(' + ')} are mutually exclusive — pick one`)
    }
  }
  return violations
}

export function findDepWarnings(
  selectedIds: string[],
  recipeMap: ReadonlyMap<string, Recipe>,
): string[] {
  const warnings: string[] = []
  for (const id of selectedIds) {
    const recipe = recipeMap.get(id)
    if (!recipe) continue
    for (const dep of recipe.dependsOn) {
      if (!selectedIds.includes(dep)) {
        const depRecipe = recipeMap.get(dep)
        const depName = depRecipe?.name ?? dep
        warnings.push(
          `${recipe.name} is pre-wired for ${depName} but ${depName} isn't selected — ` +
          `download client / indexer will need manual setup after launch`,
        )
      }
    }
  }
  return warnings
}

export function findRecipeRiskWarnings(
  selectedIds: string[],
  recipeMap: ReadonlyMap<string, Recipe>,
): RecipeRiskFinding[] {
  const findings: RecipeRiskFinding[] = []

  for (const id of selectedIds) {
    const recipe = recipeMap.get(id)
    if (!recipe) continue
    const svc = recipe.composeService
    const add = (severity: RiskSeverity, kind: RecipeRiskKind, message: string) => {
      findings.push({ recipeId: recipe.id, recipeName: recipe.name, severity, kind, message })
    }

    if (recipe.tags.includes('privileged') || svc['privileged'] === true) {
      add('high', 'privileged', `${recipe.name} runs with privileged container access.`)
    }

    if (svc.network_mode === 'host') {
      add('medium', 'host-network', `${recipe.name} uses host networking.`)
    }

    for (const volume of svc.volumes ?? []) {
      if (volume.includes('/var/run/docker.sock')) {
        const readOnly = volume.endsWith(':ro')
        add(
          readOnly ? 'medium' : 'high',
          'docker-socket',
          `${recipe.name} mounts the Docker socket${readOnly ? ' read-only' : ' read-write'}.`,
        )
      }
    }

    for (const device of svc.devices ?? []) {
      if (device.startsWith('/dev/') || device.includes(':/dev/')) {
        add('medium', 'device', `${recipe.name} mounts host device ${device}.`)
      }
    }

    for (const cap of svc.cap_add ?? []) {
      const severity: RiskSeverity = ['SYS_ADMIN', 'SYS_MODULE'].includes(cap) ? 'high' : 'medium'
      add(severity, 'capability', `${recipe.name} adds Linux capability ${cap}.`)
    }

    for (const securityOpt of svc.security_opt ?? []) {
      if (securityOpt.includes('unconfined')) {
        add('high', 'security-opt', `${recipe.name} weakens container confinement with ${securityOpt}.`)
      }
    }
  }

  return findings
}
