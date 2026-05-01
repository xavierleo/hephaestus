import type { Recipe } from '../types.js'

export const dockge: Recipe = {
  id: 'dockge',
  name: 'Dockge',
  description: 'Compose-native stack manager',
  category: 'infra',
  port: 5001,
  tags: [],

  envVars: [
    {
      key: 'DOCKGE_PORT',
      description: 'Web UI port',
      defaultValue: '5001',
      secret: false,
      required: true,
    },
    {
      key: 'DOCKGE_DATA',
      description: 'Dockge data directory',
      defaultValue: config => `${config.baseDir}/dockge/data`,
      secret: false,
      required: true,
    },
    {
      key: 'STACKS_DIR',
      description: 'Directory Dockge watches for stacks',
      defaultValue: config => config.stacksDir,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'louislam/dockge:1',
    container_name: 'dockge',
    restart: 'unless-stopped',
    volumes: [
      '/var/run/docker.sock:/var/run/docker.sock',
      '${DOCKGE_DATA}:/app/data',
      '${STACKS_DIR}:/opt/stacks',
    ],
    ports: ['${DOCKGE_PORT}:5001'],
    environment: ['TZ=${TZ}'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
