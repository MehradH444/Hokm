/* =========================================================
   HOKM
   app.js
   Main Application + Local Game Engine
   Version: 1.0.0
   RTL / Persian
   ========================================================= */

"use strict";

/* =========================================================
   1. APPLICATION CONSTANTS
   ========================================================= */

const APP_CONFIG = {
    name: "حکم",
    version: "1.0.0",

    storageKeys: {
        user: "hokm_user",
        users: "hokm_users",
        settings: "hokm_settings",
        games: "hokm_games",
        friends: "hokm_friends",
        notifications: "hokm_notifications",
        missions: "hokm_missions",
        room: "hokm_room",
        game: "hokm_game",
        firstRun: "hokm_first_run"
    },

    defaultCoins: 1000,
    defaultXP: 0,
    defaultLevel: 1,

    maxPlayers: 4,

    game: {
        cardsPerPlayer: 13,
        totalCards: 52,
        targetScore: 7
    }
};


/* =========================================================
   2. SUITS
   ========================================================= */

const SUITS = {
    spades: {
        key: "spades",
        symbol: "♠",
        name: "پیک",
        color: "black"
    },

    hearts: {
        key: "hearts",
        symbol: "♥",
        name: "دل",
        color: "red"
    },

    diamonds: {
        key: "diamonds",
        symbol: "♦",
        name: "خشت",
        color: "red"
    },

    clubs: {
        key: "clubs",
        symbol: "♣",
        name: "گشنیز",
        color: "black"
    }
};


/* =========================================================
   3. CARD VALUES
   ========================================================= */

const CARD_VALUES = {
    2: {
        rank: 2,
        label: "۲"
    },

    3: {
        rank: 3,
        label: "۳"
    },

    4: {
        rank: 4,
        label: "۴"
    },

    5: {
        rank: 5,
        label: "۵"
    },

    6: {
        rank: 6,
        label: "۶"
    },

    7: {
        rank: 7,
        label: "۷"
    },

    8: {
        rank: 8,
        label: "۸"
    },

    9: {
        rank: 9,
        label: "۹"
    },

    10: {
        rank: 10,
        label: "۱۰"
    },

    11: {
        rank: 11,
        label: "سرباز"
    },

    12: {
        rank: 12,
        label: "بی‌بی"
    },

    13: {
        rank: 13,
        label: "شاه"
    },

    14: {
        rank: 14,
        label: "آس"
    }
};


/* =========================================================
   4. DOM HELPER
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function $all(selector) {
    return Array.from(document.querySelectorAll(selector));
}


/* =========================================================
   5. APPLICATION STATE
   ========================================================= */

const state = {

    initialized: false,

    currentScreen: "loading",

    currentPage: "home",

    currentUser: null,

    users: [],

    settings: {
        sound: true,
        music: true,
        vibration: true,
        darkMode: true
    },

    friends: [],

    notifications: [],

    missions: {
        daily: [],
        weekly: []
    },

    room: null,

    game: {
        active: false,

        mode: "classic",

        phase: "idle",

        players: [],

        currentPlayerIndex: 0,

        dealerIndex: 0,

        hokmPlayerIndex: null,

        trumpSuit: null,

        deck: [],

        hands: [],

        trick: [],

        trickHistory: [],

        teamTricks: [0, 0],

        teamScore: [0, 0],

        roundNumber: 1,

        handNumber: 1,

        leadSuit: null,

        winnerTeam: null,

        startedAt: null,

        finishedAt: null
    },

    pendingConfirmation: null,

    chatMessages: []
};


/* =========================================================
   6. STORAGE HELPERS
   ========================================================= */

function loadJSON(key, fallback = null) {

    try {

        const raw = localStorage.getItem(key);

        if (!raw) {
            return fallback;
        }

        return JSON.parse(raw);

    } catch (error) {

        console.error("Storage read error:", error);

        return fallback;
    }
}


function saveJSON(key, value) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

        return true;

    } catch (error) {

        console.error("Storage write error:", error);

        return false;
    }
}


function removeStorage(key) {

    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error("Storage remove error:", error);
    }
}


/* =========================================================
   7. UTILITY FUNCTIONS
   ========================================================= */

function generateId(prefix = "id") {

    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 9)
    );
}


function randomNumber(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}


function clamp(value, min, max) {

    return Math.min(
        Math.max(value, min),
        max
    );
}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatNumber(number) {

    return Number(number || 0).toLocaleString("fa-IR");
}


function formatDate(timestamp) {

    if (!timestamp) {
        return "—";
    }

    try {

        return new Intl.DateTimeFormat(
            "fa-IR",
            {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).format(new Date(timestamp));

    } catch {

        return "—";
    }
}


function delay(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}


/* =========================================================
   8. TOAST SYSTEM
   ========================================================= */

function showToast(message, type = "info", duration = 3000) {

    const container = $("toast-container");

    if (!container) {
        return;
    }

    const toast = document.createElement("div");

    toast.className =
        "toast toast-" +
        type;

    const icons = {
        success: "✓",
        error: "✕",
        warning: "⚠️",
        info: "ℹ️"
    };

    toast.innerHTML = `
        <span class="toast-icon">
            ${icons[type] || icons.info}
        </span>

        <span class="toast-message">
            ${escapeHTML(message)}
        </span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }

        }, 300);

    }, duration);
}


/* =========================================================
   9. ACCESSIBILITY
   ========================================================= */

function announce(message) {

    const region = $("aria-live-region");

    if (!region) {
        return;
    }

    region.textContent = "";

    setTimeout(() => {
        region.textContent = message;
    }, 50);
}


/* =========================================================
   10. VIBRATION
   ========================================================= */

function vibrate(pattern = 30) {

    if (!state.settings.vibration) {
        return;
    }

    if (
        "vibrate" in navigator
    ) {

        try {
            navigator.vibrate(pattern);
        } catch {
            // Ignore vibration errors.
        }
    }
}


/* =========================================================
   11. SOUND PLACEHOLDER
   ========================================================= */

function playSound(type = "click") {

    if (!state.settings.sound) {
        return;
    }

    /*
        سیستم صدای کامل در مرحله Audio System اضافه خواهد شد.
        فعلاً از Web Audio API برای صداهای ساده استفاده می‌کنیم.
    */

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) {
            return;
        }

        const context = new AudioContext();

        const oscillator =
            context.createOscillator();

        const gain =
            context.createGain();

        const frequencies = {
            click: 520,
            card: 620,
            success: 760,
            error: 180
        };

        oscillator.frequency.value =
            frequencies[type] || frequencies.click;

        oscillator.type = "sine";

        gain.gain.setValueAtTime(
            0.0001,
            context.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.035,
            context.currentTime + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + 0.08
        );

        oscillator.connect(gain);

        gain.connect(context.destination);

        oscillator.start();

        oscillator.stop(
            context.currentTime + 0.09
        );

    } catch (error) {

        console.warn(
            "Audio error:",
            error
        );
    }
}


/* =========================================================
   12. LOADING SCREEN
   ========================================================= */

async function initializeApplication() {

    if (state.initialized) {
        return;
    }

    updateLoadingMessage(
        "در حال آماده‌سازی بازی..."
    );

    await delay(400);

    loadApplicationData();

    updateLoadingMessage(
        "در حال آماده‌سازی حساب..."
    );

    await delay(350);

    initializeDefaultData();

    updateLoadingMessage(
        "در حال آماده‌سازی رابط کاربری..."
    );

    await delay(350);

    bindEvents();

    applySettings();

    renderAll();

    await delay(500);

    state.initialized = true;

    determineInitialScreen();
}


function updateLoadingMessage(message) {

    const element = $("loading-message");

    if (element) {
        element.textContent = message;
    }
}


/* =========================================================
   13. LOAD APPLICATION DATA
   ========================================================= */

function loadApplicationData() {

    state.currentUser =
        loadJSON(
            APP_CONFIG.storageKeys.user,
            null
        );

    state.users =
        loadJSON(
            APP_CONFIG.storageKeys.users,
            []
        );

    state.settings = {
        ...state.settings,
        ...loadJSON(
            APP_CONFIG.storageKeys.settings,
            {}
        )
    };

    state.friends =
        loadJSON(
            APP_CONFIG.storageKeys.friends,
            []
        );

    state.notifications =
        loadJSON(
            APP_CONFIG.storageKeys.notifications,
            []
        );

    state.missions =
        loadJSON(
            APP_CONFIG.storageKeys.missions,
            {
                daily: [],
                weekly: []
            }
        );

    state.room =
        loadJSON(
            APP_CONFIG.storageKeys.room,
            null
        );

    state.game =
        {
            ...state.game,
            ...loadJSON(
                APP_CONFIG.storageKeys.game,
                {}
            )
        };
}


/* =========================================================
   14. DEFAULT DATA
   ========================================================= */

function initializeDefaultData() {

    if (!Array.isArray(state.users)) {
        state.users = [];
    }

    if (!Array.isArray(state.friends)) {
        state.friends = [];
    }

    if (!Array.isArray(state.notifications)) {
        state.notifications = [];
    }

    initializeMissions();

    saveJSON(
        APP_CONFIG.storageKeys.settings,
        state.settings
    );
}


/* =========================================================
   15. INITIAL SCREEN
   ========================================================= */

function determineInitialScreen() {

    if (state.currentUser) {

        showScreen("main");

        navigateToPage("home");

        return;
    }

    showScreen("auth");

    showLoginPanel();
}


/* =========================================================
   16. SCREEN CONTROL
   ========================================================= */

function showScreen(screenName) {

    const loadingScreen =
        $("loading-screen");

    const authScreen =
        $("auth-screen");

    const mainScreen =
        $("main-screen");

    if (loadingScreen) {
        loadingScreen.classList.add("hidden");
    }

    if (authScreen) {
        authScreen.classList.add("hidden");
    }

    if (mainScreen) {
        mainScreen.classList.add("hidden");
    }

    if (screenName === "loading") {

        loadingScreen?.classList.remove("hidden");

    } else if (screenName === "auth") {

        authScreen?.classList.remove("hidden");

    } else if (screenName === "main") {

        mainScreen?.classList.remove("hidden");
    }

    state.currentScreen = screenName;
}


/* =========================================================
   17. AUTH PANELS
   ========================================================= */

function showLoginPanel() {

    $("login-panel")?.classList.remove("hidden");

    $("register-panel")?.classList.add("hidden");
}


function showRegisterPanel() {

    $("login-panel")?.classList.add("hidden");

    $("register-panel")?.classList.remove("hidden");
}


/* =========================================================
   18. VALIDATION
   ========================================================= */

function validateUsername(username) {

    const value = username.trim();

    if (!value) {
        return "نام کاربری را وارد کنید.";
    }

    if (value.length < 3) {
        return "نام کاربری باید حداقل ۳ کاراکتر باشد.";
    }

    if (value.length > 30) {
        return "نام کاربری بیش از حد طولانی است.";
    }

    return "";
}


function validateEmail(email) {

    const value = email.trim();

    if (!value) {
        return "ایمیل را وارد کنید.";
    }

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!pattern.test(value)) {
        return "ایمیل واردشده معتبر نیست.";
    }

    return "";
}


function validatePassword(password) {

    if (!password) {
        return "رمز عبور را وارد کنید.";
    }

    if (password.length < 8) {
        return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
    }

    return "";
}


/* =========================================================
   19. FORM ERROR
   ========================================================= */

function setFormError(id, message) {

    const element = $(id);

    if (!element) {
        return;
    }

    element.textContent = message;

    if (message) {
        element.classList.add("visible");
    } else {
        element.classList.remove("visible");
    }
}


/* =========================================================
   20. LOGIN
   ========================================================= */

function handleLogin(event) {

    event.preventDefault();

    const username =
        $("login-username")?.value.trim() || "";

    const password =
        $("login-password")?.value || "";

    setFormError(
        "login-username-error",
        ""
    );

    setFormError(
        "login-password-error",
        ""
    );

    const usernameError =
        validateUsername(username);

    if (usernameError) {

        setFormError(
            "login-username-error",
            usernameError
        );

        return;
    }

    if (!password) {

        setFormError(
            "login-password-error",
            "رمز عبور را وارد کنید."
        );

        return;
    }

    const user =
        state.users.find(
            item =>
                item.username.toLowerCase() ===
                username.toLowerCase()
        );

    if (!user) {

        setFormError(
            "login-username-error",
            "کاربری با این نام پیدا نشد."
        );

        return;
    }

    /*
        توجه:
        این سیستم فعلاً Local Demo است.
        رمز عبور در پروژه واقعی نباید به این شکل
        در LocalStorage ذخیره شود.
    */

    if (user.password !== password) {

        setFormError(
            "login-password-error",
            "رمز عبور اشتباه است."
        );

        return;
    }

    state.currentUser = user;

    saveJSON(
        APP_CONFIG.storageKeys.user,
        state.currentUser
    );

    playSound("success");

    showToast(
        "با موفقیت وارد شدید.",
        "success"
    );

    showScreen("main");

    renderAll();

    navigateToPage("home");
}


/* =========================================================
   21. REGISTER
   ========================================================= */

function handleRegister(event) {

    event.preventDefault();

    const username =
        $("register-username")?.value.trim() || "";

    const email =
        $("register-email")?.value.trim() || "";

    const password =
        $("register-password")?.value || "";

    const passwordConfirm =
        $("register-password-confirm")?.value || "";

    const accepted =
        $("accept-terms")?.checked === true;


    setFormError(
        "register-username-error",
        ""
    );

    setFormError(
        "register-email-error",
        ""
    );

    setFormError(
        "register-password-error",
        ""
    );

    setFormError(
        "register-password-confirm-error",
        ""
    );


    const usernameError =
        validateUsername(username);

    if (usernameError) {

        setFormError(
            "register-username-error",
            usernameError
        );

        return;
    }


    const emailError =
        validateEmail(email);

    if (emailError) {

        setFormError(
            "register-email-error",
            emailError
        );

        return;
    }


    const passwordError =
        validatePassword(password);

    if (passwordError) {

        setFormError(
            "register-password-error",
            passwordError
        );

        return;
    }


    if (password !== passwordConfirm) {

        setFormError(
            "register-password-confirm-error",
            "رمزهای عبور یکسان نیستند."
        );

        return;
    }


    if (!accepted) {

        showToast(
            "برای ساخت حساب باید قوانین را بپذیرید.",
            "warning"
        );

        return;
    }


    const usernameExists =
        state.users.some(
            user =>
                user.username.toLowerCase() ===
                username.toLowerCase()
        );

    if (usernameExists) {

        setFormError(
            "register-username-error",
            "این نام کاربری قبلاً استفاده شده است."
        );

        return;
    }


    const emailExists =
        state.users.some(
            user =>
                user.email.toLowerCase() ===
                email.toLowerCase()
        );

    if (emailExists) {

        setFormError(
            "register-email-error",
            "این ایمیل قبلاً استفاده شده است."
        );

        return;
    }


    const newUser = {

        id: generateId("user"),

        username,

        email,

        password,

        avatar: "👤",

        coins: APP_CONFIG.defaultCoins,

        xp: APP_CONFIG.defaultXP,

        level: APP_CONFIG.defaultLevel,

        games: 0,

        wins: 0,

        losses: 0,

        draws: 0,

        createdAt: Date.now(),

        achievements: [],

        inventory: [],

        stats: {
            tricksWon: 0,
            gamesPlayed: 0,
            rankedGames: 0,
            rankedWins: 0
        }
    };


    state.users.push(newUser);

    state.currentUser = newUser;

    saveJSON(
        APP_CONFIG.storageKeys.users,
        state.users
    );

    saveJSON(
        APP_CONFIG.storageKeys.user,
        state.currentUser
    );

    createWelcomeNotification();

    playSound("success");

    showToast(
        "حساب شما با موفقیت ساخته شد.",
        "success"
    );

    showScreen("main");

    renderAll();

    navigateToPage("home");
}


/* =========================================================
   22. GUEST LOGIN
   ========================================================= */

function loginAsGuest() {

    const guestNumber =
        randomNumber(1000, 9999);

    const guestUser = {

        id: generateId("guest"),

        username:
            "مهمان " +
            guestNumber,

        email: "",

        password: "",

        isGuest: true,

        avatar: "👤",

        coins: 500,

        xp: 0,

        level: 1,

        games: 0,

        wins: 0,

        losses: 0,

        draws: 0,

        createdAt: Date.now(),

        achievements: [],

        inventory: [],

        stats: {
            tricksWon: 0,
            gamesPlayed: 0,
            rankedGames: 0,
            rankedWins: 0
        }
    };

    state.currentUser = guestUser;

    saveJSON(
        APP_CONFIG.storageKeys.user,
        state.currentUser
    );

    showToast(
        "با حساب مهمان وارد شدید.",
        "success"
    );

    showScreen("main");

    renderAll();

    navigateToPage("home");
}


/* =========================================================
   23. LOGOUT
   ========================================================= */

function logout() {

    saveCurrentUser();

    state.currentUser = null;

    state.room = null;

    saveJSON(
        APP_CONFIG.storageKeys.room,
        null
    );

    removeStorage(
        APP_CONFIG.storageKeys.user
    );

    showScreen("auth");

    showLoginPanel();

    showToast(
        "از حساب خارج شدید.",
        "info"
    );
}


/* =========================================================
   24. SAVE CURRENT USER
   ========================================================= */

function saveCurrentUser() {

    if (!state.currentUser) {
        return;
    }

    const index =
        state.users.findIndex(
            user =>
                user.id === state.currentUser.id
        );

    if (index >= 0) {

        state.users[index] =
            state.currentUser;

        saveJSON(
            APP_CONFIG.storageKeys.users,
            state.users
        );
    }

    saveJSON(
        APP_CONFIG.storageKeys.user,
        state.currentUser
    );
}


/* =========================================================
   25. UPDATE USER XP
   ========================================================= */

function addXP(amount) {

    if (!state.currentUser) {
        return;
    }

    state.currentUser.xp +=
        Math.max(0, amount);

    checkLevelUp();

    saveCurrentUser();

    renderProfileData();
}


function getRequiredXP(level) {

    return 100 + ((level - 1) * 75);
}


function checkLevelUp() {

    if (!state.currentUser) {
        return;
    }

    let leveledUp = false;

    while (
        state.currentUser.xp >=
        getRequiredXP(state.currentUser.level)
    ) {

        state.currentUser.xp -=
            getRequiredXP(
                state.currentUser.level
            );

        state.currentUser.level++;

        leveledUp = true;
    }

    if (leveledUp) {

        playSound("success");

        showToast(
            `تبریک! به سطح ${formatNumber(state.currentUser.level)} رسیدید.`,
            "success"
        );

        addNotification(
            "ارتقای سطح",
            `شما به سطح ${state.currentUser.level} رسیدید.`,
            "level"
        );
    }
}


/* =========================================================
   26. COINS
   ========================================================= */

function addCoins(amount) {

    if (!state.currentUser) {
        return;
    }

    state.currentUser.coins =
        Math.max(
            0,
            state.currentUser.coins +
            amount
        );

    saveCurrentUser();

    renderProfileData();
}


function spendCoins(amount) {

    if (!state.currentUser) {
        return false;
    }

    if (
        state.currentUser.coins <
        amount
    ) {

        showToast(
            "سکه کافی ندارید.",
            "warning"
        );

        return false;
    }

    state.currentUser.coins -= amount;

    saveCurrentUser();

    renderProfileData();

    return true;
}


/* =========================================================
   27. NAVIGATION
   ========================================================= */

function navigateToPage(pageName) {

    const pages =
        $all(".page");

    pages.forEach(page => {

        page.classList.add("hidden");

        page.classList.remove(
            "active-page"
        );
    });


    const target =
        document.querySelector(
            `[data-page="${pageName}"]`
        );


    if (target) {

        target.classList.remove(
            "hidden"
        );

        target.classList.add(
            "active-page"
        );

        state.currentPage =
            pageName;
    }


    updateNavigation(pageName);

    renderPage(pageName);
}


function updateNavigation(pageName) {

    $all(".nav-item").forEach(item => {

        item.classList.remove("active");

        if (
            item.dataset.pageTarget ===
            pageName
        ) {

            item.classList.add("active");
        }
    });
}


function renderPage(pageName) {

    switch (pageName) {

        case "home":
            renderHome();
            break;

        case "friends":
            renderFriends();
            break;

        case "leaderboard":
            renderLeaderboard();
            break;

        case "profile":
            renderProfile();
            break;

        case "shop":
            renderShop();
            break;

        case "history":
            renderHistory();
            break;

        case "missions":
            renderMissions();
            break;

        case "notifications":
            renderNotifications();
            break;

        case "settings":
            renderSettings();
            break;

        case "room":
            renderRoom();
            break;

        case "game":
            renderGame();
            break;

        default:
            break;
    }
}


/* =========================================================
   28. HOME RENDER
   ========================================================= */

function renderHome() {

    if (!state.currentUser) {
        return;
    }

    const username =
        state.currentUser.username;

    const level =
        state.currentUser.level;

    const coins =
        state.currentUser.coins;

    if ($("home-username")) {
        $("home-username").textContent =
            username;
    }

    if ($("home-level")) {
        $("home-level").textContent =
            formatNumber(level);
    }

    if ($("home-coins")) {
        $("home-coins").textContent =
            formatNumber(coins);
    }


    const requiredXP =
        getRequiredXP(level);

    const currentXP =
        state.currentUser.xp;

    const percentage =
        requiredXP > 0
            ? (currentXP / requiredXP) * 100
            : 0;


    if ($("current-xp")) {
        $("current-xp").textContent =
            formatNumber(currentXP);
    }

    if ($("next-level-xp")) {
        $("next-level-xp").textContent =
            formatNumber(requiredXP);
    }

    if ($("xp-progress")) {

        $("xp-progress").style.width =
            `${clamp(percentage, 0, 100)}%`;
    }


    renderDailyMissionSummary();

    renderRecentGames();
}


/* =========================================================
   29. PROFILE RENDER
   ========================================================= */

function renderProfileData() {

    if (!state.currentUser) {
        return;
    }

    const user =
        state.currentUser;


    const mappings = {

        "header-username":
            user.username,

        "header-level":
            `سطح ${user.level}`,

        "home-username":
            user.username,

        "home-level":
            String(user.level),

        "home-coins":
            formatNumber(user.coins),

        "shop-coins":
            formatNumber(user.coins),

        "profile-username":
            user.username,

        "profile-user-id":
            `ID: ${user.id}`,

        "profile-level":
            String(user.level),

        "stat-games":
            String(user.games),

        "stat-wins":
            String(user.wins),

        "stat-losses":
            String(user.losses),

        "stat-win-rate":
            calculateWinRate(user) + "%"
    };


    Object.entries(mappings).forEach(
        ([id, value]) => {

            const element = $(id);

            if (element) {
                element.textContent =
                    value;
            }
        }
    );


    const avatars = [
        $("header-avatar"),
        $("profile-avatar")
    ];


    avatars.forEach(element => {

        if (element) {
            element.textContent =
                user.avatar || "👤";
        }
    });
}


function calculateWinRate(user) {

    if (!user.games) {
        return "0";
    }

    return (
        (user.wins / user.games) *
        100
    ).toFixed(1);
}


function renderProfile() {

    renderProfileData();

    renderAchievements();
}


/* =========================================================
   30. HEADER
   ========================================================= */

function renderHeader() {

    if (!state.currentUser) {
        return;
    }

    const user =
        state.currentUser;

    if ($("header-username")) {
        $("header-username").textContent =
            user.username;
    }

    if ($("header-level")) {
        $("header-level").textContent =
            `سطح ${user.level}`;
    }

    if ($("header-avatar")) {
        $("header-avatar").textContent =
            user.avatar || "👤";
    }

    updateNotificationBadge();
}


/* =========================================================
   31. DAILY MISSIONS
   ========================================================= */

function initializeMissions() {

    if (
        !state.missions ||
        !Array.isArray(state.missions.daily) ||
        state.missions.daily.length === 0
    ) {

        state.missions = {

            daily: [
                {
                    id: "daily_play",
                    title: "یک بازی حکم انجام بده",
                    description: "یک بازی کامل انجام دهید.",
                    target: 1,
                    progress: 0,
                    rewardCoins: 100,
                    rewardXP: 30,
                    completed: false
                },

                {
                    id: "daily_tricks",
                    title: "۵ دست برنده شو",
                    description: "در مجموع ۵ تریک را ببرید.",
                    target: 5,
                    progress: 0,
                    rewardCoins: 150,
                    rewardXP: 50,
                    completed: false
                },

                {
                    id: "daily_cards",
                    title: "۲۰ کارت بازی کن",
                    description: "۲۰ کارت را در بازی استفاده کنید.",
                    target: 20,
                    progress: 0,
                    rewardCoins: 80,
                    rewardXP: 25,
                    completed: false
                }
            ],

            weekly: [
                {
                    id: "weekly_games",
                    title: "۱۰ بازی انجام بده",
                    description: "در طول هفته ۱۰ بازی انجام دهید.",
                    target: 10,
                    progress: 0,
                    rewardCoins: 500,
                    rewardXP: 200,
                    completed: false
                },

                {
                    id: "weekly_wins",
                    title: "۵ بازی را ببر",
                    description: "۵ پیروزی در هفته.",
                    target: 5,
                    progress: 0,
                    rewardCoins: 750,
                    rewardXP: 250,
                    completed: false
                }
            ]
        };

        saveJSON(
            APP_CONFIG.storageKeys.missions,
            state.missions
        );
    }
}


function updateMissionProgress(
    missionId,
    amount = 1
) {

    const categories = [
        "daily",
        "weekly"
    ];

    categories.forEach(category => {

        const missions =
            state.missions[category] || [];

        const mission =
            missions.find(
                item =>
                    item.id === missionId
            );

        if (!mission || mission.completed) {
            return;
        }

        mission.progress =
            Math.min(
                mission.target,
                mission.progress + amount
            );

        if (
            mission.progress >=
            mission.target
        ) {

            mission.completed = true;

            addNotification(
                "مأموریت تکمیل شد",
                mission.title,
                "mission"
            );

            showToast(
                `مأموریت «${mission.title}» تکمیل شد.`,
                "success"
            );

            addCoins(
                mission.rewardCoins
            );

            addXP(
                mission.rewardXP
            );
        }
    });

    saveJSON(
        APP_CONFIG.storageKeys.missions,
        state.missions
    );
}


function renderDailyMissionSummary() {

    const mission =
        state.missions.daily.find(
            item => !item.completed
        ) ||
        state.missions.daily[0];

    if (!mission) {
        return;
    }

    if ($("daily-mission-title")) {
        $("daily-mission-title").textContent =
            mission.title;
    }

    if ($("daily-mission-count")) {

        $("daily-mission-count").textContent =
            `${formatNumber(mission.progress)}/${formatNumber(mission.target)}`;
    }

    if ($("daily-mission-progress")) {

        const percent =
            mission.target
                ? (mission.progress / mission.target) * 100
                : 0;

        $("daily-mission-progress")
            .style.width =
            `${clamp(percent, 0, 100)}%`;
    }
}


function renderMissions() {

    renderMissionList(
        "daily-missions",
        state.missions.daily
    );

    renderMissionList(
        "weekly-missions",
        state.missions.weekly
    );
}


function renderMissionList(
    containerId,
    missions
) {

    const container =
        $(containerId);

    if (!container) {
        return;
    }

    if (!missions.length) {

        container.innerHTML =
            `<div class="empty-state">
                <p>مأموریتی وجود ندارد.</p>
            </div>`;

        return;
    }


    container.innerHTML =
        missions.map(mission => {

            const percentage =
                mission.target
                    ? (
                        mission.progress /
                        mission.target
                    ) * 100
                    : 0;

            return `
                <div class="mission-item ${mission.completed ? "completed" : ""}">

                    <div class="mission-item-header">

                        <strong>
                            ${escapeHTML(mission.title)}
                        </strong>

                        <span>
                            ${mission.completed ? "✓ تکمیل شد" : `${formatNumber(mission.progress)}/${formatNumber(mission.target)}`}
                        </span>

                    </div>

                    <p>
                        ${escapeHTML(mission.description)}
                    </p>

                    <div class="progress-bar">

                        <div
                            class="progress-fill"
                            style="width:${clamp(percentage, 0, 100)}%"
                        ></div>

                    </div>

                    <div class="mission-reward">

                        <span>
                            🪙 +${formatNumber(mission.rewardCoins)}
                        </span>

                        <span>
                            ⭐ +${formatNumber(mission.rewardXP)} XP
                        </span>

                    </div>

                </div>
            `;
        }).join("");
}


/* =========================================================
   32. RECENT GAMES
   ========================================================= */

function getGameHistory() {

    return loadJSON(
        APP_CONFIG.storageKeys.games,
        []
    );
}


function saveGameHistory(games) {

    saveJSON(
        APP_CONFIG.storageKeys.games,
        games
    );
}


function renderRecentGames() {

    const container =
        $("recent-games-list");

    if (!container) {
        return;
    }

    const games =
        getGameHistory()
            .slice(0, 5);

    if (!games.length) {

        container.innerHTML =
            `<div class="empty-state">

                <span class="empty-icon">
                    🃏
                </span>

                <p>
                    هنوز بازی‌ای انجام نداده‌اید
                </p>

                <small>
                    اولین بازی خود را شروع کنید
                </small>

            </div>`;

        return;
    }


    container.innerHTML =
        games.map(game => {

            const won =
                game.winnerTeam === 0;

            return `
                <div class="recent-game-item">

                    <div class="recent-game-icon">
                        ${won ? "🏆" : "🃏"}
                    </div>

                    <div class="recent-game-info">

                        <strong>
                            ${won ? "پیروزی" : "شکست"}
                        </strong>

                        <small>
                            ${formatDate(game.finishedAt)}
                        </small>

                    </div>

                    <div class="recent-game-score">
                        ${formatNumber(game.teamScore?.[0] || 0)}
                        :
                        ${formatNumber(game.teamScore?.[1] || 0)}
                    </div>

                </div>
            `;

        }).join("");
}


function renderHistory() {

    const container =
        $("history-list");

    if (!container) {
        return;
    }

    const games =
        getGameHistory();

    if (!games.length) {

        container.innerHTML =
            `<div class="empty-state">

                <span class="empty-icon">
                    📜
                </span>

                <p>
                    تاریخچه‌ای وجود ندارد
                </p>

            </div>`;

        return;
    }


    container.innerHTML =
        games.map(game => {

            const won =
                game.winnerTeam === 0;

            return `
                <div class="history-item">

                    <div class="history-result">
                        ${won ? "🏆" : "❌"}
                    </div>

                    <div class="history-info">

                        <strong>
                            ${won ? "برد" : "باخت"}
                        </strong>

                        <span>
                            ${formatDate(game.finishedAt)}
                        </span>

                    </div>

                    <div class="history-score">
                        ${game.teamScore?.[0] || 0}
                        :
                        ${game.teamScore?.[1] || 0}
                    </div>

                </div>
            `;
        }).join("");
}


/* =========================================================
   33. SHOP
   ========================================================= */

const SHOP_ITEMS = [

    {
        id: "coins_500",
        category: "coins",
        name: "۵۰۰ سکه",
        description: "افزایش موجودی سکه",
        icon: "🪙",
        price: 0,
        rewardCoins: 500
    },

    {
        id: "coins_1000",
        category: "coins",
        name: "۱۰۰۰ سکه",
        description: "بسته سکه",
        icon: "💰",
        price: 0,
        rewardCoins: 1000
    },

    {
        id: "avatar_gold",
        category: "avatars",
        name: "آواتار طلایی",
        description: "آواتار ویژه",
        icon: "👑",
        price: 500,
        rewardCoins: 0
    },

    {
        id: "avatar_fire",
        category: "avatars",
        name: "آواتار آتش",
        description: "آواتار ویژه",
        icon: "🔥",
        price: 750,
        rewardCoins: 0
    },

    {
        id: "card_style",
        category: "items",
        name: "پوسته کارت ویژه",
        description: "ظاهر ویژه کارت‌ها",
        icon: "🃏",
        price: 1000,
        rewardCoins: 0
    }
];


function renderShop(category = "coins") {

    const container =
        $("shop-content");

    if (!container) {
        return;
    }

    const items =
        SHOP_ITEMS.filter(
            item =>
                item.category === category
        );


    container.innerHTML =
        items.map(item => {

            const freeCoinPackage =
                item.category === "coins";

            return `
                <div class="shop-item-card">

                    <div class="shop-item-icon">
                        ${item.icon}
                    </div>

                    <div class="shop-item-info">

                        <strong>
                            ${escapeHTML(item.name)}
                        </strong>

                        <small>
                            ${escapeHTML(item.description)}
                        </small>

                    </div>

                    <button
                        type="button"
                        class="shop-buy-button"
                        data-shop-item="${item.id}"
                    >
                        ${
                            freeCoinPackage
                                ? "دریافت"
                                : `🪙 ${formatNumber(item.price)}`
                        }
                    </button>

                </div>
            `;
        }).join("");
}


function purchaseShopItem(itemId) {

    const item =
        SHOP_ITEMS.find(
            shopItem =>
                shopItem.id === itemId
        );

    if (!item) {
        return;
    }


    if (item.category === "coins") {

        addCoins(item.rewardCoins);

        showToast(
            `${formatNumber(item.rewardCoins)} سکه دریافت کردید.`,
            "success"
        );

        return;
    }


    if (!spendCoins(item.price)) {
        return;
    }


    if (!Array.isArray(state.currentUser.inventory)) {
        state.currentUser.inventory = [];
    }


    if (
        state.currentUser.inventory.includes(
            item.id
        )
    ) {

        showToast(
            "این آیتم را قبلاً دارید.",
            "info"
        );

        addCoins(item.price);

        return;
    }


    state.currentUser.inventory.push(
        item.id
    );

    saveCurrentUser();

    showToast(
        "آیتم با موفقیت خریداری شد.",
        "success"
    );
}


/* =========================================================
   34. FRIENDS
   ========================================================= */

function renderFriends() {

    const container =
        $("friends-list");

    if (!container) {
        return;
    }

    if (!state.friends.length) {

        container.innerHTML =
            `<div class="empty-state">

                <span class="empty-icon">
                    👥
                </span>

                <p>
                    هنوز دوستی ندارید
                </p>

                <small>
                    دوستان خود را پیدا کنید و به بازی دعوتشان کنید
                </small>

            </div>`;

        return;
    }


    container.innerHTML =
        state.friends.map(friend => {

            return `
                <div class="friend-item">

                    <div class="friend-avatar">
                        ${escapeHTML(friend.avatar || "👤")}
                    </div>

                    <div class="friend-info">

                        <strong>
                            ${escapeHTML(friend.username)}
                        </strong>

                        <small>
                            ${
                                friend.online
                                    ? "آنلاین"
                                    : "آفلاین"
                            }
                        </small>

                    </div>

                    <button
                        type="button"
                        class="small-button invite-friend-button"
                        data-friend-id="${friend.id}"
                    >
                        دعوت
                    </button>

                </div>
            `;
        }).join("");
}


function addFriendByUsername(username) {

    const value =
        username.trim();

    if (!value) {
        return;
    }

    if (!state.currentUser) {
        return;
    }

    const found =
        state.users.find(
            user =>
                user.username.toLowerCase() ===
                value.toLowerCase()
        );

    if (!found) {

        showToast(
            "بازیکنی با این نام پیدا نشد.",
            "warning"
        );

        return;
    }

    if (
        found.id ===
        state.currentUser.id
    ) {

        showToast(
            "نمی‌توانید خودتان را اضافه کنید.",
            "warning"
        );

        return;
    }

    if (
        state.friends.some(
            friend =>
                friend.id === found.id
        )
    ) {

        showToast(
            "این بازیکن قبلاً در لیست دوستان شماست.",
            "info"
        );

        return;
    }


    state.friends.push({
        id: found.id,
        username: found.username,
        avatar: found.avatar,
        online: false
    });


    saveJSON(
        APP_CONFIG.storageKeys.friends,
        state.friends
    );

    renderFriends();

    showToast(
        "بازیکن به دوستان شما اضافه شد.",
        "success"
    );
}


/* =========================================================
   35. LEADERBOARD
   ========================================================= */

function renderLeaderboard() {

    const container =
        $("leaderboard-list");

    if (!container) {
        return;
    }

    const users =
        [...state.users];

    users.sort(
        (a, b) => {

            const aScore =
                (a.wins * 10) +
                (a.level * 5);

            const bScore =
                (b.wins * 10) +
                (b.level * 5);

            return bScore - aScore;
        }
    );


    const topUsers =
        users.slice(0, 50);


    if (!topUsers.length) {

        container.innerHTML =
            `<div class="empty-state">
                <p>هنوز بازیکنی وجود ندارد.</p>
            </div>`;

        return;
    }


    container.innerHTML =
        topUsers.map(
            (user, index) => {

                return `
                    <div class="leaderboard-item">

                        <div class="leaderboard-rank">
                            ${formatNumber(index + 1)}
                        </div>

                        <div class="leaderboard-avatar">
                            ${escapeHTML(user.avatar || "👤")}
                        </div>

                        <div class="leaderboard-user">

                            <strong>
                                ${escapeHTML(user.username)}
                            </strong>

                            <small>
                                سطح ${formatNumber(user.level)}
                            </small>

                        </div>

                        <div class="leaderboard-score">
                            ${formatNumber(user.wins)}
                            برد
                        </div>

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   36. ACHIEVEMENTS
   ========================================================= */

const ACHIEVEMENTS = [

    {
        id: "first_game",
        title: "اولین بازی",
        description: "اولین بازی خود را انجام دهید.",
        icon: "🎮"
    },

    {
        id: "first_win",
        title: "اولین پیروزی",
        description: "اولین بازی خود را ببرید.",
        icon: "🏆"
    },

    {
        id: "ten_games",
        title: "بازیکن فعال",
        description: "۱۰ بازی انجام دهید.",
        icon: "🔥"
    },

    {
        id: "ten_wins",
        title: "حریف قدرتمند",
        description: "۱۰ بازی را ببرید.",
        icon: "👑"
    }
];


function renderAchievements() {

    const container =
        $("achievement-list");

    if (!container) {
        return;
    }

    const unlocked =
        state.currentUser?.achievements || [];


    container.innerHTML =
        ACHIEVEMENTS.map(
            achievement => {

                const active =
                    unlocked.includes(
                        achievement.id
                    );

                return `
                    <div
                        class="achievement-item ${active ? "unlocked" : "locked"}"
                    >

                        <span class="achievement-icon">
                            ${achievement.icon}
                        </span>

                        <div>

                            <strong>
                                ${escapeHTML(achievement.title)}
                            </strong>

                            <small>
                                ${escapeHTML(achievement.description)}
                            </small>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


function unlockAchievement(id) {

    if (!state.currentUser) {
        return;
    }

    if (
        !Array.isArray(
            state.currentUser.achievements
        )
    ) {
        state.currentUser.achievements = [];
    }

    if (
        state.currentUser.achievements.includes(id)
    ) {
        return;
    }

    const achievement =
        ACHIEVEMENTS.find(
            item => item.id === id
        );

    if (!achievement) {
        return;
    }

    state.currentUser.achievements.push(id);

    saveCurrentUser();

    showToast(
        `افتخار جدید: ${achievement.title}`,
        "success"
    );

    addNotification(
        "افتخار جدید",
        achievement.title,
        "achievement"
    );
}


function checkAchievements() {

    if (!state.currentUser) {
        return;
    }

    if (
        state.currentUser.games >= 1
    ) {
        unlockAchievement("first_game");
    }

    if (
        state.currentUser.wins >= 1
    ) {
        unlockAchievement("first_win");
    }

    if (
        state.currentUser.games >= 10
    ) {
        unlockAchievement("ten_games");
    }

    if (
        state.currentUser.wins >= 10
    ) {
        unlockAchievement("ten_wins");
    }
}


/* =========================================================
   37. NOTIFICATIONS
   ========================================================= */

function createWelcomeNotification() {

    addNotification(
        "خوش آمدید",
        "به بازی حکم خوش آمدید!",
        "welcome"
    );
}


function addNotification(
    title,
    message,
    type = "info"
) {

    const notification = {

        id: generateId("notification"),

        title,

        message,

        type,

        read: false,

        createdAt: Date.now()
    };


    state.notifications.unshift(
        notification
    );

    state.notifications =
        state.notifications.slice(
            0,
            100
        );


    saveJSON(
        APP_CONFIG.storageKeys.notifications,
        state.notifications
    );

    updateNotificationBadge();
}


function renderNotifications() {

    const container =
        $("notifications-list");

    if (!container) {
        return;
    }


    if (!state.notifications.length) {

        container.innerHTML =
            `<div class="empty-state">

                <span class="empty-icon">
                    🔔
                </span>

                <p>
                    اعلان جدیدی ندارید
                </p>

            </div>`;

        return;
    }


    container.innerHTML =
        state.notifications.map(
            notification => {

                return `
                    <div
                        class="notification-item ${notification.read ? "read" : "unread"}"
                        data-notification-id="${notification.id}"
                    >

                        <div class="notification-icon">
                            🔔
                        </div>

                        <div class="notification-content">

                            <strong>
                                ${escapeHTML(notification.title)}
                            </strong>

                            <p>
                                ${escapeHTML(notification.message)}
                            </p>

                            <small>
                                ${formatDate(notification.createdAt)}
                            </small>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


function markAllNotificationsRead() {

    state.notifications.forEach(
        notification => {
            notification.read = true;
        }
    );

    saveJSON(
        APP_CONFIG.storageKeys.notifications,
        state.notifications
    );

    renderNotifications();

    updateNotificationBadge();

    showToast(
        "همه اعلان‌ها خوانده شدند.",
        "success"
    );
}


function updateNotificationBadge() {

    const badge =
        $("notification-badge");

    if (!badge) {
        return;
    }

    const unread =
        state.notifications.filter(
            notification =>
                !notification.read
        ).length;


    badge.textContent =
        formatNumber(unread);


    if (unread > 0) {

        badge.classList.remove(
            "hidden"
        );

    } else {

        badge.classList.add(
            "hidden"
        );
    }
}


/* =========================================================
   38. SETTINGS
   ========================================================= */

function renderSettings() {

    if ($("sound-setting")) {
        $("sound-setting").checked =
            state.settings.sound;
    }

    if ($("music-setting")) {
        $("music-setting").checked =
            state.settings.music;
    }

    if ($("vibration-setting")) {
        $("vibration-setting").checked =
            state.settings.vibration;
    }

    if ($("dark-mode-setting")) {
        $("dark-mode-setting").checked =
            state.settings.darkMode;
    }
}


function updateSetting(
    key,
    value
) {

    state.settings[key] =
        Boolean(value);

    saveJSON(
        APP_CONFIG.storageKeys.settings,
        state.settings
    );

    applySettings();
}


function applySettings() {

    document.documentElement
        .dataset.theme =
        state.settings.darkMode
            ? "dark"
            : "light";

    document.body.classList.toggle(
        "light-theme",
        !state.settings.darkMode
    );
}


/* =========================================================
   39. ROOM SYSTEM
   ========================================================= */

function createRoom() {

    if (!state.currentUser) {
        return;
    }

    const roomName =
        $("room-name-input")?.value.trim() ||
        "اتاق حکم";


    const code =
        generateRoomCode();


    state.room = {

        id: generateId("room"),

        code,

        name: roomName,

        hostId: state.currentUser.id,

        private:
            $("room-private-setting")
                ?.checked ?? true,

        players: [
            {
                id: state.currentUser.id,
                username: state.currentUser.username,
                avatar: state.currentUser.avatar,
                ready: false,
                seat: 0
            }
        ],

        createdAt: Date.now(),

        status: "waiting"
    };


    saveJSON(
        APP_CONFIG.storageKeys.room,
        state.room
    );


    closeModal(
        "create-room-modal"
    );

    navigateToPage("room");

    showToast(
        `اتاق ${code} ساخته شد.`,
        "success"
    );
}


function generateRoomCode() {

    const letters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ";

    let code = "";

    for (let i = 0; i < 6; i++) {

        code +=
            letters[
                randomNumber(
                    0,
                    letters.length - 1
                )
            ];
    }

    return code;
}


function renderRoom() {

    if (!state.room) {
        return;
    }

    if ($("room-code")) {
        $("room-code").textContent =
            state.room.code;
    }

    if ($("room-status-text")) {

        $("room-status-text").textContent =
            state.room.status === "playing"
                ? "بازی در حال اجرا"
                : "در انتظار بازیکنان";
    }


    const slots =
        $all(
            ".room-player-slot"
        );


    slots.forEach(slot => {

        const seat =
            Number(
                slot.dataset.seat
            );

        const player =
            state.room.players.find(
                item =>
                    item.seat === seat
            );


        if (player) {

            slot.classList.remove(
                "empty-slot"
            );

            slot.innerHTML = `
                <div class="room-player-avatar">
                    ${escapeHTML(player.avatar || "👤")}
                </div>

                <strong>
                    ${escapeHTML(player.username)}
                </strong>

                <span class="player-ready">
                    ${player.ready ? "آماده" : "آماده نیست"}
                </span>
            `;

        } else {

            slot.classList.add(
                "empty-slot"
            );

            slot.innerHTML = `
                <div class="room-player-avatar">
                    +
                </div>

                <span>
                    انتظار بازیکن
                </span>
            `;
        }
