import { describe, expect, it } from 'vitest'
import { describeMountPath, findMountAtPath, parseProcMounts } from '../system/mounts.js'

describe('mount detection', () => {
  it('parses mounted paths from /proc/mounts content', () => {
    const mounts = parseProcMounts([
      'overlay / overlay rw,relatime 0 0',
      '//192.168.1.2/media /mnt/synology-media cifs rw,relatime 0 0',
      '/dev/sda1 /mnt/Media\\040Drive ext4 rw,relatime 0 0',
    ].join('\n'))

    expect(findMountAtPath(mounts, '/mnt/synology-media')).toMatchObject({
      source: '//192.168.1.2/media',
      mountPoint: '/mnt/synology-media',
      fsType: 'cifs',
    })
    expect(findMountAtPath(mounts, '/mnt/Media Drive')).toMatchObject({
      mountPoint: '/mnt/Media Drive',
      fsType: 'ext4',
    })
  })

  it('describes whether an editable NAS mount path exists or is already mounted', () => {
    const mounts = parseProcMounts('//nas/media /mnt/nas cifs rw 0 0')

    expect(describeMountPath('/mnt/nas', mounts, () => true)).toMatchObject({
      kind: 'mounted',
      message: 'Already mounted as cifs from //nas/media',
    })
    expect(describeMountPath('/mnt/empty', mounts, () => true)).toMatchObject({
      kind: 'exists',
      message: 'Path exists but is not mounted yet',
    })
    expect(describeMountPath('/mnt/new', mounts, () => false)).toMatchObject({
      kind: 'missing',
      message: 'Path does not exist yet; Hephaestus will create it',
    })
  })
})
