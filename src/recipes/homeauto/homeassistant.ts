import type { Recipe } from '../types.js'

export const homeassistant: Recipe = {
  id: 'homeassistant',
  name: 'Home Assistant',
  description: 'Home automation platform',
  category: 'homeauto',
  port: 8123,
  tags: ['network-host'],

  envVars: [
    {
      key: 'HA_DATA',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/homeassistant/config`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'ghcr.io/home-assistant/home-assistant:stable',
    container_name: 'homeassistant',
    restart: 'unless-stopped',
    network_mode: 'host',
    environment: ['TZ=${TZ}'],
    volumes: [
      '${HA_DATA}:/config',
      '/run/dbus:/run/dbus:ro',
    ],
    // network_mode: host — ports are exposed directly
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
