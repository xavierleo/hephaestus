import type { Recipe } from '../types.js'

export const gitea: Recipe = {
  id: 'gitea',
  name: 'Gitea',
  description: 'Self-hosted Git service',
  category: 'dev',
  port: 3100,
  tags: [],

  envVars: [
    {
      key: 'GITEA_HTTP_PORT',
      description: 'Web UI port',
      defaultValue: '3100',
      secret: false,
      required: true,
    },
    {
      key: 'GITEA_SSH_PORT',
      description: 'SSH port',
      defaultValue: '2222',
      secret: false,
      required: true,
    },
    {
      key: 'GITEA_DATA',
      description: 'Data directory — must be local',
      defaultValue: config => `${config.baseDir}/gitea/data`,
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
    image: 'gitea/gitea:latest',
    container_name: 'gitea',
    restart: 'unless-stopped',
    environment: [
      'USER_UID=${PUID}',
      'USER_GID=${PGID}',
      'TZ=${TZ}',
    ],
    volumes: ['${GITEA_DATA}:/data'],
    ports: [
      '${GITEA_HTTP_PORT}:3000',
      '${GITEA_SSH_PORT}:22',
    ],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
