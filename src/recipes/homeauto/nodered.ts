import type { Recipe } from '../types.js'

export const nodered: Recipe = {
  id: 'nodered',
  name: 'Node-RED',
  description: 'Visual flow-based automation',
  category: 'homeauto',
  port: 1880,
  tags: [],

  envVars: [
    {
      key: 'NODERED_PORT',
      description: 'Web UI port',
      defaultValue: '1880',
      secret: false,
      required: true,
    },
    {
      key: 'NODERED_DATA',
      description: 'Data directory — must be local',
      defaultValue: config => `${config.baseDir}/nodered/data`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'nodered/node-red:latest',
    container_name: 'nodered',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: ['${NODERED_DATA}:/data'],
    ports: ['${NODERED_PORT}:1880'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
