import type { Recipe } from '../types.js'

export const homepage: Recipe = {
  id: 'homepage',
  name: 'Homepage',
  description: 'Highly customisable dashboard',
  category: 'dashboard',
  port: 3000,
  tags: [],

  envVars: [
    {
      key: 'HOMEPAGE_PORT',
      description: 'Web UI port',
      defaultValue: '3000',
      secret: false,
      required: true,
    },
    {
      key: 'HOMEPAGE_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/homepage/config`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'ghcr.io/gethomepage/homepage:latest',
    container_name: 'homepage',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${HOMEPAGE_DATA}:/app/config',
      '/var/run/docker.sock:/var/run/docker.sock:ro',
    ],
    ports: ['${HOMEPAGE_PORT}:3000'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
