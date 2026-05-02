import type { Recipe } from '../types.js'
import { generateArrConfig } from '../../scaffold/seed/arr-config.js'

export const radarr: Recipe = {
  id: 'radarr',
  name: 'Radarr',
  description: 'Movie automation',
  category: 'arr',
  port: 7878,
  tags: ['arr', 'sqlite', 'needs-nas'],

  envVars: [
    {
      key: 'RADARR_PORT',
      description: 'Web UI port',
      defaultValue: '7878',
      secret: false,
      required: true,
    },
    {
      key: 'RADARR_DATA',
      description: 'Config directory — must be local (SQLite)',
      defaultValue: config => `${config.baseDir}/radarr/config`,
      secret: false,
      required: true,
    },
    {
      key: 'MEDIA_DIR',
      description: 'Media root (movies at /media/movies)',
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
    image: 'lscr.io/linuxserver/radarr:latest',
    container_name: 'radarr',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${RADARR_DATA}:/config',
      '${MEDIA_DIR}:/media',
      '${COMPLETE_DIR}:/downloads/complete',
    ],
    ports: ['${RADARR_PORT}:7878'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [
    {
      path: config => `${config.baseDir}/radarr/config/config.xml`,
      generate: ctx => generateArrConfig('Radarr', 7878, ctx.apiKey),
    },
  ],
  dependsOn: ['sabnzbd', 'prowlarr'],
  postInstall: [],
}
