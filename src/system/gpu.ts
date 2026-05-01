import { execa } from 'execa'

export async function configureAmdGpu(renderGid: number): Promise<void> {
  // Ensure render group exists with the correct GID
  try {
    await execa('groupadd', ['--gid', String(renderGid), 'render'])
  } catch {
    // Group may already exist
  }

  // Install mesa VA-API drivers for hardware transcoding
  await execa('apt-get', ['install', '-y', 'mesa-va-drivers'], { stdio: 'inherit' })
}

export async function addUserToRenderGroup(username: string): Promise<void> {
  await execa('usermod', ['-aG', 'render', username])
  await execa('usermod', ['-aG', 'video', username])
}
