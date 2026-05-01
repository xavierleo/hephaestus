import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { WizardConfig } from '../../types/config.js'
import { deriveDockerSocketPath } from '../../types/config.js'

interface Props {
  config: Partial<WizardConfig>
  onNext: (updates: Partial<WizardConfig>) => void
  onBack: () => void
}

type Mode = 'rootful' | 'rootless'

const DIVIDER = '─'.repeat(51)

export function DockerMode({ config, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<Mode>(
    config.dockerRootless ? 'rootless' : 'rootful',
  )

  useInput((_input, key) => {
    if (key.upArrow || key.downArrow) {
      setSelected(prev => (prev === 'rootful' ? 'rootless' : 'rootful'))
    }
    if (key.return) {
      const rootless = selected === 'rootless'
      onNext({
        dockerRootless: rootless,
        dockerSocketPath: deriveDockerSocketPath(rootless, config.puid ?? 1000),
      })
    }
    if (key.escape) onBack()
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Docker mode</Text>
      <Text dimColor>{DIVIDER}</Text>
      <Text dimColor>How should Docker run on this server?</Text>
      <Box marginTop={1} />

      <ModeOption
        active={selected === 'rootful'}
        label="Rootful"
        subtitle="(recommended for most homelabs)"
        lines={[
          'Docker daemon runs as root. Simpler setup.',
          'All features supported including network_mode: host.',
        ]}
      />

      <Box marginTop={1} />

      <ModeOption
        active={selected === 'rootless'}
        label="Rootless"
        lines={[
          'Docker daemon runs as your user.',
          'Better security posture for internet-exposed servers.',
          'Ports < 1024 and GPU access configured automatically.',
          'Note: Portainer CE has limited rootless support — Dockge',
          'is recommended instead.',
        ]}
      />

      <Box marginTop={1}>
        <Text dimColor>↑↓ to select   </Text>
        <Text bold>Enter</Text>
        <Text dimColor> to confirm   </Text>
        <Text bold>Esc</Text>
        <Text dimColor> to go back   </Text>
        <Text bold>q</Text>
        <Text dimColor>: quit</Text>
      </Box>
    </Box>
  )
}

function ModeOption({
  active,
  label,
  subtitle,
  lines,
}: {
  active: boolean
  label: string
  subtitle?: string
  lines: string[]
}) {
  const radio = active ? '●' : '○'
  const color = active ? 'cyan' : undefined
  return (
    <Box flexDirection="column">
      <Box>
        <Text color={color} bold={active}>
          {radio} {label}
        </Text>
        {subtitle && <Text dimColor> {subtitle}</Text>}
      </Box>
      {lines.map((line, i) => (
        <Box key={i} marginLeft={2}>
          <Text dimColor={!active}>{line}</Text>
        </Box>
      ))}
    </Box>
  )
}
