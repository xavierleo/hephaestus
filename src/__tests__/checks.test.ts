import { describe, it, expect } from 'vitest'
import { allRecipes } from '../recipes/registry.js'
import {
  findPortConflicts,
  findMutexViolations,
  findDepWarnings,
  MUTEX_GROUPS,
} from '../tui/utils/review-checks.js'
import type { Recipe } from '../recipes/types.js'

// Minimal Recipe stub for creating collision scenarios
function makeRecipe(id: string, port: number): Recipe {
  return {
    id,
    name: id,
    description: `Test ${id}`,
    category: 'infra',
    port,
    tags: [],
    envVars: [],
    composeService: { image: `${id}:latest`, container_name: id, restart: 'unless-stopped' },
    seedConfigs: [],
    dependsOn: [],
    postInstall: [],
  }
}

describe('findPortConflicts', () => {
  it('returns empty when no services share a port', () => {
    const map = new Map([
      ['svc-a', makeRecipe('svc-a', 8080)],
      ['svc-b', makeRecipe('svc-b', 9090)],
    ])
    expect(findPortConflicts(['svc-a', 'svc-b'], map)).toHaveLength(0)
  })

  it('detects a conflict when two selected services share a port', () => {
    const map = new Map([
      ['svc-a', makeRecipe('svc-a', 8080)],
      ['svc-b', makeRecipe('svc-b', 8080)],
    ])
    const conflicts = findPortConflicts(['svc-a', 'svc-b'], map)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({ port: 8080, a: 'svc-a', b: 'svc-b' })
  })

  it('ignores recipes with port === 0 (no external port)', () => {
    const map = new Map([
      ['svc-a', makeRecipe('svc-a', 0)],
      ['svc-b', makeRecipe('svc-b', 0)],
    ])
    expect(findPortConflicts(['svc-a', 'svc-b'], map)).toHaveLength(0)
  })

  it('ignores services not in the selection', () => {
    const map = new Map([
      ['svc-a', makeRecipe('svc-a', 8080)],
      ['svc-b', makeRecipe('svc-b', 8080)],
    ])
    expect(findPortConflicts(['svc-a'], map)).toHaveLength(0)
  })

  it('returns no conflicts for the real recipe registry when one service is chosen per group', () => {
    const recipeMap = new Map(allRecipes.map(r => [r.id, r]))
    // Pick one from each group — should never conflict
    const onePerGroup = Object.values(MUTEX_GROUPS)
      .map(members => members.find(m => recipeMap.has(m)))
      .filter(Boolean) as string[]

    const conflicts = findPortConflicts(onePerGroup, recipeMap)
    expect(conflicts).toHaveLength(0)
  })
})

describe('findMutexViolations', () => {
  it('returns empty when no group has two members selected', () => {
    expect(findMutexViolations(['jellyfin', 'sonarr'])).toHaveLength(0)
  })

  it('detects a violation when two media servers are selected', () => {
    const violations = findMutexViolations(['jellyfin', 'plex'])
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('MEDIA_SERVER')
    expect(violations[0]).toContain('jellyfin')
    expect(violations[0]).toContain('plex')
  })

  it('detects violations in multiple groups simultaneously', () => {
    const violations = findMutexViolations(['jellyfin', 'plex', 'pihole', 'adguard'])
    expect(violations).toHaveLength(2)
  })

  it('accepts a custom mutexGroups parameter', () => {
    const custom = { TEST_GROUP: ['a', 'b', 'c'] }
    expect(findMutexViolations(['a', 'b'], custom)).toHaveLength(1)
    expect(findMutexViolations(['a'], custom)).toHaveLength(0)
  })

  it('returns no violations when only one service from each group is selected', () => {
    const onePerGroup = Object.values(MUTEX_GROUPS).map(members => members[0]!)
    expect(findMutexViolations(onePerGroup)).toHaveLength(0)
  })
})

describe('findDepWarnings', () => {
  it('returns empty when all dependsOn services are selected', () => {
    const recipeMap = new Map(allRecipes.map(r => [r.id, r]))
    // Sonarr depends on prowlarr; select both
    const sonarr = allRecipes.find(r => r.id === 'sonarr')
    if (!sonarr || sonarr.dependsOn.length === 0) return

    const selection = ['sonarr', ...sonarr.dependsOn]
    const warnings = findDepWarnings(selection, recipeMap)
    const sonarrWarnings = warnings.filter(w => w.startsWith('Sonarr'))
    expect(sonarrWarnings).toHaveLength(0)
  })

  it('warns when a service is selected but its dependency is not', () => {
    const recipeMap = new Map(allRecipes.map(r => [r.id, r]))
    const sonarr = allRecipes.find(r => r.id === 'sonarr')
    if (!sonarr || sonarr.dependsOn.length === 0) return

    const warnings = findDepWarnings(['sonarr'], recipeMap)
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings[0]).toContain('Sonarr')
  })

  it('returns empty for services with no dependsOn', () => {
    const noDepRecipes = allRecipes.filter(r => r.dependsOn.length === 0)
    const recipeMap = new Map(allRecipes.map(r => [r.id, r]))
    const selection = noDepRecipes.map(r => r.id)
    expect(findDepWarnings(selection, recipeMap)).toHaveLength(0)
  })
})
