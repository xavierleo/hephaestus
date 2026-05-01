import type { Recipe } from '../types.js'

export const nextcloud: Recipe = {
  id: 'nextcloud',
  name: 'Nextcloud',
  description: 'File sync, calendar, contacts, and collaboration',
  category: 'productivity',
  port: 443,
  tags: [],

  envVars: [
    {
      key: 'NEXTCLOUD_PORT',
      description: 'HTTPS port',
      defaultValue: '8443',
      secret: false,
      required: true,
    },
    {
      key: 'NEXTCLOUD_DATA',
      description: 'Data directory — must be local',
      defaultValue: config => `${config.baseDir}/nextcloud/data`,
      secret: false,
      required: true,
    },
    {
      key: 'NEXTCLOUD_ADMIN_USER',
      description: 'Initial admin username',
      defaultValue: 'admin',
      secret: false,
      required: true,
    },
    {
      key: 'NEXTCLOUD_ADMIN_PASSWORD',
      description: 'Initial admin password',
      defaultValue: '',
      secret: true,
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
    image: 'lscr.io/linuxserver/nextcloud:latest',
    container_name: 'nextcloud',
    restart: 'unless-stopped',
    environment: [
      'PUID=${PUID}',
      'PGID=${PGID}',
      'TZ=${TZ}',
    ],
    volumes: ['${NEXTCLOUD_DATA}:/data'],
    ports: ['${NEXTCLOUD_PORT}:443'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
