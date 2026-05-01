import type { Recipe } from '../types.js'

export const vaultwarden: Recipe = {
  id: 'vaultwarden',
  name: 'Vaultwarden',
  description: 'Self-hosted Bitwarden-compatible password manager',
  category: 'productivity',
  port: 80,
  tags: [],

  envVars: [
    {
      key: 'VW_PORT',
      description: 'Web UI port',
      defaultValue: '8300',
      secret: false,
      required: true,
    },
    {
      key: 'VW_DATA',
      description: 'Data directory — must be local',
      defaultValue: config => `${config.baseDir}/vaultwarden/data`,
      secret: false,
      required: true,
    },
    {
      key: 'VW_DOMAIN',
      description: 'Public URL for Vaultwarden (required for mobile clients)',
      defaultValue: config => `https://vault.${config.domain || config.hostIp}`,
      secret: false,
      required: true,
    },
    {
      key: 'VW_ADMIN_TOKEN',
      description: 'Admin panel token',
      defaultValue: '',
      secret: true,
      required: false,
    },
  ],

  composeService: {
    image: 'vaultwarden/server:latest',
    container_name: 'vaultwarden',
    restart: 'unless-stopped',
    environment: [
      'DOMAIN=${VW_DOMAIN}',
      'ADMIN_TOKEN=${VW_ADMIN_TOKEN}',
      'TZ=${TZ}',
    ],
    volumes: ['${VW_DATA}:/data'],
    ports: ['${VW_PORT}:80'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
