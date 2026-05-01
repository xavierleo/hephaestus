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

interface AppProps {
  flags: AppFlags
}

export function App({ flags }: AppProps) {
  const { exit } = useApp()
  const [screen, setScreen] = useState<WizardScreen>('LOADING')
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
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
    runPreflightChecks(stacksDir).then(result => {
      setPreflight(result)
      setConfig(prev => ({
        ...prev,
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
      }))

      if (flags.stacksOnly) {
        setScreen('SERVICE_SELECTOR')
      } else {
        setScreen('WELCOME')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        onNext={() => advance()}
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

  if (screen === 'REVIEW' && preflight) {
    return (
      <Review
        config={config as WizardConfig}
        preflight={preflight}
        flags={flags}
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
        onDone={() => setScreen('DONE')}
      />
    )
  }

  if (screen === 'DONE') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green" bold>✓ Scaffold complete!</Text>
        <Text dimColor>Your stacks are in {config.stacksDir}. Run: docker compose up -d</Text>
      </Box>
    )
  }

  return null
}
