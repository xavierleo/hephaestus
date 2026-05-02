import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('TUI completion screen', () => {
  it('tells users how to start stacks and exit after scaffold completion', () => {
    const appSource = readFileSync('src/tui/screens/Done.tsx', 'utf-8')

    expect(appSource).toContain('cd {config.stacksDir} && docker compose up -d')
    expect(appSource).toContain('Press q to exit')
  })
})

describe('TUI defaults', () => {
  it('uses a user-writable stacks directory by default', () => {
    const appSource = readFileSync('src/tui/App.tsx', 'utf-8')
    const configSource = readFileSync('src/tui/screens/Config.tsx', 'utf-8')

    expect(appSource).toContain('stacksDir: `${defaultHomeDir}/stacks`')
    expect(configSource).toContain('stacksDir: config.stacksDir ?? `${defaultHomeDir}/stacks`')
    expect(appSource).not.toContain("stacksDir: '/opt/stacks'")
    expect(configSource).not.toContain("stacksDir: config.stacksDir ?? '/opt/stacks'")
  })

  it('adds a media folder confirmation screen after NAS configuration', () => {
    const configSource = readFileSync('src/types/config.ts', 'utf-8')
    const appSource = readFileSync('src/tui/App.tsx', 'utf-8')
    const mediaFoldersSource = readFileSync('src/tui/screens/MediaFolders.tsx', 'utf-8')

    expect(configSource).toContain("'MEDIA_FOLDERS'")
    expect(appSource).toContain("prev === 'CONFIG' && !nextConfig.hasNas")
    expect(mediaFoldersSource).toContain('detectMediaFoldersWithFallback')
    expect(mediaFoldersSource).toContain('Usenet completed downloads')
    expect(mediaFoldersSource).toContain('Torrent completed downloads')
    expect(mediaFoldersSource).toContain('not found yet')
  })
})

describe('profile summaries', () => {
  it('show whether NAS is enabled and which path it uses', () => {
    const welcomeSource = readFileSync('src/tui/screens/Welcome.tsx', 'utf-8')
    const profileManagerSource = readFileSync('src/tui/screens/ProfileManager.tsx', 'utf-8')

    expect(welcomeSource).toContain('NAS')
    expect(welcomeSource).toContain('activeProfile.config.hasNas')
    expect(welcomeSource).toContain('activeProfile.config.nasMountPath')
    expect(profileManagerSource).toContain('NAS ')
    expect(profileManagerSource).toContain('profile.config.hasNas')
    expect(profileManagerSource).toContain('profile.config.nasMountPath')
  })
})
