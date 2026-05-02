import { Command } from 'commander'
import { render } from 'ink'
import React from 'react'
import { App } from './tui/App.js'
import type { AppFlags, WizardConfig } from './types/config.js'
import { allRecipes } from './recipes/registry.js'
import { getCliVersion } from './version.js'

const program = new Command()

program
  .name('hephaestus')
  .description('Homelab stack scaffolder — Ninite for homelabs')
  .version(getCliVersion())
  .option('--dry-run', 'Preview everything without writing any files', false)
  .option('--stacks-only', 'Re-scaffold stacks, skip system setup screens', false)
  .option('--list', 'Print available services and exit', false)
  .option('--profile <name>', 'Load a saved profile by name')

program
  .command('update')
  .description('Update from the latest verified GitHub release')
  .action(async () => {
    const { runReleaseUpdate } = await import('./system/release.js')
    const hephaestusDir = process.env['HEPHAESTUS_DIR'] ?? `${process.env['HOME']}/.hephaestus`
    await runReleaseUpdate({
      installDir: hephaestusDir,
      binPath: process.env['HEPHAESTUS_BIN'] ?? '/usr/local/bin/hephaestus',
    })
    console.log('✓ Hephaestus updated successfully')
  })

const profileCmd = program
  .command('profile')
  .description('Manage saved profiles')

profileCmd
  .command('list')
  .description('List all saved profiles')
  .action(async () => {
    const { loadProfiles } = await import('./profile/index.js')
    const store = loadProfiles()
    const names = Object.keys(store.profiles)
    if (names.length === 0) {
      console.log('No profiles saved yet. Run hephaestus to create one.')
      return
    }
    console.log('')
    for (const name of names) {
      const p = store.profiles[name]!
      const active = store.activeProfile === name ? ' ★' : '  '
      const updated = new Date(p.updatedAt).toLocaleDateString()
      const desc = p.description ? `  ${p.description}` : ''
      console.log(`${active} ${name.padEnd(20)} ${String(p.defaultServices.length).padStart(2)} services   updated ${updated}${desc}`)
    }
    console.log('')
  })

profileCmd
  .command('show [name]')
  .description('Show full config for a profile (defaults to active profile)')
  .action(async (name?: string) => {
    const { loadProfiles } = await import('./profile/index.js')
    const store = loadProfiles()
    const profileName = name ?? store.activeProfile
    if (!profileName) {
      console.error('No profile name given and no active profile set.')
      process.exit(1)
    }
    const profile = store.profiles[profileName]
    if (!profile) {
      console.error(`Profile "${profileName}" not found.`)
      process.exit(1)
    }
    console.log(`\nProfile: ${profile.name}${store.activeProfile === profileName ? ' ★' : ''}`)
    if (profile.description) console.log(`Description: ${profile.description}`)
    console.log(`Created:  ${profile.createdAt}`)
    console.log(`Updated:  ${profile.updatedAt}`)
    console.log(`Services: ${profile.defaultServices.join(', ')}`)
    console.log(`NAS:      ${profile.config.hasNas ? `enabled — ${profile.config.nasMountPath}` : 'disabled'}`)
    console.log('\nConfig:')
    for (const [k, v] of Object.entries(profile.config)) {
      console.log(`  ${k.padEnd(18)} ${v}`)
    }
    console.log('')
  })

profileCmd
  .command('use <name>')
  .description('Set the active profile')
  .action(async (name: string) => {
    const { setActiveProfile } = await import('./profile/index.js')
    try {
      setActiveProfile(name)
      console.log(`✓ Active profile set to "${name}"`)
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

profileCmd
  .command('delete <name>')
  .description('Delete a profile (prompts for confirmation)')
  .action(async (name: string) => {
    const readline = await import('readline')
    const { loadProfiles, deleteProfile } = await import('./profile/index.js')
    const store = loadProfiles()
    if (!store.profiles[name]) {
      console.error(`Profile "${name}" not found.`)
      process.exit(1)
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await new Promise<string>(resolve =>
      rl.question(`Delete profile "${name}"? This cannot be undone. [y/N] `, resolve)
    )
    rl.close()
    if (answer.toLowerCase() !== 'y') {
      console.log('Aborted.')
      return
    }
    deleteProfile(name)
    console.log(`✓ Deleted "${name}"`)
  })

profileCmd
  .command('export <name> [output-path]')
  .description('Export a profile to a JSON file (no secrets)')
  .action(async (name: string, outputPath?: string) => {
    const { loadProfiles } = await import('./profile/index.js')
    const { writeFileSync } = await import('fs')
    const store = loadProfiles()
    const profile = store.profiles[name]
    if (!profile) {
      console.error(`Profile "${name}" not found.`)
      process.exit(1)
    }
    const out = outputPath ?? `${name}-profile.json`
    writeFileSync(out, JSON.stringify(profile, null, 2), 'utf-8')
    console.log(`✓ Exported "${name}" to ${out}`)
  })

profileCmd
  .command('import <file-path>')
  .description('Import a profile from a JSON file')
  .action(async (filePath: string) => {
    const readline = await import('readline')
    const { readFileSync } = await import('fs')
    const { loadProfiles } = await import('./profile/index.js')

    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(filePath, 'utf-8'))
    } catch {
      console.error(`Could not read "${filePath}"`)
      process.exit(1)
    }

    if (
      typeof parsed !== 'object' || parsed === null ||
      !('name' in parsed) || typeof (parsed as Record<string, unknown>)['name'] !== 'string' ||
      !('config' in parsed) || !('defaultServices' in parsed)
    ) {
      console.error('File does not look like a valid Hephaestus profile export.')
      process.exit(1)
    }

    const p = parsed as { name: string; config: Record<string, unknown>; defaultServices: string[]; description?: string }

    const doImport = async () => {
      const { saveProfile: save } = await import('./profile/index.js')
      save(p.name, p.config as Partial<WizardConfig>, p.defaultServices, p.description ?? '')
      console.log(`✓ Imported profile "${p.name}"`)
    }

    const store = loadProfiles()
    if (store.profiles[p.name]) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      rl.question(`Profile "${p.name}" already exists. Overwrite? [y/N] `, answer => {
        rl.close()
        if (answer.toLowerCase() !== 'y') { console.log('Aborted.'); return }
        doImport().catch(err => {
          console.error('Import failed:', err instanceof Error ? err.message : String(err))
          process.exit(1)
        })
      })
    } else {
      await doImport()
    }
  })

program.action((options: { dryRun: boolean; stacksOnly: boolean; list: boolean; profile?: string }) => {
  if (options.list) {
    printServiceList()
    process.exit(0)
  }

  const flags: AppFlags = {
    dryRun: options.dryRun,
    stacksOnly: options.stacksOnly,
    list: options.list,
    profileName: options.profile,
  }

  const { waitUntilExit } = render(React.createElement(App, { flags }))
  waitUntilExit().then(() => process.exit(0))
})

program.parse()

function printServiceList(): void {
  const byCategory = new Map<string, typeof allRecipes>()
  for (const recipe of allRecipes) {
    const existing = byCategory.get(recipe.category) ?? []
    existing.push(recipe)
    byCategory.set(recipe.category, existing)
  }

  for (const [category, recipes] of byCategory.entries()) {
    console.log(`\n${category.toUpperCase()}`)
    console.log('─'.repeat(60))
    for (const r of recipes) {
      const portStr = r.port > 0 ? `:${r.port}` : '    '
      const tags = r.tags.length > 0 ? `  [${r.tags.join(', ')}]` : ''
      console.log(`  ${r.id.padEnd(20)} ${r.name.padEnd(22)} ${portStr.padEnd(8)}${tags}`)
    }
  }
  console.log('')
}
