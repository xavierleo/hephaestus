import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('TUI completion screen', () => {
  it('tells users how to start stacks and exit after scaffold completion', () => {
    const appSource = readFileSync('src/tui/screens/Done.tsx', 'utf-8')

    expect(appSource).toContain('cd <stack-dir> && docker compose up -d')
    expect(appSource).toContain('Press q to exit')
  })
})
