import { execa } from 'execa'
import { mkdirSync } from 'fs'

export interface NasConfig {
  nasIp: string
  nasShare: string
  mountPath: string
  nasUser: string
  nasPass: string
}

export async function mountNas(config: NasConfig): Promise<void> {
  mkdirSync(config.mountPath, { recursive: true })

  // Add fstab entry for persistence across reboots
  const fstabEntry = `//${config.nasIp}/${config.nasShare} ${config.mountPath} cifs ` +
    `username=${config.nasUser},password=${config.nasPass},uid=1000,gid=1000,` +
    `file_mode=0775,dir_mode=0775,noperm 0 0`

  await execa('bash', ['-c', `echo '${fstabEntry}' >> /etc/fstab`])
  await execa('mount', ['-a'], { stdio: 'inherit' })
}

export async function unmountNas(mountPath: string): Promise<void> {
  await execa('umount', [mountPath])
}
