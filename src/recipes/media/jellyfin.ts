import type { Recipe } from '../types.js'

export const jellyfin: Recipe = {
  id: 'jellyfin',
  name: 'Jellyfin',
  description: 'Media server with AMD VAAPI',
  category: 'media',
  port: 8096,
  tags: ['needs-gpu', 'needs-nas'],

  envVars: [
    {
      key: 'JELLYFIN_PORT',
      description: 'Web UI port',
      defaultValue: '8096',
      secret: false,
      required: true,
    },
    {
      key: 'JELLYFIN_DATA',
      description: 'Config directory — must be local (not NAS)',
      defaultValue: config => `${config.baseDir}/jellyfin/config`,
      secret: false,
      required: true,
    },
    {
      key: 'JELLYFIN_CACHE',
      description: 'Cache directory — must be local (fast SSD)',
      defaultValue: config => `${config.baseDir}/jellyfin/cache`,
      secret: false,
      required: true,
    },
    {
      key: 'MEDIA_DIR',
      description: 'Media library root',
      defaultValue: config => config.mediaDir,
      secret: false,
      required: true,
    },
    {
      key: 'RENDER_GID',
      description: 'GID of /dev/dri/renderD* — must match host',
      defaultValue: config => String(config.renderGid),
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'jellyfin/jellyfin:latest',
    container_name: 'jellyfin',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: [
      '${JELLYFIN_DATA}:/config',
      '${JELLYFIN_CACHE}:/cache',
      '${MEDIA_DIR}:/media:ro',
    ],
    ports: ['${JELLYFIN_PORT}:8096'],
    devices: ['/dev/dri:/dev/dri'],
    group_add: ['${RENDER_GID}'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
