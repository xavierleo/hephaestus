import { execa } from 'execa'

export async function installDockerRootful(): Promise<void> {
  // Convenience install script — works on Ubuntu/Debian
  await execa('bash', ['-c', 'curl -fsSL https://get.docker.com | sh'], { stdio: 'inherit' })
  await execa('systemctl', ['enable', '--now', 'docker'], { stdio: 'inherit' })
}

export async function installDockerRootless(puid: number): Promise<void> {
  // Rootless install requires the user to run dockerd-rootless-setuptool.sh
  await execa('sh', ['/usr/share/docker/contrib/dockerd-rootless-setuptool.sh', 'install'], {
    stdio: 'inherit',
    uid: puid,
    env: { ...process.env, XDG_RUNTIME_DIR: `/run/user/${puid}` },
  })
  await execa('systemctl', ['--user', 'enable', '--now', 'docker'], {
    stdio: 'inherit',
    uid: puid,
    env: { ...process.env, XDG_RUNTIME_DIR: `/run/user/${puid}` },
  })
}

export async function createDockerNetwork(networkName: string): Promise<void> {
  try {
    await execa('docker', ['network', 'create', networkName])
  } catch {
    // Network may already exist — non-fatal
  }
}

export async function enableUnprivilegedPorts(): Promise<void> {
  const content = 'net.ipv4.ip_unprivileged_port_start=80\n'
  await execa('bash', ['-c', `echo '${content}' | tee /etc/sysctl.d/99-docker-rootless.conf`])
  await execa('sysctl', ['--system'])
}
