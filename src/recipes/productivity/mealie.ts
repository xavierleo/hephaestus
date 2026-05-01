import type { Recipe } from '../types.js'

export const mealie: Recipe = {
  id: 'mealie',
  name: 'Mealie',
  description: 'Recipe manager and meal planner',
  category: 'productivity',
  port: 9000,
  tags: [],

  envVars: [
    {
      key: 'MEALIE_PORT',
      description: 'Web UI port',
      defaultValue: '9500',
      secret: false,
      required: true,
    },
    {
      key: 'MEALIE_DATA',
      description: 'Data directory — must be local',
      defaultValue: config => `${config.baseDir}/mealie/data`,
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
  ],

  composeService: {
    image: 'ghcr.io/mealie-recipes/mealie:latest',
    container_name: 'mealie',
    restart: 'unless-stopped',
    environment: [
      'PUID=${PUID}',
      'PGID=${PGID}',
      'TZ=${TZ}',
    ],
    volumes: ['${MEALIE_DATA}:/app/data'],
    ports: ['${MEALIE_PORT}:9000'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
