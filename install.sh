#!/bin/bash

# AI Music Assistant Installation Script

echo "🎵 AI Music Assistant - Installation Script"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not available"
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create data directory
echo ""
echo "📁 Creating data directory..."
mkdir -p data

# Create backup directory
mkdir -p backups

echo "✅ Data directories created"

# Set up environment
echo ""
echo "🔧 Setting up environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cat > .env << EOF
# AI Music Assistant Environment Variables
NODE_ENV=development

# LLM Provider Settings (configure in the app)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
LOCAL_MODEL_PATH=

# Database Settings
DB_PATH=./data/library.db
BACKUP_PATH=./backups

# Audio Analysis Settings
MAX_FILE_SIZE_MB=100
SUPPORTED_FORMATS=wav,mp3,flac,aiff,m4a,mid,midi
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to start the development server"
echo "2. Configure your LLM provider in the Settings tab"
echo "3. Start uploading and analyzing audio files!"
echo ""
echo "For more information, see README.md"
