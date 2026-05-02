import type { Recipe } from '../types.js'

export const dockerRegistry: Recipe = {
  id: 'docker-registry',
  name: 'Docker Registry',
  description: 'Private container image registry',
  category: 'dev',
  port: 5050,
  tags: [],

  envVars: [
    {
      key: 'REGISTRY_PORT',
      description: 'Registry API port',
      defaultValue: '5050',
      secret: false,
      required: true,
    },
    {
      key: 'REGISTRY_DATA',
      description: 'Image storage directory — can be large',
      defaultValue: config => `${config.baseDir}/registry/data`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'registry:2',
    container_name: 'docker-registry',
    restart: 'unless-stopped',
    environment: ['REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY=/data'],
    volumes: ['${REGISTRY_DATA}:/data'],
    ports: ['${REGISTRY_PORT}:5000'],
    security_opt: ['no-new-privileges:true'],
    cap_drop: ['ALL'],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
