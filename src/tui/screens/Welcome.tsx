import React from 'react'
import { Box, Text, useInput } from 'ink'
import type { PreflightResult } from '../../system/checks.js'

interface Props {
  preflight: PreflightResult
  onNext: () => void
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

export function Welcome({ preflight, onNext }: Props) {
  useInput((_input, key) => {
    if (key.return) onNext()
  })

  const dockerLabel = preflight.docker.ok
    ? `${preflight.docker.version} (Compose V2)`
    : 'not installed'

  const dockerMode = preflight.docker.rootless ? 'Rootless' : 'Rootful'

  const tailscaleLabel = preflight.tailscale.ok
    ? `${preflight.tailscale.version} — ${preflight.tailscale.connected ? 'connected' : 'disconnected'}`
    : 'not installed'

  const gpuLabel = preflight.gpu.detected
    ? `AMD (${preflight.gpu.cardPath.split('/').pop()}/${preflight.gpu.renderPath.split('/').pop()})`
    : 'none detected'

  const portLabel =
    preflight.portConflicts.length === 0
      ? 'none'
      : preflight.portConflicts.map(c => `:${c.port}`).join(', ')

  const stacksLabel =
    preflight.existingStacks.length === 0
      ? 'none'
      : preflight.existingStacks.join(', ')

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
      <CheckRow
        label="Docker"
        value={dockerLabel}
        ok={preflight.docker.ok}
      />
      <CheckRow label="Docker mode" value={dockerMode} />
      <CheckRow
        label="Tailscale"
        value={tailscaleLabel}
        ok={preflight.tailscale.ok || undefined}
      />
      <CheckRow
        label="GPU"
        value={gpuLabel}
        ok={preflight.gpu.detected || undefined}
      />
      {preflight.gpu.detected && (
        <CheckRow label="Render GID" value={String(preflight.gpu.renderGid)} />
      )}
      <CheckRow
        label="CIFS utils"
        value={preflight.cifsUtils.installed ? 'installed' : 'not installed'}
        ok={preflight.cifsUtils.installed || undefined}
      />
      <CheckRow
        label="Port conflicts"
        value={portLabel}
        ok={preflight.portConflicts.length === 0 ? true : undefined}
        warning={preflight.portConflicts.length > 0}
      />
      <CheckRow label="Existing stacks" value={stacksLabel} />

      <Box marginTop={1}>
        <Text dimColor>Press </Text>
        <Text bold>Enter</Text>
        <Text dimColor> to continue   </Text>
        <Text bold>q</Text>
        <Text dimColor>: quit</Text>
      </Box>
    </Box>
  )
}
