import { execa } from 'execa'
import { existsSync, readdirSync, readFileSync } from 'fs'
import type { MountInfo } from './mounts.js'
import { readCurrentMounts } from './mounts.js'

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
  composeOk: boolean       // false if Compose V2 plugin is missing
  daemonRunning: boolean   // false if binary exists but daemon is not started
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
  userInRenderGroup: boolean  // false = GPU present but user needs `usermod -aG render`
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
  mounts: MountInfo[]
  portConflicts: PortConflict[]
  portScanAvailable: boolean   // false if both ss and netstat are missing
  existingStacks: string[]
  hostIp: string
  puid: number
  pgid: number
  tz: string
  tzDefaulted: boolean         // true if timezone fell back to UTC — user should verify
  isRoot: boolean              // true if running as root
  sudoUser?: string            // set when running via sudo — used for PUID/PGID
}

export async function runPreflightChecks(stacksDir: string): Promise<PreflightResult> {
  const [osInfo, docker, tailscale, gpu, cifsUtils, network, user, portResult] = await Promise.all([
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
  const mounts = readCurrentMounts()

  return {
    os: osInfo,
    docker,
    tailscale,
    gpu,
    cifsUtils,
    mounts,
    portConflicts: portResult.conflicts,
    portScanAvailable: portResult.available,
    existingStacks,
    hostIp: network.hostIp,
    puid: user.puid,
    pgid: user.pgid,
    tz: user.tz,
    tzDefaulted: user.tzDefaulted,
    isRoot: user.isRoot,
    sudoUser: user.sudoUser,
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
  const notInstalled: DockerInfo = {
    version: 'not installed', composeVersion: '', rootless: false,
    ok: false, composeOk: false, daemonRunning: false,
  }

  // Check if the docker binary exists at all
  try {
    await execa('which', ['docker'])
  } catch {
    return notInstalled
  }

  // Binary exists — try to reach the daemon
  let version = ''
  let daemonRunning = false
  try {
    const { stdout } = await execa('docker', ['version', '--format', '{{.Server.Version}}'])
    version = stdout.trim()
    daemonRunning = true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Daemon installed but not started vs permission error vs other
    const isDaemonDown = msg.includes('Cannot connect') || msg.includes('dial unix') ||
      msg.includes('connection refused') || msg.includes('No such file or directory')
    if (isDaemonDown) {
      return {
        version: 'installed (daemon not running)',
        composeVersion: '', rootless: false,
        ok: false, composeOk: false, daemonRunning: false,
      }
    }
    // Permission denied or other error — daemon may be running but user can't reach it
    return {
      version: 'installed (cannot connect)',
      composeVersion: '', rootless: false,
      ok: false, composeOk: false, daemonRunning: false,
    }
  }

  // Daemon reachable — check Compose V2 plugin
  let composeVersion = ''
  let composeOk = false
  try {
    const { stdout } = await execa('docker', ['compose', 'version', '--short'])
    composeVersion = stdout.trim()
    composeOk = true
  } catch {
    // Compose V2 plugin missing — hephaestus requires it
  }

  const dockerHost = process.env['DOCKER_HOST'] ?? ''
  const rootless =
    dockerHost.includes('/run/user/') ||
    dockerHost.includes('/users/') ||
    (await isRootlessDockerRunning())

  return { version, composeVersion, rootless, ok: true, composeOk, daemonRunning }
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
  const noGpu: GpuInfo = { detected: false, cardPath: '', renderPath: '', renderGid: 0, renderGidName: '', userInRenderGroup: false }

  if (!existsSync(drmPath)) return noGpu

  try {
    const files = readdirSync(drmPath)
    const renderFiles = files.filter(f => f.startsWith('renderD')).sort()
    const cardFiles = files.filter(f => f.startsWith('card')).sort()

    // Prefer card1 (discrete GPU) on systems with integrated + discrete
    const cardPath = cardFiles[1]
      ? `${drmPath}/${cardFiles[1]}`
      : cardFiles[0]
        ? `${drmPath}/${cardFiles[0]}`
        : ''

    // Use the first renderD node; on multi-GPU systems the user can override in Config
    const renderPath = renderFiles[0] ? `${drmPath}/${renderFiles[0]}` : ''

    if (!renderPath) {
      // /dev/dri exists (card present) but no renderD node — integrated-only or missing firmware
      return { ...noGpu, cardPath }
    }

    const { stdout: statOut } = await execa('stat', ['-c', '%g %G', renderPath])
    const [gidStr, gidName] = statOut.trim().split(' ')
    const renderGid = parseInt(gidStr ?? '0', 10)
    const renderGidName = gidName ?? 'render'

    // Check whether the effective user is already in the render group
    let userInRenderGroup = false
    try {
      const uid = process.env['SUDO_UID'] ? parseInt(process.env['SUDO_UID'], 10) : process.getuid?.()
      if (uid === 0 && !process.env['SUDO_UID']) {
        // Running as root — has access regardless
        userInRenderGroup = true
      } else {
        const { stdout: groupsOut } = await execa('id', ['-G'])
        const gids = groupsOut.trim().split(' ').map(g => parseInt(g, 10))
        userInRenderGroup = gids.includes(renderGid)
      }
    } catch { /* assume not in group */ }

    return { detected: true, cardPath, renderPath, renderGid, renderGidName, userInRenderGroup }
  } catch {
    return noGpu
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

async function detectPortConflicts(): Promise<{ conflicts: PortConflict[]; available: boolean }> {
  const WATCHED_PORTS = [80, 443, 81, 3000, 3001, 5001, 8080, 8090, 8096, 9000, 9696]

  // Try ss first (iproute2), fall back to netstat (net-tools)
  let output = ''
  let available = false
  try {
    const { stdout } = await execa('ss', ['-tlnp'])
    output = stdout
    available = true
  } catch {
    try {
      const { stdout } = await execa('netstat', ['-tlnp'])
      output = stdout
      available = true
    } catch {
      return { conflicts: [], available: false }
    }
  }

  const conflicts: PortConflict[] = []
  for (const line of output.split('\n').slice(1)) {
    const parts = line.trim().split(/\s+/)
    const addr = parts[3] ?? ''
    const match = addr.match(/:(\d+)$/)
    if (!match) continue
    const port = parseInt(match[1], 10)
    if (WATCHED_PORTS.includes(port)) {
      conflicts.push({ port, process: parts[5] ?? parts[6] ?? 'unknown' })
    }
  }

  return { conflicts, available }
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

async function detectUser(): Promise<{
  puid: number; pgid: number; tz: string; tzDefaulted: boolean; isRoot: boolean; sudoUser?: string
}> {
  let puid = 1000
  let pgid = 1000
  let tz = 'UTC'
  let tzDefaulted = true

  const isRoot = process.getuid?.() === 0
  const sudoUser = process.env['SUDO_USER'] || undefined

  if (isRoot && process.env['SUDO_UID']) {
    // Running via sudo — use the original user's IDs, not root's
    puid = parseInt(process.env['SUDO_UID'], 10) || 1000
    pgid = parseInt(process.env['SUDO_GID'] ?? '', 10) || 1000
  } else {
    try {
      const { stdout } = await execa('id', ['-u'])
      puid = parseInt(stdout.trim(), 10)
    } catch { /* fall through */ }

    try {
      const { stdout } = await execa('id', ['-g'])
      pgid = parseInt(stdout.trim(), 10)
    } catch { /* fall through */ }
  }

  // Timezone: /etc/timezone → timedatectl → fall back to UTC with a warning flag
  try {
    const tzContent = readFileSync('/etc/timezone', 'utf-8').trim()
    if (tzContent) {
      tz = tzContent
      tzDefaulted = (tz === 'UTC' || tz === 'Etc/UTC')
    }
  } catch {
    try {
      const { stdout } = await execa('timedatectl', ['show', '--property=Timezone', '--value'])
      const detected = stdout.trim()
      if (detected) {
        tz = detected
        tzDefaulted = (tz === 'UTC' || tz === 'Etc/UTC')
      }
    } catch { /* both methods failed — tz stays 'UTC', tzDefaulted stays true */ }
  }

  return { puid, pgid, tz, tzDefaulted, isRoot, sudoUser }
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
