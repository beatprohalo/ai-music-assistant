<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let isDragOver = false;
  let selectedFiles = [];
  let categories = {
    humanization: false,
    patterns: false
  };
  
  function handleDragOver(event) {
    event.preventDefault();
    isDragOver = true;
  }
  
  function handleDragLeave(event) {
    event.preventDefault();
    isDragOver = false;
  }
  
  function handleDrop(event) {
    event.preventDefault();
    isDragOver = false;
    
    const files = Array.from(event.dataTransfer.files);
    handleFiles(files);
  }
  
  async function handleFileSelect() {
    if (window.electronAPI) {
      const result = await window.electronAPI.selectAudioFiles();
      if (!result.canceled && result.filePaths) {
        const files = result.filePaths.map(path => ({ path, name: path.split('/').pop() }));
        handleFiles(files);
      }
    }
  }

  async function handleFolderSelect() {
    if (window.electronAPI) {
      const result = await window.electronAPI.selectFolder();
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0];
        // Get all audio files from the folder
        const files = await window.electronAPI.getFilesFromFolder(folderPath);
        if (files && files.length > 0) {
          const fileObjects = files.map(path => ({ path, name: path.split('/').pop() }));
          handleFiles(fileObjects);
        }
      }
    }
  }
  
  function handleFiles(files) {
    selectedFiles = files;
  }
  
  function handleUpload() {
    if (selectedFiles.length === 0) {
      alert('Please select files first');
      return;
    }
    
    if (!categories.humanization && !categories.patterns) {
      alert('Please select at least one category');
      return;
    }
    
    dispatch('upload', { files: selectedFiles, categories });
    selectedFiles = [];
    categories = { humanization: false, patterns: false };
  }
  
  function removeFile(index) {
    selectedFiles = selectedFiles.filter((_, i) => i !== index);
  }
</script>

<div class="space-y-4">
  <!-- Drag & Drop Area -->
  <div
    class="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center transition-colors duration-200
           {isDragOver ? 'border-accent bg-accent/10' : 'hover:border-gray-500'}"
    role="button"
    tabindex="0"
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
  >
    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <p class="mt-2 text-sm text-gray-400">
      Drag and drop audio files here, or
      <button class="text-accent hover:text-accent-hover" on:click={handleFileSelect}>
        browse files
      </button>
      or
      <button class="text-accent hover:text-accent-hover" on:click={handleFolderSelect}>
        select folder
      </button>
    </p>
    <p class="text-xs text-gray-500 mt-1">Supports WAV, MP3, FLAC, AIFF, M4A, MID, MIDI</p>
  </div>

  <!-- Selected Files -->
  {#if selectedFiles.length > 0}
    <div class="space-y-2">
      <h3 class="text-sm font-medium text-gray-300">Selected Files:</h3>
      {#each selectedFiles as file, index}
        <div class="flex items-center justify-between bg-dark-card rounded-lg p-3">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
            </svg>
            <span class="text-sm text-white">{file.name}</span>
          </div>
          <button
            class="text-red-400 hover:text-red-300"
            on:click={() => removeFile(index)}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Categories -->
  <div class="space-y-3">
    <h3 class="text-sm font-medium text-gray-300">Categories:</h3>
    <div class="space-y-2">
      <label class="flex items-center space-x-3">
        <input
          type="checkbox"
          bind:checked={categories.humanization}
          class="rounded border-dark-border text-accent focus:ring-accent"
        />
        <span class="text-sm text-white">Humanization (timing, velocity patterns)</span>
      </label>
      <label class="flex items-center space-x-3">
        <input
          type="checkbox"
          bind:checked={categories.patterns}
          class="rounded border-dark-border text-accent focus:ring-accent"
        />
        <span class="text-sm text-white">Patterns (melody, rhythm, harmony)</span>
      </label>
    </div>
  </div>

  <!-- Upload Button -->
  <button
    class="btn-primary w-full"
    on:click={handleUpload}
    disabled={selectedFiles.length === 0}
  >
    Upload & Analyze Files
  </button>
</div>
