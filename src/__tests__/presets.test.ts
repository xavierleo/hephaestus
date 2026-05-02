import { describe, expect, it } from 'vitest'
import { allPresets, presetMap, validatePresetServices } from '../presets/registry.js'
import { recipeMap } from '../recipes/registry.js'
import { nextScreen, prevScreen } from '../types/config.js'
import { applyPresetSelection } from '../tui/screens/PresetSelector.js'

describe('preset registry', () => {
  it('has unique non-empty preset ids', () => {
    const ids = allPresets.map(p => p.id)

    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('maps every preset by id', () => {
    for (const preset of allPresets) {
      expect(presetMap.get(preset.id)).toBe(preset)
    }
  })

  it('only references known recipes and every preset has services', () => {
    expect(() => validatePresetServices(recipeMap)).not.toThrow()
    for (const preset of allPresets) {
      expect(preset.services.length, `${preset.id} should include services`).toBeGreaterThan(0)
    }
  })

  it('ships the initial core homelab bundles', () => {
    expect([...presetMap.keys()]).toEqual([
      'media',
      'home-automation',
      'security-nvr',
      'productivity',
      'dev',
      'monitoring',
    ])
    expect(presetMap.get('media')?.services).toEqual([
      'jellyfin',
      'seerr',
      'gluetun',
      'sabnzbd',
      'prowlarr',
      'sonarr',
      'radarr',
      'bazarr',
    ])
  })
})

describe('preset wizard flow', () => {
  it('routes from config to presets to service selection', () => {
    expect(nextScreen('CONFIG')).toBe('MEDIA_FOLDERS')
    expect(nextScreen('MEDIA_FOLDERS')).toBe('PRESET_SELECTOR')
    expect(nextScreen('PRESET_SELECTOR')).toBe('SERVICE_SELECTOR')
    expect(prevScreen('PRESET_SELECTOR')).toBe('MEDIA_FOLDERS')
    expect(prevScreen('MEDIA_FOLDERS')).toBe('CONFIG')
  })

  it('replaces the current service selection when a preset is selected', () => {
    expect(applyPresetSelection(['plex', 'portainer'], ['jellyfin', 'sonarr'])).toEqual(['jellyfin', 'sonarr'])
  })
})
