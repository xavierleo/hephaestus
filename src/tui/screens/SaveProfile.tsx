import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { WizardConfig } from '../../types/config.js'

interface Props {
  config: WizardConfig
  onSave: (name: string, description: string) => void
  onSkip: () => void
}

type Field = 'name' | 'description'

export function SaveProfile({ config: _config, onSave, onSkip }: Props) {
  const defaultName = process.env['USER'] ?? 'my-server'
  const [name, setName] = useState(defaultName)
  const [description, setDescription] = useState('')
  const [active, setActive] = useState<Field>('name')
  const [error, setError] = useState('')

  useInput((input, key) => {
    if (key.escape) {
      onSkip()
      return
    }

    if (key.return) {
      if (active === 'name') {
        if (!name.trim()) {
          setError('Profile name is required')
          return
        }
        if (!/^[a-z0-9-]+$/.test(name.trim())) {
          setError('Name must be lowercase letters, numbers, and hyphens only')
          return
        }
        setError('')
        setActive('description')
      } else {
        onSave(name.trim(), description.trim())
      }
      return
    }

    if (key.backspace || key.delete) {
      if (active === 'name') setName(prev => prev.slice(0, -1))
      else setDescription(prev => prev.slice(0, -1))
      return
    }

    if (input && !key.ctrl && !key.meta) {
      if (active === 'name') setName(prev => prev + input)
      else setDescription(prev => prev + input)
    }
  })

  const DIVIDER = '─'.repeat(51)

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Save this config as a profile?</Text>
      <Text dimColor>{DIVIDER}</Text>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text dimColor>{'Profile name'.padEnd(16)}</Text>
          <Text color={active === 'name' ? 'cyan' : undefined}>{name}</Text>
          {active === 'name' && <Text color="cyan">▌</Text>}
        </Box>

        <Box>
          <Text dimColor>{'Description'.padEnd(16)}</Text>
          <Text color={active === 'description' ? 'cyan' : undefined}>
            {description || (active === 'description' ? '' : '(optional)')}
          </Text>
          {active === 'description' && <Text color="cyan">▌</Text>}
        </Box>

        {error && (
          <Box marginTop={1}>
            <Text color="red">{error}</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press </Text>
        <Text bold>Enter</Text>
        <Text dimColor> to save   </Text>
        <Text bold>Esc</Text>
        <Text dimColor> to skip</Text>
      </Box>
    </Box>
  )
}
