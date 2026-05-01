import type { Recipe } from '../types.js'

export const adguard: Recipe = {
  id: 'adguard',
  name: 'AdGuard Home',
  description: 'DNS filtering and ad blocking (alternative to Pi-hole)',
  category: 'networking',
  port: 8053,
  tags: [],

  envVars: [
    {
      key: 'ADGUARD_DATA',
      description: 'Config and work directory — must be local',
      defaultValue: config => `${config.baseDir}/adguard`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'adguard/adguardhome:latest',
    container_name: 'adguard',
    restart: 'unless-stopped',
    volumes: [
      '${ADGUARD_DATA}/work:/opt/adguardhome/work',
      '${ADGUARD_DATA}/conf:/opt/adguardhome/conf',
    ],
    ports: [
      '53:53/tcp',
      '53:53/udp',
      '3000:3000/tcp',  // setup UI
      '8053:80/tcp',    // admin UI after setup
    ],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [
    {
      title: 'Complete the setup wizard',
      description: 'Open http://HOST_IP:3000 — the wizard is only available on port 3000 during first run. After setup, AdGuard is served on port 8053.',
    },
  ],
}
