<script>
  import { onMount } from 'svelte';
  
  let settings = {
    llmProvider: 'none',
    openaiApiKey: '',
    anthropicApiKey: '',
    googleApiKey: '',
    localModelPath: '',
    audioAnalysis: {
      extractFeatures: true,
      generateEmbeddings: true,
      maxFileSize: 100, // MB
      supportedFormats: ['wav', 'mp3', 'flac', 'aiff', 'm4a', 'mid', 'midi']
    },
    database: {
      autoBackup: true,
      backupInterval: 24, // hours
      maxBackups: 5
    }
  };
  
  let isSaving = false;
  let saveStatus = '';
  
  onMount(() => {
    loadSettings();
  });
  
  async function loadSettings() {
    try {
      if (window.electronAPI) {
        const savedSettings = await window.electronAPI.getSettings();
        if (savedSettings) {
          settings = { ...settings, ...savedSettings };
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
  
  async function saveSettings() {
    isSaving = true;
    saveStatus = 'Saving settings...';
    
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveSettings(settings);
        saveStatus = 'Settings saved successfully!';
        
        // Clear status after 3 seconds
        setTimeout(() => {
          saveStatus = '';
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      saveStatus = 'Error saving settings';
    } finally {
      isSaving = false;
    }
  }
  
  async function testLLMConnection() {
    if (settings.llmProvider === 'none') {
      alert('Please select an LLM provider first');
      return;
    }
    
    try {
      const result = await window.electronAPI.testLLMConnection();
      if (result.success) {
        alert('Connection successful!');
      } else {
        alert(`Connection failed: ${result.message}`);
      }
    } catch (error) {
      alert(`Connection test failed: ${error.message}`);
    }
  }
  
  function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      settings = {
        llmProvider: 'none',
        openaiApiKey: '',
        anthropicApiKey: '',
        googleApiKey: '',
        localModelPath: '',
        audioAnalysis: {
          extractFeatures: true,
          generateEmbeddings: true,
          maxFileSize: 100,
          supportedFormats: ['wav', 'mp3', 'flac', 'aiff', 'm4a', 'mid', 'midi']
        },
        database: {
          autoBackup: true,
          backupInterval: 24,
          maxBackups: 5
        }
      };
    }
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold text-white">Settings</h1>
      <p class="text-gray-400 mt-2">Configure AI providers and application preferences</p>
    </div>
    <div class="flex space-x-3">
      <button class="btn-secondary" on:click={resetSettings}>
        Reset to Defaults
      </button>
      <button class="btn-primary" on:click={saveSettings} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </div>

  <!-- Save Status -->
  {#if saveStatus}
    <div class="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
      <p class="text-green-400 text-sm">{saveStatus}</p>
    </div>
  {/if}

  <!-- LLM Provider Settings -->
  <div class="card">
    <h2 class="text-xl font-semibold text-white mb-4">LLM Provider</h2>
    
    <div class="space-y-4">
      <div>
        <label for="llm-provider" class="block text-sm font-medium text-gray-300 mb-2">
          Select LLM Provider:
        </label>
        <select id="llm-provider" bind:value={settings.llmProvider} class="input-field w-full">
          <option value="none">No LLM (Basic Analysis Only)</option>
          <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google (Gemini)</option>
          <option value="local">Local Model (Gemma 2B)</option>
        </select>
      </div>

      <!-- OpenAI Settings -->
      {#if settings.llmProvider === 'openai'}
        <div>
          <label for="openai-key" class="block text-sm font-medium text-gray-300 mb-2">
            OpenAI API Key:
          </label>
          <input
            id="openai-key"
            type="password"
            bind:value={settings.openaiApiKey}
            placeholder="sk-..."
            class="input-field w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            Get your API key from <a href="https://platform.openai.com/api-keys" class="text-accent hover:text-accent-hover">OpenAI Platform</a>
          </p>
        </div>
      {/if}

      <!-- Anthropic Settings -->
      {#if settings.llmProvider === 'anthropic'}
        <div>
          <label for="anthropic-key" class="block text-sm font-medium text-gray-300 mb-2">
            Anthropic API Key:
          </label>
          <input
            id="anthropic-key"
            type="password"
            bind:value={settings.anthropicApiKey}
            placeholder="sk-ant-..."
            class="input-field w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            Get your API key from <a href="https://console.anthropic.com/" class="text-accent hover:text-accent-hover">Anthropic Console</a>
          </p>
        </div>
      {/if}

      <!-- Google Settings -->
      {#if settings.llmProvider === 'google'}
        <div>
          <label for="google-key" class="block text-sm font-medium text-gray-300 mb-2">
            Google API Key:
          </label>
          <input
            id="google-key"
            type="password"
            bind:value={settings.googleApiKey}
            placeholder="AIza..."
            class="input-field w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            Get your API key from <a href="https://makersuite.google.com/app/apikey" class="text-accent hover:text-accent-hover">Google AI Studio</a>
          </p>
        </div>
      {/if}

      <!-- Local Model Settings -->
      {#if settings.llmProvider === 'local'}
        <div>
          <label for="local-model" class="block text-sm font-medium text-gray-300 mb-2">
            Local Model Path:
          </label>
          <input
            id="local-model"
            type="text"
            bind:value={settings.localModelPath}
            placeholder="/path/to/gemma-2b-model"
            class="input-field w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            Path to your local Gemma 2B model files
          </p>
        </div>
      {/if}

      <button class="btn-secondary" on:click={testLLMConnection}>
        Test Connection
      </button>
    </div>
  </div>

  <!-- Audio Analysis Settings -->
  <div class="card">
    <h2 class="text-xl font-semibold text-white mb-4">Audio Analysis</h2>
    
    <div class="space-y-4">
      <div class="flex items-center space-x-3">
        <input
          type="checkbox"
          bind:checked={settings.audioAnalysis.extractFeatures}
          class="rounded border-dark-border text-accent focus:ring-accent"
        />
        <label class="text-sm text-white">Extract audio features (recommended)</label>
      </div>
      
      <div class="flex items-center space-x-3">
        <input
          type="checkbox"
          bind:checked={settings.audioAnalysis.generateEmbeddings}
          class="rounded border-dark-border text-accent focus:ring-accent"
        />
        <label class="text-sm text-white">Generate embeddings for similarity search</label>
      </div>
      
      <div>
        <label for="max-file-size" class="block text-sm font-medium text-gray-300 mb-2">
          Maximum file size (MB):
        </label>
        <input
          id="max-file-size"
          type="number"
          bind:value={settings.audioAnalysis.maxFileSize}
          min="1"
          max="1000"
          class="input-field w-32"
        />
      </div>
    </div>
  </div>

  <!-- Database Settings -->
  <div class="card">
    <h2 class="text-xl font-semibold text-white mb-4">Database</h2>
    
    <div class="space-y-4">
      <div class="flex items-center space-x-3">
        <input
          type="checkbox"
          bind:checked={settings.database.autoBackup}
          class="rounded border-dark-border text-accent focus:ring-accent"
        />
        <label class="text-sm text-white">Enable automatic backups</label>
      </div>
      
      <div>
        <label for="backup-interval" class="block text-sm font-medium text-gray-300 mb-2">
          Backup interval (hours):
        </label>
        <input
          id="backup-interval"
          type="number"
          bind:value={settings.database.backupInterval}
          min="1"
          max="168"
          class="input-field w-32"
        />
      </div>
      
      <div>
        <label for="max-backups" class="block text-sm font-medium text-gray-300 mb-2">
          Maximum backups to keep:
        </label>
        <input
          id="max-backups"
          type="number"
          bind:value={settings.database.maxBackups}
          min="1"
          max="50"
          class="input-field w-32"
        />
      </div>
    </div>
  </div>
</div>
