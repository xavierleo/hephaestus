import type { Recipe } from '../types.js'

export const kavita: Recipe = {
  id: 'kavita',
  name: 'Kavita',
  description: 'Comics and manga reader',
  category: 'books',
  port: 5000,
  tags: ['needs-nas'],

  envVars: [
    {
      key: 'KAVITA_PORT',
      description: 'Web UI port',
      defaultValue: '5000',
      secret: false,
      required: true,
    },
    {
      key: 'KAVITA_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/kavita/config`,
      secret: false,
      required: true,
    },
    {
      key: 'COMICS_DIR',
      description: 'Comics/manga library directory',
      defaultValue: config => `${config.mediaDir}/comics`,
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
    image: 'lscr.io/linuxserver/kavita:latest',
    container_name: 'kavita',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${KAVITA_DATA}:/config',
      '${COMICS_DIR}:/data:ro',
    ],
    ports: ['${KAVITA_PORT}:5000'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
