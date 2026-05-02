import type { Recipe } from '../types.js'

export const emby: Recipe = {
  id: 'emby',
  name: 'Emby',
  description: 'Media server (alternative to Jellyfin)',
  category: 'media',
  port: 8096,
  tags: ['needs-nas'],

  envVars: [
    {
      key: 'EMBY_PORT',
      description: 'Web UI port',
      defaultValue: '8096',
      secret: false,
      required: true,
    },
    {
      key: 'EMBY_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/emby/config`,
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
    image: 'lscr.io/linuxserver/emby:latest',
    container_name: 'emby',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${EMBY_DATA}:/config',
      '${MEDIA_DIR}:/media:ro',
    ],
    ports: ['${EMBY_PORT}:8096'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
