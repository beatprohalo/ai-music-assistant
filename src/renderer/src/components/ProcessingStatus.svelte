<script>
  export let status = '';
</script>

<div class="fixed bottom-4 right-4 bg-dark-surface border border-dark-border rounded-lg p-4 shadow-lg max-w-sm">
  <div class="flex items-center space-x-3">
    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>
    <div>
      <p class="text-sm font-medium text-white">Processing</p>
      <p class="text-xs text-gray-400">{status}</p>
    </div>
  </div>
</div>
