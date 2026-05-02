import React, { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { Spinner } from '@inkjs/ui'
import type { WizardConfig, AppFlags, WizardScreen } from '../types/config.js'
import { nextScreen, prevScreen, deriveDockerSocketPath } from '../types/config.js'
import type { PreflightResult } from '../system/checks.js'
import { runPreflightChecks } from '../system/checks.js'
import { Welcome } from './screens/Welcome.js'
import { DockerMode } from './screens/DockerMode.js'
import { Config } from './screens/Config.js'
import { ServiceSelector } from './screens/ServiceSelector.js'
import { Review } from './screens/Review.js'
import { Progress } from './screens/Progress.js'
import { getActiveProfile, getProfile, mergeWithDetected, saveProfile, setActiveProfile } from '../profile/index.js'
import { allRecipes } from '../recipes/registry.js'
import type { Profile } from '../profile/types.js'
import { SaveProfile } from './screens/SaveProfile.js'
import { ProfileManager } from './screens/ProfileManager.js'
import { PresetSelector } from './screens/PresetSelector.js'
import { Done } from './screens/Done.js'

interface AppProps {
  flags: AppFlags
}

export function App({ flags }: AppProps) {
  const { exit } = useApp()
  const [screen, setScreen] = useState<WizardScreen>('LOADING')
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null)
  const [loadedProfileName, setLoadedProfileName] = useState<string | null>(null)
  const [config, setConfig] = useState<Partial<WizardConfig>>({
    selectedServices: [],
    baseDir: `/home/${process.env['USER'] ?? 'user'}/docker-services`,
    stacksDir: '/opt/stacks',
    mediaDir: '/mnt/synology-media/media',
    nasMountPath: '/mnt/synology-media',
    hasNas: false,
    domain: '',
  })

  useEffect(() => {
    const stacksDir = config.stacksDir ?? '/opt/stacks'
    setActiveProfileState(getActiveProfile())

    runPreflightChecks(stacksDir).then(result => {
      setPreflight(result)

      const detectedValues: Partial<WizardConfig> = {
        hostIp: result.hostIp,
        puid: result.puid,
        pgid: result.pgid,
        tz: result.tz,
        dockerRootless: result.docker.rootless,
        dockerSocketPath: deriveDockerSocketPath(result.docker.rootless, result.puid),
        hasGpu: result.gpu.detected,
        gpuCard: result.gpu.cardPath,
        gpuRender: result.gpu.renderPath,
        renderGid: result.gpu.renderGid,
      }

      if (flags.profileName) {
        const targetProfile = getProfile(flags.profileName)
        if (targetProfile) {
          const merged = mergeWithDetected(targetProfile, detectedValues)
          setConfig(merged)
          setLoadedProfileName(targetProfile.name)
          setScreen(flags.stacksOnly ? 'PROGRESS' : 'SERVICE_SELECTOR')
          return
        }
        console.warn(`[hephaestus] Profile "${flags.profileName}" not found — starting wizard`)
      }

      setConfig(prev => ({ ...prev, ...detectedValues }))
      setScreen(flags.stacksOnly ? 'SERVICE_SELECTOR' : 'WELCOME')
    })
  }, [])

  const updateConfig = (updates: Partial<WizardConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const advance = (updates?: Partial<WizardConfig>) => {
    if (updates) updateConfig(updates)
    setScreen(prev => nextScreen(prev))
  }

  const goBack = () => {
    setScreen(prev => prevScreen(prev))
  }

  const currentRecipeVersions = (): Record<string, string> => {
    const map: Record<string, string> = {}
    for (const r of allRecipes) {
      map[r.id] = r.schemaVersion ?? '1.0.0'
    }
    return map
  }

  const profileRecipeVersions = loadedProfileName
    ? (getProfile(loadedProfileName)?.recipeVersions ?? null)
    : null

  const handleLoadProfile = () => {
    if (!activeProfile || !preflight) return
    const detectedValues: Partial<WizardConfig> = {
      hostIp: preflight.hostIp,
      puid: preflight.puid,
      pgid: preflight.pgid,
      tz: preflight.tz,
      dockerRootless: preflight.docker.rootless,
      dockerSocketPath: deriveDockerSocketPath(preflight.docker.rootless, preflight.puid),
      hasGpu: preflight.gpu.detected,
      gpuCard: preflight.gpu.cardPath,
      gpuRender: preflight.gpu.renderPath,
      renderGid: preflight.gpu.renderGid,
    }
    const merged = mergeWithDetected(activeProfile, detectedValues)
    setConfig(merged)
    setLoadedProfileName(activeProfile.name)
    setScreen('SERVICE_SELECTOR')
  }

  // Global quit — disabled during scaffolding to avoid partial writes
  useInput((input, key) => {
    if (screen === 'PROGRESS') return
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit()
    }
  })

  if (screen === 'LOADING') {
    return (
      <Box padding={1} gap={1}>
        <Spinner label=" Detecting system…" />
      </Box>
    )
  }

  if (screen === 'WELCOME' && preflight) {
    return (
      <Welcome
        preflight={preflight}
        activeProfile={activeProfile}
        onNext={() => advance()}
        onLoadProfile={handleLoadProfile}
        onManageProfiles={() => setScreen('PROFILE_MANAGER')}
      />
    )
  }

  if (screen === 'DOCKER_MODE') {
    return (
      <DockerMode
        config={config}
        onNext={updates => advance(updates)}
        onBack={goBack}
      />
    )
  }

  if (screen === 'CONFIG') {
    return (
      <Config
        config={config}
        mounts={preflight?.mounts ?? []}
        onNext={updates => advance(updates)}
        onBack={goBack}
      />
    )
  }

  if (screen === 'SERVICE_SELECTOR') {
    return (
      <ServiceSelector
        config={config}
        onNext={updates => advance(updates)}
        onBack={goBack}
      />
    )
  }

  if (screen === 'PRESET_SELECTOR') {
    return (
      <PresetSelector
        config={config}
        onNext={updates => advance(updates)}
        onBack={goBack}
      />
    )
  }

  if (screen === 'REVIEW' && preflight) {
    return (
      <Review
        config={config as WizardConfig}
        preflight={preflight}
        flags={flags}
        profileRecipeVersions={profileRecipeVersions}
        onNext={() => advance()}
        onBack={goBack}
      />
    )
  }

  if (screen === 'PROGRESS') {
    return (
      <Progress
        config={config as WizardConfig}
        flags={flags}
        onDone={() => {
          if (loadedProfileName) {
            saveProfile(loadedProfileName, config, config.selectedServices ?? [], '', undefined, currentRecipeVersions())
            setScreen('DONE')
          } else {
            setScreen('SAVE_PROFILE')
          }
        }}
      />
    )
  }

  if (screen === 'DONE') {
    return <Done config={config as WizardConfig} preflight={preflight} />
  }

  if (screen === 'SAVE_PROFILE') {
    return (
      <SaveProfile
        config={config as WizardConfig}
        onSave={(name, description) => {
          saveProfile(name, config, config.selectedServices ?? [], description, undefined, currentRecipeVersions())
          setActiveProfile(name)
          setScreen('DONE')
        }}
        onSkip={() => setScreen('DONE')}
      />
    )
  }

  if (screen === 'PROFILE_MANAGER') {
    return (
      <ProfileManager
        onDone={() => setScreen('WELCOME')}
      />
    )
  }

  return null
}
