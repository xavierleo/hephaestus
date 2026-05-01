import { describe, it, expect } from 'vitest'
import { allRecipes } from '../recipes/registry.js'
import { RecipeSchema } from '../recipes/types.js'
import { MUTEX_GROUPS } from '../tui/utils/review-checks.js'

describe('Recipe registry — IDs', () => {
  it('all recipe IDs are unique', () => {
    const ids = allRecipes.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all recipe IDs are lowercase alphanumeric with hyphens', () => {
    for (const recipe of allRecipes) {
      expect(recipe.id, `Recipe ID "${recipe.id}" contains invalid characters`).toMatch(
        /^[a-z0-9-]+$/,
      )
    }
  })
})

describe('Recipe registry — Zod validation', () => {
  it('every recipe passes the schema', () => {
    for (const recipe of allRecipes) {
      expect(
        () => RecipeSchema.parse(recipe),
        `Recipe "${recipe.id}" failed schema validation`,
      ).not.toThrow()
    }
  })

  it('every recipe has a non-empty name and description', () => {
    for (const recipe of allRecipes) {
      expect(recipe.name.trim(), `Recipe "${recipe.id}" has empty name`).not.toBe('')
      expect(recipe.description.trim(), `Recipe "${recipe.id}" has empty description`).not.toBe('')
    }
  })
})

describe('Recipe registry — cross-recipe references', () => {
  it('all dependsOn entries reference a recipe that exists in the registry', () => {
    const ids = new Set(allRecipes.map(r => r.id))
    for (const recipe of allRecipes) {
      for (const dep of recipe.dependsOn) {
        expect(
          ids.has(dep),
          `Recipe "${recipe.id}" depends on unknown service "${dep}"`,
        ).toBe(true)
      }
    }
  })
})

describe('Recipe registry — port uniqueness', () => {
  it('no two non-mutex-exclusive recipes claim the same non-zero port', () => {
    // Build a canonical set of mutex-paired IDs so we can allow intentional port sharing
    // (e.g. jellyfin and emby both default to 8096 — only one is ever selected)
    const mutexPairs = new Set<string>()
    for (const members of Object.values(MUTEX_GROUPS)) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          mutexPairs.add([members[i]!, members[j]!].sort().join(':'))
        }
      }
    }

    const areMutex = (a: string, b: string) => mutexPairs.has([a, b].sort().join(':'))

    const portOwners = new Map<number, string[]>()
    for (const recipe of allRecipes) {
      if (recipe.port === 0) continue
      const owners = portOwners.get(recipe.port) ?? []
      for (const owner of owners) {
        expect(
          areMutex(owner, recipe.id),
          `Port ${recipe.port} conflict: "${owner}" and "${recipe.id}" are not mutex-exclusive — add them to MUTEX_GROUPS or assign different ports`,
        ).toBe(true)
      }
      portOwners.set(recipe.port, [...owners, recipe.id])
    }
  })
})

describe('Recipe registry — mutex groups', () => {
  it('recipes that appear in multiple mutex groups share no port (sanity check)', () => {
    // If a recipe ID appears in more than one mutex group its port must still be unique.
    // This is already covered by the port-uniqueness test above; this test just documents intent.
    const registeredIds = new Set(allRecipes.map(r => r.id))

    for (const [groupId, members] of Object.entries(MUTEX_GROUPS)) {
      for (const member of members) {
        if (!registeredIds.has(member)) continue // recipe not yet implemented — skip
        const recipe = allRecipes.find(r => r.id === member)!
        expect(typeof recipe.port, `${groupId}/${member} port must be a number`).toBe('number')
      }
    }
  })
})

describe('Recipe registry — Frigate', () => {
  it('registers Frigate as a security camera NVR recipe', () => {
    const frigate = allRecipes.find(r => r.id === 'frigate')

    expect(frigate).toBeDefined()
    expect(frigate).toMatchObject({
      name: 'Frigate',
      category: 'security',
      port: 8971,
      composeService: {
        image: 'ghcr.io/blakeblackshear/frigate:stable',
        container_name: 'frigate',
      },
    })
    expect(frigate?.tags).toContain('needs-gpu')
    expect(frigate?.tags).toContain('privileged')
    expect(frigate?.envVars.some(env => env.key === 'FRIGATE_RTSP_PASSWORD' && env.secret)).toBe(true)
    expect(frigate?.composeService.ports).toEqual(expect.arrayContaining([
      '${FRIGATE_PORT}:8971',
      '${FRIGATE_RTSP_PORT}:8554',
      '${FRIGATE_WEBRTC_PORT}:8555/tcp',
      '${FRIGATE_WEBRTC_PORT}:8555/udp',
    ]))
  })
})
