let currentUser = null;
let currentRecipe = null;
let isReading = false;
let isPaused = false;
let currentLineIndex = 0;
let readingTimeout = null;
let allLines = [];

const $ = (id) => document.getElementById(id);

const storage = {
    get(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); } catch { /* ignore */ }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
};

const sessionBackup = {
    get(key) {
        try { return sessionStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
        try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
    },
    remove(key) {
        try { sessionStorage.removeItem(key); } catch { /* ignore */ }
    }
};

const STORAGE_KEYS = {
    users: 'users',
    recipes: 'recipes'
};

const safeJsonParse = (value, fallback = null) => {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
};

const persistData = (key, value) => {
    const stringified = JSON.stringify(value);
    storage.set(key, stringified);
    sessionBackup.set(key, stringified);
};

const getRecipes = () => {
    const json = storage.get(STORAGE_KEYS.recipes) || sessionBackup.get(STORAGE_KEYS.recipes);
    return safeJsonParse(json, []);
};

const setRecipes = (recipes) => {
    persistData(STORAGE_KEYS.recipes, recipes);
};

const getUsers = () => {
    const json = storage.get(STORAGE_KEYS.users) || sessionBackup.get(STORAGE_KEYS.users);
    return safeJsonParse(json, []);
};

const setUsers = (users) => {
    persistData(STORAGE_KEYS.users, users);
};

function initializeData() {
    if (getUsers().length === 0) {
        const users = [
            { username: 'admin', password: '1234', settings: { delay: 2, theme: 'light', fontSize: 'medium', speechRate: 1 } },
            { username: 'user1', password: 'pass1', settings: { delay: 2, theme: 'light', fontSize: 'medium', speechRate: 1 } },
            { username: 'chef', password: 'cook123', settings: { delay: 2, theme: 'dark', fontSize: 'large', speechRate: 0.9 } }
        ];
        setUsers(users);
    }

    // Try to restore recipes from localStorage. If missing, fall back to sessionStorage.
    let recipesJson = storage.get(STORAGE_KEYS.recipes) || sessionBackup.get(STORAGE_KEYS.recipes);

    if (!recipesJson) {
        const recipes = [
            {
                id: 1,
                name: 'פסטה ברוטב עגבניות',
                image: 'images/פסטה.jpg',
                ingredients: ['500 גרם פסטה', '400 גרם עגבניות מרוסקות', '3 שיני שום', '2 כפות שמן זית', 'בזיליקום טרי', 'מלח ופלפל'],
                instructions: ['הרתיחו מים במסיר גדול והוסיפו מלח', 'בשלו את הפסטה לפי ההוראות על האריזה', 'בינתיים, חממו שמן זית במחבת וטגנו שום קצוץ', 'הוסיפו עגבניות מרוסקות ובשלו 10 דקות', 'תבלו במלח, פלפל ובזיליקום', 'סננו את הפסטה וערבבו עם הרוטב', 'הגישו חם עם פרמזן מגורד']
            },
            {
                id: 2,
                name: 'סלט ירקות טרי',
                image: 'images/סלט ירקות.jpg',
                ingredients: ['חסה', '2 עגבניות', 'מלפפון', 'פלפל צהוב', 'בצל סגול', 'לימון', 'שמן זית', 'מלח'],
                instructions: ['שטפו היטב את כל הירקות', 'קצצו את החסה לגודל נוח', 'חתכו עגבניות ומלפפון לקוביות', 'פרסו את הפלפל והבצל דק', 'ערבבו הכל בקערה גדולה', 'הוסיפו מיץ לימון ושמן זית', 'תבלו במלח לפי הטעם והגישו']
            },
            {
                id: 3,
                name: 'עוגת שוקולד',
                image: 'images/עוגת שוקולד.jpg',
                ingredients: ['2 כוסות קמח', '1.5 כוסות סוכר', '3/4 כוס קקאו', '2 ביצים', '1 כוס חלב', '1/2 כוס שמן', '2 כפיות אבקת אפייה', 'וניל'],
                instructions: ['חממו תנור ל-180 מעלות', 'ערבבו מרכיבים יבשים בקערה', 'הוסיפו ביצים, חלב ושמן', 'טרפו היטב עד לקבלת בלילה חלקה', 'מרחו תבנית באורך 20x30', 'יצקו את הבלילה לתבנית', 'אפו 35-40 דקות', 'הוציאו מהתנור והניחו להתקרר']
            }
        ];
        persistData(STORAGE_KEYS.recipes, recipes);
        recipesJson = storage.get(STORAGE_KEYS.recipes);
    }

    // Ensure existing saved recipes use the new pasta image filename
    let existingRecipes = safeJsonParse(recipesJson, []);
    let updated = false;
    existingRecipes.forEach(r => {
        if (r.image === 'images/פסטהs.jfif') {
            r.image = 'images/פסטה.jpg';
            updated = true;
        }
    });
    if (updated) {
        persistData(STORAGE_KEYS.recipes, existingRecipes);
    }
}

function login() {
    const username = $('username').value.trim();
    const password = $('password').value;
    const errorEl = $('loginError');

    if (!username || !password) {
        errorEl.textContent = 'נא למלא את כל השדות';
        return;
    }

    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        currentUser = user;
        errorEl.textContent = '';
        applySettings(user.settings);
        showRecipeList();
    } else {
        errorEl.textContent = 'שם משתמש או סיסמה שגויים';
    }
}

function logout() {
    currentUser = null;
    $('username').value = '';
    $('password').value = '';
    showScreen('loginScreen');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(screenId).classList.add('active');
}

function showRecipeList() {
    showScreen('recipeListScreen');
    // Clear any previous search filter so new recipes always appear
    const searchInput = $('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    displayRecipes();
}

function showSettings() {
    showScreen('settingsScreen');
    const settings = currentUser.settings;
    $('readingDelay').value = settings.delay;
    $('themeSelect').value = settings.theme;
    $('fontSizeSelect').value = settings.fontSize;
    $('speechRate').value = settings.speechRate;
    $('rateValue').textContent = settings.speechRate;
}

function showAddRecipe() {
    showScreen('addRecipeScreen');
    $('newRecipeName').value = '';
    $('newRecipeImage').value = '';
    $('newRecipeIngredients').value = '';
    $('newRecipeInstructions').value = '';
}

function displayRecipes(filter = '') {
    const recipes = getRecipes();
    const listEl = $('recipeList');
    
    const filtered = recipes.filter(r => 
        r.name.toLowerCase().includes(filter.toLowerCase())
    );

    listEl.innerHTML = filtered.map(recipe => `
        <div class="recipe-card" onclick="showRecipe(${recipe.id})">
            <img src="${recipe.image}" alt="${recipe.name}" class="recipe-image" onerror="this.style.display='none'">
            <div class="recipe-info">
                <h3>${recipe.name}</h3>
                <p>${recipe.ingredients.length} מרכיבים</p>
                <p>${recipe.instructions.length} שלבים</p>
            </div>
        </div>
    `).join('');
}

function searchRecipes() {
    const query = $('searchInput').value;
    displayRecipes(query);
}

function showRecipe(id) {
    const recipes = getRecipes();
    currentRecipe = recipes.find(r => r.id === id);
    if (!currentRecipe) return;

    $('recipeTitle').textContent = currentRecipe.name;

    const recipeImageEl = $('recipeImage');
    if (currentRecipe.image) {
        recipeImageEl.src = currentRecipe.image;
        recipeImageEl.style.display = 'block';
    } else {
        recipeImageEl.style.display = 'none';
    }

    $('ingredientsList').innerHTML = currentRecipe.ingredients.map(i => `<li>${i}</li>`).join('');
    $('instructionsList').innerHTML = currentRecipe.instructions.map(i => `<li>${i}</li>`).join('');
    $('currentLine').textContent = '';

    resetReading();
    showScreen('recipeScreen');
}

function normalizeImagePath(rawPath) {
    if (!rawPath) return '';

    const trimmed = rawPath.trim();
    // If it's a complete URL, return as-is
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    // Normalize backslashes to slashes
    let normalized = trimmed.replace(/\\/g, '/');

    // If user only provided a filename (no slash), prefix images/
    if (!normalized.includes('/')) {
        normalized = `images/${normalized}`;
    }

    return normalized;
}

function addRecipe() {
    const name = $('newRecipeName').value.trim();
    const image = normalizeImagePath($('newRecipeImage').value);
    const ingredients = $('newRecipeIngredients').value
        .split('\n').filter(i => i.trim());
    const instructions = $('newRecipeInstructions').value
        .split('\n').filter(i => i.trim());

    if (!name || ingredients.length === 0 || instructions.length === 0) {
        alert('נא למלא את כל השדות');
        return;
    }

    const recipes = getRecipes();
    const newRecipe = {
        id: Date.now(),
        name,
        image,
        ingredients,
        instructions
    };

    recipes.push(newRecipe);
    setRecipes(recipes);

    // הודעה למשתמש שהמתכון נשמר
    alert('המתכון נשמר בהצלחה!');
    
    // Reset the search input so the new recipe is visible immediately
    const searchInput = $('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    showRecipeList();
}

function saveSettings() {
    const settings = {
        delay: parseFloat($('readingDelay').value),
        theme: $('themeSelect').value,
        fontSize: $('fontSizeSelect').value,
        speechRate: parseFloat($('speechRate').value)
    };

    currentUser.settings = settings;

    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === currentUser.username);
    if (userIndex >= 0) {
        users[userIndex] = currentUser;
        setUsers(users);
    }
    alert('ההגדרות נשמרו בהצלחה!');
}

function applySettings(settings) {
    document.body.className = '';
    if (settings.theme === 'dark') {
        document.body.classList.add('dark');
    }
    document.body.classList.add(`font-${settings.fontSize}`);
}

function changeTheme() {
    const theme = $('themeSelect').value;
    const fontSize = $('fontSizeSelect').value;
    applySettings({ theme, fontSize, delay: parseFloat($('readingDelay').value), speechRate: parseFloat($('speechRate').value) });
}

function changeFontSize() {
    const fontSize = $('fontSizeSelect').value;
    const theme = $('themeSelect').value;
    applySettings({ theme, fontSize, delay: parseFloat($('readingDelay').value), speechRate: parseFloat($('speechRate').value) });
}

$('speechRate')?.addEventListener('input', (e) => {
    $('rateValue').textContent = e.target.value;
});

function toggleReading() {
    if (!isReading) {
        startReading();
    } else if (isPaused) {
        resumeReading();
    } else {
        pauseReading();
    }
}

function startReading() {
    if (!currentRecipe) return;

    allLines = [
        'מרכיבים:',
        ...currentRecipe.ingredients,
        'אופן ההכנה:',
        ...currentRecipe.instructions
    ];

    currentLineIndex = 0;
    isReading = true;
    isPaused = false;
    $('playPauseBtn').textContent = '⏸️ השהה';
    
    readNextLine();
}

function readNextLine() {
    if (currentLineIndex >= allLines.length) {
        stopReading();
        return;
    }

    const line = allLines[currentLineIndex];
    $('currentLine').textContent = line;

    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = 'he-IL';
    utterance.rate = currentUser.settings.speechRate;

    utterance.onend = () => {
        if (isReading && !isPaused) {
            currentLineIndex++;
            readingTimeout = setTimeout(() => {
                readNextLine();
            }, currentUser.settings.delay * 1000);
        }
    };

    speechSynthesis.speak(utterance);
}

function pauseReading() {
    isPaused = true;
    speechSynthesis.cancel();
    clearTimeout(readingTimeout);
    $('playPauseBtn').textContent = '▶️ המשך';
}

function resumeReading() {
    isPaused = false;
    $('playPauseBtn').textContent = '⏸️ השהה';
    readNextLine();
}

function restartReading() {
    stopReading();
    startReading();
}

function stopReading() {
    isReading = false;
    isPaused = false;
    speechSynthesis.cancel();
    clearTimeout(readingTimeout);
    currentLineIndex = 0;
    $('currentLine').textContent = '';
    $('playPauseBtn').textContent = '▶️ התחל קריאה';
}

function resetReading() {
    stopReading();
    allLines = [];
}

function resetData() {
    if (confirm('האם אתה בטוח שאתה רוצה לאפס רק את ההגדרות (משתמש וסיסמה)? המתכונים יישארו.') ) {
        // Keep recipes so user doesn’t lose what they added
        storage.remove(STORAGE_KEYS.users);
        sessionBackup.remove(STORAGE_KEYS.users);
        currentUser = null;
        location.reload();
    }
}

initializeData();
