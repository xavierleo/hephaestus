import type { Recipe } from '../types.js'

export const portainer: Recipe = {
  id: 'portainer',
  name: 'Portainer CE',
  description: 'Docker management UI',
  category: 'infra',
  port: 9000,
  tags: ['rootless-limited'],

  envVars: [
    {
      key: 'PORTAINER_HTTP_PORT',
      description: 'HTTP port',
      defaultValue: '9000',
      secret: false,
      required: true,
    },
    {
      key: 'PORTAINER_HTTPS_PORT',
      description: 'HTTPS port',
      defaultValue: '9443',
      secret: false,
      required: true,
    },
    {
      key: 'PORTAINER_DATA',
      description: 'Portainer data directory',
      defaultValue: config => `${config.baseDir}/portainer/data`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'portainer/portainer-ce:latest',
    container_name: 'portainer',
    restart: 'unless-stopped',
    volumes: [
      '/var/run/docker.sock:/var/run/docker.sock',
      '${PORTAINER_DATA}:/data',
    ],
    ports: [
      '${PORTAINER_HTTP_PORT}:9000',
      '${PORTAINER_HTTPS_PORT}:9443',
    ],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
