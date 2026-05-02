import type { Recipe } from '../types.js'

export const mosquitto: Recipe = {
  id: 'mosquitto',
  name: 'Mosquitto',
  description: 'MQTT message broker',
  category: 'homeauto',
  port: 1883,
  tags: [],

  envVars: [
    {
      key: 'MOSQUITTO_PORT',
      description: 'MQTT port',
      defaultValue: '1883',
      secret: false,
      required: true,
    },
    {
      key: 'MOSQUITTO_DATA',
      description: 'Data directory — must be local',
      defaultValue: config => `${config.baseDir}/mosquitto`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'eclipse-mosquitto:latest',
    container_name: 'mosquitto',
    restart: 'unless-stopped',
    environment: ['TZ=${TZ}'],
    volumes: [
      '${MOSQUITTO_DATA}/config:/mosquitto/config',
      '${MOSQUITTO_DATA}/data:/mosquitto/data',
      '${MOSQUITTO_DATA}/log:/mosquitto/log',
    ],
    ports: ['${MOSQUITTO_PORT}:1883'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
