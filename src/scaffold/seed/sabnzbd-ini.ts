import type { WizardConfig } from '../../types/config.js'

export function generateSabnzbdIni(config: WizardConfig, apiKey: string): string {
  const completeDir = `${config.mediaDir}/downloads/complete`
  const incompleteDir = `${config.baseDir}/sabnzbd/incomplete`

  return `[misc]
host = 0.0.0.0
port = 8080
apikey = ${apiKey}
nzo_ids = []
download_dir = ${incompleteDir}
complete_dir = ${completeDir}
log_dir = logs
admin_dir = admin
dirscan_speed = 5
web_dir = Glitter
bandwidth_perc = 100
bandwidth_max = 0

[categories]
[[*]]
name = *
order = 0
pp = 3
script = Default
dir =
newzbin =
priority = 0

[[tv]]
name = tv
order = 1
pp = 3
script = Default
dir = ${completeDir}/tv
newzbin =
priority = 0

[[movies]]
name = movies
order = 2
pp = 3
script = Default
dir = ${completeDir}/movies
newzbin =
priority = 0

[[music]]
name = music
order = 3
pp = 3
script = Default
dir = ${completeDir}/music
newzbin =
priority = 0

[[books]]
name = books
order = 4
pp = 3
script = Default
dir = ${completeDir}/books
newzbin =
priority = 0

[[manual]]
name = manual
order = 5
pp = 3
script = Default
dir = ${completeDir}/manual
newzbin =
priority = 0
`
}
