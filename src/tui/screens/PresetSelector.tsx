import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { WizardConfig } from '../../types/config.js'
import { allPresets } from '../../presets/registry.js'
import type { Preset } from '../../presets/types.js'

interface Props {
  config: Partial<WizardConfig>
  onNext: (updates: Partial<WizardConfig>) => void
  onBack: () => void
}

const DIVIDER = '─'.repeat(71)

export function applyPresetSelection(_currentServices: string[], presetServices: string[]): string[] {
  return [...presetServices]
}

export function PresetSelector({ config, onNext, onBack }: Props) {
  const [cursor, setCursor] = useState(0)
  const preset = allPresets[cursor]

  const choosePreset = (selected: Preset) => {
    onNext({
      selectedServices: applyPresetSelection(config.selectedServices ?? [], selected.services),
    })
  }

  useInput((input, key) => {
    if (key.escape) {
      onBack()
      return
    }

    if (input.toLowerCase() === 's') {
      onNext({ selectedServices: config.selectedServices ?? [] })
      return
    }

    if (key.return && preset) {
      choosePreset(preset)
      return
    }

    if (key.upArrow) {
      setCursor(prev => Math.max(0, prev - 1))
      return
    }

    if (key.downArrow) {
      setCursor(prev => Math.min(allPresets.length - 1, prev + 1))
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Guided presets</Text>
      <Text dimColor>{DIVIDER}</Text>
      <Text dimColor>Choose a starting bundle. You can fine-tune services on the next screen.</Text>

      <Box marginTop={1} flexDirection="column">
        {allPresets.map((p, i) => {
          const isCursor = i === cursor
          return (
            <Box key={p.id} flexDirection="column" marginBottom={1}>
              <Text color={isCursor ? 'cyan' : undefined} bold={isCursor} inverse={isCursor}>
                {p.name}  ({p.services.length} services)
              </Text>
              <Text dimColor>{p.description}</Text>
              <Text dimColor>Services: {p.services.join(', ')}</Text>
              {isCursor && p.notes?.map(note => (
                <Text key={note} color="yellow">Note: {note}</Text>
              ))}
            </Box>
          )
        })}
      </Box>

      <Text dimColor>{DIVIDER}</Text>
      <Box>
        <Text dimColor>↑↓: move   </Text>
        <Text bold>Enter</Text>
        <Text dimColor>: choose   </Text>
        <Text bold>s</Text>
        <Text dimColor>: skip   </Text>
        <Text bold>Esc</Text>
        <Text dimColor>: back</Text>
      </Box>
    </Box>
  )
}
