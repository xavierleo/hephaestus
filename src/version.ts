import { readFileSync } from 'fs'

export function getCliVersion(): string {
  const packageUrl = new URL('../package.json', import.meta.url)
  const parsed = JSON.parse(readFileSync(packageUrl, 'utf-8')) as { version?: unknown }
  if (typeof parsed.version !== 'string' || parsed.version.length === 0) {
    throw new Error('package.json is missing a valid version')
  }
  return parsed.version
}
