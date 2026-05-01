import type { Recipe } from '../types.js'

export const netdata: Recipe = {
  id: 'netdata',
  name: 'Netdata',
  description: 'Real-time system + container metrics',
  category: 'monitoring',
  port: 19999,
  tags: [],

  envVars: [
    {
      key: 'NETDATA_PORT',
      description: 'Web UI port',
      defaultValue: '19999',
      secret: false,
      required: true,
    },
    {
      key: 'NETDATA_DATA',
      description: 'Config and cache directory — must be local',
      defaultValue: config => `${config.baseDir}/netdata`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'netdata/netdata:latest',
    container_name: 'netdata',
    restart: 'unless-stopped',
    cap_add: ['SYS_PTRACE', 'SYS_ADMIN'],
    security_opt: ['apparmor:unconfined'],
    environment: ['TZ=${TZ}'],
    volumes: [
      '${NETDATA_DATA}/config:/etc/netdata',
      '${NETDATA_DATA}/lib:/var/lib/netdata',
      '${NETDATA_DATA}/cache:/var/cache/netdata',
      '/proc:/host/proc:ro',
      '/sys:/host/sys:ro',
      '/etc/os-release:/host/etc/os-release:ro',
      '/var/run/docker.sock:/var/run/docker.sock:ro',
    ],
    ports: ['${NETDATA_PORT}:19999'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
