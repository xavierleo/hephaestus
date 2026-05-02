import type { Recipe } from '../types.js'

export const profilarr: Recipe = {
  id: 'profilarr',
  name: 'Profilarr',
  description: 'Quality profile sync across arr apps',
  category: 'management',
  port: 6868,
  tags: ['arr'],

  envVars: [
    {
      key: 'PROFILARR_PORT',
      description: 'Web UI port',
      defaultValue: '6868',
      secret: false,
      required: true,
    },
    {
      key: 'PROFILARR_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/profilarr/config`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'ghcr.io/dictionaryhouse/profilarr:latest',
    container_name: 'profilarr',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: ['${PROFILARR_DATA}:/config'],
    ports: ['${PROFILARR_PORT}:6868'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: ['sonarr', 'radarr'],
  postInstall: [],
}
