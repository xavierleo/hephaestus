import { execa } from 'execa'
import { appendFileSync, chmodSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

export interface NasConfig {
  nasIp: string
  nasShare: string
  mountPath: string
  nasUser: string
  nasPass: string
}

export function credentialsPathForMount(mountPath: string): string {
  const name = mountPath.replace(/^\/+/, '').replace(/[^a-zA-Z0-9_-]+/g, '-')
  return join('/etc/hephaestus', `cifs-${name || 'nas'}.credentials`)
}

export function renderCifsCredentials(username: string, password: string): string {
  return `username=${username}\npassword=${password}\n`
}

export function renderFstabEntry(config: NasConfig, credentialsPath: string): string {
  return `//${config.nasIp}/${config.nasShare} ${config.mountPath} cifs ` +
    `credentials=${credentialsPath},uid=1000,gid=1000,` +
    `file_mode=0775,dir_mode=0775,noperm 0 0\n`
}

export async function mountNas(config: NasConfig): Promise<void> {
  mkdirSync(config.mountPath, { recursive: true })
  const credentialsPath = credentialsPathForMount(config.mountPath)
  mkdirSync(dirname(credentialsPath), { recursive: true })
  writeFileSync(credentialsPath, renderCifsCredentials(config.nasUser, config.nasPass), 'utf-8')
  chmodSync(credentialsPath, 0o600)

  appendFileSync('/etc/fstab', renderFstabEntry(config, credentialsPath), 'utf-8')
  await execa('mount', ['-a'], { stdio: 'inherit' })
}

export async function unmountNas(mountPath: string): Promise<void> {
  await execa('umount', [mountPath])
}
