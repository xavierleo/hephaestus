import type { Recipe } from '../types.js'
import { generateSabnzbdIni } from '../../scaffold/seed/sabnzbd-ini.js'

export const sabnzbd: Recipe = {
  id: 'sabnzbd',
  name: 'SABnzbd',
  description: 'Usenet downloader',
  category: 'download',
  port: 8080,
  tags: ['needs-nas'],

  envVars: [
    {
      key: 'SABNZBD_DATA',
      description: 'SABnzbd config directory — must be local',
      defaultValue: config => `${config.baseDir}/sabnzbd/config`,
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
      key: 'INCOMPLETE_DIR',
      description: 'In-progress downloads directory — must be local SSD',
      defaultValue: config => `${config.baseDir}/sabnzbd/incomplete`,
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
    image: 'lscr.io/linuxserver/sabnzbd:latest',
    container_name: 'sabnzbd',
    restart: 'unless-stopped',
    environment: ['PUID=${PUID}', 'PGID=${PGID}', 'TZ=${TZ}'],
    volumes: [
      '${SABNZBD_DATA}:/config',
      '${COMPLETE_DIR}:/downloads/complete',
      '${INCOMPLETE_DIR}:/downloads/incomplete',
    ],
    ports: ['8080:8080'],
  },

  seedConfigs: [
    {
      path: config => `${config.baseDir}/sabnzbd/config/sabnzbd.ini`,
      generate: ctx => generateSabnzbdIni(ctx.config, ctx.apiKey),
    },
  ],
  dependsOn: [],
  postInstall: [],
}
