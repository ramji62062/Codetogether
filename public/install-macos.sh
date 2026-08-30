#!/bin/bash
set -e

APP_NAME="CodeTogether"
INSTALL_DIR="/Applications"
DMG_TEMP="/tmp/codetogether-install.dmg"
MOUNT_DIR="/tmp/codetogether-mount"
ZIP_URL=""

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  DMG_URL="https://github.com/ramji62062/Codetogether/releases/download/v1.0.3/CodeTogether-arm64-signed.dmg"
elif [ "$ARCH" = "x86_64" ]; then
  DMG_URL="https://github.com/ramji62062/Codetogether/releases/download/v1.0.3/CodeTogether-intel-signed.dmg"
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

echo ""
echo "  Downloading CodeTogether for $ARCH..."
echo ""

curl -L -o "$DMG_TEMP" "$DMG_URL"

echo ""
echo "  Installing..."

# Detach any previous mount
hdiutil detach "$MOUNT_DIR" 2>/dev/null || true

# Mount DMG
hdiutil attach "$DMG_TEMP" -nobrowse -mountpoint "$MOUNT_DIR"

# Copy to Applications
cp -R "$MOUNT_DIR/$APP_NAME.app" "$INSTALL_DIR/"

# Remove quarantine flag (fixes "damaged" Gatekeeper error)
xattr -cr "$INSTALL_DIR/$APP_NAME.app"

# Cleanup
hdiutil detach "$MOUNT_DIR" 2>/dev/null || true
rm -f "$DMG_TEMP"

echo ""
echo "  Done! $APP_NAME has been installed to $INSTALL_DIR"
echo "  Open it from Applications or Spotlight."
echo ""
