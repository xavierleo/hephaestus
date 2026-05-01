import { execa } from 'execa'
import { existsSync, readdirSync, readFileSync } from 'fs'

export interface OsInfo {
  name: string
  version: string
  ok: boolean
}

export interface DockerInfo {
  version: string
  composeVersion: string
  rootless: boolean
  ok: boolean
}

export interface TailscaleInfo {
  version: string
  connected: boolean
  ok: boolean
}

export interface GpuInfo {
  detected: boolean
  cardPath: string
  renderPath: string
  renderGid: number
  renderGidName: string
}

export interface CifsInfo {
  installed: boolean
}

export interface PortConflict {
  port: number
  process: string
}

export interface PreflightResult {
  os: OsInfo
  docker: DockerInfo
  tailscale: TailscaleInfo
  gpu: GpuInfo
  cifsUtils: CifsInfo
  portConflicts: PortConflict[]
  existingStacks: string[]
  hostIp: string
  puid: number
  pgid: number
  tz: string
}

export async function runPreflightChecks(stacksDir: string): Promise<PreflightResult> {
  const [osInfo, docker, tailscale, gpu, cifsUtils, network, user, portConflicts] = await Promise.all([
    detectOs(),
    detectDocker(),
    detectTailscale(),
    detectGpu(),
    detectCifsUtils(),
    detectNetwork(),
    detectUser(),
    detectPortConflicts(),
  ])

  const existingStacks = detectExistingStacks(stacksDir)

  return {
    os: osInfo,
    docker,
    tailscale,
    gpu,
    cifsUtils,
    portConflicts,
    existingStacks,
    hostIp: network.hostIp,
    puid: user.puid,
    pgid: user.pgid,
    tz: user.tz,
  }
}

async function detectOs(): Promise<OsInfo> {
  try {
    const content = readFileSync('/etc/os-release', 'utf-8')
    const lines = Object.fromEntries(
      content
        .split('\n')
        .filter(l => l.includes('='))
        .map(l => {
          const [k, v] = l.split('=', 2)
          return [k.trim(), v.trim().replace(/^"|"$/g, '')]
        }),
    )
    const name = lines['PRETTY_NAME'] ?? lines['NAME'] ?? 'Unknown'
    const version = lines['VERSION'] ?? lines['VERSION_ID'] ?? ''
    return { name, version, ok: true }
  } catch {
    return { name: 'Unknown', version: '', ok: false }
  }
}

async function detectDocker(): Promise<DockerInfo> {
  const defaultInfo: DockerInfo = { version: 'not installed', composeVersion: '', rootless: false, ok: false }

  let version = ''
  try {
    const { stdout } = await execa('docker', ['version', '--format', '{{.Server.Version}}'])
    version = stdout.trim()
  } catch {
    return defaultInfo
  }

  let composeVersion = ''
  try {
    const { stdout } = await execa('docker', ['compose', 'version', '--short'])
    composeVersion = stdout.trim()
  } catch {
    // Compose V2 not available — non-fatal
  }

  // Rootless: DOCKER_HOST points to a user-owned socket
  const dockerHost = process.env['DOCKER_HOST'] ?? ''
  const rootless =
    dockerHost.includes(`/run/user/`) ||
    dockerHost.includes(`/users/`) ||
    (await isRootlessDockerRunning())

  return { version, composeVersion, rootless, ok: true }
}

async function isRootlessDockerRunning(): Promise<boolean> {
  try {
    const { stdout } = await execa('docker', ['info', '--format', '{{.SecurityOptions}}'])
    return stdout.includes('rootless')
  } catch {
    return false
  }
}

async function detectTailscale(): Promise<TailscaleInfo> {
  try {
    const { stdout: versionOut } = await execa('tailscale', ['version'])
    const version = versionOut.split('\n')[0]?.trim() ?? ''

    const { stdout: statusOut } = await execa('tailscale', ['status', '--json'])
    const status = JSON.parse(statusOut) as { BackendState?: string }
    const connected = status.BackendState === 'Running'

    return { version, connected, ok: true }
  } catch {
    return { version: '', connected: false, ok: false }
  }
}

async function detectGpu(): Promise<GpuInfo> {
  const drmPath = '/dev/dri'
  if (!existsSync(drmPath)) {
    return { detected: false, cardPath: '', renderPath: '', renderGid: 0, renderGidName: '' }
  }

  try {
    const files = readdirSync(drmPath)
    const renderFiles = files.filter(f => f.startsWith('renderD')).sort()
    const cardFiles = files.filter(f => f.startsWith('card')).sort()

    const renderPath = renderFiles[1] // card1 convention: use second renderD if multiple GPUs
      ? `${drmPath}/${renderFiles[1]}`
      : renderFiles[0]
        ? `${drmPath}/${renderFiles[0]}`
        : ''

    // Prefer card1 (discrete GPU on systems with integrated + discrete)
    const cardPath = cardFiles[1]
      ? `${drmPath}/${cardFiles[1]}`
      : cardFiles[0]
        ? `${drmPath}/${cardFiles[0]}`
        : ''

    if (!renderPath) {
      return { detected: false, cardPath, renderPath: '', renderGid: 0, renderGidName: '' }
    }

    // Get the GID of the render device
    const { stdout: statOut } = await execa('stat', ['-c', '%g %G', renderPath])
    const [gidStr, gidName] = statOut.trim().split(' ')
    const renderGid = parseInt(gidStr ?? '0', 10)
    const renderGidName = gidName ?? 'render'

    return {
      detected: true,
      cardPath,
      renderPath,
      renderGid,
      renderGidName,
    }
  } catch {
    return { detected: false, cardPath: '', renderPath: '', renderGid: 0, renderGidName: '' }
  }
}

async function detectCifsUtils(): Promise<CifsInfo> {
  try {
    await execa('which', ['mount.cifs'])
    return { installed: true }
  } catch {
    try {
      await execa('dpkg', ['-l', 'cifs-utils'])
      return { installed: true }
    } catch {
      return { installed: false }
    }
  }
}

async function detectPortConflicts(): Promise<PortConflict[]> {
  try {
    const { stdout } = await execa('ss', ['-tlnp'])
    const conflicts: PortConflict[] = []
    const WATCHED_PORTS = [80, 443, 81, 3000, 3001, 5001, 8080, 8090, 8096, 9000, 9696]

    for (const line of stdout.split('\n').slice(1)) {
      const parts = line.trim().split(/\s+/)
      const addr = parts[3] ?? ''
      const match = addr.match(/:(\d+)$/)
      if (!match) continue
      const port = parseInt(match[1], 10)
      if (WATCHED_PORTS.includes(port)) {
        const process = parts[5] ?? 'unknown'
        conflicts.push({ port, process })
      }
    }

    return conflicts
  } catch {
    return []
  }
}

async function detectNetwork(): Promise<{ hostIp: string }> {
  try {
    const { stdout } = await execa('hostname', ['-I'])
    const firstIp = stdout.trim().split(' ')[0] ?? ''
    return { hostIp: firstIp }
  } catch {
    try {
      const { stdout } = await execa('ip', ['route', 'get', '1.2.3.4'])
      const match = stdout.match(/src\s+(\S+)/)
      return { hostIp: match?.[1] ?? '' }
    } catch {
      return { hostIp: '' }
    }
  }
}

async function detectUser(): Promise<{ puid: number; pgid: number; tz: string }> {
  let puid = 1000
  let pgid = 1000
  let tz = 'UTC'

  try {
    const { stdout: uidOut } = await execa('id', ['-u'])
    puid = parseInt(uidOut.trim(), 10)
  } catch {
    /* fall through */
  }

  try {
    const { stdout: gidOut } = await execa('id', ['-g'])
    pgid = parseInt(gidOut.trim(), 10)
  } catch {
    /* fall through */
  }

  try {
    const tzContent = readFileSync('/etc/timezone', 'utf-8').trim()
    if (tzContent) tz = tzContent
  } catch {
    try {
      const { stdout } = await execa('timedatectl', ['show', '--property=Timezone', '--value'])
      if (stdout.trim()) tz = stdout.trim()
    } catch {
      /* fall through */
    }
  }

  return { puid, pgid, tz }
}

function detectExistingStacks(stacksDir: string): string[] {
  if (!existsSync(stacksDir)) return []
  try {
    return readdirSync(stacksDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
  } catch {
    return []
  }
}
