<script>
  import { onMount } from 'svelte';
  
  let libraryFiles = [];
  let isLoading = true;
  let searchQuery = '';
  let filterCategory = 'all';
  let sortBy = 'date';
  let sortOrder = 'desc';
  let currentlyPlaying = null;
  let audioElement = null;
  
  onMount(() => {
    loadLibraryFiles();
    // Create audio element for playback
    audioElement = new Audio();
    audioElement.addEventListener('ended', () => {
      currentlyPlaying = null;
    });
  });
  
  async function loadLibraryFiles() {
    try {
      if (window.electronAPI) {
        const files = await window.electronAPI.getLibraryFiles();
        libraryFiles = files;
      }
    } catch (error) {
      console.error('Failed to load library files:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function clearLibrary() {
    if (confirm('Are you sure you want to clear the entire library? This action cannot be undone.')) {
      try {
        await window.electronAPI.clearLibrary();
        libraryFiles = [];
      } catch (error) {
        console.error('Failed to clear library:', error);
      }
    }
  }
  
  async function reindexLibrary() {
    try {
      await window.electronAPI.reindexLibrary();
      await loadLibraryFiles();
    } catch (error) {
      console.error('Failed to reindex library:', error);
    }
  }
  
  async function playFile(file) {
    try {
      if (currentlyPlaying === file.id) {
        // If same file is playing, pause it
        audioElement.pause();
        currentlyPlaying = null;
        return;
      }
      
      // Stop any currently playing audio
      if (currentlyPlaying) {
        audioElement.pause();
      }
      
      // For MIDI files, we need to generate audio first or use MIDI playback
      if (file.path.toLowerCase().endsWith('.mid') || file.path.toLowerCase().endsWith('.midi')) {
        // For now, we'll try to play the file directly or show a message
        console.log('MIDI playback not yet implemented for:', file.path);
        alert('MIDI playback will be implemented soon!');
        return;
      }
      
      // For audio files
      if (window.electronAPI && window.electronAPI.playAudioFile) {
        await window.electronAPI.playAudioFile(file.path);
      } else {
        // Fallback: try to load and play directly
        audioElement.src = `file://${file.path}`;
        await audioElement.play();
      }
      
      currentlyPlaying = file.id;
    } catch (error) {
      console.error('Failed to play file:', error);
      alert('Failed to play file. Make sure the file exists and is a valid audio format.');
    }
  }
  
  function stopPlayback() {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    currentlyPlaying = null;
  }
  
  function isAudioFile(filePath) {
    const audioExtensions = ['.mp3', '.wav', '.flac', '.aiff', '.aif', '.m4a', '.ogg', '.aac'];
    return audioExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }
  
  function isMidiFile(filePath) {
    return filePath.toLowerCase().endsWith('.mid') || filePath.toLowerCase().endsWith('.midi');
  }
  
  function filteredFiles() {
    let filtered = libraryFiles;
    
    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(file => 
        file.categories.includes(filterCategory)
      );
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query) ||
        (file.tags && file.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.dateAdded) - new Date(b.dateAdded);
          break;
        case 'size':
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }
  
  function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }
</script>

<div class="library-component min-h-screen bg-dark-bg p-6 space-y-6">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold text-white">Library Management</h1>
      <p class="text-gray-400 mt-2">Manage your analyzed audio files and patterns</p>
    </div>
    <div class="flex space-x-3">
      <button class="btn-secondary" on:click={reindexLibrary}>
        Reindex Library
      </button>
      <button class="btn-secondary text-red-400 hover:text-red-300" on:click={clearLibrary}>
        Clear Library
      </button>
      {#if currentlyPlaying}
        <button class="btn-secondary text-yellow-400 hover:text-yellow-300" on:click={stopPlayback}>
          Stop Playback
        </button>
      {/if}
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="card">
      <div class="text-center">
        <p class="text-2xl font-bold text-white">{libraryFiles.length}</p>
        <p class="text-sm text-gray-400">Total Files</p>
      </div>
    </div>
    <div class="card">
      <div class="text-center">
        <p class="text-2xl font-bold text-white">
          {libraryFiles.filter(f => f.categories.includes('humanization')).length}
        </p>
        <p class="text-sm text-gray-400">Humanization</p>
      </div>
    </div>
    <div class="card">
      <div class="text-center">
        <p class="text-2xl font-bold text-white">
          {libraryFiles.filter(f => f.categories.includes('patterns')).length}
        </p>
        <p class="text-sm text-gray-400">Patterns</p>
      </div>
    </div>
    <div class="card">
      <div class="text-center">
        <p class="text-2xl font-bold text-white">
          {libraryFiles.reduce((sum, f) => sum + (f.fileSize || 0), 0) > 0 
            ? formatFileSize(libraryFiles.reduce((sum, f) => sum + (f.fileSize || 0))
            : 'Unknown'}
        </p>
        <p class="text-sm text-gray-400">Total Size</p>
      </div>
    </div>
  </div>

  <!-- Filters and Search -->
  <div class="card">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label for="search" class="block text-sm font-medium text-gray-300 mb-2">Search:</label>
        <input
          id="search"
          type="text"
          bind:value={searchQuery}
          placeholder="Search files..."
          class="input-field w-full"
        />
      </div>
      
      <div>
        <label for="category" class="block text-sm font-medium text-gray-300 mb-2">Category:</label>
        <select id="category" bind:value={filterCategory} class="input-field w-full">
          <option value="all">All Categories</option>
          <option value="humanization">Humanization</option>
          <option value="patterns">Patterns</option>
        </select>
      </div>
      
      <div>
        <label for="sort-by" class="block text-sm font-medium text-gray-300 mb-2">Sort by:</label>
        <select id="sort-by" bind:value={sortBy} class="input-field w-full">
          <option value="date">Date Added</option>
          <option value="name">Name</option>
          <option value="size">File Size</option>
        </select>
      </div>
      
      <div>
        <label for="sort-order" class="block text-sm font-medium text-gray-300 mb-2">Order:</label>
        <select id="sort-order" bind:value={sortOrder} class="input-field w-full">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Files List -->
  <div class="card">
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    {:else if filteredFiles().length === 0}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
        </svg>
        <p class="text-gray-400 mt-2">No files found</p>
      </div>
    {:else}
      <div class="space-y-2">
        {#each filteredFiles() as file}
          <div class="flex items-center justify-between bg-dark-card rounded-lg p-4 hover:bg-dark-border transition-colors border border-dark-border">
            <div class="flex items-center space-x-4">
              <div class="p-2 bg-accent rounded-lg">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
              </div>
              <div class="flex-grow">
                <p class="font-medium text-white">{file.name}</p>
                <p class="text-sm text-gray-400">{file.path}</p>
                <div class="flex space-x-2 mt-1">
                  {#each file.categories as category}
                    <span class="text-xs px-2 py-1 bg-accent/20 text-accent rounded">
                      {category}
                    </span>
                  {/each}
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <!-- Play Button -->
              {#if isAudioFile(file.path) || isMidiFile(file.path)}
                <button 
                  class="play-button p-2 rounded-lg transition-colors {currentlyPlaying === file.id ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'}"
                  on:click={() => playFile(file)}
                  title={currentlyPlaying === file.id ? 'Stop' : 'Play'}
                >
                  {#if currentlyPlaying === file.id}
                    <!-- Stop icon -->
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="4" y="4" width="16" height="16" rx="2"/>
                    </svg>
                  {:else}
                    <!-- Play icon -->
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <polygon points="9.5,3 20,12 9.5,21"/>
                    </svg>
                  {/if}
                </button>
              {/if}
              
              <!-- File info -->
              <div class="text-right text-sm text-gray-400">
                <p>{formatFileSize(file.fileSize)}</p>
                <p>{formatDate(file.dateAdded)}</p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Ensure dark theme is properly applied */
  :global(.library-component) {
    background-color: #0f0f0f !important;
    color: white !important;
  }
  
  /* Force dark backgrounds for all elements */
  :global(.library-component *) {
    border-color: #404040 !important;
  }
  
  :global(.library-component input),
  :global(.library-component select) {
    background-color: #262626 !important;
    color: white !important;
    border-color: #404040 !important;
  }
  
  :global(.library-component input::placeholder) {
    color: #9ca3af !important;
  }
  
  /* Play button animations */
  .play-button {
    transition: all 0.2s ease;
  }
  
  .play-button:hover {
    transform: scale(1.05);
  }
  
  .play-button:active {
    transform: scale(0.95);
  }
</style>
