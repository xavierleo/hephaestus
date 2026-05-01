import type { Recipe } from '../types.js'
import { generateArrConfig } from '../../scaffold/seed/arr-config.js'

export const sonarr: Recipe = {
  id: 'sonarr',
  name: 'Sonarr',
  description: 'TV show automation',
  category: 'arr',
  port: 8989,
  tags: ['arr', 'sqlite', 'needs-nas'],

  envVars: [
    {
      key: 'SONARR_PORT',
      description: 'Web UI port',
      defaultValue: '8989',
      secret: false,
      required: true,
    },
    {
      key: 'SONARR_DATA',
      description: 'Config directory — must be local (SQLite)',
      defaultValue: config => `${config.baseDir}/sonarr/config`,
      secret: false,
      required: true,
    },
    {
      key: 'MEDIA_DIR',
      description: 'Media root (TV subdirectory will be /media/tv)',
      defaultValue: config => config.mediaDir,
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
    image: 'lscr.io/linuxserver/sonarr:latest',
    container_name: 'sonarr',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${SONARR_DATA}:/config',
      '${MEDIA_DIR}:/media',
      '${COMPLETE_DIR}:/downloads/complete',
    ],
    ports: ['${SONARR_PORT}:8989'],
  },

  seedConfigs: [
    {
      path: config => `${config.baseDir}/sonarr/config/config.xml`,
      generate: ctx => generateArrConfig('Sonarr', 8989, ctx.apiKey),
    },
  ],
  dependsOn: ['sabnzbd', 'prowlarr'],
  postInstall: [],
}
