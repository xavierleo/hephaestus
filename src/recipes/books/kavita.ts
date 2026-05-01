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
  ],

  composeService: {
    image: 'jvmilazz0/kavita:latest',
    container_name: 'kavita',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: [
      '${KAVITA_DATA}:/kavita/config',
      '${COMICS_DIR}:/comics:ro',
    ],
    ports: ['${KAVITA_PORT}:5000'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
