import React from 'react'
import { Box, Text, useInput } from 'ink'
import type { WizardConfig, AppFlags } from '../../types/config.js'
import type { PreflightResult } from '../../system/checks.js'
import { recipeMap } from '../../recipes/registry.js'

interface Props {
  config: WizardConfig
  preflight: PreflightResult
  flags: AppFlags
  onNext: () => void
  onBack: () => void
}

const DIVIDER = '─'.repeat(75)

export function Review({ config, preflight, flags, onNext, onBack }: Props) {
  useInput((_input, key) => {
    if (key.return) onNext()
    if (key.escape) onBack()
  })

  const selectedRecipes = config.selectedServices
    .map(id => recipeMap.get(id))
    .filter(Boolean)

  const dockerInstalled = preflight.docker.ok
  const needsNas = config.hasNas
  const needsGpu = config.hasGpu
  const needsNpm = config.selectedServices.includes('npm')
  const needsRootlessPorts = config.dockerRootless && needsNpm

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>
        Review — {selectedRecipes.length} stack{selectedRecipes.length !== 1 ? 's' : ''} will be scaffolded
        {flags.dryRun ? ' (DRY RUN)' : ''}
      </Text>
      <Text dimColor>{DIVIDER}</Text>

      {/* System actions */}
      <Box marginTop={1} flexDirection="column">
        <Text bold>System actions</Text>
        <ActionRow
          done={dockerInstalled}
          label={dockerInstalled
            ? `Docker ${preflight.docker.version} already installed — skipping`
            : 'Install Docker (rootful)'}
        />
        {needsGpu && (
          <ActionRow
            done={false}
            label={`AMD GPU: render group (GID ${config.renderGid}), mesa-va-drivers`}
          />
        )}
        {needsNas && (
          <ActionRow
            done={false}
            label={`NAS: ${config.nasMountPath} fstab entry + mount`}
          />
        )}
        {needsRootlessPorts && (
          <ActionRow
            done={false}
            label="Unprivileged ports: sysctl net.ipv4.ip_unprivileged_port_start=80"
          />
        )}
        <ActionRow done={false} label="Docker network: cerebro-net" />
      </Box>

      {/* Stacks */}
      <Box marginTop={1} flexDirection="column">
        <Text bold>Stacks  →  {config.stacksDir}/</Text>
        {selectedRecipes.map(recipe => {
          if (!recipe) return null
          const hasSeed = recipe.seedConfigs.length > 0
          const seedLabel = hasSeed
            ? `  seed: ${recipe.seedConfigs.map(s => typeof s.path === 'string' ? s.path.split('/').pop() : '(dynamic)').join(', ')}`
            : ''
          const needsKey = recipe.tags.includes('needs-gluetun')

          return (
            <Box key={recipe.id}>
              <Text color="green">  ✓ </Text>
              <Text>{recipe.id.padEnd(16)}</Text>
              <Text dimColor>compose.yml  .env  SETUP.md</Text>
              {seedLabel && <Text dimColor>{seedLabel}</Text>}
              {needsKey && <Text color="yellow">  ⚠ VPN key required</Text>}
            </Box>
          )
        })}
      </Box>

      {/* Config summary */}
      <Box marginTop={1} flexDirection="column">
        <Text bold>Configuration</Text>
        <Box>
          <Text dimColor>  Base dir:   </Text>
          <Text>{config.baseDir}</Text>
        </Box>
        <Box>
          <Text dimColor>  Stacks dir: </Text>
          <Text>{config.stacksDir}</Text>
        </Box>
        <Box>
          <Text dimColor>  PUID/PGID:  </Text>
          <Text>{config.puid}/{config.pgid}</Text>
        </Box>
        <Box>
          <Text dimColor>  Timezone:   </Text>
          <Text>{config.tz}</Text>
        </Box>
        {config.domain && (
          <Box>
            <Text dimColor>  Domain:     </Text>
            <Text>{config.domain}</Text>
          </Box>
        )}
      </Box>

      <Text dimColor>{DIVIDER}</Text>
      <Box>
        <Text bold>Enter</Text>
        <Text dimColor>
          {flags.dryRun ? ' to preview' : ' to scaffold'}{'  '}
        </Text>
        <Text bold>Esc</Text>
        <Text dimColor> to go back   </Text>
        <Text bold>q</Text>
        <Text dimColor>: quit</Text>
      </Box>
    </Box>
  )
}

function ActionRow({ done, label }: { done: boolean; label: string }) {
  return (
    <Box>
      <Text color={done ? 'green' : 'cyan'}>{done ? '  ✓ ' : '  → '}</Text>
      <Text dimColor={done}>{label}</Text>
    </Box>
  )
}
