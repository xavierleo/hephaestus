import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import type { WizardConfig, AppFlags } from '../../types/config.js'
import type { PreflightResult } from '../../system/checks.js'
import { recipeMap } from '../../recipes/registry.js'
import { findPortConflicts, findMutexViolations, findDepWarnings, findRecipeRiskWarnings } from '../utils/review-checks.js'
import { findMountAtPath } from '../../system/mounts.js'

interface Props {
  config: WizardConfig
  preflight: PreflightResult
  flags: AppFlags
  profileRecipeVersions?: Record<string, string> | null
  onNext: () => void
  onBack: () => void
}

const DIVIDER = '─'.repeat(75)

export function Review({ config, preflight, flags, profileRecipeVersions, onNext, onBack }: Props) {
  const [riskAcknowledged, setRiskAcknowledged] = useState(false)
  const riskWarnings = findRecipeRiskWarnings(config.selectedServices, recipeMap)
  const requiresRiskAck = riskWarnings.length > 0 && !flags.dryRun

  useEffect(() => {
    setRiskAcknowledged(false)
  }, [config.selectedServices.join('|')])

  useInput((input, key) => {
    if (input.toLowerCase() === 'a' && requiresRiskAck) setRiskAcknowledged(true)
    if (key.return && (!requiresRiskAck || riskAcknowledged)) onNext()
    if (key.escape) onBack()
  })

  const selectedRecipes = config.selectedServices
    .map(id => recipeMap.get(id))
    .filter(Boolean)

  const dockerInstalled = preflight.docker.ok
  const needsNas = config.hasNas
  const existingNasMount = needsNas ? findMountAtPath(preflight.mounts, config.nasMountPath) : undefined
  const needsGpu = config.hasGpu
  const needsNpm = config.selectedServices.includes('npm')
  const needsRootlessPorts = config.dockerRootless && needsNpm

  const portConflicts = findPortConflicts(config.selectedServices, recipeMap)
  const depWarnings = findDepWarnings(config.selectedServices, recipeMap)
  const mutexViolations = findMutexViolations(config.selectedServices)

  const hasBlockers = portConflicts.length > 0 || mutexViolations.length > 0

  const updatedRecipes = profileRecipeVersions
    ? config.selectedServices
        .map(id => recipeMap.get(id))
        .filter((r): r is NonNullable<typeof r> => r !== undefined)
        .filter(r => {
          const stored = profileRecipeVersions[r.id]
          const current = r.schemaVersion ?? '1.0.0'
          return stored !== undefined && stored !== current
        })
    : []

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>
        Review — {selectedRecipes.length} stack{selectedRecipes.length !== 1 ? 's' : ''} will be scaffolded
        {flags.dryRun ? ' (DRY RUN)' : ''}
      </Text>
      <Text dimColor>{DIVIDER}</Text>

      {/* Errors that must be resolved before scaffolding */}
      {(portConflicts.length > 0 || mutexViolations.length > 0) && (
        <Box marginTop={1} flexDirection="column">
          <Text color="red" bold>⛔ Issues to resolve before scaffolding</Text>
          {portConflicts.map(({ port, a, b }) => (
            <Box key={`${a}-${b}`}>
              <Text color="red">  ✗ Port conflict: </Text>
              <Text color="red">{a} and {b} both use port {port}</Text>
            </Box>
          ))}
          {mutexViolations.map(msg => (
            <Box key={msg}>
              <Text color="red">  ✗ </Text>
              <Text color="red">{msg}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Soft warnings — won't block scaffolding */}
      {depWarnings.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow" bold>⚠ Wiring warnings</Text>
          {depWarnings.map(msg => (
            <Box key={msg}>
              <Text color="yellow">  ⚠ </Text>
              <Text dimColor>{msg}</Text>
            </Box>
          ))}
        </Box>
      )}

      {riskWarnings.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow" bold>Security warnings</Text>
          {riskWarnings.map((warning, index) => (
            <Box key={`${warning.recipeId}-${warning.kind}-${index}`}>
              <Text color={warning.severity === 'high' ? 'red' : 'yellow'}>
                {`  ${warning.severity.toUpperCase()} `}
              </Text>
              <Text dimColor>{warning.message}</Text>
            </Box>
          ))}
          {requiresRiskAck && !riskAcknowledged && (
            <Text color="yellow">  Press a to acknowledge these risks before scaffolding.</Text>
          )}
          {requiresRiskAck && riskAcknowledged && (
            <Text color="green">  Risks acknowledged.</Text>
          )}
        </Box>
      )}

      {updatedRecipes.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>{DIVIDER}</Text>
          <Text color="yellow" bold>
            {'⚠  '}{updatedRecipes.length} recipe{updatedRecipes.length !== 1 ? 's have' : ' has'} been updated since your last run
          </Text>
          {updatedRecipes.map(r => (
            <Box key={r.id}>
              <Text dimColor>{'     '}{r.id.padEnd(20)}</Text>
              <Text dimColor>— schema updated to v{r.schemaVersion ?? '1.0.0'}</Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text dimColor>Updated stacks will be regenerated. Existing .env values are preserved.</Text>
          </Box>
        </Box>
      )}

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
            done={existingNasMount !== undefined}
            label={existingNasMount
              ? `NAS: ${config.nasMountPath} already mounted (${existingNasMount.fsType}) — skipping mount setup`
              : `NAS: ${config.nasMountPath} fstab entry + mount`}
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
        {hasBlockers ? (
          <Text color="red">Go back and resolve the issues above before scaffolding.</Text>
        ) : requiresRiskAck && !riskAcknowledged ? (
          <>
            <Text bold>a</Text>
            <Text dimColor> to acknowledge security warnings   </Text>
            <Text bold>Esc</Text>
            <Text dimColor> to go back</Text>
          </>
        ) : (
          <>
            <Text bold>Enter</Text>
            <Text dimColor>
              {flags.dryRun ? ' to preview' : ' to scaffold'}{'  '}
            </Text>
            <Text bold>Esc</Text>
            <Text dimColor> to go back   </Text>
            <Text bold>q</Text>
            <Text dimColor>: quit</Text>
          </>
        )}
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
