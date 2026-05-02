import type { Recipe } from '../types.js'

export const nzbget: Recipe = {
  id: 'nzbget',
  name: 'NZBGet',
  description: 'Usenet downloader (alternative to SABnzbd)',
  category: 'download',
  port: 6789,
  tags: [],

  envVars: [
    {
      key: 'NZBGET_PORT',
      description: 'Web UI port',
      defaultValue: '6789',
      secret: false,
      required: true,
    },
    {
      key: 'NZBGET_DATA',
      description: 'NZBGet config directory — must be local',
      defaultValue: config => `${config.baseDir}/nzbget/config`,
      secret: false,
      required: true,
    },
    {
      key: 'COMPLETE_DIR',
      description: 'Completed downloads directory',
      defaultValue: config => config.usenetDir ?? `${config.mediaDir}/downloads/complete`,
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
    image: 'lscr.io/linuxserver/nzbget:latest',
    container_name: 'nzbget',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${NZBGET_DATA}:/config',
      '${COMPLETE_DIR}:/downloads/complete',
    ],
    ports: ['${NZBGET_PORT}:6789'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
