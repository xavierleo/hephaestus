import type { Recipe } from '../types.js'

export const vscode: Recipe = {
  id: 'vscode',
  name: 'VS Code Server',
  description: 'Browser-based VS Code IDE',
  category: 'dev',
  port: 8443,
  tags: [],

  envVars: [
    {
      key: 'VSCODE_PORT',
      description: 'Web UI port',
      defaultValue: '8443',
      secret: false,
      required: true,
    },
    {
      key: 'VSCODE_PASSWORD',
      description: 'Web UI password',
      defaultValue: '',
      secret: true,
      required: true,
    },
    {
      key: 'VSCODE_DATA',
      description: 'Config and extensions directory',
      defaultValue: config => `${config.baseDir}/vscode/config`,
      secret: false,
      required: true,
    },
    {
      key: 'PUID',
      description: 'User ID',
      defaultValue: config => String(config.puid),
      secret: false,
      required: true,
    },
    {
      key: 'PGID',
      description: 'Group ID',
      defaultValue: config => String(config.pgid),
      secret: false,
      required: true,
    },
    {
      key: 'TZ',
      description: 'Timezone',
      defaultValue: config => config.tz,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'lscr.io/linuxserver/code-server:latest',
    container_name: 'vscode',
    restart: 'unless-stopped',
    environment: [
      'PUID=${PUID}',
      'PGID=${PGID}',
      'TZ=${TZ}',
      'PASSWORD=${VSCODE_PASSWORD}',
    ],
    volumes: ['${VSCODE_DATA}:/config'],
    ports: ['${VSCODE_PORT}:8443'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
