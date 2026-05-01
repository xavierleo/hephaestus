import React from 'react'
import { Box, Text, useInput } from 'ink'
import type { PreflightResult } from '../../system/checks.js'
import type { Profile } from '../../profile/types.js'

interface Props {
  preflight: PreflightResult
  activeProfile?: Profile | null
  onNext: () => void
  onLoadProfile?: () => void
  onManageProfiles?: () => void
}

const DIVIDER = '─'.repeat(51)

function CheckRow({
  label,
  value,
  ok,
  warning,
}: {
  label: string
  value: string
  ok?: boolean
  warning?: boolean
}) {
  const indicator = ok === undefined ? ' ' : ok ? '✓' : warning ? '⚠' : '✗'
  const indicatorColor = ok === undefined ? undefined : ok ? 'green' : warning ? 'yellow' : 'red'
  return (
    <Box>
      <Text dimColor>{label.padEnd(16)}</Text>
      <Text>{value.padEnd(30)}</Text>
      <Text color={indicatorColor}>{indicator}</Text>
    </Box>
  )
}

export function Welcome({ preflight, activeProfile, onNext, onLoadProfile, onManageProfiles }: Props) {
  useInput((input, key) => {
    if (activeProfile) {
      const lower = input.toLowerCase()
      if (lower === 'l') onLoadProfile?.()
      if (lower === 'n') onNext()
      if (lower === 'm') onManageProfiles?.()
    } else {
      if (key.return) onNext()
    }
  })

  // Docker label — distinguish between not installed, daemon down, and running
  let dockerLabel: string
  let dockerOk: boolean | undefined
  if (preflight.docker.ok) {
    const composeNote = preflight.docker.composeOk
      ? `Compose V2 ${preflight.docker.composeVersion}`
      : 'Compose V2 MISSING'
    dockerLabel = `${preflight.docker.version} (${composeNote})`
    dockerOk = preflight.docker.composeOk
  } else if (preflight.docker.version.includes('daemon not running')) {
    dockerLabel = 'installed — daemon not running (start with: sudo systemctl start docker)'
    dockerOk = false
  } else if (preflight.docker.version.includes('cannot connect')) {
    dockerLabel = 'installed — cannot connect (permission error or daemon down)'
    dockerOk = false
  } else {
    dockerLabel = 'not installed'
    dockerOk = false
  }

  const dockerMode = preflight.docker.rootless ? 'Rootless' : 'Rootful'

  const tailscaleLabel = preflight.tailscale.ok
    ? `${preflight.tailscale.version} — ${preflight.tailscale.connected ? 'connected' : 'disconnected'}`
    : 'not installed'

  let gpuLabel: string
  let gpuOk: boolean | undefined
  if (preflight.gpu.detected) {
    gpuLabel = `AMD (${preflight.gpu.cardPath.split('/').pop()}/${preflight.gpu.renderPath.split('/').pop()})`
    gpuOk = true
  } else {
    gpuLabel = 'none detected'
    gpuOk = undefined
  }

  const portLabel =
    preflight.portConflicts.length === 0
      ? preflight.portScanAvailable ? 'none' : 'scan unavailable (ss/netstat missing)'
      : preflight.portConflicts.map(c => `:${c.port}`).join(', ')

  const stacksLabel =
    preflight.existingStacks.length === 0
      ? 'none'
      : `${preflight.existingStacks.length} existing (will merge on re-run)`

  // Collect warnings to show below the table
  const warnings: string[] = []

  if (preflight.docker.ok && !preflight.docker.composeOk) {
    warnings.push(
      'Docker Compose V2 plugin is missing. Install it with:\n' +
      '  sudo apt-get install docker-compose-plugin',
    )
  }

  if (preflight.tzDefaulted) {
    warnings.push(
      `Timezone could not be detected — defaulted to UTC. ` +
      `Update it in the Configuration screen.`,
    )
  }

  if (preflight.gpu.detected && !preflight.gpu.userInRenderGroup) {
    warnings.push(
      `GPU detected but your user is not in the render group (GID ${preflight.gpu.renderGid}). ` +
      `Add yourself with:\n` +
      `  sudo usermod -aG ${preflight.gpu.renderGidName} $USER\n` +
      `  (then log out and back in)`,
    )
  }

  if (preflight.isRoot && !preflight.sudoUser) {
    warnings.push(
      'Running as root. Hephaestus works best run as your normal user with sudo only where needed.',
    )
  }

  if (!preflight.portScanAvailable) {
    warnings.push(
      'Port conflict detection unavailable — neither ss nor netstat found. ' +
      'Install iproute2: sudo apt-get install iproute2',
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box flexDirection="column" borderStyle="double" borderColor="cyan" paddingX={2} paddingY={0} marginBottom={1}>
        <Text color="cyan" bold>  ⚒  HEPHAESTUS  v1.0.0</Text>
        <Text dimColor>  Homelab stack scaffolder</Text>
      </Box>

      <Text bold>System detection</Text>
      <Text dimColor>{DIVIDER}</Text>

      <CheckRow label="OS" value={preflight.os.name} ok={preflight.os.ok} />
      <CheckRow label="Docker" value={dockerLabel} ok={dockerOk} />
      <CheckRow label="Docker mode" value={dockerMode} />
      <CheckRow
        label="Tailscale"
        value={tailscaleLabel}
        ok={preflight.tailscale.ok || undefined}
      />
      <CheckRow label="GPU" value={gpuLabel} ok={gpuOk} />
      {preflight.gpu.detected && (
        <>
          <CheckRow label="Render GID" value={String(preflight.gpu.renderGid)} />
          <CheckRow
            label="Render group"
            value={preflight.gpu.userInRenderGroup ? 'user is member' : `not in group — run usermod`}
            ok={preflight.gpu.userInRenderGroup || undefined}
            warning={!preflight.gpu.userInRenderGroup}
          />
        </>
      )}
      <CheckRow
        label="CIFS utils"
        value={preflight.cifsUtils.installed ? 'installed' : 'not installed'}
        ok={preflight.cifsUtils.installed || undefined}
      />
      <CheckRow
        label="Port conflicts"
        value={portLabel}
        ok={preflight.portConflicts.length === 0 && preflight.portScanAvailable}
        warning={!preflight.portScanAvailable || preflight.portConflicts.length > 0}
      />
      <CheckRow
        label="Timezone"
        value={preflight.tz}
        ok={!preflight.tzDefaulted}
        warning={preflight.tzDefaulted}
      />
      <CheckRow label="PUID / PGID" value={`${preflight.puid} / ${preflight.pgid}`} />
      {preflight.sudoUser && (
        <CheckRow label="sudo user" value={preflight.sudoUser} />
      )}
      <CheckRow label="Existing stacks" value={stacksLabel} />

      {warnings.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>{DIVIDER}</Text>
          {warnings.map((w, i) => (
            <Box key={i} marginBottom={i < warnings.length - 1 ? 1 : 0}>
              <Text color="yellow">⚠ </Text>
              <Text dimColor>{w}</Text>
            </Box>
          ))}
        </Box>
      )}

      {activeProfile ? (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>{DIVIDER}</Text>
          <Box>
            <Text color="cyan" bold>  Saved profile: </Text>
            <Text bold>{activeProfile.name}</Text>
            {activeProfile.description ? <Text dimColor>  — {activeProfile.description}</Text> : null}
          </Box>
          <Text dimColor>{DIVIDER}</Text>
          <Box><Text dimColor>{'  Base dir'.padEnd(16)}</Text><Text>{activeProfile.config.baseDir}</Text></Box>
          <Box><Text dimColor>{'  Stacks dir'.padEnd(16)}</Text><Text>{activeProfile.config.stacksDir}</Text></Box>
          <Box><Text dimColor>{'  Domain'.padEnd(16)}</Text><Text>{activeProfile.config.domain || '(none)'}</Text></Box>
          <Box>
            <Text dimColor>{'  Services'.padEnd(16)}</Text>
            <Text>{activeProfile.defaultServices.length} services (your last selection)</Text>
          </Box>
          <Box marginTop={1}>
            <Text bold>[L]</Text><Text dimColor> Load profile   </Text>
            <Text bold>[N]</Text><Text dimColor> Start fresh   </Text>
            <Text bold>[M]</Text><Text dimColor> Manage profiles</Text>
          </Box>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text dimColor>Press </Text>
          <Text bold>Enter</Text>
          <Text dimColor> to continue   </Text>
          <Text bold>q</Text>
          <Text dimColor>: quit</Text>
        </Box>
      )}
    </Box>
  )
}
