import type { Recipe } from '../types.js'

export const gluetun: Recipe = {
  id: 'gluetun',
  name: 'Gluetun',
  description: 'VPN kill-switch container',
  category: 'download',
  port: 0,
  tags: ['needs-gluetun', 'privileged'],

  envVars: [
    {
      key: 'VPN_SERVICE_PROVIDER',
      description: 'VPN provider (e.g. mullvad, nordvpn, private internet access)',
      defaultValue: 'mullvad',
      secret: false,
      required: true,
    },
    {
      key: 'VPN_TYPE',
      description: 'VPN protocol (wireguard or openvpn)',
      defaultValue: 'wireguard',
      secret: false,
      required: true,
    },
    {
      key: 'WIREGUARD_PRIVATE_KEY',
      description: 'WireGuard private key from your VPN provider',
      defaultValue: '',
      secret: true,
      required: true,
    },
    {
      key: 'WIREGUARD_ADDRESSES',
      description: 'WireGuard IP address (e.g. 10.64.222.21/32)',
      defaultValue: '',
      secret: false,
      required: true,
    },
    {
      key: 'SERVER_COUNTRIES',
      description: 'Server country filter',
      defaultValue: 'Netherlands',
      secret: false,
      required: false,
    },
    {
      key: 'GLUETUN_DATA',
      description: 'Gluetun data directory',
      defaultValue: config => `${config.baseDir}/gluetun/data`,
      secret: false,
      required: true,
    },
  ],

  composeService: {
    image: 'qmcgaw/gluetun:latest',
    container_name: 'gluetun',
    restart: 'unless-stopped',
    cap_add: ['NET_ADMIN'],
    devices: ['/dev/net/tun:/dev/net/tun'],
    environment: [
      'VPN_SERVICE_PROVIDER=${VPN_SERVICE_PROVIDER}',
      'VPN_TYPE=${VPN_TYPE}',
      'WIREGUARD_PRIVATE_KEY=${WIREGUARD_PRIVATE_KEY}',
      'WIREGUARD_ADDRESSES=${WIREGUARD_ADDRESSES}',
      'SERVER_COUNTRIES=${SERVER_COUNTRIES}',
      'TZ=${TZ}',
    ],
    volumes: ['${GLUETUN_DATA}:/gluetun'],
    ports: [
      '8080:8080',   // SABnzbd
      '8388:8388',   // qBittorrent
    ],
  },

  seedConfigs: [],
  dependsOn: [],
  postInstall: [],
}
