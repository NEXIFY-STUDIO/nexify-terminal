#!/usr/bin/env bash
set -e

# Compilation script for NexifyTray.app

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="NexifyTray"
APP_BUNDLE="${APP_NAME}.app"

echo "🗑️  Removing old build if it exists..."
rm -rf "$APP_BUNDLE"

echo "📁 Creating App bundle structure..."
mkdir -p "${APP_BUNDLE}/Contents/MacOS"
mkdir -p "${APP_BUNDLE}/Contents/Resources"

echo "📝 Creating Info.plist..."
cat <<EOF > "${APP_BUNDLE}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>com.nexify.tray</string>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <!-- Hide the application from the Dock and make it run entirely as an accessory -->
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

echo "🔨 Compiling Swift source code..."
swiftc -O -sdk $(xcrun --show-sdk-path) scripts/NexifyTray.swift -o "${APP_BUNDLE}/Contents/MacOS/${APP_NAME}"

echo "✅ Compilation successful!"
echo "🚀 You can now start the app using: open ${APP_BUNDLE}"
