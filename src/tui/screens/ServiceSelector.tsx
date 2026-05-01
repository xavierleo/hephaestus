import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { WizardConfig } from '../../types/config.js'
import type { Category } from '../../recipes/types.js'
import { CATEGORY_LABELS } from '../../recipes/types.js'
import { recipesByCategory, allRecipes } from '../../recipes/registry.js'

interface Props {
  config: Partial<WizardConfig>
  onNext: (updates: Partial<WizardConfig>) => void
  onBack: () => void
}

const DIVIDER = '─'.repeat(71)

const CATEGORY_ORDER: Category[] = [
  'infra',
  'media',
  'download',
  'arr',
  'management',
  'books',
  'dashboard',
  'monitoring',
  'homeauto',
  'networking',
  'dev',
  'productivity',
]

export function ServiceSelector({ config, onNext, onBack }: Props) {
  const [catIdx, setCatIdx] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(config.selectedServices ?? []),
  )

  const category = CATEGORY_ORDER[catIdx] ?? 'infra'
  const services = recipesByCategory.get(category) ?? []

  useInput((input, key) => {
    if (key.escape) {
      onBack()
      return
    }

    if (key.return) {
      onNext({ selectedServices: Array.from(selected) })
      return
    }

    if (key.tab) {
      setCatIdx(prev => (prev + 1) % CATEGORY_ORDER.length)
      setCursor(0)
      return
    }

    if (key.shift && key.tab) {
      setCatIdx(prev => (prev - 1 + CATEGORY_ORDER.length) % CATEGORY_ORDER.length)
      setCursor(0)
      return
    }

    if (key.upArrow) {
      setCursor(prev => Math.max(0, prev - 1))
      return
    }

    if (key.downArrow) {
      setCursor(prev => Math.min(services.length - 1, prev + 1))
      return
    }

    if (input === ' ') {
      const service = services[cursor]
      if (!service) return
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(service.id)) {
          next.delete(service.id)
        } else {
          next.add(service.id)
        }
        return next
      })
      return
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      {/* Category tabs */}
      <Box flexWrap="wrap">
        <Text bold>Services  </Text>
        {CATEGORY_ORDER.map((cat, i) => (
          <Text key={cat} color={i === catIdx ? 'cyan' : 'gray'} bold={i === catIdx}>
            {`[ ${CATEGORY_LABELS[cat]} ] `}
          </Text>
        ))}
      </Box>
      <Text dimColor>{DIVIDER}</Text>

      {/* Service list */}
      <Box flexDirection="column">
        <Text bold>{CATEGORY_LABELS[category]}</Text>
        <Text dimColor>{'─'.repeat(14)}</Text>
        {services.length === 0 && <Text dimColor>No services in this category</Text>}
        {services.map((svc, i) => {
          const isSelected = selected.has(svc.id)
          const isCursor = i === cursor
          const checkbox = isSelected ? '[✓]' : '[ ]'
          const nameStr = svc.name.padEnd(22)
          const descStr = svc.description.padEnd(40)
          const portStr = svc.port ? `:${svc.port}` : ''

          return (
            <Box key={svc.id}>
              <Text
                color={isCursor ? 'cyan' : isSelected ? 'green' : undefined}
                bold={isCursor}
                inverse={isCursor}
              >
                {checkbox} {nameStr}{descStr}{portStr}
              </Text>
            </Box>
          )
        })}
      </Box>

      <Text dimColor>{DIVIDER}</Text>
      <Box>
        <Text dimColor>Tab: next category   ↑↓: move   Space: toggle   </Text>
        <Text bold>Enter</Text>
        <Text dimColor>: confirm   </Text>
        <Text bold>q</Text>
        <Text dimColor>: quit   </Text>
        <Text color="green" bold>{selected.size} selected</Text>
      </Box>
    </Box>
  )
}
