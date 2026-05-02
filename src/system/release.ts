import { execa } from 'execa'
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'

const REPO = 'xavierleo/hephaestus'

export function isValidReleaseTag(tag: string): boolean {
  return /^v\d+\.\d+\.\d+$/.test(tag)
}

export function assertSafeTarEntries(entries: string[]): void {
  for (const entry of entries) {
    const normalized = entry.replace(/\\/g, '/')
    const parts = normalized.split('/').filter(Boolean)
    if (
      normalized.startsWith('/') ||
      parts.includes('..') ||
      normalized === '.' ||
      normalized.length === 0
    ) {
      throw new Error(`Unsafe tarball entry: ${entry}`)
    }
  }
}

export async function listTarEntries(tarballPath: string): Promise<string[]> {
  const { stdout } = await execa('tar', ['-tzf', tarballPath])
  return stdout.split('\n').filter(Boolean)
}

export interface ReleaseUpdateOptions {
  installDir: string
  binPath: string
  tag?: string
  repo?: string
}

export async function runReleaseUpdate(options: ReleaseUpdateOptions): Promise<void> {
  const repo = options.repo ?? REPO
  const requestedTag = options.tag ?? process.env['HEPHAESTUS_VERSION']
  const tag = requestedTag
    ? `v${String(requestedTag).replace(/^v/, '')}`
    : await resolveLatestReleaseTag(repo)

  if (!isValidReleaseTag(tag)) {
    throw new Error(`Invalid release tag: ${tag}`)
  }

  const version = tag.slice(1)
  const tarball = `hephaestus-${version}.tar.gz`
  const baseUrl = `https://github.com/${repo}/releases/download/${tag}`
  const tmpDir = resolve(options.installDir, '..', `.hephaestus-update-${Date.now()}`)
  const extractDir = join(tmpDir, 'extract')
  const previousDir = `${options.installDir}.previous`

  mkdirSync(extractDir, { recursive: true })
  try {
    await execa('curl', ['-fsSL', '-o', join(tmpDir, tarball), `${baseUrl}/${tarball}`], { stdio: 'inherit' })
    await execa('curl', ['-fsSL', '-o', join(tmpDir, `${tarball}.sha256`), `${baseUrl}/${tarball}.sha256`])
    await execa('sha256sum', ['-c', `${tarball}.sha256`], { cwd: tmpDir, stdio: 'inherit' })

    const entries = await listTarEntries(join(tmpDir, tarball))
    assertSafeTarEntries(entries)
    await execa('tar', ['-xzf', join(tmpDir, tarball), '-C', extractDir])
    await assertReleaseLayout(extractDir)

    if (existsSync(previousDir)) rmSync(previousDir, { recursive: true, force: true })
    if (existsSync(options.installDir)) renameSync(options.installDir, previousDir)
    renameSync(extractDir, options.installDir)
    await execa('npm', ['ci', '--omit=dev', '--silent'], { cwd: options.installDir, stdio: 'inherit' })
    writeWrapper(options.binPath, options.installDir)
    const { stdout } = await execa(options.binPath, ['--version'])
    if (stdout.trim() !== version) {
      throw new Error(`Updated binary reported ${stdout.trim()}, expected ${version}`)
    }
    if (existsSync(previousDir)) rmSync(previousDir, { recursive: true, force: true })
  } catch (err) {
    if (existsSync(options.installDir)) rmSync(options.installDir, { recursive: true, force: true })
    if (existsSync(previousDir)) renameSync(previousDir, options.installDir)
    throw err
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function resolveLatestReleaseTag(repo: string): Promise<string> {
  const { stdout } = await execa('curl', ['-fsSL', `https://api.github.com/repos/${repo}/releases/latest`])
  const parsed = JSON.parse(stdout) as { tag_name?: unknown }
  if (typeof parsed.tag_name !== 'string') throw new Error('Could not resolve latest release tag')
  return parsed.tag_name
}

async function assertReleaseLayout(dir: string): Promise<void> {
  const required = ['dist/index.js', 'install.sh', 'package.json', 'package-lock.json']
  for (const file of required) {
    const path = join(dir, file)
    if (!existsSync(path) || !statSync(path).isFile()) {
      throw new Error(`Release tarball is missing ${file}`)
    }
  }
  const packageVersion = getCliVersionFromDir(dir)
  if (packageVersion.length === 0) throw new Error('Release package has no version')
}

function getCliVersionFromDir(dir: string): string {
  const packagePath = join(dir, 'package.json')
  const parsed = JSON.parse(readFileSync(packagePath, 'utf-8')) as { version?: unknown }
  return typeof parsed.version === 'string' ? parsed.version : ''
}

export function writeWrapper(binPath: string, installDir: string): void {
  mkdirSync(dirname(binPath), { recursive: true })
  const content = `#!/usr/bin/env bash\nexec node "${installDir}/dist/index.js" "$@"\n`
  writeFileSync(binPath, content, 'utf-8')
  chmodSync(binPath, 0o755)
}
