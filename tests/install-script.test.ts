import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { getCliVersion } from '../src/version.js'
import { assertSafeTarEntries, isValidReleaseTag } from '../src/system/release.js'

describe('Node.js runtime support', () => {
  it('targets Node.js 24 LTS in package metadata and installer', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8')) as {
      engines?: { node?: string }
    }
    const installScript = readFileSync('install.sh', 'utf-8')

    expect(packageJson.engines?.node).toBe('>=24.0.0')
    expect(installScript).toContain('Node.js 24+')
    expect(installScript).toContain('requires Node.js >=24')
    expect(installScript).toContain('Node.js not found. Installing Node.js 24 with fnm.')
    expect(installScript).toContain('FNM_DIR="${HOME}/.local/share/fnm"')
    expect(installScript).toContain('bash -s -- --install-dir "$FNM_DIR" --skip-shell')
    expect(installScript).toContain('configure_fnm_shell')
    expect(installScript).toContain('eval "$("$FNM_DIR/fnm" env --shell bash)"')
    expect(installScript).toContain('fnm install 24')
    expect(installScript).toContain('fnm use 24')
    expect(installScript).toContain('NODE_BIN="\\$(command -v node || true)"')
    expect(installScript).toContain('exec "\\${NODE_BIN}"')
    expect(installScript).not.toContain('nodesource.com/setup_lts.x')
    expect(installScript).not.toContain('/usr/bin/node')
  })

  it('uses package metadata for the CLI version', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string }

    expect(getCliVersion()).toBe(packageJson.version)
  })
})

describe('release artifact safety', () => {
  it('accepts only semver release tags', () => {
    expect(isValidReleaseTag('v1.2.3')).toBe(true)
    expect(isValidReleaseTag('v1.2.3-beta.1')).toBe(false)
    expect(isValidReleaseTag('1.2.3')).toBe(false)
    expect(isValidReleaseTag('v1.2')).toBe(false)
    expect(isValidReleaseTag('v1.2.3;rm -rf /')).toBe(false)
  })

  it('rejects unsafe tar entries', () => {
    expect(() => assertSafeTarEntries(['dist/index.js', 'install.sh', 'package.json', 'package-lock.json'])).not.toThrow()
    expect(() => assertSafeTarEntries(['/tmp/evil'])).toThrow(/Unsafe tarball entry/)
    expect(() => assertSafeTarEntries(['../evil'])).toThrow(/Unsafe tarball entry/)
    expect(() => assertSafeTarEntries(['dist/../../evil'])).toThrow(/Unsafe tarball entry/)
  })

  it('runs full verification and smoke tests before publishing releases', () => {
    const releaseWorkflow = readFileSync('.github/workflows/release.yml', 'utf-8')

    expect(releaseWorkflow).toContain('npm run typecheck')
    expect(releaseWorkflow).toContain('npm run lint')
    expect(releaseWorkflow).toContain('npm test')
    expect(releaseWorkflow).toContain('npm run build')
    expect(releaseWorkflow).toContain('Smoke test release tarball')
    expect(releaseWorkflow).toContain('node smoke/dist/index.js --version')
    expect(releaseWorkflow).toContain('node smoke/dist/index.js --list')
  })
})
