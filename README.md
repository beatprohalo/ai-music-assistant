# AI Music Assistant

A desktop application for AI-powered music analysis and generation, built with Electron and Svelte.

## Features

### 🎵 Audio Analysis
- **Audio-to-MIDI Conversion**: Convert audio files to MIDI using Basic Pitch (TensorFlow.js)
- **Feature Extraction**: Analyze audio characteristics using Meyda.js
- **MIDI Analysis**: Parse and analyze MIDI files with @tonejs/midi
- **Vector Embeddings**: Generate embeddings for similarity search

### 🧠 AI Integration
- **Multiple LLM Support**: OpenAI, Anthropic, Google, and local models (Gemma 2B)
- **Intelligent Music Generation**: Generate music based on natural language prompts
- **Context-Aware**: Uses your library to provide relevant musical context

### 📚 Library Management
- **Vector Database**: Store and search musical patterns using LanceDB
- **Category System**: Organize files as "Humanization" or "Patterns"
- **Similarity Search**: Find similar musical content in your library
- **Statistics**: Track library usage and file statistics

### 🎼 Music Generation
- **Multiple Output Formats**: MIDI files (.mid) and Logic Pro Scripter (.json)
- **Algorithmic Generation**: JavaScript-based MIDI generation algorithms
- **Style Support**: Melodic, rhythmic, harmonic, and experimental styles
- **Customizable Parameters**: Tempo, key, time signature, and more

## Architecture

### Core Components

1. **Audio/MIDI Analysis Engine** (`src/audio/AudioAnalyzer.js`)
   - Converts audio to MIDI using Basic Pitch
   - Extracts musical features with Meyda.js
   - Analyzes MIDI data for patterns and characteristics

2. **Vector Database** (`src/database/VectorDatabase.js`)
   - SQLite-based storage with vector similarity search
   - Stores file metadata, features, and embeddings
   - Provides library statistics and search capabilities

3. **LLM Orchestrator** (`src/llm/LLMOrchestrator.js`)
   - Manages multiple LLM providers
   - Handles API keys and configuration
   - Provides unified interface for AI generation

4. **Music Generation Engine** (`src/generation/MusicGenerator.js`)
   - Implements MIDI generation algorithms
   - Supports multiple output formats
   - Generates melodies, harmonies, rhythms, and basslines

### User Interface

- **Dashboard**: Main interface for file processing and music generation
- **Library Management**: View and manage analyzed files
- **Settings**: Configure LLM providers and application preferences
- **File Uploader**: Advanced drag-and-drop interface with category tagging

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-music-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## Configuration

### LLM Providers

The app supports multiple LLM providers:

- **OpenAI**: GPT-4, GPT-3.5
- **Anthropic**: Claude models
- **Google**: Gemini models
- **Local**: Gemma 2B (requires local model files)

### API Keys

Configure your API keys in the Settings page:
- OpenAI: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- Anthropic: Get from [Anthropic Console](https://console.anthropic.com/)
- Google: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Usage

### 1. Upload and Analyze Files

1. Go to the Dashboard
2. Drag and drop audio files or click "browse files"
3. Select categories (Humanization, Patterns, or both)
4. Click "Upload & Analyze Files"

### 2. Generate Music

1. In the Dashboard, enter a musical description
2. Choose output format (MIDI or Logic Pro Scripter)
3. Select a style (Melodic, Rhythmic, Harmonic, Experimental)
4. Click "Generate Music"

### 3. Manage Library

1. Go to the Library tab
2. View statistics and file information
3. Search and filter files
4. Clear or reindex the library

### 4. Configure Settings

1. Go to the Settings tab
2. Select an LLM provider
3. Enter API keys
4. Configure audio analysis options
5. Save settings

## File Formats

### Supported Input Formats
- **Audio**: WAV, MP3, FLAC, AIFF, M4A
- **MIDI**: MID, MIDI

### Output Formats
- **MIDI**: Standard MIDI files (.mid)
- **Logic Pro Scripter**: JSON format for Logic Pro (.json)

## Development

### Project Structure

```
src/
├── main.js                 # Electron main process
├── preload.js             # Preload script for IPC
├── audio/
│   └── AudioAnalyzer.js   # Audio/MIDI analysis
├── database/
│   └── VectorDatabase.js  # Vector database operations
├── llm/
│   └── LLMOrchestrator.js # LLM provider management
├── generation/
│   └── MusicGenerator.js  # Music generation algorithms
└── renderer/              # Svelte frontend
    ├── src/
    │   ├── App.svelte
    │   ├── components/
    │   │   ├── Dashboard.svelte
    │   │   ├── Library.svelte
    │   │   ├── Settings.svelte
    │   │   ├── FileUploader.svelte
    │   │   ├── MusicGenerator.svelte
    │   │   └── ProcessingStatus.svelte
    │   └── main.js
    └── index.html
```

### Building

```bash
# Build for production
npm run build

# Package for distribution
npm run electron:pack
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Basic Pitch**: Audio-to-MIDI conversion
- **Meyda.js**: Audio feature extraction
- **@tonejs/midi**: MIDI file handling
- **LanceDB**: Vector database
- **Electron**: Desktop app framework
- **Svelte**: Frontend framework
