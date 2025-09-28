<script>
  import { onMount } from 'svelte';
  import FileUploader from './FileUploader.svelte';
  import MusicGenerator from './MusicGenerator.svelte';
  import ProcessingStatus from './ProcessingStatus.svelte';
  
  let selectedFiles = [];
  let isProcessing = false;
  let processingStatus = '';
  let libraryStats = {
    totalFiles: 0,
    humanizationFiles: 0,
    patternFiles: 0
  };
  
  onMount(() => {
    loadLibraryStats();
  });
  
  async function loadLibraryStats() {
    try {
      if (window.electronAPI) {
        const stats = await window.electronAPI.getLibraryStats();
        libraryStats = stats;
      }
    } catch (error) {
      console.error('Failed to load library stats:', error);
    }
  }
  
  async function handleFileUpload(files, categories) {
    selectedFiles = files;
    isProcessing = true;
    processingStatus = 'Analyzing audio files...';
    
    try {
      for (const file of files) {
        processingStatus = `Processing ${file.name}...`;
        const result = await window.electronAPI.processAudioFile(file.path, {
          categories,
          extractFeatures: true,
          generateEmbeddings: true
        });
        
        await window.electronAPI.addToLibrary({
          ...result,
          categories,
          originalPath: file.path
        });
      }
      
      processingStatus = 'Complete!';
      await loadLibraryStats();
    } catch (error) {
      console.error('Processing failed:', error);
      processingStatus = 'Error: ' + error.message;
    } finally {
      isProcessing = false;
    }
  }
  
  async function handleMusicGeneration(prompt, options) {
    isProcessing = true;
    processingStatus = 'Generating music with AI...';
    
    try {
      const result = await window.electronAPI.generateMusic(prompt, options);
      processingStatus = 'Music generated successfully!';
      return result;
    } catch (error) {
      console.error('Generation failed:', error);
      processingStatus = 'Error: ' + error.message;
    } finally {
      isProcessing = false;
    }
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold text-white">Dashboard</h1>
      <p class="text-gray-400 mt-2">Process audio files and generate music with AI</p>
    </div>
    <div class="text-right">
      <div class="text-sm text-gray-400">Library Stats</div>
      <div class="text-2xl font-bold text-white">{libraryStats.totalFiles} files</div>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="card">
      <div class="flex items-center">
        <div class="p-2 bg-accent rounded-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-400">Total Files</p>
          <p class="text-2xl font-bold text-white">{libraryStats.totalFiles}</p>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="flex items-center">
        <div class="p-2 bg-green-500 rounded-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-400">Humanization</p>
          <p class="text-2xl font-bold text-white">{libraryStats.humanizationFiles}</p>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="flex items-center">
        <div class="p-2 bg-purple-500 rounded-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-400">Patterns</p>
          <p class="text-2xl font-bold text-white">{libraryStats.patternFiles}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- File Uploader -->
    <div class="card">
      <h2 class="text-xl font-semibold text-white mb-4">Upload & Analyze Files</h2>
      <FileUploader on:upload={handleFileUpload} />
    </div>
    
    <!-- Music Generator -->
    <div class="card">
      <h2 class="text-xl font-semibold text-white mb-4">Generate Music</h2>
      <MusicGenerator on:generate={handleMusicGeneration} />
    </div>
  </div>

  <!-- Processing Status -->
  {#if isProcessing}
    <ProcessingStatus status={processingStatus} />
  {/if}
</div>
