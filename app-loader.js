// Initialize API keys from server if available
if (typeof PRELOADED_API_KEYS !== 'undefined') {
    // Auto-select provider based on available API key
    if (PRELOADED_API_KEYS.google) {
        gameState.apiKey = PRELOADED_API_KEYS.google;
        gameState.provider = 'google';
    } else if (PRELOADED_API_KEYS.anthropic) {
        gameState.apiKey = PRELOADED_API_KEYS.anthropic;
        gameState.provider = 'anthropic';
        document.querySelector('input[name="ai-provider"][value="anthropic"]').checked = true;
    } else if (PRELOADED_API_KEYS.openai) {
        gameState.apiKey = PRELOADED_API_KEYS.openai;
        gameState.provider = 'openai';
        document.querySelector('input[name="ai-provider"][value="openai"]').checked = true;
    }

    // Update API key input field
    if (apiKeyInput && gameState.apiKey) {
        apiKeyInput.value = gameState.apiKey;
        updateStartButton();
    }
}

// Update provider change to use preloaded keys
const originalUpdateAPILink = updateAPILink;
function updateAPILink() {
    if (typeof PRELOADED_API_KEYS !== 'undefined') {
        // Update gameState.apiKey when provider changes
        if (gameState.provider === 'google' && PRELOADED_API_KEYS.google) {
            gameState.apiKey = PRELOADED_API_KEYS.google;
            apiKeyInput.value = gameState.apiKey;
        } else if (gameState.provider === 'anthropic' && PRELOADED_API_KEYS.anthropic) {
            gameState.apiKey = PRELOADED_API_KEYS.anthropic;
            apiKeyInput.value = gameState.apiKey;
        } else if (gameState.provider === 'openai' && PRELOADED_API_KEYS.openai) {
            gameState.apiKey = PRELOADED_API_KEYS.openai;
            apiKeyInput.value = gameState.apiKey;
        }
        updateStartButton();
    }
    // Call original function
    if (originalUpdateAPILink) originalUpdateAPILink();
}
