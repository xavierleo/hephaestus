import type { Recipe } from '../types.js'

export const dashy: Recipe = {
  id: 'dashy',
  name: 'Dashy',
  description: 'Highly customisable personal dashboard',
  category: 'dashboard',
  port: 4000,
  tags: [],

  envVars: [
    {
      key: 'DASHY_PORT',
      description: 'Web UI port',
      defaultValue: '4000',
      secret: false,
      required: true,
    },
    {
      key: 'DASHY_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/dashy/config`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'lissy93/dashy:latest',
    container_name: 'dashy',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: ['${DASHY_DATA}:/app/user-data'],
    ports: ['${DASHY_PORT}:8080'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
