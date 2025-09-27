const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class LLMOrchestrator {
  constructor() {
    this.provider = 'none';
    this.config = {};
    this.clients = {};
  }

  async setProvider(provider, config) {
    this.provider = provider;
    this.config = config;

    // Initialize the appropriate client
    switch (provider) {
      case 'openai':
        if (!config.apiKey) {
          throw new Error('OpenAI API key is required');
        }
        this.clients.openai = new OpenAI({
          apiKey: config.apiKey
        });
        break;

      case 'anthropic':
        if (!config.apiKey) {
          throw new Error('Anthropic API key is required');
        }
        this.clients.anthropic = new Anthropic({
          apiKey: config.apiKey
        });
        break;

      case 'google':
        if (!config.apiKey) {
          throw new Error('Google API key is required');
        }
        this.clients.google = new GoogleGenerativeAI(config.apiKey);
        break;

      case 'local':
        if (!config.modelPath) {
          throw new Error('Local model path is required');
        }
        // Initialize local model (this would use transformers.js or similar)
        await this.initializeLocalModel(config.modelPath);
        break;

      case 'none':
        // No LLM provider
        break;

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  async initializeLocalModel(modelPath) {
    // This would initialize a local model like Gemma 2B
    // For now, we'll just store the path
    this.config.modelPath = modelPath;
    console.log(`Local model initialized at: ${modelPath}`);
  }

  async generate(prompt, context = {}) {
    if (this.provider === 'none') {
      throw new Error('No LLM provider configured');
    }

    const systemPrompt = this.buildSystemPrompt(context);
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;

    try {
      switch (this.provider) {
        case 'openai':
          return await this.generateWithOpenAI(fullPrompt);
        case 'anthropic':
          return await this.generateWithAnthropic(fullPrompt);
        case 'google':
          return await this.generateWithGoogle(fullPrompt);
        case 'local':
          return await this.generateWithLocal(fullPrompt);
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }
    } catch (error) {
      console.error('LLM generation failed:', error);
      throw error;
    }
  }

  buildSystemPrompt(context) {
    let systemPrompt = `You are an AI Music Assistant that helps users create and analyze music. You have access to a library of analyzed audio files and can generate musical content based on user requests.

Your capabilities include:
- Analyzing musical patterns and features
- Generating MIDI sequences based on descriptions
- Providing creative musical suggestions
- Explaining musical concepts and theory

When generating music, consider:
- Musical structure and form
- Harmonic progressions and voice leading
- Rhythmic patterns and timing
- Melodic contour and phrasing
- Style and genre characteristics

Always provide practical, actionable musical content that can be implemented in MIDI format.`;

    if (context.libraryStats) {
      systemPrompt += `\n\nLibrary Statistics:
- Total files: ${context.libraryStats.totalFiles}
- Humanization files: ${context.libraryStats.humanizationFiles}
- Pattern files: ${context.libraryStats.patternFiles}`;
    }

    if (context.similarFiles && context.similarFiles.length > 0) {
      systemPrompt += `\n\nSimilar files in library:
${context.similarFiles.map(file => `- ${file.file_name} (${file.categories})`).join('\n')}`;
    }

    if (context.audioFeatures) {
      systemPrompt += `\n\nCurrent audio features:
- Tempo: ${context.audioFeatures.tempo || 'Unknown'}
- Key: ${context.audioFeatures.key || 'Unknown'}
- Average pitch: ${context.audioFeatures.averagePitch || 'Unknown'}
- Harmonic content: ${context.audioFeatures.harmonicContent ? 'Available' : 'Not available'}`;
    }

    return systemPrompt;
  }

  async generateWithOpenAI(prompt) {
    const response = await this.clients.openai.chat.completions.create({
      model: this.config.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an AI Music Assistant. Provide detailed, practical musical guidance and generate MIDI-compatible content when requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.config.maxTokens || 2000,
      temperature: this.config.temperature || 0.7
    });

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: response.model
    };
  }

  async generateWithAnthropic(prompt) {
    const response = await this.clients.anthropic.messages.create({
      model: this.config.model || 'claude-3-sonnet-20240229',
      max_tokens: this.config.maxTokens || 2000,
      temperature: this.config.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return {
      content: response.content[0].text,
      usage: response.usage,
      model: response.model
    };
  }

  async generateWithGoogle(prompt) {
    const model = this.clients.google.getGenerativeModel({
      model: this.config.model || 'gemini-pro'
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      content: text,
      model: 'gemini-pro'
    };
  }

  async generateWithLocal(prompt) {
    // This would use a local model like Gemma 2B
    // For now, we'll return a mock response
    return {
      content: `[Local Model Response] Based on your request: "${prompt}", I would suggest creating a musical piece with the following characteristics...`,
      model: 'local-gemma-2b'
    };
  }

  async testConnection() {
    if (this.provider === 'none') {
      return { success: true, message: 'No LLM provider configured' };
    }

    try {
      const testPrompt = 'Hello, this is a connection test. Please respond with "Connection successful."';
      const response = await this.generate(testPrompt);
      
      return {
        success: true,
        message: 'Connection successful',
        response: response.content.substring(0, 100) + '...'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async generateMusicPrompt(userPrompt, context = {}) {
    const musicPrompt = `Generate a detailed musical description for: "${userPrompt}"

Consider the following context:
${context.similarFiles ? `Similar patterns in library: ${context.similarFiles.length} files` : ''}
${context.audioFeatures ? `Current audio features available` : ''}

Provide a structured musical description that includes:
1. Style and genre
2. Tempo and time signature
3. Key and harmonic progression
4. Melodic characteristics
5. Rhythmic patterns
6. Instrumentation suggestions

Format your response as a JSON object with these fields:
{
  "style": "genre description",
  "tempo": number,
  "timeSignature": [4, 4],
  "key": "C major",
  "harmony": "chord progression description",
  "melody": "melodic characteristics",
  "rhythm": "rhythmic pattern description",
  "instruments": ["instrument list"],
  "structure": "musical form description"
}`;

    return await this.generate(musicPrompt, context);
  }

  async analyzeMusicalContent(content, type = 'general') {
    const analysisPrompt = `Analyze the following musical content and provide insights:

Content: ${content}
Type: ${type}

Provide analysis covering:
1. Musical characteristics
2. Technical aspects
3. Creative suggestions
4. Potential improvements

Format as structured analysis with clear sections.`;

    return await this.generate(analysisPrompt);
  }

  getProviderInfo() {
    return {
      provider: this.provider,
      configured: this.provider !== 'none',
      hasClient: !!this.clients[this.provider]
    };
  }
}

module.exports = LLMOrchestrator;
