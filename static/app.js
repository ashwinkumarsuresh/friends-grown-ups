// Game State
const gameState = {
    friends: [],
    apiKey: '',
    provider: 'google', // 'google', 'anthropic', or 'openai'
    currentFriend: null,
    usedFriends: [],
    spicePreference: 'mild', // User's selection (can be 'random')
    spiceLevel: 'mild' // Actual resolved spice level ('mild', 'medium', 'spicy', 'intimate')
};

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const selectionScreen = document.getElementById('selection-screen');
const topicScreen = document.getElementById('topic-screen');
const questionScreen = document.getElementById('question-screen');

const friendNameInput = document.getElementById('friend-name');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendsList = document.getElementById('friends-list');
const apiKeyInput = document.getElementById('api-key');
const startGameBtn = document.getElementById('start-game-btn');

const nameSpinner = document.getElementById('name-spinner');
const selectedFriendDiv = document.getElementById('selected-friend');
const currentPlayerDiv = document.getElementById('current-player');
const topicsLoading = document.getElementById('topics-loading');
const topicsGrid = document.getElementById('topics-grid');

const questionPlayer = document.getElementById('question-player');
const questionLoading = document.getElementById('question-loading');
const questionDisplay = document.getElementById('question-display');
const nextRoundBtn = document.getElementById('next-round-btn');
const endGameBtn = document.getElementById('end-game-btn');

// Spice level elements
const spiceLevelBtns = document.querySelectorAll('.spice-btn');
const currentSpiceLevelDisplay = document.getElementById('current-spice-level');

// Event Listeners
addFriendBtn.addEventListener('click', addFriend);
friendNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addFriend();
});

apiKeyInput.addEventListener('input', () => {
    gameState.apiKey = apiKeyInput.value.trim();
    updateStartButton();
});

// Provider selection listeners
document.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        gameState.provider = e.target.value;
        updateAPILink();
    });
});

// Spice level listeners
spiceLevelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const newLevel = btn.dataset.level;
        gameState.spicePreference = newLevel;
        // If random is selected, default to mild until first resolution
        if (newLevel === 'random') {
            gameState.spiceLevel = 'mild';
        } else {
            gameState.spiceLevel = newLevel;
        }
        updateSpiceLevelUI();
    });
});

function updateSpiceLevelUI() {
    spiceLevelBtns.forEach(btn => {
        if (btn.dataset.level === gameState.spicePreference) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const levelNames = {
        'random': 'Random',
        'mild': 'Mild',
        'medium': 'Medium',
        'spicy': 'Spicy',
        'intimate': 'Intimate'
    };

    if (currentSpiceLevelDisplay) {
        currentSpiceLevelDisplay.textContent = levelNames[gameState.spicePreference];
    }
}

function resolveSpiceLevel() {
    // If random mode, pick a random spice level for this round
    if (gameState.spicePreference === 'random') {
        // Weighted random: 25% mild, 30% medium, 30% spicy, 15% intimate
        const rand = Math.random();
        if (rand < 0.25) gameState.spiceLevel = 'mild';
        else if (rand < 0.55) gameState.spiceLevel = 'medium';
        else if (rand < 0.85) gameState.spiceLevel = 'spicy';
        else gameState.spiceLevel = 'intimate';
    } else {
        gameState.spiceLevel = gameState.spicePreference;
    }
}

function updateCurrentPlayerDisplay() {
    // Show current player with spice info if in random mode
    if (gameState.spicePreference === 'random') {
        const spiceEmojis = {
            'mild': '🌶️',
            'medium': '🌶️🌶️',
            'spicy': '🌶️🌶️🌶️',
            'intimate': '🌶️🌶️🌶️🌶️'
        };
        const emoji = spiceEmojis[gameState.spiceLevel] || '🎲';
        const spiceName = gameState.spiceLevel.charAt(0).toUpperCase() + gameState.spiceLevel.slice(1);
        currentPlayerDiv.innerHTML = `${gameState.currentFriend.name}'s Turn <span class="spice-badge">${emoji} ${spiceName}</span>`;
    } else {
        currentPlayerDiv.textContent = `${gameState.currentFriend.name}'s Turn`;
    }
}

function updateAPILink() {
    const apiLink = document.getElementById('api-link');
    if (gameState.provider === 'google') {
        apiLink.innerHTML = 'Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>';
        apiKeyInput.placeholder = 'Enter your Google AI API Key';
    } else if (gameState.provider === 'openai') {
        apiLink.innerHTML = 'Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>';
        apiKeyInput.placeholder = 'Enter your OpenAI API Key';
    } else {
        apiLink.innerHTML = 'Get your API key from <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a>';
        apiKeyInput.placeholder = 'Enter your Anthropic API Key';
    }
}

startGameBtn.addEventListener('click', startGame);
nextRoundBtn.addEventListener('click', startNewRound);
endGameBtn.addEventListener('click', endGame);

// Functions
function addFriend() {
    const name = friendNameInput.value.trim();

    if (!name) {
        alert('Please enter a valid name!');
        return;
    }

    gameState.friends.push({ name });
    renderFriendsList();

    friendNameInput.value = '';
    friendNameInput.focus();

    updateStartButton();
}

function removeFriend(index) {
    gameState.friends.splice(index, 1);
    renderFriendsList();
    updateStartButton();
}

function renderFriendsList() {
    friendsList.innerHTML = '';
    gameState.friends.forEach((friend, index) => {
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        friendItem.innerHTML = `
            <div class="friend-info">
                ${friend.name}
            </div>
            <button class="remove-friend" onclick="removeFriend(${index})">Remove</button>
        `;
        friendsList.appendChild(friendItem);
    });
}

function updateStartButton() {
    startGameBtn.disabled = gameState.friends.length < 2 || !gameState.apiKey;
}

function switchScreen(hideScreen, showScreen) {
    hideScreen.classList.remove('active');
    showScreen.classList.add('active');
}

function startGame() {
    switchScreen(setupScreen, selectionScreen);
    selectRandomFriend();
}

function selectRandomFriend() {
    // Reset if all friends have been used
    if (gameState.usedFriends.length === gameState.friends.length) {
        gameState.usedFriends = [];
    }

    // Get available friends
    const availableFriends = gameState.friends.filter(
        friend => !gameState.usedFriends.includes(friend.name)
    );

    // Spinning animation
    let spinCount = 0;
    const spinInterval = setInterval(() => {
        const randomFriend = gameState.friends[Math.floor(Math.random() * gameState.friends.length)];
        nameSpinner.textContent = randomFriend.name;
        spinCount++;

        if (spinCount > 20) {
            clearInterval(spinInterval);
            // Select the actual friend
            const selectedFriend = availableFriends[Math.floor(Math.random() * availableFriends.length)];
            gameState.currentFriend = selectedFriend;
            gameState.usedFriends.push(selectedFriend.name);

            nameSpinner.style.display = 'none';
            selectedFriendDiv.textContent = selectedFriend.name;

            // Move to topic selection after delay
            setTimeout(() => {
                switchScreen(selectionScreen, topicScreen);

                // Resolve spice level for this round if random mode
                if (gameState.spicePreference === 'random') {
                    resolveSpiceLevel();
                }

                // Update player display with spice info if random
                updateCurrentPlayerDisplay();
                generateTopics();
            }, 2000);
        }
    }, 100);
}

function getSpiceLevelGuidance() {
    const guidance = {
        'mild': {
            description: 'Light and playful - fun questions that keep things interesting but still comfortable',
            examples: 'favorite experiences, fun preferences, light personal questions',
            tone: 'Fun and engaging but still appropriate for acquaintances'
        },
        'medium': {
            description: 'More personal and revealing - questions that go deeper into experiences and opinions',
            examples: 'dating experiences, personal beliefs, past relationships, moderate confessions',
            tone: 'More intimate but still suitable for close friends'
        },
        'spicy': {
            description: 'Bold and revealing - questions about more intimate topics and experiences',
            examples: 'attraction stories, romantic experiences, fantasies (PG-13), bold confessions',
            tone: 'Flirty and provocative but tasteful - R-rated content'
        },
        'intimate': {
            description: 'Very personal and mature - deep questions about intimate experiences and desires',
            examples: 'intimate experiences, desires, deep confessions, adult topics',
            tone: 'Very mature and personal - for close friends only, full adult content'
        }
    };

    return guidance[gameState.spiceLevel];
}

async function generateTopics() {
    topicsLoading.style.display = 'block';
    topicsGrid.innerHTML = '';

    try {
        const spiceGuidance = getSpiceLevelGuidance();

        const prompt = `You are generating 3 conversation topics for an ADULT-ONLY friends game (18+).

Player: ${gameState.currentFriend.name}
Spice Level: ${gameState.spiceLevel.toUpperCase()} - ${spiceGuidance.description}

ALL CONTENT MUST BE FOR ADULTS ONLY (18+). This is NOT family-friendly.

SPICE LEVEL GUIDELINES:
${spiceGuidance.tone}

Examples of appropriate content: ${spiceGuidance.examples}

Pick 3 fun and engaging topics from DIFFERENT categories:

CATEGORIES TO CHOOSE FROM:
1. ROMANTIC EXPERIENCES: Dating stories, relationships, attraction, romantic moments
2. PERSONAL CONFESSIONS: Secrets, embarrassing moments, things you've never told anyone
3. DESIRES & FANTASIES: Dreams, wishes, what you want in life/love, hypotheticals
4. WILD STORIES: Party stories, adventures, rebellious moments, crazy experiences
5. OPINIONS & BELIEFS: Hot takes, controversial opinions, personal philosophies
6. INTIMATE QUESTIONS: Personal preferences, intimate experiences (adjust intensity to spice level)
7. SELF-REFLECTION: Deep thoughts, personal growth, things you've learned
8. SOCIAL DYNAMICS: Friendship drama, social experiences, relationship dynamics

Requirements:
- VARY the categories - don't repeat!
- Make titles CATCHY and INTRIGUING (2-4 words max)
- Keep descriptions SUPER SHORT and CLEAR
- Adjust content intensity to match the ${gameState.spiceLevel} spice level
- At ${gameState.spiceLevel} level: ${spiceGuidance.tone}

Return ONLY this JSON format:
[
  {"title": "Topic Title", "description": "Brief description"},
  {"title": "Topic Title", "description": "Brief description"},
  {"title": "Topic Title", "description": "Brief description"}
]`;

        const topics = await callAIAPI(prompt);

        topicsLoading.style.display = 'none';
        displayTopics(topics);
    } catch (error) {
        console.error('Error generating topics:', error);
        topicsLoading.innerHTML = `
            <p style="color: red;">Error generating topics: ${error.message}</p>
            <p>Please check your API key and try again.</p>
        `;
    }
}

function displayTopics(topics) {
    topicsGrid.innerHTML = '';

    topics.forEach((topic, index) => {
        const topicCard = document.createElement('div');
        topicCard.className = 'topic-card';
        topicCard.style.animationDelay = `${index * 0.2}s`;
        topicCard.innerHTML = `
            <h3>${topic.title}</h3>
            <p>${topic.description}</p>
        `;
        topicCard.addEventListener('click', () => selectTopic(topic));
        topicsGrid.appendChild(topicCard);
    });
}

async function selectTopic(topic) {
    switchScreen(topicScreen, questionScreen);
    questionPlayer.textContent = `${gameState.currentFriend.name}'s Question`;
    questionLoading.style.display = 'block';
    questionDisplay.innerHTML = '';

    try {
        const spiceGuidance = getSpiceLevelGuidance();

        const prompt = `Generate ONE question for an ADULT-ONLY friends game (18+).

Topic: "${topic.title}" - ${topic.description}
Player: ${gameState.currentFriend.name}
Spice Level: ${gameState.spiceLevel.toUpperCase()} - ${spiceGuidance.description}

ALL CONTENT MUST BE FOR ADULTS ONLY (18+). This is NOT family-friendly.

SPICE LEVEL GUIDELINES:
${spiceGuidance.tone}

Rules:
- Use CONVERSATIONAL, NATURAL language
- Make it SHORT and CLEAR
- Make it ENGAGING and thought-provoking
- Ask about a SPECIFIC situation or experience
- Adjust content intensity to match the ${gameState.spiceLevel} spice level
- Should create interesting adult conversation
- Be bold and direct - this is for adults

Examples of ${gameState.spiceLevel} level questions:
${spiceGuidance.examples}

Return ONLY the question. No quotes, no extra words.`;

        const question = await callAIAPI(prompt, true);

        questionLoading.style.display = 'none';

        // Format the question nicely
        const formattedQuestion = question.trim()
            .replace(/^["']|["']$/g, '') // Remove quotes if AI added them
            .replace(/\?$/, '') // Remove ? if exists, we'll add it back
            + '?'; // Ensure it ends with ?

        questionDisplay.innerHTML = `
            <div class="question-icon">🔥</div>
            <h3>${formattedQuestion}</h3>
            <div class="question-subtitle">Everyone can share their answer!</div>
        `;
    } catch (error) {
        console.error('Error generating question:', error);
        questionLoading.innerHTML = `
            <p style="color: red;">Error generating question: ${error.message}</p>
        `;
    }
}

async function callAIAPI(prompt, isTextResponse = false) {
    try {
        // Use local proxy to avoid CORS issues
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: gameState.apiKey,
                prompt: prompt,
                isTextResponse: isTextResponse,
                provider: gameState.provider
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'API request failed');
        }

        const content = data.content;

        if (isTextResponse) {
            return content.trim();
        }

        // Parse JSON response
        try {
            // Remove markdown code blocks if present
            const jsonText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(jsonText);
        } catch (e) {
            console.error('Failed to parse JSON:', content);
            throw new Error('Invalid response format from API');
        }
    } catch (error) {
        // Better error messages
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Network error: Make sure you are running the proxy server. Run: python3 proxy-server.py');
        }
        throw error;
    }
}

function startNewRound() {
    // Reset selection screen
    nameSpinner.style.display = 'block';
    nameSpinner.textContent = '';
    selectedFriendDiv.textContent = '';

    switchScreen(questionScreen, selectionScreen);
    selectRandomFriend();
}

function endGame() {
    if (confirm('Are you sure you want to end the game?')) {
        // Reset game state
        gameState.currentFriend = null;
        gameState.usedFriends = [];

        // Reset screens
        nameSpinner.style.display = 'block';
        nameSpinner.textContent = '';
        selectedFriendDiv.textContent = '';

        switchScreen(questionScreen, setupScreen);
    }
}

// Initialize spice level UI
updateSpiceLevelUI();

// Make removeFriend available globally
window.removeFriend = removeFriend;
