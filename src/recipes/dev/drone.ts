import type { Recipe } from '../types.js'

export const drone: Recipe = {
  id: 'drone',
  name: 'Drone CI',
  description: 'Container-native CI/CD',
  category: 'dev',
  port: 3200,
  tags: [],

  envVars: [
    {
      key: 'DRONE_PORT',
      description: 'Web UI port',
      defaultValue: '3200',
      secret: false,
      required: true,
    },
    {
      key: 'DRONE_SERVER_HOST',
      description: 'Public hostname of Drone server',
      defaultValue: config => `drone.${config.domain || config.hostIp}`,
      secret: false,
      required: true,
    },
    {
      key: 'DRONE_GITEA_SERVER',
      description: 'Gitea server URL',
      defaultValue: config => `http://${config.hostIp}:3100`,
      secret: false,
      required: true,
    },
    {
      key: 'DRONE_GITEA_CLIENT_ID',
      description: 'Gitea OAuth application client ID',
      defaultValue: '',
      secret: true,
      required: true,
    },
    {
      key: 'DRONE_GITEA_CLIENT_SECRET',
      description: 'Gitea OAuth application client secret',
      defaultValue: '',
      secret: true,
      required: true,
    },
    {
      key: 'DRONE_RPC_SECRET',
      description: 'Shared secret between server and runner',
      defaultValue: '',
      secret: true,
      required: true,
    },
    {
      key: 'DRONE_DATA',
      description: 'Data directory — must be local',
      defaultValue: config => `${config.baseDir}/drone/data`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'drone/drone:2',
    container_name: 'drone',
    restart: 'unless-stopped',
    environment: [
      'DRONE_GITEA_SERVER=${DRONE_GITEA_SERVER}',
      'DRONE_GITEA_CLIENT_ID=${DRONE_GITEA_CLIENT_ID}',
      'DRONE_GITEA_CLIENT_SECRET=${DRONE_GITEA_CLIENT_SECRET}',
      'DRONE_RPC_SECRET=${DRONE_RPC_SECRET}',
      'DRONE_SERVER_HOST=${DRONE_SERVER_HOST}',
      'DRONE_SERVER_PROTO=http',
    ],
    volumes: [
      '${DRONE_DATA}:/data',
      '/var/run/docker.sock:/var/run/docker.sock',
    ],
    ports: ['${DRONE_PORT}:80'],
  },

  seedConfigs: [],
  dependsOn: ['gitea'],
  postInstall: [],
}
