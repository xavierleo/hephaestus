import type { Recipe } from '../types.js'

export const fileflows: Recipe = {
  id: 'fileflows',
  name: 'FileFlows',
  description: 'Media re-encoding with AMD GPU',
  category: 'management',
  port: 19200,
  tags: ['needs-gpu', 'needs-nas'],

  envVars: [
    {
      key: 'FILEFLOWS_PORT',
      description: 'Web UI port',
      defaultValue: '19200',
      secret: false,
      required: true,
    },
    {
      key: 'FILEFLOWS_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/fileflows/data`,
      secret: false,
      required: true,
    },
    {
      key: 'FILEFLOWS_TEMP',
      description: 'Temp directory — must be on fast local SSD',
      defaultValue: config => `${config.baseDir}/fileflows/temp`,
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
      key: 'RENDER_GID',
      description: 'GID of /dev/dri/renderD* — must match host',
      defaultValue: config => String(config.renderGid),
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'revenz/fileflows:latest',
    container_name: 'fileflows',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: [
      '${FILEFLOWS_DATA}:/app/Data',
      '${FILEFLOWS_TEMP}:/temp',
      '${MEDIA_DIR}:/media',
      '/var/run/docker.sock:/var/run/docker.sock:ro',
    ],
    ports: ['${FILEFLOWS_PORT}:19200'],
    devices: ['/dev/dri:/dev/dri'],
    group_add: ['${RENDER_GID}'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
