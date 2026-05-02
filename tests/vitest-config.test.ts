import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'

describe('Vitest workspace hygiene', () => {
  it('excludes local git worktrees from the main test run', () => {
    const config = readFileSync('vitest.config.ts', 'utf-8')

    expect(config).toContain('**/.worktrees/**')
  })
})
