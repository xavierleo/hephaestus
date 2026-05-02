import type { Recipe } from '../types.js'

export const komga: Recipe = {
  id: 'komga',
  name: 'Komga',
  description: 'Comics server with OPDS support',
  category: 'books',
  port: 25600,
  tags: ['needs-nas'],

  envVars: [
    {
      key: 'KOMGA_PORT',
      description: 'Web UI port',
      defaultValue: '25600',
      secret: false,
      required: true,
    },
    {
      key: 'KOMGA_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/komga/config`,
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
  ],

  composeService: {
    image: 'gotson/komga:latest',
    container_name: 'komga',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: [
      '${KOMGA_DATA}:/config',
      '${COMICS_DIR}:/comics:ro',
    ],
    ports: ['${KOMGA_PORT}:25600'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
