import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'

describe('Node.js runtime support', () => {
  it('targets Node.js 24 LTS in package metadata and installer', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8')) as {
      engines?: { node?: string }
    }
    const installScript = readFileSync('install.sh', 'utf-8')

    expect(packageJson.engines?.node).toBe('>=24.0.0')
    expect(installScript).toContain('nodesource.com/setup_lts.x')
    expect(installScript).toContain('apt-get install -y nodejs')
    expect(installScript).toContain('/usr/bin/node')
  })
})
