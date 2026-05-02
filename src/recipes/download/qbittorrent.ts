import type { Recipe } from '../types.js'

export const qbittorrent: Recipe = {
  id: 'qbittorrent',
  name: 'qBittorrent',
  description: 'Torrent client',
  category: 'download',
  port: 8388,
  tags: ['needs-nas'],

  envVars: [
    {
      key: 'QBIT_DATA',
      description: 'qBittorrent config directory — must be local',
      defaultValue: config => `${config.baseDir}/qbittorrent/config`,
      secret: false,
      required: true,
    },
    {
      key: 'COMPLETE_DIR',
      description: 'Completed downloads directory',
      defaultValue: config => config.torrentsDir ?? `${config.mediaDir}/downloads/complete`,
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
    image: 'lscr.io/linuxserver/qbittorrent:latest',
    container_name: 'qbittorrent',
    restart: 'unless-stopped',
    environment: [
      'PUID=${PUID}',
      'PGID=${PGID}',
      'TZ=${TZ}',
      'WEBUI_PORT=8388',
    ],
    volumes: [
      '${QBIT_DATA}:/config',
      '${COMPLETE_DIR}:/downloads/complete',
    ],
    ports: ['8388:8388'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
