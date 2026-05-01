import type { Recipe } from '../recipes/types.js'
import type { WizardConfig } from '../types/config.js'

export function renderSetupMd(recipe: Recipe, config: WizardConfig): string {
  const port = recipe.port
  const url = port > 0 ? `http://${config.hostIp}:${port}` : undefined

  const lines: string[] = [
    `# ${recipe.name} — Post-install setup`,
    '',
    `Start: \`cd ${config.stacksDir}/${recipe.id} && docker compose up -d\``,
    url ? `Open:  ${url}` : '',
    '',
  ]

  if (recipe.seedConfigs.length > 0) {
    lines.push('## Already configured for you')
    for (const seed of recipe.seedConfigs) {
      lines.push(`- ✓ ${seed.path} pre-seeded`)
    }
    lines.push('')
  }

  if (recipe.dependsOn.length > 0) {
    lines.push('## Pre-wired connections')
    for (const dep of recipe.dependsOn) {
      lines.push(`- ↔ ${dep}`)
    }
    lines.push('')
  }

  if (recipe.postInstall.length > 0) {
    lines.push('## You need to do')
    recipe.postInstall.forEach((step, i) => {
      lines.push(`${i + 1}. **${step.title}**`)
      lines.push(`   ${step.description}`)
      if (step.url) {
        lines.push(`   ${step.url(config)}`)
      }
    })
    lines.push('')
  }

  if (config.domain) {
    lines.push('## Reverse proxy (optional)')
    lines.push(`NPM proxy host:`)
    lines.push(`  Forward hostname: ${recipe.composeService.container_name}`)
    if (port > 0) lines.push(`  Forward port:     ${port}`)
    if (config.domain) {
      lines.push(`  SSL: request Let's Encrypt cert for ${recipe.id}.${config.domain}`)
    }
  }

  return lines.filter(l => l !== null).join('\n')
}
