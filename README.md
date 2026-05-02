# Hephaestus

**Homelab stack scaffolder — Ninite for homelabs.**

Hephaestus is an interactive terminal wizard that generates production-ready Docker Compose stacks for your homelab. It auto-detects your system, lets you pick services, and writes `compose.yml` + `.env` files with services already wired together — Sonarr knows where SABnzbd is, Prowlarr is already connected to every arr app, Bazarr is linked to Sonarr and Radarr. Everything is configured before the first `docker compose up -d`.

> **Linux only.** Requires Docker with the Compose V2 plugin.

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/xavierleo/hephaestus/main/install.sh | bash
```

The installer will:
1. Check for Node 24+ and install it via [fnm](https://github.com/Schniz/fnm) if missing
2. Download the latest release tarball and verify its SHA-256 checksum
3. Extract it to `~/.hephaestus` and install production dependencies
4. Write a wrapper script at `/usr/local/bin/hephaestus`

To pin a specific version:

```bash
HEPHAESTUS_VERSION=1.2.2 curl -fsSL https://raw.githubusercontent.com/xavierleo/hephaestus/main/install.sh | bash
```

---

## Usage

```bash
hephaestus                        # Full interactive wizard
hephaestus --dry-run              # Preview everything without writing any files
hephaestus --stacks-only          # Re-scaffold stacks, skip system setup screens
hephaestus --list                 # Print available services and exit
hephaestus --profile <name>       # Load a saved profile and jump straight to scaffolding
hephaestus update                 # Pull the latest release and rebuild
```

### Wizard flow

1. **Welcome** — system preflight (Docker, GPU, timezone, port conflicts)
2. **Docker mode** — rootful vs rootless socket path
3. **Config** — base dirs, domain, NAS/media paths
4. **Service selector** — pick from 40+ services across 13 categories
5. **Review** — summary of what will be written
6. **Scaffold** — files written, seed configs generated, services cross-wired
7. **Save profile** — optionally save your config for next time

---

## Profiles

Profiles save your wizard config so you can re-run scaffolding without going through the full setup again.

```bash
hephaestus profile list               # List all saved profiles
hephaestus profile show [name]        # Show full config for a profile
hephaestus profile use <name>         # Set the active profile
hephaestus profile delete <name>      # Delete a profile
hephaestus profile export <name>      # Export to JSON (no secrets)
hephaestus profile import <file>      # Import from JSON
```

The active profile is shown on the Welcome screen and can be loaded with one keypress.

---

## Available services

| Category | Services |
|---|---|
| Infra | Dockge, Portainer, Nginx Proxy Manager, Beszel |
| Media | Jellyfin, Plex, Emby, Seerr |
| Download | Gluetun, SABnzbd, qBittorrent, NZBGet, Transmission |
| Arr | Prowlarr, Sonarr, Radarr, Lidarr, Readarr, Bazarr, Whisparr |
| Management | FileFlows, Huntarr, Profilarr, Tdarr |
| Books | Calibre-Web, BookLore, Kavita, Komga |
| Dashboard | Homarr, Homepage, Dashy |
| Monitoring | Uptime Kuma, Netdata |
| Security | Frigate |
| Home Automation | Home Assistant, Node-RED, Mosquitto |
| Networking | Pi-hole, AdGuard Home, WireGuard |
| Dev | Gitea, Drone CI, Docker Registry, VS Code Server |
| Productivity | Nextcloud, Vaultwarden, Paperless-ngx, Mealie, Immich |

Run `hephaestus --list` for a full list with ports and tags.

---

## Requirements

- **Linux** (the installer will exit on macOS/Windows)
- **Docker** with the Compose V2 plugin (`docker compose version`)
- **Node.js 24+** (installed automatically by the install script if missing)

Optional but detected automatically:
- GPU (`/dev/dri`) for hardware transcoding services
- NAS/CIFS mount for media path configuration
- Tailscale for VPN-aware config

---

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (no build step needed)
npm run dev

# Type-check
npm run typecheck

# Lint
npm run lint

# Run tests
npm test

# Build for distribution
npm run build
```

The built output lands in `dist/`. The entry point is `dist/index.js`.

### Project structure

```
src/
  index.ts          CLI entry point (Commander)
  tui/              Ink/React screens (App, Welcome, Config, ServiceSelector, …)
  recipes/          Service definitions — one file per service, validated with Zod
  scaffold/         File generation (compose.yml, .env, seed configs, SETUP.md)
  system/           Preflight checks (Docker, GPU, timezone, ports, …)
  profile/          Profile load/save/merge
  types/            Shared types (WizardConfig, AppFlags, WizardScreen)
```

### Adding a new service

1. Create `src/recipes/<category>/<id>.ts` following the `Recipe` interface in [src/recipes/types.ts](src/recipes/types.ts)
2. Export the recipe and add it to `allRecipes` in [src/recipes/registry.ts](src/recipes/registry.ts)
3. All recipes are validated at startup via Zod — a malformed recipe throws immediately with a clear error

---

## Built with

Hephaestus was built with help from [Codex](https://openai.com/codex/) and [Claude Code](https://www.anthropic.com/claude-code).

---

## License

MIT
