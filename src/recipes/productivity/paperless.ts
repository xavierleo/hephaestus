import type { Recipe } from '../types.js'

export const paperless: Recipe = {
  id: 'paperless',
  name: 'Paperless-ngx',
  description: 'Document management and OCR',
  category: 'productivity',
  port: 8000,
  tags: [],

  envVars: [
    {
      key: 'PAPERLESS_PORT',
      description: 'Web UI port',
      defaultValue: '8400',
      secret: false,
      required: true,
    },
    {
      key: 'PAPERLESS_DATA',
      description: 'Data directory — must be local',
      defaultValue: config => `${config.baseDir}/paperless/data`,
      secret: false,
      required: true,
    },
    {
      key: 'PAPERLESS_MEDIA',
      description: 'Document media directory',
      defaultValue: config => `${config.baseDir}/paperless/media`,
      secret: false,
      required: true,
    },
    {
      key: 'PAPERLESS_CONSUME',
      description: 'Inbox directory for auto-import',
      defaultValue: config => `${config.baseDir}/paperless/consume`,
      secret: false,
      required: true,
    },
    {
      key: 'PAPERLESS_SECRET_KEY',
      description: 'Django secret key (auto-generated if blank)',
      defaultValue: '',
      secret: true,
      required: false,
    },
    {
      key: 'PAPERLESS_ADMIN_USER',
      description: 'Initial admin username',
      defaultValue: 'admin',
      secret: false,
      required: true,
    },
    {
      key: 'PAPERLESS_ADMIN_PASSWORD',
      description: 'Initial admin password',
      defaultValue: '',
      secret: true,
      required: true,
    },
  ],

  composeService: {
    image: 'ghcr.io/paperless-ngx/paperless-ngx:latest',
    container_name: 'paperless',
    restart: 'unless-stopped',
    environment: [
      'PAPERLESS_SECRET_KEY=${PAPERLESS_SECRET_KEY}',
      'PAPERLESS_ADMIN_USER=${PAPERLESS_ADMIN_USER}',
      'PAPERLESS_ADMIN_PASSWORD=${PAPERLESS_ADMIN_PASSWORD}',
      'TZ=${TZ}',
    ],
    volumes: [
      '${PAPERLESS_DATA}:/usr/src/paperless/data',
      '${PAPERLESS_MEDIA}:/usr/src/paperless/media',
      '${PAPERLESS_CONSUME}:/usr/src/paperless/consume',
    ],
    ports: ['${PAPERLESS_PORT}:8000'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
