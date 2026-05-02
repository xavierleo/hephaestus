import React from 'react'
import { Box, Text } from 'ink'
import type { WizardConfig } from '../../types/config.js'
import type { PreflightResult } from '../../system/checks.js'

const DIVIDER = '─'.repeat(51)

interface DoneProps {
  config: WizardConfig
  preflight: PreflightResult | null
}

export function Done({ config, preflight }: DoneProps) {
  const needsTailscale = preflight && !preflight.tailscale.ok

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green" bold>✓ Scaffold complete!</Text>
      <Text dimColor>Your stacks are in {config.stacksDir}.</Text>
      <Text dimColor>Next: cd {config.stacksDir} && docker compose up -d</Text>

      {needsTailscale && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Next steps</Text>
          <Text dimColor>{DIVIDER}</Text>

          <Box flexDirection="column" marginTop={0}>
            <Text bold color="yellow">Tailscale — not installed</Text>
            <Text dimColor>Install Tailscale to access your services remotely over a private network.</Text>
            <Box flexDirection="column" marginTop={1} marginLeft={2}>
              <Text dimColor>1. Install:</Text>
              <Text color="cyan">{'   curl -fsSL https://tailscale.com/install.sh | sh'}</Text>
              <Text dimColor>2. Connect:</Text>
              <Text color="cyan">{'   sudo tailscale up'}</Text>
              <Text dimColor>3. (Optional) Enable subnet routing if you want LAN access:</Text>
              <Text color="cyan">{'   sudo tailscale up --advertise-routes=<your-subnet>'}</Text>
            </Box>
          </Box>
        </Box>
      )}

      <Box marginTop={1}><Text dimColor>Press q to exit</Text></Box>
    </Box>
  )
}
