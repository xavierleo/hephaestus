import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { Spinner } from '@inkjs/ui'
import type { WizardConfig, AppFlags } from '../../types/config.js'
import { runScaffold } from '../../scaffold/index.js'

interface Props {
  config: WizardConfig
  flags: AppFlags
  onDone: () => void
}

interface ProgressItem {
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  detail?: string
}

export function Progress({ config, flags, onDone }: Props) {
  const [items, setItems] = useState<ProgressItem[]>([])
  const [done, setDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [newEnvVars, setNewEnvVars] = useState<Map<string, string[]>>(new Map())

  useInput((_input, key) => {
    if (done && key.return) onDone()
  })

  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - start) / 100) / 10)
    }, 100)

    const onProgress = (label: string, status: ProgressItem['status'], detail?: string) => {
      setItems(prev => {
        const existing = prev.findIndex(i => i.label === label)
        if (existing >= 0) {
          const next = [...prev]
          next[existing] = { label, status, detail }
          return next
        }
        return [...prev, { label, status, detail }]
      })
    }

    runScaffold(config, { dryRun: flags.dryRun, onProgress })
      .then(result => {
        clearInterval(timer)
        setNewEnvVars(result.newEnvVars)
        setDone(true)
      })
      .catch(err => {
        clearInterval(timer)
        setError(err instanceof Error ? err.message : String(err))
        setDone(true)
      })

    return () => clearInterval(timer)
  }, [])

  const DIVIDER = '─'.repeat(75)

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Scaffolding{flags.dryRun ? ' (DRY RUN)' : ''}</Text>
      <Text dimColor>{DIVIDER}</Text>
      <Box marginTop={1} flexDirection="column">
        {items.map(item => (
          <Box key={item.label}>
            {item.status === 'running' && <Spinner label={`  ${item.label}`} />}
            {item.status === 'done' && (
              <>
                <Text color="green">  ✓  </Text>
                <Text>{item.label}</Text>
                {item.detail && <Text dimColor>  ({item.detail})</Text>}
              </>
            )}
            {item.status === 'error' && (
              <>
                <Text color="red">  ✗  </Text>
                <Text color="red">{item.label}</Text>
                {item.detail && <Text color="red">  {item.detail}</Text>}
              </>
            )}
          </Box>
        ))}
      </Box>

      {done && !error && newEnvVars.size > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow" bold>New env vars appended to existing .env files:</Text>
          {[...newEnvVars.entries()].map(([recipeId, keys]) => (
            <Box key={recipeId}>
              <Text dimColor>  {recipeId.padEnd(20)}</Text>
              <Text dimColor>{keys.join(', ')}</Text>
            </Box>
          ))}
        </Box>
      )}

      {done && !error && (
        <Box marginTop={1} flexDirection="column">
          <Text color="green" bold>Done in {elapsed}s</Text>
          <Box marginTop={1}>
            <Text dimColor>Press </Text>
            <Text bold>Enter</Text>
            <Text dimColor> for summary</Text>
          </Box>
        </Box>
      )}

      {done && error && (
        <Box marginTop={1} flexDirection="column">
          <Text color="red" bold>Error: {error}</Text>
          <Text dimColor>Check the output above for details.</Text>
        </Box>
      )}

      {!done && (
        <Box marginTop={1}>
          <Text dimColor>{elapsed}s elapsed…</Text>
        </Box>
      )}
    </Box>
  )
}
