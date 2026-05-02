import type { Recipe } from '../types.js'
import { generateBazarrConfig } from '../../scaffold/seed/bazarr-yaml.js'

export const bazarr: Recipe = {
  id: 'bazarr',
  name: 'Bazarr',
  description: 'Subtitle automation',
  category: 'arr',
  port: 6767,
  tags: ['arr', 'sqlite', 'needs-nas'],

  envVars: [
    {
      key: 'BAZARR_PORT',
      description: 'Web UI port',
      defaultValue: '6767',
      secret: false,
      required: true,
    },
    {
      key: 'BAZARR_DATA',
      description: 'Config directory — must be local (SQLite)',
      defaultValue: config => `${config.baseDir}/bazarr/config`,
      secret: false,
      required: true,
    },
    {
      key: 'MEDIA_DIR',
      description: 'Media root',
      defaultValue: config => config.mediaDir,
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
    image: 'lscr.io/linuxserver/bazarr:latest',
    container_name: 'bazarr',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${BAZARR_DATA}:/config',
      '${MEDIA_DIR}:/media:ro',
    ],
    ports: ['${BAZARR_PORT}:6767'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [
    {
      path: config => `${config.baseDir}/bazarr/config/config.yaml`,
      generate: ctx => generateBazarrConfig(ctx),
    },
  ],
  dependsOn: ['sonarr', 'radarr'],
  postInstall: [],
}
