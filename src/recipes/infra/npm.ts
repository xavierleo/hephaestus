import type { Recipe } from '../types.js'

export const npm: Recipe = {
  id: 'npm',
  name: 'Nginx Proxy Manager',
  description: 'Reverse proxy + Let\'s Encrypt SSL',
  category: 'infra',
  port: 81,
  tags: ['network-host'],

  envVars: [
    {
      key: 'NPM_HTTP_PORT',
      description: 'HTTP port (must be 80 for SSL challenge)',
      defaultValue: '80',
      secret: false,
      required: true,
    },
    {
      key: 'NPM_HTTPS_PORT',
      description: 'HTTPS port',
      defaultValue: '443',
      secret: false,
      required: true,
    },
    {
      key: 'NPM_ADMIN_PORT',
      description: 'Admin UI port',
      defaultValue: '81',
      secret: false,
      required: true,
    },
    {
      key: 'NPM_DATA',
      description: 'NPM data directory',
      defaultValue: config => `${config.baseDir}/npm/data`,
      secret: false,
      required: true,
    },
    {
      key: 'NPM_LETSENCRYPT',
      description: 'Let\'s Encrypt certificates directory',
      defaultValue: config => `${config.baseDir}/npm/letsencrypt`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'jc21/nginx-proxy-manager:latest',
    container_name: 'npm',
    restart: 'unless-stopped',
    volumes: [
      '${NPM_DATA}:/data',
      '${NPM_LETSENCRYPT}:/etc/letsencrypt',
    ],
    ports: [
      '${NPM_HTTP_PORT}:80',
      '${NPM_HTTPS_PORT}:443',
      '${NPM_ADMIN_PORT}:81',
    ],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
