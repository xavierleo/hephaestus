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

// Mutual exclusivity groups — selecting two from the same group is an error
const MUTEX_GROUPS: Record<string, string[]> = {
  MEDIA_SERVER:    ['jellyfin', 'plex', 'emby'],
  REQUEST_MANAGER: ['seerr', 'jellyseerr'],
  REVERSE_PROXY:   ['npm', 'traefik', 'caddy'],
  STACK_MANAGER:   ['dockge', 'portainer'],
  USENET_CLIENT:   ['sabnzbd', 'nzbget'],
  TORRENT_CLIENT:  ['qbittorrent', 'transmission', 'deluge', 'rutorrent'],
  REENCODER:       ['fileflows', 'tdarr', 'unmanic'],
  DNS_BLOCKER:     ['pihole', 'adguard'],
  GIT_SERVER:      ['gitea', 'forgejo', 'gitlab'],
  PHOTO_MANAGER:   ['immich', 'photoprism', 'pigallery2'],
}

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

  // Detect port conflicts between selected services
  const portOwners = new Map<number, string>()
  const portConflicts: Array<{ port: number; a: string; b: string }> = []
  for (const recipe of selectedRecipes) {
    if (!recipe || recipe.port === 0) continue
    const existing = portOwners.get(recipe.port)
    if (existing) {
      portConflicts.push({ port: recipe.port, a: existing, b: recipe.id })
    } else {
      portOwners.set(recipe.port, recipe.id)
    }
  }

  // Detect missing dependsOn — warn when a wired service isn't selected
  const depWarnings: string[] = []
  for (const recipe of selectedRecipes) {
    if (!recipe) continue
    for (const dep of recipe.dependsOn) {
      if (!config.selectedServices.includes(dep)) {
        const depRecipe = recipeMap.get(dep)
        const depName = depRecipe?.name ?? dep
        depWarnings.push(
          `${recipe.name} is pre-wired for ${depName} but ${depName} isn't selected — ` +
          `download client / indexer will need manual setup after launch`,
        )
      }
    }
  }

  // Detect mutual exclusivity violations
  const mutexViolations: string[] = []
  for (const [groupId, members] of Object.entries(MUTEX_GROUPS)) {
    const selected = members.filter(m => config.selectedServices.includes(m))
    if (selected.length > 1) {
      mutexViolations.push(
        `${groupId}: ${selected.join(' + ')} are mutually exclusive — pick one`,
      )
    }
  }

  const hasBlockers = portConflicts.length > 0 || mutexViolations.length > 0

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
        {hasBlockers ? (
          <Text color="red">Go back and resolve the issues above before scaffolding.</Text>
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
