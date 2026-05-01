import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import {
  loadProfiles,
  deleteProfile,
  setActiveProfile,
} from '../../profile/index.js'
import type { ProfileStore } from '../../profile/types.js'

interface Props {
  onDone: () => void
}

export function ProfileManager({ onDone }: Props) {
  const [store, setStore] = useState<ProfileStore>(() => loadProfiles())
  const [cursor, setCursor] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  const names = Object.keys(store.profiles)

  const reload = () => setStore(loadProfiles())

  useInput((input, key) => {
    if (key.escape) { onDone(); return }

    if (key.upArrow) { setCursor(prev => Math.max(0, prev - 1)); return }
    if (key.downArrow) { setCursor(prev => Math.min(names.length - 1, prev + 1)); return }

    const selected = names[cursor]
    if (!selected) return

    const lower = input.toLowerCase()

    if (lower === 'u') {
      setActiveProfile(selected)
      reload()
      setMessage(`★ "${selected}" is now the active profile`)
    }

    if (lower === 'd') {
      deleteProfile(selected)
      reload()
      setCursor(prev => Math.max(0, prev - 1))
      setMessage(`Deleted "${selected}"`)
    }
  })

  const DIVIDER = '─'.repeat(51)

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Profile Manager</Text>
      <Text dimColor>{DIVIDER}</Text>

      {names.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor>No profiles saved yet.</Text>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          {names.map((name, i) => {
            const profile = store.profiles[name]!
            const isActive = store.activeProfile === name
            const isCursor = i === cursor
            return (
              <Box key={name}>
                <Text color={isCursor ? 'cyan' : undefined}>
                  {isCursor ? '▶ ' : '  '}
                  {isActive ? '★ ' : '  '}
                  {name.padEnd(20)}
                </Text>
                <Text dimColor>
                  {(profile.description || '').padEnd(24)}
                </Text>
                <Text dimColor>
                  {profile.defaultServices.length} services
                </Text>
              </Box>
            )
          })}
        </Box>
      )}

      {message && (
        <Box marginTop={1}>
          <Text color="green">{message}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text bold>[U]</Text><Text dimColor> Set active   </Text>
        <Text bold>[D]</Text><Text dimColor> Delete   </Text>
        <Text bold>Esc</Text><Text dimColor> Back</Text>
      </Box>
    </Box>
  )
}
