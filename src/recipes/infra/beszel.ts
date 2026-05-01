import type { Recipe } from '../types.js'

export const beszel: Recipe = {
  id: 'beszel',
  name: 'Beszel',
  description: 'Lightweight server + Docker monitor',
  category: 'infra',
  port: 8090,
  tags: [],

  envVars: [
    {
      key: 'BESZEL_PORT',
      description: 'Web UI port',
      defaultValue: '8090',
      secret: false,
      required: true,
    },
    {
      key: 'BESZEL_DATA',
      description: 'Beszel data directory',
      defaultValue: config => `${config.baseDir}/beszel/data`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'henrygd/beszel:latest',
    container_name: 'beszel',
    restart: 'unless-stopped',
    volumes: [
      '/var/run/docker.sock:/var/run/docker.sock:ro',
      '${BESZEL_DATA}:/beszel_data',
    ],
    ports: ['${BESZEL_PORT}:8090'],
    environment: ['TZ=${TZ}'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
