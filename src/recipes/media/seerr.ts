import type { Recipe } from '../types.js'

export const seerr: Recipe = {
  id: 'seerr',
  name: 'Seerr',
  description: 'Media request management',
  category: 'media',
  port: 5055,
  tags: [],

  envVars: [
    {
      key: 'SEERR_PORT',
      description: 'Web UI port',
      defaultValue: '5055',
      secret: false,
      required: true,
    },
    {
      key: 'SEERR_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/seerr/config`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'ghcr.io/seerr-team/seerr:latest',
    container_name: 'seerr',
    restart: 'unless-stopped',
    environment: ['LOG_LEVEL=debug', 'TZ=${TZ}'],
    volumes: ['${SEERR_DATA}:/app/config'],
    ports: ['${SEERR_PORT}:5055'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: ['jellyfin'],
  postInstall: [],
}
