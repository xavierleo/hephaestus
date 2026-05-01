import type { Recipe } from '../types.js'

export const readarr: Recipe = {
  id: 'readarr',
  name: 'Readarr',
  description: 'Ebook automation',
  category: 'arr',
  port: 8787,
  tags: ['arr', 'sqlite', 'needs-nas'],

  envVars: [
    {
      key: 'READARR_PORT',
      description: 'Web UI port',
      defaultValue: '8787',
      secret: false,
      required: true,
    },
    {
      key: 'READARR_DATA',
      description: 'Config directory — must be local (SQLite)',
      defaultValue: config => `${config.baseDir}/readarr/config`,
      secret: false,
      required: true,
    },
    {
      key: 'MEDIA_DIR',
      description: 'Media root (books at /media/books)',
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
    image: 'lscr.io/linuxserver/readarr:develop',
    container_name: 'readarr',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${READARR_DATA}:/config',
      '${MEDIA_DIR}:/media',
      '${COMPLETE_DIR}:/downloads/complete',
    ],
    ports: ['${READARR_PORT}:8787'],
  },

  seedConfigs: [],
  dependsOn: ['sabnzbd', 'prowlarr'],
  postInstall: [],
}
