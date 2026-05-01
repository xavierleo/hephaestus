import type { Recipe } from '../types.js'

export const uptimekuma: Recipe = {
  id: 'uptimekuma',
  name: 'Uptime Kuma',
  description: 'Service uptime monitoring',
  category: 'monitoring',
  port: 3001,
  tags: [],

  envVars: [
    {
      key: 'KUMA_PORT',
      description: 'Web UI port',
      defaultValue: '3001',
      secret: false,
      required: true,
    },
    {
      key: 'KUMA_DATA',
      description: 'Data directory — must be local',
      defaultValue: config => `${config.baseDir}/uptime-kuma/data`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'louislam/uptime-kuma:1',
    container_name: 'uptime-kuma',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: ['${KUMA_DATA}:/app/data'],
    ports: ['${KUMA_PORT}:3001'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
