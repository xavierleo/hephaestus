import type { Recipe } from '../types.js'

export const lidarr: Recipe = {
  id: 'lidarr',
  name: 'Lidarr',
  description: 'Music automation',
  category: 'arr',
  port: 8686,
  tags: ['arr', 'sqlite', 'needs-nas'],

  envVars: [
    {
      key: 'LIDARR_PORT',
      description: 'Web UI port',
      defaultValue: '8686',
      secret: false,
      required: true,
    },
    {
      key: 'LIDARR_DATA',
      description: 'Config directory — must be local (SQLite)',
      defaultValue: config => `${config.baseDir}/lidarr/config`,
      secret: false,
      required: true,
    },
    {
      key: 'MEDIA_DIR',
      description: 'Media root (music at /media/music)',
      defaultValue: config => config.mediaDir,
      secret: false,
      required: true,
    },
    {
      key: 'COMPLETE_DIR',
      description: 'Completed downloads directory',
      defaultValue: config => config.usenetDir ?? `${config.mediaDir}/downloads/complete`,
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
    image: 'lscr.io/linuxserver/lidarr:latest',
    container_name: 'lidarr',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${LIDARR_DATA}:/config',
      '${MEDIA_DIR}:/media',
      '${COMPLETE_DIR}:/downloads/complete',
    ],
    ports: ['${LIDARR_PORT}:8686'],
  },

  seedConfigs: [],
  dependsOn: ['sabnzbd', 'prowlarr'],
  postInstall: [],
}
