import type { Recipe } from '../types.js'

export const transmission: Recipe = {
  id: 'transmission',
  name: 'Transmission',
  description: 'Torrent client (alternative to qBittorrent)',
  category: 'download',
  port: 9091,
  tags: [],

  envVars: [
    {
      key: 'TRANSMISSION_PORT',
      description: 'Web UI port',
      defaultValue: '9091',
      secret: false,
      required: true,
    },
    {
      key: 'TRANSMISSION_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/transmission/config`,
      secret: false,
      required: true,
    },
    {
      key: 'COMPLETE_DIR',
      description: 'Completed downloads directory',
      defaultValue: config => `${config.mediaDir}/downloads/complete`,
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
    image: 'lscr.io/linuxserver/transmission:latest',
    container_name: 'transmission',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${TRANSMISSION_DATA}:/config',
      '${COMPLETE_DIR}:/downloads/complete',
    ],
    ports: ['${TRANSMISSION_PORT}:9091'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
