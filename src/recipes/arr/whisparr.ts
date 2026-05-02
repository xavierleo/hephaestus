import type { Recipe } from '../types.js'

export const whisparr: Recipe = {
  id: 'whisparr',
  name: 'Whisparr',
  description: 'Adult content automation',
  category: 'arr',
  port: 6969,
  tags: ['arr', 'sqlite'],

  envVars: [
    {
      key: 'WHISPARR_PORT',
      description: 'Web UI port',
      defaultValue: '6969',
      secret: false,
      required: true,
    },
    {
      key: 'WHISPARR_DATA',
      description: 'Config directory — must be local (SQLite)',
      defaultValue: config => `${config.baseDir}/whisparr/config`,
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
    image: 'ghcr.io/hotio/whisparr:latest',
    container_name: 'whisparr',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: ['${WHISPARR_DATA}:/config'],
    ports: ['${WHISPARR_PORT}:6969'],
  },

  seedConfigs: [],
  dependsOn: ['prowlarr'],
  postInstall: [],
}
