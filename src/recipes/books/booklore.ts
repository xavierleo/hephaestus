import type { Recipe } from '../types.js'

export const booklore: Recipe = {
  id: 'booklore',
  name: 'BookLore',
  description: 'Book tracker and manager',
  category: 'books',
  port: 6464,
  tags: [],

  envVars: [
    {
      key: 'BOOKLORE_PORT',
      description: 'Web UI port',
      defaultValue: '6464',
      secret: false,
      required: true,
    },
    {
      key: 'BOOKLORE_DATA',
      description: 'Data directory — must be local',
      defaultValue: config => `${config.baseDir}/booklore/data`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'ghcr.io/adityachandelgit/booklore-app:latest',
    container_name: 'booklore',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: ['${BOOKLORE_DATA}:/data'],
    ports: ['${BOOKLORE_PORT}:6464'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
