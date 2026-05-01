import type { Recipe } from '../../recipes/types.js'

export const MUTEX_GROUPS: Record<string, string[]> = {
  MEDIA_SERVER:    ['jellyfin', 'plex', 'emby'],
  REQUEST_MANAGER: ['seerr', 'jellyseerr'],
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
