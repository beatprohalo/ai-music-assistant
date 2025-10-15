<script>
  import { onMount } from 'svelte';
  import Dashboard from './components/Dashboard.svelte';
  import Library from './components/Library.svelte';
  import Settings from './components/Settings.svelte';
  
  let currentView = 'dashboard';
  let isLoading = true;
  
  onMount(() => {
    // Initialize the app
    initializeApp();
  });
  
  async function initializeApp() {
    try {
      // Initialize database and check for existing data
      if (window.electronAPI) {
        await window.electronAPI.initializeDatabase();
      }
      isLoading = false;
    } catch (error) {
      console.error('Failed to initialize app:', error);
      isLoading = false;
    }
  }
  
  function navigateTo(view) {
    currentView = view;
  }
</script>

<main class="min-h-screen bg-dark-bg">
  {#if isLoading}
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <p class="text-gray-400">Initializing AI Music Assistant...</p>
      </div>
    </div>
  {:else}
    <!-- Navigation -->
    <nav class="bg-dark-surface border-b border-dark-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold text-white">AI Music Assistant</h1>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <button
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200
                       {currentView === 'dashboard' 
                         ? 'border-accent text-accent' 
                         : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'}"
                on:click={() => navigateTo('dashboard')}
              >
                Dashboard
              </button>
              <button
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200
                       {currentView === 'library' 
                         ? 'border-accent text-accent' 
                         : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'}"
                on:click={() => navigateTo('library')}
              >
                Library
              </button>
              <button
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200
                       {currentView === 'settings' 
                         ? 'border-accent text-accent' 
                         : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'}"
                on:click={() => navigateTo('settings')}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {#if currentView === 'dashboard'}
        <Dashboard />
      {:else if currentView === 'library'}
        <Library />
      {:else if currentView === 'settings'}
        <Settings closeSettings={() => navigateTo('dashboard')} />
      {/if}
    </div>
  {/if}
</main>
