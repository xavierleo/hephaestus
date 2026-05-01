import type { Recipe } from '../types.js'

export const pihole: Recipe = {
  id: 'pihole',
  name: 'Pi-hole',
  description: 'DNS sinkhole + ad blocking',
  category: 'networking',
  port: 8053,
  tags: ['network-host'],

  envVars: [
    {
      key: 'PIHOLE_PORT',
      description: 'Admin UI port',
      defaultValue: '8053',
      secret: false,
      required: true,
    },
    {
      key: 'PIHOLE_PASSWORD',
      description: 'Admin password',
      defaultValue: '',
      secret: true,
      required: true,
    },
    {
      key: 'PIHOLE_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/pihole`,
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
    image: 'pihole/pihole:latest',
    container_name: 'pihole',
    restart: 'unless-stopped',
    environment: [
      'TZ=${TZ}',
      'WEBPASSWORD=${PIHOLE_PASSWORD}',
      'WEB_PORT=${PIHOLE_PORT}',
    ],
    volumes: [
      '${PIHOLE_DATA}/pihole:/etc/pihole',
      '${PIHOLE_DATA}/dnsmasq.d:/etc/dnsmasq.d',
    ],
    ports: [
      '53:53/tcp',
      '53:53/udp',
      '${PIHOLE_PORT}:80',
    ],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
