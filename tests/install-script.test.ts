import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'

describe('Node.js runtime support', () => {
  it('targets Node.js 24 LTS in package metadata and installer', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8')) as {
      engines?: { node?: string }
    }
    const installScript = readFileSync('install.sh', 'utf-8')

    expect(packageJson.engines?.node).toBe('>=24.0.0')
    expect(installScript).toContain('Node.js 24+')
    expect(installScript).toContain('requires >=24')
    expect(installScript).toContain('fnm install 24 --lts')
    expect(installScript).toContain('fnm use 24')
  })
})
