# AI Music Assistant

A powerful desktop application for music analysis, generation, and humanization using AI technology. Built with Electron and featuring advanced audio processing capabilities.

## 🎵 Features

### Core Functionality
- **Audio Analysis**: Extract features from audio files (WAV, MP3, FLAC, AIFF, M4A, OGG, AAC)
- **MIDI Processing**: Analyze and generate MIDI files
- **AI-Powered Generation**: Create music using advanced AI models
- **Humanization**: Add natural timing and velocity variations to MIDI
- **Vector Database**: Store and search musical patterns using embeddings

### Upload & Management
- **File Upload**: Support for individual files and bulk folder uploads
- **Format Support**: Audio (WAV, MP3, FLAC, AIFF, M4A, OGG, AAC) and MIDI (MID, MIDI)
- **Library Management**: Organize and categorize your music library
- **Recursive Scanning**: Automatically scan subdirectories for audio files

### AI Integration
- **LLM Support**: Integration with OpenAI, Anthropic, Google, and local models
- **Music Generation**: AI-powered music creation from text prompts
- **Pattern Recognition**: Identify and learn from musical patterns
- **Smart Categorization**: Automatic tagging of musical elements

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- macOS, Windows, or Linux

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-music-assistant.git
   cd ai-music-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

### Development

1. **Install development dependencies**
   ```bash
   npm install --save-dev
   ```

2. **Run in development mode**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
ai-music-assistant/
├── src/                    # Source code
│   ├── audio/             # Audio processing modules
│   ├── database/          # Vector database implementation
│   ├── generation/        # Music generation logic
│   ├── llm/              # LLM integration
│   └── renderer/         # Frontend components (Svelte)
├── main.js               # Main Electron process
├── settings.html         # Settings page
├── index.html            # Main application page
├── package.json          # Project configuration
└── README.md             # This file
```

## 🎛️ Usage

### Uploading Files
1. **Open Settings**: Click the "SETTINGS" button in the main interface
2. **Upload Files**: Use "📁 UPLOAD FILES" for individual files or "📂 SCAN FOLDER" for bulk uploads
3. **Categorize**: Select categories (Humanization, Patterns) for your files
4. **Process**: Files are automatically analyzed and added to your library

### Generating Music
1. **Enter Prompt**: Describe the music you want to generate
2. **Select Type**: Choose between humanization, MIDI generation, or both
3. **Generate**: Click the appropriate generation button
4. **Download**: Save your generated music

### AI Configuration
1. **LLM Settings**: Configure your preferred AI model in settings
2. **API Keys**: Add your API keys for cloud-based models
3. **Local Models**: Set up local models for offline processing

## 🔧 Configuration

### Supported Audio Formats
- **Audio**: WAV, MP3, FLAC, AIFF, M4A, OGG, AAC
- **MIDI**: MID, MIDI

### AI Model Support
- **OpenAI**: GPT-3.5, GPT-4
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet
- **Google**: Gemini Pro
- **Local Models**: Custom model support

### Database
- **Vector Storage**: Efficient similarity search
- **Embeddings**: Musical pattern representations
- **Categorization**: Automatic tagging system

## 🛠️ Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## 📦 Dependencies

### Core Dependencies
- **Electron**: Desktop application framework
- **@tonejs/midi**: MIDI processing
- **meyda**: Audio feature extraction
- **web-audio-api**: Audio processing

### Development Dependencies
- **Electron**: Latest version
- **Node.js**: v16+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Electron** for the desktop framework
- **Tone.js** for MIDI processing
- **Meyda** for audio analysis
- **OpenAI** for AI capabilities

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/ai-music-assistant/issues) page
2. Create a new issue with detailed information
3. Include your system information and error logs

## 🔮 Roadmap

- [ ] Real-time audio processing
- [ ] Advanced AI model integration
- [ ] Cloud synchronization
- [ ] Plugin system
- [ ] Mobile companion app
- [ ] Advanced MIDI editing
- [ ] Collaborative features

---

**Made with ❤️ for musicians and AI enthusiasts**