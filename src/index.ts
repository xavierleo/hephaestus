import { Command } from 'commander'
import { render } from 'ink'
import React from 'react'
import { App } from './tui/App.js'
import type { AppFlags } from './types/config.js'
import { allRecipes } from './recipes/registry.js'

const program = new Command()

program
  .name('hephaestus')
  .description('Homelab stack scaffolder — Ninite for homelabs')
  .version('1.0.0')
  .option('--dry-run', 'Preview everything without writing any files', false)
  .option('--stacks-only', 'Re-scaffold stacks, skip system setup screens', false)
  .option('--list', 'Print available services and exit', false)

program
  .command('update')
  .description('Pull latest changes and rebuild')
  .action(async () => {
    const { execa } = await import('execa')
    const hephaestusDir = process.env['HEPHAESTUS_DIR'] ?? `${process.env['HOME']}/.hephaestus`
    await execa('git', ['-C', hephaestusDir, 'pull'], { stdio: 'inherit' })
    await execa('npm', ['install', '--prefix', hephaestusDir], { stdio: 'inherit' })
    await execa('npm', ['run', 'build', '--prefix', hephaestusDir], { stdio: 'inherit' })
    console.log('✓ Hephaestus updated successfully')
  })

program.action((options: { dryRun: boolean; stacksOnly: boolean; list: boolean }) => {
  if (options.list) {
    printServiceList()
    process.exit(0)
  }

  const flags: AppFlags = {
    dryRun: options.dryRun,
    stacksOnly: options.stacksOnly,
    list: options.list,
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
