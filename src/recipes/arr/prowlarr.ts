import type { Recipe } from '../types.js'
import { generateArrConfig } from '../../scaffold/seed/arr-config.js'
import { generateWireScript } from '../../scaffold/seed/wire-script.js'

export const prowlarr: Recipe = {
  id: 'prowlarr',
  name: 'Prowlarr',
  description: 'Indexer manager for all arr apps',
  category: 'arr',
  port: 9696,
  tags: ['arr', 'sqlite'],

  envVars: [
    {
      key: 'PROWLARR_PORT',
      description: 'Web UI port',
      defaultValue: '9696',
      secret: false,
      required: true,
    },
    {
      key: 'PROWLARR_DATA',
      description: 'Config directory — must be local (SQLite)',
      defaultValue: config => `${config.baseDir}/prowlarr/config`,
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
    image: 'lscr.io/linuxserver/prowlarr:latest',
    container_name: 'prowlarr',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: ['${PROWLARR_DATA}:/config'],
    ports: ['${PROWLARR_PORT}:9696'],
  },

  seedConfigs: [
    {
      path: config => `${config.baseDir}/prowlarr/config/config.xml`,
      generate: ctx => generateArrConfig('Prowlarr', 9696, ctx.apiKey),
    },
    {
      path: 'wire-services.sh',
      generate: ctx => generateWireScript(ctx),
    },
  ],
  dependsOn: [],
  postInstall: [],
}
