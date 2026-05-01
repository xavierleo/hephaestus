# Releasing Hephaestus

## Prerequisites

- `main` branch is green (CI passes)
- You are authenticated as `xavierleo` on GitHub
- `gh` CLI is installed and authenticated (`gh auth status`)

## Release steps

### 1. Decide the version

Hephaestus follows [Semantic Versioning](https://semver.org/):
- **Patch** (`1.0.x`) — bug fixes, no new services or config fields
- **Minor** (`1.x.0`) — new recipes, new TUI screens, backwards-compatible config changes
- **Major** (`x.0.0`) — breaking changes to the scaffolded file layout or CLI interface

### 2. Bump the version

`npm version` runs `preversion` (typecheck + tests) automatically before modifying `package.json`.

```bash
# For a patch release:
npm version patch

# For a minor release:
npm version minor

# For a major release:
npm version major
```

This creates a tagged commit (`vX.Y.Z`) locally. Push both the commit and the tag:

```bash
git push origin main --follow-tags
```

### 3. Wait for CI to build the release

Pushing the `vX.Y.Z` tag triggers `.github/workflows/release.yml`, which:
1. Installs dependencies and builds the bundle (`tsup`)
2. Packages `dist/`, `install.sh`, `package.json`, and `package-lock.json` into `hephaestus-X.Y.Z.tar.gz`
3. Generates a SHA256 checksum file
4. Creates a GitHub Release with auto-generated release notes

Monitor progress:

```bash
gh run watch
```

### 4. Verify the release

```bash
# Check the release exists and has the expected assets
gh release view vX.Y.Z

# Quick smoke-test the install script against the new release
HEPHAESTUS_VERSION=X.Y.Z bash <(curl -fsSL https://raw.githubusercontent.com/xavierleo/hephaestus/main/install.sh)
hephaestus --version
```

### 5. Announce (optional)

If this is a significant release, update the README or post in the homelab communities you care about.

---

## Hotfix releases

If you need to fix a critical bug on a released tag:

```bash
git checkout vX.Y.Z -b hotfix/X.Y.Z+1
# ... fix the bug, commit ...
npm version patch
git push origin hotfix/X.Y.Z+1 --follow-tags
# CI will build and publish the hotfix tag automatically
```

## Rolling back

GitHub Releases can be deleted via the UI or `gh release delete vX.Y.Z`. The `install.sh` script pins to a specific `HEPHAESTUS_VERSION` if needed.
