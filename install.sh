#!/usr/bin/env bash
set -euo pipefail

REPO="xavierleo/hephaestus"
INSTALL_DIR="${HOME}/.hephaestus"
BIN_PATH="/usr/local/bin/hephaestus"

# ── Colour helpers ─────────────────────────────────────────────────────────────
red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

# ── OS check ───────────────────────────────────────────────────────────────────
OS="$(uname -s)"
if [[ "$OS" != "Linux" ]]; then
  red "Hephaestus requires Linux. Detected: $OS"
  exit 1
fi

bold "Installing Hephaestus..."

# ── Node.js 24+ ────────────────────────────────────────────────────────────────
if command -v node &>/dev/null; then
  NODE_MAJOR="$(node --version | cut -d. -f1 | tr -d 'v')"
  if [ "$NODE_MAJOR" -ge 24 ]; then
    green "Node.js $(node --version) already installed"
  else
    red "Node.js $(node --version) found, but Hephaestus requires Node.js >=24."
    red "Install Node.js 24 LTS, then run this installer again."
    exit 1
  fi
else
  red "Node.js not found. Hephaestus requires Node.js >=24."
  red "Install Node.js 24 LTS, then run this installer again."
  exit 1
fi

green "Node.js $(node --version) ready"

# ── Fetch latest release from GitHub ──────────────────────────────────────────
if [[ -n "${HEPHAESTUS_VERSION:-}" ]]; then
  TAG="v${HEPHAESTUS_VERSION#v}"
else
  TAG="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": "\(.*\)".*/\1/')" || true
fi

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  red "Invalid release tag: ${TAG}"
  exit 1
fi

if [[ -z "$TAG" ]]; then
  red "Could not determine the latest Hephaestus release."
  red "Set HEPHAESTUS_VERSION=1.2.3 to pin a version."
  exit 1
fi

VERSION="${TAG#v}"
TARBALL="hephaestus-${VERSION}.tar.gz"
RELEASE_URL="https://github.com/${REPO}/releases/download/${TAG}/${TARBALL}"
SHA256_URL="${RELEASE_URL}.sha256"

bold "Downloading Hephaestus ${TAG}..."
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

curl -fsSL --progress-bar -o "${TMP_DIR}/${TARBALL}" "$RELEASE_URL"
curl -fsSL -o "${TMP_DIR}/${TARBALL}.sha256" "$SHA256_URL"

# ── Verify checksum ────────────────────────────────────────────────────────────
bold "Verifying checksum..."
EXPECTED_SHA="$(awk '{print $1}' "${TMP_DIR}/${TARBALL}.sha256")"
ACTUAL_SHA="$(sha256sum "${TMP_DIR}/${TARBALL}" | awk '{print $1}')"

if [[ "$EXPECTED_SHA" != "$ACTUAL_SHA" ]]; then
  red "Checksum mismatch!"
  red "  Expected: ${EXPECTED_SHA}"
  red "  Got:      ${ACTUAL_SHA}"
  exit 1
fi
green "Checksum OK"

# ── Extract and install ────────────────────────────────────────────────────────
bold "Installing to ${INSTALL_DIR}..."
EXTRACT_DIR="${TMP_DIR}/extract"
mkdir -p "$EXTRACT_DIR"

while IFS= read -r entry; do
  case "$entry" in
    /*|*../*|../*|.*../*|"")
      red "Unsafe tarball entry: ${entry}"
      exit 1
      ;;
  esac
done < <(tar -tzf "${TMP_DIR}/${TARBALL}")

tar -xzf "${TMP_DIR}/${TARBALL}" -C "$EXTRACT_DIR"

for required in dist/index.js install.sh package.json package-lock.json; do
  if [[ ! -f "${EXTRACT_DIR}/${required}" ]]; then
    red "Release tarball is missing ${required}"
    exit 1
  fi
done

BACKUP_DIR="${INSTALL_DIR}.previous"
rm -rf "$BACKUP_DIR"
if [[ -d "$INSTALL_DIR" ]]; then
  mv "$INSTALL_DIR" "$BACKUP_DIR"
fi
mv "$EXTRACT_DIR" "$INSTALL_DIR"

# Install production dependencies
if ! (cd "$INSTALL_DIR" && npm ci --omit=dev --silent); then
  red "Dependency install failed; rolling back."
  rm -rf "$INSTALL_DIR"
  if [[ -d "$BACKUP_DIR" ]]; then mv "$BACKUP_DIR" "$INSTALL_DIR"; fi
  exit 1
fi

# ── Write the wrapper script ───────────────────────────────────────────────────
bold "Writing ${BIN_PATH}..."
WRAPPER="$(cat <<WRAPPER_EOF
#!/usr/bin/env bash
exec node "${INSTALL_DIR}/dist/index.js" "\$@"
WRAPPER_EOF
)"

if [[ -w "$(dirname "$BIN_PATH")" ]]; then
  printf '%s\n' "$WRAPPER" > "$BIN_PATH"
  chmod +x "$BIN_PATH"
else
  echo "$WRAPPER" | sudo tee "$BIN_PATH" > /dev/null
  sudo chmod +x "$BIN_PATH"
fi

if ! "$BIN_PATH" --version >/dev/null; then
  red "Installed binary failed smoke test; rolling back."
  rm -rf "$INSTALL_DIR"
  if [[ -d "$BACKUP_DIR" ]]; then mv "$BACKUP_DIR" "$INSTALL_DIR"; fi
  exit 1
fi
rm -rf "$BACKUP_DIR"

green "Hephaestus ${TAG} installed!"
echo ""
echo "  Run:  hephaestus"
echo ""
read -rp "  Press Enter to continue..." _ </dev/tty
