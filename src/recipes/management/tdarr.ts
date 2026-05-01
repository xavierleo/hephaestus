import type { Recipe } from '../types.js'

export const tdarr: Recipe = {
  id: 'tdarr',
  name: 'Tdarr',
  description: 'Media transcoding library (alternative to FileFlows)',
  category: 'management',
  port: 8265,
  tags: ['needs-gpu', 'needs-nas'],

  envVars: [
    {
      key: 'TDARR_SERVER_PORT',
      description: 'Server UI port',
      defaultValue: '8265',
      secret: false,
      required: true,
    },
    {
      key: 'TDARR_NODE_PORT',
      description: 'Node API port',
      defaultValue: '8266',
      secret: false,
      required: true,
    },
    {
      key: 'TDARR_SERVER_DATA',
      description: 'Server data directory — must be local',
      defaultValue: config => `${config.baseDir}/tdarr/server`,
      secret: false,
      required: true,
    },
    {
      key: 'TDARR_CONFIGS',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/tdarr/configs`,
      secret: false,
      required: true,
    },
    {
      key: 'TDARR_LOGS',
      description: 'Log directory',
      defaultValue: config => `${config.baseDir}/tdarr/logs`,
      secret: false,
      required: true,
    },
    {
      key: 'TDARR_TEMP',
      description: 'Transcode temp — must be local SSD',
      defaultValue: config => `${config.baseDir}/tdarr/temp`,
      secret: false,
      required: true,
    },
    {
      key: 'MEDIA_DIR',
      description: 'Media library root',
      defaultValue: config => config.mediaDir,
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
  ],

  composeService: {
    image: 'ghcr.io/haveagitgat/tdarr:latest',
    container_name: 'tdarr',
    restart: 'unless-stopped',
    environment: [
      'PUID=${PUID}',
      'PGID=${PGID}',
      'TZ=${TZ}',
      'serverIP=0.0.0.0',
      'serverPort=8266',
      'webUIPort=8265',
    ],
    volumes: [
      '${TDARR_SERVER_DATA}:/app/server',
      '${TDARR_CONFIGS}:/app/configs',
      '${TDARR_LOGS}:/app/logs',
      '${TDARR_TEMP}:/temp',
      '${MEDIA_DIR}:/media',
    ],
    ports: [
      '${TDARR_SERVER_PORT}:8265',
      '${TDARR_NODE_PORT}:8266',
    ],
    devices: ['/dev/dri:/dev/dri'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
