#!/bin/bash

# AI Music Assistant - Build Script with Icon Support
# This script helps build the app with proper icon handling

echo "🎵 AI Music Assistant - Build Script"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if icon files exist
echo "🔍 Checking for icon files..."

ICON_MAC="build/icon.icns"
ICON_WIN="build/icon.ico"
ICON_LINUX="build/icon.png"

if [ ! -f "$ICON_MAC" ] || [ ! -f "$ICON_WIN" ] || [ ! -f "$ICON_LINUX" ]; then
    echo "⚠️  Some icon files are missing:"
    [ ! -f "$ICON_MAC" ] && echo "   - $ICON_MAC (macOS)"
    [ ! -f "$ICON_WIN" ] && echo "   - $ICON_WIN (Windows)"
    [ ! -f "$ICON_LINUX" ] && echo "   - $ICON_LINUX (Linux)"
    echo ""
    echo "📝 To generate icons:"
    echo "   1. Place your app icon as 'build/app-icon.png' (1024x1024 recommended)"
    echo "   2. Run: node build/generate-icons.js"
    echo "   3. Or use online converters (see build/README.md)"
    echo ""
    read -p "Continue without icons? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Build cancelled."
        exit 1
    fi
else
    echo "✅ All icon files found"
fi

echo ""
echo "🔨 Building AI Music Assistant..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run clean

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the app
echo "🏗️  Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Build completed successfully!"
    echo "📁 Check the 'dist/' folder for your packaged app"
    echo ""
    echo "Generated files:"
    ls -la dist/ 2>/dev/null || echo "   (No dist folder found)"
else
    echo ""
    echo "❌ Build failed. Check the error messages above."
    exit 1
fi
