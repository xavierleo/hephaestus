import type { Recipe } from '../types.js'

export const immich: Recipe = {
  id: 'immich',
  name: 'Immich',
  description: 'Self-hosted photo and video backup',
  category: 'productivity',
  port: 2283,
  tags: ['needs-nas'],

  envVars: [
    {
      key: 'IMMICH_PORT',
      description: 'Web UI port',
      defaultValue: '2283',
      secret: false,
      required: true,
    },
    {
      key: 'IMMICH_DATA',
      description: 'App data directory — must be local',
      defaultValue: config => `${config.baseDir}/immich/data`,
      secret: false,
      required: true,
    },
    {
      key: 'IMMICH_UPLOAD',
      description: 'Photo/video upload directory (can be NAS)',
      defaultValue: config => `${config.mediaDir}/photos`,
      secret: false,
      required: true,
    },
    {
      key: 'DB_PASSWORD',
      description: 'PostgreSQL password',
      defaultValue: 'immich_db_password',
      secret: true,
      required: true,
    },
  ],

  composeService: {
    image: 'ghcr.io/immich-app/immich-server:release',
    container_name: 'immich',
    restart: 'unless-stopped',
    environment: [
      'DB_HOSTNAME=immich-postgres',
      'DB_USERNAME=postgres',
      'DB_PASSWORD=${DB_PASSWORD}',
      'DB_DATABASE_NAME=immich',
      'REDIS_HOSTNAME=immich-redis',
      'TZ=${TZ}',
    ],
    volumes: [
      '${IMMICH_UPLOAD}:/usr/src/app/upload',
      '${IMMICH_DATA}:/usr/src/app/data',
    ],
    ports: ['${IMMICH_PORT}:2283'],
    depends_on: ['immich-redis', 'immich-postgres'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
