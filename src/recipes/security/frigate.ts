import type { Recipe } from '../types.js'

export const frigate: Recipe = {
  id: 'frigate',
  name: 'Frigate',
  description: 'Camera NVR with local object detection',
  category: 'security',
  port: 8971,
  tags: ['needs-gpu', 'privileged'],

  envVars: [
    {
      key: 'FRIGATE_PORT',
      description: 'Web UI port',
      defaultValue: '8971',
      secret: false,
      required: true,
    },
    {
      key: 'FRIGATE_RTSP_PORT',
      description: 'RTSP restreaming port',
      defaultValue: '8554',
      secret: false,
      required: true,
    },
    {
      key: 'FRIGATE_WEBRTC_PORT',
      description: 'WebRTC port',
      defaultValue: '8555',
      secret: false,
      required: true,
    },
    {
      key: 'FRIGATE_CONFIG',
      description: 'Config directory — must be local',
      defaultValue: config => `${config.baseDir}/frigate/config`,
      secret: false,
      required: true,
    },
    {
      key: 'FRIGATE_MEDIA',
      description: 'Recording and snapshot storage',
      defaultValue: config => `${config.mediaDir}/frigate`,
      secret: false,
      required: true,
    },
    {
      key: 'FRIGATE_RTSP_PASSWORD',
      description: 'RTSP password for Frigate restreams',
      defaultValue: '',
      secret: true,
      required: true,
    },
  ],

  composeService: {
    image: 'ghcr.io/blakeblackshear/frigate:stable',
    container_name: 'frigate',
    restart: 'unless-stopped',
    stop_grace_period: '30s',
    privileged: true,
    shm_size: '512mb',
    environment: [
      'TZ=${TZ}',
      'FRIGATE_RTSP_PASSWORD=${FRIGATE_RTSP_PASSWORD}',
    ],
    volumes: [
      '/etc/localtime:/etc/localtime:ro',
      '${FRIGATE_CONFIG}:/config',
      '${FRIGATE_MEDIA}:/media/frigate',
    ],
    tmpfs: ['/tmp/cache:size=1000000000'],
    ports: [
      '${FRIGATE_PORT}:8971',
      '${FRIGATE_RTSP_PORT}:8554',
      '${FRIGATE_WEBRTC_PORT}:8555/tcp',
      '${FRIGATE_WEBRTC_PORT}:8555/udp',
    ],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [
    {
      title: 'Create config.yml',
      description: 'Frigate requires camera and detector settings in the mounted config directory before it can do useful detection.',
      url: () => 'https://docs.frigate.video/configuration/',
    },
    {
      title: 'Add detector hardware',
      description: 'For Coral, Hailo, Nvidia, or other accelerators, add the matching device mapping from the Frigate hardware docs after confirming the host device path.',
      url: () => 'https://docs.frigate.video/frigate/installation/',
    },
  ],
}
