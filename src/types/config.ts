export type WizardScreen =
  | 'LOADING'
  | 'WELCOME'
  | 'DOCKER_MODE'
  | 'CONFIG'
  | 'PRESET_SELECTOR'
  | 'SERVICE_SELECTOR'
  | 'REVIEW'
  | 'PROGRESS'
  | 'DONE'
  | 'SAVE_PROFILE'
  | 'PROFILE_MANAGER'

export const SCREEN_ORDER: WizardScreen[] = [
  'LOADING',
  'WELCOME',
  'DOCKER_MODE',
  'CONFIG',
  'PRESET_SELECTOR',
  'SERVICE_SELECTOR',
  'REVIEW',
  'PROGRESS',
  'DONE',
]

export interface WizardConfig {
  // System
  baseDir: string        // /home/xavier/docker-services
  stacksDir: string      // /home/xavier/stacks
  puid: number           // 1000
  pgid: number           // 1000
  tz: string             // Africa/Johannesburg
  hostIp: string         // 192.168.1.x
  domain: string         // phantomark.xyz

  // Docker
  dockerRootless: boolean
  dockerSocketPath: string  // derived from rootless flag

  // Media
  mediaDir: string       // /mnt/synology-media/media

  // NAS
  hasNas: boolean
  nasMountPath: string   // /mnt/synology-media
  nasIp?: string
  nasShare?: string
  nasUser?: string
  nasPass?: string

  // GPU
  hasGpu: boolean
  gpuCard: string        // /dev/dri/card1
  gpuRender: string      // /dev/dri/renderD128
  renderGid: number      // 993

  // Services
  selectedServices: string[]
}

export interface AppFlags {
  dryRun: boolean
  stacksOnly: boolean
  list: boolean
  profileName?: string  // --profile <name>
}

export function nextScreen(current: WizardScreen): WizardScreen {
  const idx = SCREEN_ORDER.indexOf(current)
  return SCREEN_ORDER[Math.min(idx + 1, SCREEN_ORDER.length - 1)]
}

export function prevScreen(current: WizardScreen): WizardScreen {
  const idx = SCREEN_ORDER.indexOf(current)
  return SCREEN_ORDER[Math.max(idx - 1, 0)]
}

export function deriveDockerSocketPath(rootless: boolean, puid: number): string {
  return rootless ? `/run/user/${puid}/docker.sock` : '/var/run/docker.sock'
}
