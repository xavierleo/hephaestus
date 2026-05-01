import type { Recipe } from '../types.js'

export const plex: Recipe = {
  id: 'plex',
  name: 'Plex',
  description: 'Media server (alternative to Jellyfin)',
  category: 'media',
  port: 32400,
  tags: ['needs-nas', 'network-host'],

  envVars: [
    {
      key: 'PLEX_CLAIM',
      description: 'Plex claim token from plex.tv/claim',
      defaultValue: '',
      secret: true,
      required: true,
    },
    {
      key: 'PLEX_DATA',
      description: 'Plex config/metadata — must be local',
      defaultValue: config => `${config.baseDir}/plex/config`,
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
    image: 'lscr.io/linuxserver/plex:latest',
    container_name: 'plex',
    restart: 'unless-stopped',
    network_mode: 'host',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}', 'PLEX_CLAIM=${PLEX_CLAIM}'],
    volumes: [
      '${PLEX_DATA}:/config',
      '${MEDIA_DIR}:/media:ro',
    ],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
