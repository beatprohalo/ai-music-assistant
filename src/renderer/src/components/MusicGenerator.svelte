<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let prompt = '';
  let outputFormat = 'mid';
  let style = 'melodic';
  let isGenerating = false;
  
  const outputFormats = [
    { value: 'mid', label: 'MIDI File (.mid)' },
    { value: 'json', label: 'Logic Pro Scripter (.json)' }
  ];
  
  const styles = [
    { value: 'melodic', label: 'Melodic' },
    { value: 'rhythmic', label: 'Rhythmic' },
    { value: 'harmonic', label: 'Harmonic' },
    { value: 'experimental', label: 'Experimental' }
  ];
  
  async function handleGenerate() {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }
    
    isGenerating = true;
    
    try {
      const result = await dispatch('generate', {
        prompt: prompt.trim(),
        outputFormat,
        style,
        timestamp: Date.now()
      });
      
      prompt = '';
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      isGenerating = false;
    }
  }
  
  function handleKeyPress(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
      handleGenerate();
    }
  }
</script>

<div class="space-y-4">
  <!-- Prompt Input -->
  <div>
    <label for="prompt" class="block text-sm font-medium text-gray-300 mb-2">
      Describe the music you want to generate:
    </label>
    <textarea
      id="prompt"
      bind:value={prompt}
      on:keypress={handleKeyPress}
      placeholder="e.g., 'Create a melancholic piano melody in C minor with jazz influences'"
      class="input-field w-full h-24 resize-none"
    ></textarea>
    <p class="text-xs text-gray-500 mt-1">Press Ctrl+Enter to generate</p>
  </div>

  <!-- Options -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label for="output-format" class="block text-sm font-medium text-gray-300 mb-2">
        Output Format:
      </label>
      <select
        id="output-format"
        bind:value={outputFormat}
        class="input-field w-full"
      >
        {#each outputFormats as format}
          <option value={format.value}>{format.label}</option>
        {/each}
      </select>
    </div>
    
    <div>
      <label for="style" class="block text-sm font-medium text-gray-300 mb-2">
        Style:
      </label>
      <select
        id="style"
        bind:value={style}
        class="input-field w-full"
      >
        {#each styles as styleOption}
          <option value={styleOption.value}>{styleOption.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Generate Button -->
  <button
    class="btn-primary w-full"
    on:click={handleGenerate}
    disabled={!prompt.trim() || isGenerating}
  >
    {#if isGenerating}
      <div class="flex items-center justify-center space-x-2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span>Generating...</span>
      </div>
    {:else}
      Generate Music
    {/if}
  </button>

  <!-- Quick Prompts -->
  <div class="space-y-2">
    <p class="text-sm font-medium text-gray-300">Quick prompts:</p>
    <div class="flex flex-wrap gap-2">
      {#each [
        'Jazz piano ballad',
        'Electronic drum pattern',
        'Classical string quartet',
        'Blues guitar riff',
        'Ambient pad progression'
      ] as quickPrompt}
        <button
          class="btn-secondary text-xs"
          on:click={() => prompt = quickPrompt}
        >
          {quickPrompt}
        </button>
      {/each}
    </div>
  </div>
</div>
