import { describe, expect, it, vi, beforeEach } from 'vitest'
import { execa } from 'execa'
import { createDockerNetwork } from '../system/docker.js'

vi.mock('execa', () => ({
  execa: vi.fn(),
}))

const mockedExeca = vi.mocked(execa)

describe('Docker helpers', () => {
  beforeEach(() => {
    mockedExeca.mockReset()
  })

  it('treats an existing Docker network as success', async () => {
    mockedExeca.mockRejectedValue(new Error('Error response from daemon: network with name cerebro-net already exists'))

    await expect(createDockerNetwork('cerebro-net')).resolves.toBeUndefined()
    expect(mockedExeca).toHaveBeenCalledWith('docker', ['network', 'create', 'cerebro-net'])
  })

  it('surfaces Docker network creation failures that are not already-exists responses', async () => {
    mockedExeca.mockRejectedValue(new Error('permission denied'))

    await expect(createDockerNetwork('cerebro-net')).rejects.toThrow('permission denied')
  })
})
