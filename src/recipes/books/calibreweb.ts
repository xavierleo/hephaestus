import type { Recipe } from '../types.js'

export const calibreweb: Recipe = {
  id: 'calibreweb',
  name: 'Calibre-Web',
  description: 'Ebook library with web reader',
  category: 'books',
  port: 8083,
  tags: ['needs-nas'],

  envVars: [
    {
      key: 'CALIBREWEB_PORT',
      description: 'Web UI port',
      defaultValue: '8083',
      secret: false,
      required: true,
    },
    {
      key: 'CALIBREWEB_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/calibreweb/config`,
      secret: false,
      required: true,
    },
    {
      key: 'CALIBRE_LIBRARY',
      description: 'Calibre library location (can be on NAS)',
      defaultValue: config => `${config.mediaDir}/books`,
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
    image: 'lscr.io/linuxserver/calibre-web:latest',
    container_name: 'calibreweb',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}', 'DOCKER_MODS=linuxserver/mods:universal-calibre'],
    volumes: [
      '${CALIBREWEB_DATA}:/config',
      '${CALIBRE_LIBRARY}:/books',
    ],
    ports: ['${CALIBREWEB_PORT}:8083'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
