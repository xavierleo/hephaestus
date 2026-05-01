import type { Recipe } from '../types.js'

export const wireguard: Recipe = {
  id: 'wireguard',
  name: 'WireGuard',
  description: 'VPN server for remote access',
  category: 'networking',
  port: 51820,
  tags: ['privileged'],

  envVars: [
    {
      key: 'WG_PORT',
      description: 'WireGuard UDP port',
      defaultValue: '51820',
      secret: false,
      required: true,
    },
    {
      key: 'WG_SERVERURL',
      description: 'Public hostname or IP of this server',
      defaultValue: config => config.hostIp,
      secret: false,
      required: true,
    },
    {
      key: 'WG_PEERS',
      description: 'Number of client configs to generate',
      defaultValue: '5',
      secret: false,
      required: false,
    },
    {
      key: 'WG_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/wireguard/config`,
      secret: false,
      required: true,
    },
    {
      key: 'PUID',
      description: 'User ID',
      defaultValue: config => String(config.puid),
      secret: false,
      required: true,
    },
    {
      key: 'PGID',
      description: 'Group ID',
      defaultValue: config => String(config.pgid),
      secret: false,
      required: true,
    },
    {
      key: 'TZ',
      description: 'Timezone',
      defaultValue: config => config.tz,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'lscr.io/linuxserver/wireguard:latest',
    container_name: 'wireguard',
    restart: 'unless-stopped',
    cap_add: ['NET_ADMIN', 'SYS_MODULE'],
    environment: [
      'PUID=${PUID}',
      'PGID=${PGID}',
      'TZ=${TZ}',
      'SERVERURL=${WG_SERVERURL}',
      'PEERS=${WG_PEERS}',
    ],
    volumes: [
      '${WG_DATA}:/config',
      '/lib/modules:/lib/modules:ro',
    ],
    ports: ['${WG_PORT}:51820/udp'],
    security_opt: ['no-new-privileges:true'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
