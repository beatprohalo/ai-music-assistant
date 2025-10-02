#!/bin/bash

# AI Music Assistant - Build Script
# This script helps you package the app for distribution

set -e

echo "🎵 AI Music Assistant - Build Script"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Function to build for specific platform
build_platform() {
    local platform=$1
    echo "🔨 Building for $platform..."
    
    case $platform in
        "mac")
            npm run build:mac
            ;;
        "win")
            npm run build:win
            ;;
        "linux")
            npm run build:linux
            ;;
        "all")
            npm run build
            ;;
        *)
            echo "❌ Unknown platform: $platform"
            echo "Available platforms: mac, win, linux, all"
            exit 1
            ;;
    esac
}

# Function to pack (create directory) for specific platform
pack_platform() {
    local platform=$1
    echo "📦 Packing for $platform (directory only)..."
    
    case $platform in
        "mac")
            npm run pack:mac
            ;;
        "win")
            npm run pack:win
            ;;
        "linux")
            npm run pack:linux
            ;;
        "all")
            npm run pack
            ;;
        *)
            echo "❌ Unknown platform: $platform"
            echo "Available platforms: mac, win, linux, all"
            exit 1
            ;;
    esac
}

# Parse command line arguments
case "${1:-all}" in
    "mac"|"win"|"linux"|"all")
        if [ "${2:-dist}" = "pack" ]; then
            pack_platform $1
        else
            build_platform $1
        fi
        ;;
    "pack")
        if [ -n "$2" ]; then
            pack_platform $2
        else
            npm run pack
        fi
        ;;
    "clean")
        echo "🧹 Cleaning build artifacts..."
        npm run clean
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [platform] [mode]"
        echo ""
        echo "Platforms:"
        echo "  mac     - Build for macOS (DMG + ZIP)"
        echo "  win     - Build for Windows (NSIS + Portable)"
        echo "  linux   - Build for Linux (AppImage + DEB)"
        echo "  all     - Build for all platforms (default)"
        echo ""
        echo "Modes:"
        echo "  dist    - Create installers (default)"
        echo "  pack    - Create unpacked directories only"
        echo ""
        echo "Other commands:"
        echo "  clean   - Remove build artifacts"
        echo "  help    - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Build all platforms"
        echo "  $0 mac               # Build for macOS"
        echo "  $0 win pack          # Pack for Windows (directory only)"
        echo "  $0 clean              # Clean build artifacts"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac

echo ""
echo "✅ Build process completed!"
echo "📁 Check the 'dist/' folder for your packaged app(s)"
echo ""
echo "📋 Build artifacts:"
if [ -d "dist" ]; then
    ls -la dist/
else
    echo "   No dist folder found"
fi
