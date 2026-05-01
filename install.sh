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

# ── Node.js 20+ ────────────────────────────────────────────────────────────────
check_node() {
  if command -v node &>/dev/null; then
    NODE_VER="$(node --version | sed 's/v//')"
    MAJOR="${NODE_VER%%.*}"
    if [[ "$MAJOR" -ge 20 ]]; then
      return 0
    fi
    yellow "Node.js ${NODE_VER} found — Hephaestus requires >=20. Installing via fnm..."
  else
    yellow "Node.js not found. Installing via fnm..."
  fi
  return 1
}

if ! check_node; then
  # Install fnm (fast node manager) and use it to install Node 20 LTS
  if ! command -v fnm &>/dev/null; then
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell
    export PATH="${HOME}/.local/share/fnm:${PATH}"
    eval "$(fnm env --use-on-cd)"
  fi
  fnm install 20 --lts
  fnm use 20
  eval "$(fnm env)"
fi

NODE_VER="$(node --version)"
green "Node.js ${NODE_VER} ready"

# ── Fetch latest release from GitHub ──────────────────────────────────────────
if [[ -n "${HEPHAESTUS_VERSION:-}" ]]; then
  TAG="v${HEPHAESTUS_VERSION#v}"
else
  TAG="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": "\(.*\)".*/\1/')"
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
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
tar -xzf "${TMP_DIR}/${TARBALL}" -C "$INSTALL_DIR"

# Install production dependencies
(cd "$INSTALL_DIR" && npm ci --omit=dev --silent)

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

green "Hephaestus ${TAG} installed!"
echo ""
echo "  Run:  hephaestus"
echo ""
