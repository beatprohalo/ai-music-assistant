# AI Music Assistant - Installation Guide

## Building the App

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build for your platform:**
   ```bash
   # Build for current platform
   npm run build
   
   # Or use the build script
   ./build-app.sh
   ```

3. **Find your packaged app:**
   - Check the `dist/` folder for installers and packages

### Platform-Specific Builds

#### macOS
```bash
npm run build:mac
```
Creates:
- `AI Music Assistant-1.0.0.dmg` - Installer
- `AI Music Assistant-1.0.0-mac.zip` - Portable version

#### Windows
```bash
npm run build:win
```
Creates:
- `AI Music Assistant Setup 1.0.0.exe` - NSIS installer
- `AI Music Assistant-1.0.0-win.zip` - Portable version

#### Linux
```bash
npm run build:linux
```
Creates:
- `AI Music Assistant-1.0.0.AppImage` - Portable AppImage
- `ai-music-assistant_1.0.0_amd64.deb` - Debian package

### Development vs Production

#### Development
```bash
npm start
# or
npm run dev
```

#### Production Build
```bash
npm run build
```

### Build Script Usage

The `build-app.sh` script provides additional options:

```bash
# Build all platforms
./build-app.sh

# Build specific platform
./build-app.sh mac
./build-app.sh win
./build-app.sh linux

# Pack only (no installer)
./build-app.sh pack mac
./build-app.sh pack win

# Clean build artifacts
./build-app.sh clean

# Show help
./build-app.sh help
```

### Troubleshooting

#### Common Issues

1. **Missing dependencies:**
   ```bash
   npm install
   ```

2. **Build fails:**
   ```bash
   npm run clean
   npm install
   npm run build
   ```

3. **Permission issues (macOS):**
   - The app may need to be signed for distribution
   - For development, you can run unsigned apps

#### Build Artifacts

After building, you'll find:
- **macOS**: DMG installer and ZIP archive
- **Windows**: NSIS installer and portable ZIP
- **Linux**: AppImage and DEB package

### Distribution

The packaged apps are ready for distribution:
- **macOS**: Share the DMG file
- **Windows**: Share the NSIS installer
- **Linux**: Share the AppImage or DEB package

### Notes

- The app includes all necessary dependencies
- No additional installation required for end users
- Database files are stored in user data directory
- Settings persist between app launches
