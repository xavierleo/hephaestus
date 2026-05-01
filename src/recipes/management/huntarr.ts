import type { Recipe } from '../types.js'

export const huntarr: Recipe = {
  id: 'huntarr',
  name: 'Huntarr',
  description: 'Missing media hunter for arr apps',
  category: 'management',
  port: 9705,
  tags: ['arr'],

  envVars: [
    {
      key: 'HUNTARR_PORT',
      description: 'Web UI port',
      defaultValue: '9705',
      secret: false,
      required: true,
    },
    {
      key: 'HUNTARR_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/huntarr/config`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'ghcr.io/plexguide/huntarr:latest',
    container_name: 'huntarr',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: ['${HUNTARR_DATA}:/config'],
    ports: ['${HUNTARR_PORT}:9705'],
  },

  seedConfigs: [],
  dependsOn: ['sonarr', 'radarr'],
  postInstall: [],
}
