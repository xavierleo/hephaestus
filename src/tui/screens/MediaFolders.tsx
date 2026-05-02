import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { WizardConfig } from '../../types/config.js'
import { detectMediaFoldersWithFallback } from '../../system/media-folders.js'
import { existsSync, statSync } from 'fs'

interface Props {
  config: Partial<WizardConfig>
  onNext: (updates: Partial<WizardConfig>) => void
  onBack: () => void
}

type FieldKey = 'mediaDir' | 'usenetDir' | 'torrentsDir'
type FieldValues = Record<FieldKey, string>

const FIELDS: Array<{ key: FieldKey; label: string; hint: string }> = [
  { key: 'mediaDir', label: 'Media library root', hint: 'TV, movies, anime, music, books' },
  { key: 'usenetDir', label: 'Usenet completed downloads', hint: 'SABnzbd/NZBGet completed downloads' },
  { key: 'torrentsDir', label: 'Torrent completed downloads', hint: 'qBittorrent/Transmission completed downloads' },
]

const DIVIDER = '─'.repeat(60)

function initialValues(config: Partial<WizardConfig>): FieldValues {
  const root = config.nasMountPath ?? '/mnt/synology-media'
  if (config.hasNas) {
    const detected = detectMediaFoldersWithFallback(root)
    const fallback = {
      mediaDir: `${root}/media`,
      usenetDir: `${root}/usenet`,
      torrentsDir: `${root}/torrents`,
    }

    return {
      mediaDir: config.mediaDir && config.mediaDir !== fallback.mediaDir ? config.mediaDir : detected.mediaDir,
      usenetDir: config.usenetDir && config.usenetDir !== fallback.usenetDir ? config.usenetDir : detected.usenetDir,
      torrentsDir: config.torrentsDir && config.torrentsDir !== fallback.torrentsDir ? config.torrentsDir : detected.torrentsDir,
    }
  }

  const detected = {
    mediaDir: config.mediaDir ?? `${config.baseDir}/media`,
    usenetDir: config.usenetDir ?? `${config.baseDir}/downloads/usenet`,
    torrentsDir: config.torrentsDir ?? `${config.baseDir}/downloads/torrents`,
  }

  return {
    mediaDir: config.mediaDir ?? detected.mediaDir,
    usenetDir: config.usenetDir ?? detected.usenetDir,
    torrentsDir: config.torrentsDir ?? detected.torrentsDir,
  }
}

function validatePath(value: string): string | null {
  if (!value.trim()) return 'Required'
  if (!value.startsWith('/')) return 'Must be an absolute path'
  return null
}

function pathStatus(value: string): { color: 'green' | 'yellow'; message: string } {
  try {
    if (existsSync(value) && statSync(value).isDirectory()) {
      return { color: 'green', message: 'exists' }
    }
  } catch {
    // Fall through to missing; the scaffold can still create writable paths later.
  }
  return { color: 'yellow', message: 'not found yet' }
}

export function MediaFolders({ config, onNext, onBack }: Props) {
  const [fields, setFields] = useState<FieldValues>(() => initialValues(config))
  const [activeIdx, setActiveIdx] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const activeField = FIELDS[activeIdx]
  const errors = Object.fromEntries(
    FIELDS.map(field => [field.key, validatePath(fields[field.key])]).filter(([, error]) => error !== null),
  ) as Partial<Record<FieldKey, string>>
  const hasErrors = Object.keys(errors).length > 0

  useInput((input, key) => {
    if (!activeField) return

    if (key.return || key.tab) {
      if (activeIdx === FIELDS.length - 1) {
        if (hasErrors) {
          setShowErrors(true)
        } else {
          onNext(fields)
        }
      } else {
        setActiveIdx(prev => prev + 1)
      }
      return
    }

    if (key.upArrow) {
      setActiveIdx(prev => Math.max(0, prev - 1))
      return
    }

    if (key.downArrow) {
      setActiveIdx(prev => Math.min(FIELDS.length - 1, prev + 1))
      return
    }

    if (key.escape) {
      onBack()
      return
    }

    if (key.backspace || key.delete) {
      setFields(prev => ({ ...prev, [activeField.key]: prev[activeField.key].slice(0, -1) }))
      return
    }

    if (input && !key.ctrl && !key.meta) {
      setFields(prev => ({ ...prev, [activeField.key]: prev[activeField.key] + input }))
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Media folders</Text>
      <Text dimColor>{DIVIDER}</Text>
      <Box marginTop={1} />

      {FIELDS.map((field, idx) => {
        const isActive = idx === activeIdx
        const value = fields[field.key]
        const error = showErrors || isActive ? errors[field.key] : null
        const status = pathStatus(value)

        return (
          <Box key={field.key} flexDirection="column" marginBottom={1}>
            <Text color={isActive ? 'cyan' : 'gray'}>{field.label}</Text>
            <Box>
              <Text color={isActive ? 'white' : 'gray'}>{value || ' '}</Text>
              {isActive && <Text color="cyan">█</Text>}
            </Box>
            {isActive && <Text dimColor>({field.hint})</Text>}
            {!error && <Text color={status.color}>{status.message}</Text>}
            {error && <Text color="red">⚠ {error}</Text>}
          </Box>
        )
      })}

      <Text dimColor>{DIVIDER}</Text>
      <Text dimColor>
        Enter: continue   ↑/↓: move   Backspace: edit   Esc: back   q: quit
      </Text>
    </Box>
  )
}
