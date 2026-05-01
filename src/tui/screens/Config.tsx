import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { WizardConfig } from '../../types/config.js'

interface Props {
  config: Partial<WizardConfig>
  onNext: (updates: Partial<WizardConfig>) => void
  onBack: () => void
}

type FieldKey =
  | 'baseDir'
  | 'stacksDir'
  | 'puid'
  | 'pgid'
  | 'tz'
  | 'hostIp'
  | 'domain'
  | 'hasNas'
  | 'nasIp'
  | 'nasShare'
  | 'nasMountPath'
  | 'nasUser'
  | 'nasPass'
  | 'hasGpu'
  | 'gpuCard'
  | 'gpuRender'

interface FieldDef {
  key: FieldKey
  label: string
  hint?: string
  secret?: boolean
  boolean?: boolean
  showWhen?: (fields: FieldValues) => boolean
}

type FieldValues = Record<FieldKey, string>

const FIELD_DEFS: FieldDef[] = [
  { key: 'baseDir', label: 'Base data directory', hint: 'service configs and SQLite databases — must be local' },
  { key: 'stacksDir', label: 'Stacks directory', hint: 'compose.yml + .env files — Dockge watches this' },
  { key: 'puid', label: 'PUID' },
  { key: 'pgid', label: 'PGID' },
  { key: 'tz', label: 'Timezone' },
  { key: 'hostIp', label: 'Server IP' },
  { key: 'domain', label: 'Public domain (optional)' },
  { key: 'hasNas', label: 'Mount a NAS via CIFS?', boolean: true },
  { key: 'nasIp', label: 'NAS IP', showWhen: f => f.hasNas === 'true' },
  { key: 'nasShare', label: 'Share name', showWhen: f => f.hasNas === 'true' },
  { key: 'nasMountPath', label: 'Mount point', showWhen: f => f.hasNas === 'true' },
  { key: 'nasUser', label: 'Username', showWhen: f => f.hasNas === 'true' },
  { key: 'nasPass', label: 'Password', showWhen: f => f.hasNas === 'true', secret: true },
  { key: 'hasGpu', label: 'Enable AMD VAAPI transcoding?', boolean: true },
  { key: 'gpuCard', label: 'Card device', showWhen: f => f.hasGpu === 'true' },
  { key: 'gpuRender', label: 'Render device', showWhen: f => f.hasGpu === 'true' },
]

const DIVIDER = '─'.repeat(51)

function configToFields(config: Partial<WizardConfig>): FieldValues {
  return {
    baseDir: config.baseDir ?? `/home/${process.env['USER'] ?? 'user'}/docker-services`,
    stacksDir: config.stacksDir ?? '/opt/stacks',
    puid: String(config.puid ?? 1000),
    pgid: String(config.pgid ?? 1000),
    tz: config.tz ?? 'UTC',
    hostIp: config.hostIp ?? '',
    domain: config.domain ?? '',
    hasNas: String(config.hasNas ?? false),
    nasIp: config.nasIp ?? '',
    nasShare: config.nasShare ?? 'media',
    nasMountPath: config.nasMountPath ?? '/mnt/synology-media',
    nasUser: config.nasUser ?? '',
    nasPass: config.nasPass ?? '',
    hasGpu: String(config.hasGpu ?? false),
    gpuCard: config.gpuCard ?? '/dev/dri/card1',
    gpuRender: config.gpuRender ?? '/dev/dri/renderD128',
  }
}

function fieldsToConfig(fields: FieldValues): Partial<WizardConfig> {
  return {
    baseDir: fields.baseDir,
    stacksDir: fields.stacksDir,
    puid: parseInt(fields.puid, 10) || 1000,
    pgid: parseInt(fields.pgid, 10) || 1000,
    tz: fields.tz,
    hostIp: fields.hostIp,
    domain: fields.domain,
    hasNas: fields.hasNas === 'true',
    nasIp: fields.nasIp || undefined,
    nasShare: fields.nasShare || undefined,
    nasMountPath: fields.nasMountPath,
    nasUser: fields.nasUser || undefined,
    nasPass: fields.nasPass || undefined,
    hasGpu: fields.hasGpu === 'true',
    gpuCard: fields.gpuCard,
    gpuRender: fields.gpuRender,
    mediaDir: fields.hasNas === 'true'
      ? `${fields.nasMountPath}/media`
      : `${fields.baseDir}/media`,
  }
}

export function Config({ config, onNext, onBack }: Props) {
  const [fields, setFields] = useState<FieldValues>(configToFields(config))
  const [activeIdx, setActiveIdx] = useState(0)

  const visibleFields = FIELD_DEFS.filter(f => !f.showWhen || f.showWhen(fields))
  const activeField = visibleFields[activeIdx]

  useInput((input, key) => {
    if (!activeField) return

    if (key.tab || key.return) {
      if (activeIdx === visibleFields.length - 1) {
        onNext(fieldsToConfig(fields))
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
      setActiveIdx(prev => Math.min(visibleFields.length - 1, prev + 1))
      return
    }

    if (key.escape) {
      onBack()
      return
    }

    if (activeField.boolean) {
      // Boolean fields: y/n or space to toggle
      if (input === 'y' || input === 'Y' || input === ' ') {
        setFields(prev => ({ ...prev, [activeField.key]: 'true' }))
      } else if (input === 'n' || input === 'N') {
        setFields(prev => ({ ...prev, [activeField.key]: 'false' }))
      }
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
      <Text bold>Configuration</Text>
      <Text dimColor>{DIVIDER}</Text>
      <Box marginTop={1} />

      {visibleFields.map((field, idx) => {
        const isActive = idx === activeIdx
        const value = fields[field.key]
        const display = field.secret && value ? '•'.repeat(value.length) : value

        if (field.boolean) {
          const isTrue = value === 'true'
          return (
            <Box key={field.key} marginBottom={idx < visibleFields.length - 1 ? 0 : 0}>
              <Text color={isActive ? 'cyan' : undefined} bold={isActive}>
                {field.label}{'  '}
              </Text>
              <Text color={isTrue ? 'cyan' : undefined}>{isTrue ? '● Yes' : '○ Yes'}</Text>
              <Text>  </Text>
              <Text color={!isTrue ? 'cyan' : undefined}>{!isTrue ? '● No' : '○ No'}</Text>
              {isActive && <Text dimColor>  (y/n)</Text>}
            </Box>
          )
        }

        return (
          <Box key={field.key} flexDirection="column" marginBottom={1}>
            <Text color={isActive ? 'cyan' : 'gray'}>{field.label}</Text>
            <Box>
              <Text color={isActive ? 'white' : 'gray'}>{display || ' '}</Text>
              {isActive && <Text color="cyan">█</Text>}
            </Box>
            {isActive && field.hint && <Text dimColor>({field.hint})</Text>}
          </Box>
        )
      })}

      <Box marginTop={1}>
        <Text dimColor>Tab/↑↓ navigate   </Text>
        <Text bold>Enter</Text>
        <Text dimColor> next   </Text>
        <Text bold>Esc</Text>
        <Text dimColor> back   </Text>
        <Text bold>q</Text>
        <Text dimColor>: quit</Text>
      </Box>
    </Box>
  )
}
