import type { Recipe } from '../types.js'

export const homarr: Recipe = {
  id: 'homarr',
  name: 'Homarr',
  description: 'Homelab dashboard with service integration',
  category: 'dashboard',
  port: 7575,
  tags: [],

  envVars: [
    {
      key: 'HOMARR_PORT',
      description: 'Web UI port',
      defaultValue: '7575',
      secret: false,
      required: true,
    },
    {
      key: 'HOMARR_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/homarr/config`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'ghcr.io/ajnart/homarr:latest',
    container_name: 'homarr',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: [
      '/var/run/docker.sock:/var/run/docker.sock:ro',
      '${HOMARR_DATA}:/app/data/configs',
      '${HOMARR_DATA}/icons:/app/public/icons',
    ],
    ports: ['${HOMARR_PORT}:7575'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
