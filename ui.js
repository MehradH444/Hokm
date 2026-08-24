/* ============================================================
   HOKM ONLINE
   UI.JS
   مرحله ۱۰ پروژه
   ------------------------------------------------------------
   مسئولیت این فایل:
   - مدیریت کامل رابط کاربری
   - مدیریت صفحات
   - مدیریت مودال‌ها
   - Toast / پیام‌ها
   - وضعیت اتصال
   - Loading
   - اطلاعات بازیکن
   - نمایش کارت‌ها
   - نمایش بازیکنان میز
   - نمایش امتیازات
   - نمایش حکم
   - نمایش نوبت
   - فروشگاه
   - دوستان
   - رتبه‌بندی
   - پروفایل
   - تاریخچه
   - مأموریت‌ها
   - اعلان‌ها
   - تنظیمات
   - چت
   - نتیجه بازی
   - ابزارهای عمومی DOM
   ============================================================ */

"use strict";


/* ============================================================
   1. NAMESPACE
   ============================================================ */

window.HokmUI = window.HokmUI || {};


/* ============================================================
   2. CONSTANTS
   ============================================================ */

const UI_CONSTANTS = {

    DEFAULT_PAGE: "home",

    TOAST_DURATION: 3500,

    LOADING_MINIMUM_TIME: 500,

    ANIMATION_DURATION: 250,

    MAX_TOASTS: 5,

    MAX_CHAT_MESSAGES: 200,

    MAX_HISTORY_ITEMS: 100,

    MAX_NOTIFICATIONS: 100,

    MAX_FRIENDS: 500,

    MAX_LEADERBOARD_ITEMS: 100,

    DEFAULT_AVATAR: "👤",

    DEFAULT_USERNAME: "بازیکن",

    DEFAULT_LEVEL: 1,

    DEFAULT_COINS: 1000,

    DEFAULT_XP: 0,

    DEFAULT_NEXT_XP: 100,

    SUITS: {

        spades: {
            symbol: "♠",
            name: "پیک",
            color: "black"
        },

        hearts: {
            symbol: "♥",
            name: "دل",
            color: "red"
        },

        diamonds: {
            symbol: "♦",
            name: "خشت",
            color: "red"
        },

        clubs: {
            symbol: "♣",
            name: "گشنیز",
            color: "black"
        }

    },

    RANKS: {

        "2": "۲",
        "3": "۳",
        "4": "۴",
        "5": "۵",
        "6": "۶",
        "7": "۷",
        "8": "۸",
        "9": "۹",
        "10": "۱۰",
        "J": "سرباز",
        "Q": "بی‌بی",
        "K": "شاه",
        "A": "آس"

    }

};


/* ============================================================
   3. INTERNAL STATE
   ============================================================ */

const UIState = {

    initialized: false,

    currentPage: UI_CONSTANTS.DEFAULT_PAGE,

    previousPage: null,

    loading: true,

    loadingStartedAt: Date.now(),

    currentModal: null,

    modalHistory: [],

    chatOpen: false,

    connectionOnline: navigator.onLine,

    connectionVisible: false,

    currentUser: {

        id: null,

        username: UI_CONSTANTS.DEFAULT_USERNAME,

        email: "",

        avatar: UI_CONSTANTS.DEFAULT_AVATAR,

        level: UI_CONSTANTS.DEFAULT_LEVEL,

        xp: UI_CONSTANTS.DEFAULT_XP,

        nextLevelXp: UI_CONSTANTS.DEFAULT_NEXT_XP,

        coins: UI_CONSTANTS.DEFAULT_COINS,

        games: 0,

        wins: 0,

        losses: 0,

        winRate: 0,

        achievements: []

    },

    game: {

        active: false,

        roomId: null,

        round: 1,

        teamScore: 0,

        opponentScore: 0,

        trump: null,

        currentTurn: null,

        message: "",

        players: [],

        hand: [],

        playedCards: {},

        legalCards: [],

        tricks: 0

    },

    notifications: [],

    friends: [],

    friendRequests: [],

    leaderboard: [],

    history: [],

    dailyMissions: [],

    weeklyMissions: [],

    shopItems: [],

    settings: {

        sound: true,

        music: true,

        vibration: true,

        darkMode: true

    },

    toastCount: 0,

    listenersBound: false

};


/* ============================================================
   4. DOM CACHE
   ============================================================ */

const UI = {};


/* ============================================================
   5. DOM SELECTOR
   ============================================================ */

function $(selector, root = document) {

    if (!selector) {
        return null;
    }

    return root.querySelector(selector);
}


function $$(selector, root = document) {

    if (!selector) {
        return [];
    }

    return Array.from(root.querySelectorAll(selector));
}


/* ============================================================
   6. CACHE DOM ELEMENTS
   ============================================================ */

function cacheElements() {

    const ids = [

        "app",

        "loading-screen",
        "loading-spinner",
        "loading-message",

        "auth-screen",
        "login-panel",
        "register-panel",

        "main-screen",

        "page-container",

        "home-page",
        "room-page",
        "game-page",
        "shop-page",
        "friends-page",
        "leaderboard-page",
        "profile-page",
        "history-page",
        "missions-page",
        "notifications-page",
        "settings-page",

        "header-avatar",
        "header-username",
        "header-level",

        "home-username",
        "home-level",
        "home-coins",
        "current-xp",
        "next-level-xp",
        "xp-progress",

        "quick-match-modal",
        "create-room-modal",
        "trump-modal",
        "game-menu-modal",
        "confirmation-modal",
        "game-result-modal",

        "player-hand",

        "team-score",
        "opponent-score",
        "current-round",

        "trump-display",
        "trump-suit",

        "game-message",

        "game-player-name",
        "game-player-status",
        "game-turn-indicator",

        "shop-coins",
        "shop-content",

        "friend-search-input",
        "friends-list",
        "friend-request-badge",

        "leaderboard-list",

        "profile-avatar",
        "profile-username",
        "profile-user-id",
        "profile-level",

        "stat-games",
        "stat-wins",
        "stat-losses",
        "stat-win-rate",

        "achievement-list",

        "history-list",

        "daily-missions",
        "weekly-missions",

        "notifications-list",
        "notification-badge",

        "sound-setting",
        "music-setting",
        "vibration-setting",
        "dark-mode-setting",

        "chat-panel",
        "chat-messages",
        "chat-input",

        "toast-container",

        "connection-status",
        "connection-status-icon",
        "connection-status-text",

        "offline-notice",

        "aria-live-region"

    ];

    ids.forEach(id => {

        UI[id] = document.getElementById(id);

    });


    UI.pages = $$("[data-page]");

    UI.navItems = $$(".nav-item");

    UI.modals = $$(".modal-overlay");

    UI.shopTabs = $$(".shop-tab");

    UI.friendsTabs = $$(".friends-tab");

    UI.leaderboardTabs = $$(".leaderboard-tab");

    UI.suitButtons = $$(".suit-button");

    UI.modalOptions = $$(".modal-option");

}


/* ============================================================
   7. SAFE TEXT
   ============================================================ */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ============================================================
   8. FORMAT NUMBER
   ============================================================ */

function formatNumber(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "۰";
    }

    return number.toLocaleString("fa-IR");

}


/* ============================================================
   9. FORMAT DATE
   ============================================================ */

function formatDate(dateValue) {

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "fa-IR",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(date);

}


/* ============================================================
   10. FORMAT TIME
   ============================================================ */

function formatTime(dateValue) {

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "fa-IR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);

}


/* ============================================================
   11. SET TEXT
   ============================================================ */

function setText(element, value) {

    if (!element) {
        return;
    }

    element.textContent =
        value === null || value === undefined
            ? ""
            : String(value);

}


/* ============================================================
   12. SET HTML
   ============================================================ */

function setHTML(element, html) {

    if (!element) {
        return;
    }

    element.innerHTML = html || "";

}


/* ============================================================
   13. SHOW ELEMENT
   ============================================================ */

function show(element) {

    if (!element) {
        return;
    }

    element.classList.remove("hidden");

}


/* ============================================================
   14. HIDE ELEMENT
   ============================================================ */

function hide(element) {

    if (!element) {
        return;
    }

    element.classList.add("hidden");

}


/* ============================================================
   15. TOGGLE ELEMENT
   ============================================================ */

function toggle(element, visible) {

    if (!element) {
        return;
    }

    element.classList.toggle("hidden", !visible);

}


/* ============================================================
   16. SET ACTIVE
   ============================================================ */

function setActive(element, active = true) {

    if (!element) {
        return;
    }

    element.classList.toggle("active", active);

}


/* ============================================================
   17. LOADING SCREEN
   ============================================================ */

function showLoading(message = "در حال آماده‌سازی بازی...") {

    UIState.loading = true;

    if (UI["loading-screen"]) {
        show(UI["loading-screen"]);
    }

    setText(UI["loading-message"], message);

}


function hideLoading() {

    const elapsed =
        Date.now() - UIState.loadingStartedAt;

    const remaining =
        Math.max(
            0,
            UI_CONSTANTS.LOADING_MINIMUM_TIME - elapsed
        );

    setTimeout(() => {

        UIState.loading = false;

        hide(UI["loading-screen"]);

    }, remaining);

}


function setLoadingMessage(message) {

    setText(
        UI["loading-message"],
        message
    );

}


/* ============================================================
   18. SCREEN MANAGEMENT
   ============================================================ */

function showAuthScreen() {

    hide(UI["loading-screen"]);

    show(UI["auth-screen"]);

    hide(UI["main-screen"]);

}


function showMainScreen() {

    hide(UI["loading-screen"]);

    hide(UI["auth-screen"]);

    show(UI["main-screen"]);

    showPage(UIState.currentPage || "home");

}


/* ============================================================
   19. PAGE MANAGEMENT
   ============================================================ */

function showPage(pageName, options = {}) {

    if (!pageName) {
        pageName = UI_CONSTANTS.DEFAULT_PAGE;
    }

    const page = document.querySelector(
        `[data-page="${pageName}"]`
    );

    if (!page) {

        console.warn(
            "HokmUI: page not found:",
            pageName
        );

        return false;

    }


    UIState.previousPage =
        UIState.currentPage;

    UIState.currentPage =
        pageName;


    UI.pages.forEach(pageElement => {

        const isTarget =
            pageElement === page;

        pageElement.classList.toggle(
            "active-page",
            isTarget
        );

        pageElement.classList.toggle(
            "hidden",
            !isTarget
        );

    });


    UI.navItems.forEach(item => {

        const target =
            item.dataset.pageTarget;

        item.classList.toggle(
            "active",
            target === pageName
        );

    });


    if (!options.skipHistory) {

        try {

            history.replaceState(
                {
                    page: pageName
                },
                "",
                window.location.href
            );

        } catch (error) {

            console.warn(
                "HokmUI: history update failed.",
                error
            );

        }

    }


    if (typeof options.onShow === "function") {

        options.onShow(page);

    }


    return true;

}


function goBackPage() {

    if (
        UIState.previousPage &&
        UIState.previousPage !== UIState.currentPage
    ) {

        showPage(
            UIState.previousPage
        );

        return true;

    }

    return false;

}


/* ============================================================
   20. MODAL MANAGEMENT
   ============================================================ */

function openModal(modalId) {

    const modal =
        typeof modalId === "string"
            ? document.getElementById(modalId)
            : modalId;

    if (!modal) {
        return false;
    }


    if (
        UIState.currentModal &&
        UIState.currentModal !== modal.id
    ) {

        UIState.modalHistory.push(
            UIState.currentModal
        );

    }


    UIState.currentModal =
        modal.id;


    show(modal);

    document.body.classList.add(
        "modal-open"
    );


    const firstFocusable =
        modal.querySelector(
            "button, input, select, textarea, [tabindex]"
        );

    if (firstFocusable) {

        setTimeout(() => {

            try {
                firstFocusable.focus();
            } catch (_) {}

        }, 50);

    }


    return true;

}


function closeModal(modalId) {

    const modal =
        typeof modalId === "string"
            ? document.getElementById(modalId)
            : modalId;

    if (!modal) {
        return false;
    }


    hide(modal);


    if (
        UIState.currentModal === modal.id
    ) {

        UIState.currentModal = null;

    }


    if (
        !UI.modals.some(
            item => !item.classList.contains("hidden")
        )
    ) {

        document.body.classList.remove(
            "modal-open"
        );

    }


    return true;

}


function closeAllModals() {

    UI.modals.forEach(modal => {

        hide(modal);

    });

    UIState.currentModal = null;

    UIState.modalHistory = [];

    document.body.classList.remove(
        "modal-open"
    );

}


/* ============================================================
   21. CONFIRMATION MODAL
   ============================================================ */

let confirmationCallback = null;


function showConfirmation(options = {}) {

    const {

        title = "تأیید",

        message = "آیا مطمئن هستید؟",

        icon = "⚠️",

        confirmText = "تأیید",

        cancelText = "انصراف",

        danger = false,

        onConfirm = null,

        onCancel = null

    } = options;


    setText(
        UI["confirmation-title"],
        title
    );

    setText(
        UI["confirmation-message"],
        message
    );

    setText(
        UI["confirmation-icon"],
        icon
    );


    const confirmButton =
        UI["confirmation-confirm"];

    const cancelButton =
        UI["confirmation-cancel"];


    setText(
        confirmButton,
        confirmText
    );

    setText(
        cancelButton,
        cancelText
    );


    if (confirmButton) {

        confirmButton.classList.toggle(
            "danger-button",
            Boolean(danger)
        );

    }


    confirmationCallback = {

        onConfirm,

        onCancel

    };


    openModal(
        "confirmation-modal"
    );

}


/* ============================================================
   22. TOAST SYSTEM
   ============================================================ */

function showToast(
    message,
    type = "info",
    duration = UI_CONSTANTS.TOAST_DURATION
) {

    if (!UI["toast-container"]) {
        return null;
    }


    if (
        UIState.toastCount >=
        UI_CONSTANTS.MAX_TOASTS
    ) {

        const oldest =
            UI["toast-container"].firstElementChild;

        if (oldest) {

            oldest.remove();

            UIState.toastCount--;

        }

    }


    const toast =
        document.createElement("div");

    toast.className =
        `toast toast-${type}`;


    const iconMap = {

        success: "✓",

        error: "✕",

        warning: "⚠",

        info: "ℹ",

        coins: "🪙",

        xp: "⭐"

    };


    const icon =
        iconMap[type] || iconMap.info;


    toast.innerHTML = `

        <span class="toast-icon">
            ${escapeHTML(icon)}
        </span>

        <span class="toast-message">
            ${escapeHTML(message)}
        </span>

        <button
            type="button"
            class="toast-close"
            aria-label="بستن"
        >
            ×
        </button>

    `;


    const closeButton =
        toast.querySelector(
            ".toast-close"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => removeToast(toast)
        );

    }


    UI["toast-container"].appendChild(
        toast
    );

    UIState.toastCount++;


    requestAnimationFrame(() => {

        toast.classList.add(
            "toast-visible"
        );

    });


    const timeout =
        setTimeout(
            () => removeToast(toast),
            duration
        );


    toast.dataset.timeout =
        String(timeout);


    return toast;

}


function removeToast(toast) {

    if (!toast) {
        return;
    }


    const timeout =
        Number(toast.dataset.timeout);

    if (timeout) {

        clearTimeout(timeout);

    }


    toast.classList.remove(
        "toast-visible"
    );


    setTimeout(() => {

        if (toast.parentNode) {

            toast.remove();

            UIState.toastCount =
                Math.max(
                    0,
                    UIState.toastCount - 1
                );

        }

    }, UI_CONSTANTS.ANIMATION_DURATION);

}


/* ============================================================
   23. ARIA LIVE MESSAGE
   ============================================================ */

function announce(message) {

    setText(
        UI["aria-live-region"],
        message
    );

}


/* ============================================================
   24. CONNECTION STATUS
   ============================================================ */

function updateConnectionStatus(
    online,
    options = {}
) {

    UIState.connectionOnline =
        Boolean(online);


    if (online) {

        setText(
            UI["connection-status-icon"],
            "●"
        );

        setText(
            UI["connection-status-text"],
            options.text || "متصل"
        );

        UI["connection-status"]
            ?.classList.remove(
                "connection-offline"
            );

        hide(UI["offline-notice"]);


    } else {

        setText(
            UI["connection-status-icon"],
            "●"
        );

        setText(
            UI["connection-status-text"],
            options.text || "بدون اتصال"
        );

        UI["connection-status"]
            ?.classList.add(
                "connection-offline"
            );

        show(UI["offline-notice"]);

    }


    if (options.visible) {

        show(UI["connection-status"]);

        UIState.connectionVisible =
            true;

    }


    announce(
        online
            ? "اتصال اینترنت برقرار شد."
            : "اتصال اینترنت قطع شد."
    );

}


/* ============================================================
   25. USER DATA
   ============================================================ */

function setCurrentUser(user = {}) {

    UIState.currentUser = {

        ...UIState.currentUser,

        ...user

    };


    renderCurrentUser();

}


function renderCurrentUser() {

    const user =
        UIState.currentUser;


    setText(
        UI["header-username"],
        user.username
    );

    setText(
        UI["header-level"],
        `سطح ${formatNumber(user.level)}`
    );


    setText(
        UI["home-username"],
        user.username
    );

    setText(
        UI["home-level"],
        formatNumber(user.level)
    );


    setText(
        UI["home-coins"],
        formatNumber(user.coins)
    );


    setText(
        UI["shop-coins"],
        formatNumber(user.coins)
    );


    setText(
        UI["current-xp"],
        formatNumber(user.xp)
    );

    setText(
        UI["next-level-xp"],
        formatNumber(user.nextLevelXp)
    );


    const percentage =
        user.nextLevelXp > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    (user.xp /
                        user.nextLevelXp) *
                    100
                )
            )
            : 0;


    if (UI["xp-progress"]) {

        UI["xp-progress"].style.width =
            `${percentage}%`;

    }


    setText(
        UI["profile-username"],
        user.username
    );


    setText(
        UI["profile-level"],
        formatNumber(user.level)
    );


    setText(
        UI["profile-user-id"],
        user.id
            ? `ID: ${user.id}`
            : "ID: --------"
    );


    setText(
        UI["stat-games"],
        formatNumber(user.games)
    );

    setText(
        UI["stat-wins"],
        formatNumber(user.wins)
    );

    setText(
        UI["stat-losses"],
        formatNumber(user.losses)
    );


    const calculatedWinRate =
        user.games > 0
            ? Math.round(
                (user.wins /
                    user.games) *
                100
            )
            : 0;


    setText(
        UI["stat-win-rate"],
        `${formatNumber(
            user.winRate ?? calculatedWinRate
        )}%`
    );


    setText(
        UI["header-avatar"],
        user.avatar ||
        UI_CONSTANTS.DEFAULT_AVATAR
    );


    setText(
        UI["profile-avatar"],
        user.avatar ||
        UI_CONSTANTS.DEFAULT_AVATAR
    );

}


/* ============================================================
   26. UPDATE COINS
   ============================================================ */

function updateCoins(amount) {

    const value =
        Number(amount);

    if (!Number.isFinite(value)) {
        return;
    }


    UIState.currentUser.coins =
        Math.max(
            0,
            value
        );


    renderCurrentUser();

}


/* ============================================================
   27. ADD COINS
   ============================================================ */

function addCoins(amount) {

    const value =
        Number(amount);

    if (!Number.isFinite(value)) {
        return;
    }


    updateCoins(
        UIState.currentUser.coins +
        value
    );

}


/* ============================================================
   28. XP
   ============================================================ */

function updateXP(
    xp,
    nextLevelXp = UIState.currentUser.nextLevelXp,
    level = UIState.currentUser.level
) {

    UIState.currentUser.xp =
        Math.max(0, Number(xp) || 0);

    UIState.currentUser.nextLevelXp =
        Math.max(
            1,
            Number(nextLevelXp) || 100
        );

    UIState.currentUser.level =
        Math.max(
            1,
            Number(level) || 1
        );


    renderCurrentUser();

}


/* ============================================================
   29. PLAYER AVATAR
   ============================================================ */

function setAvatar(avatar) {

    const value =
        avatar || UI_CONSTANTS.DEFAULT_AVATAR;

    setText(
        UI["header-avatar"],
        value
    );

    setText(
        UI["profile-avatar"],
        value
    );

    setText(
        UI["summary-avatar"],
        value
    );

}


/* ============================================================
   30. GAME STATE
   ============================================================ */

function setGameState(game = {}) {

    UIState.game = {

        ...UIState.game,

        ...game

    };


    renderGame();

}


/* ============================================================
   31. RENDER GAME
   ============================================================ */

function renderGame() {

    const game =
        UIState.game;


    setText(
        UI["team-score"],
        formatNumber(game.teamScore)
    );

    setText(
        UI["opponent-score"],
        formatNumber(game.opponentScore)
    );


    setText(
        UI["current-round"],
        formatNumber(game.round)
    );


    if (game.trump) {

        show(UI["trump-display"]);

        renderTrump(
            game.trump
        );

    } else {

        hide(UI["trump-display"]);

    }


    renderGamePlayers(
        game.players
    );


    renderPlayerHand(
        game.hand,
        game.legalCards
    );


    if (game.message) {

        showGameMessage(
            game.message
        );

    }


    updateTurnIndicator(
        game.currentTurn
    );


    renderPlayedCards(
        game.playedCards
    );

}


/* ============================================================
   32. TRUMP
   ============================================================ */

function renderTrump(suit) {

    const data =
        UI_CONSTANTS.SUITS[suit];


    if (!data) {
        return;
    }


    setText(
        UI["trump-suit"],
        data.symbol
    );


    if (UI["trump-suit"]) {

        UI["trump-suit"].dataset.suit =
            suit;

    }

}


function setTrump(suit) {

    UIState.game.trump =
        suit;

    renderTrump(suit);

    show(UI["trump-display"]);

}


/* ============================================================
   33. GAME MESSAGE
   ============================================================ */

function showGameMessage(
    message,
    duration = 0
) {

    setText(
        UI["game-message"],
        message
    );

    show(UI["game-message"]);


    announce(message);


    if (duration > 0) {

        setTimeout(
            () => hideGameMessage(),
            duration
        );

    }

}


function hideGameMessage() {

    hide(
        UI["game-message"]
    );

}


/* ============================================================
   34. GAME PLAYERS
   ============================================================ */

function renderGamePlayers(players = []) {

    if (!Array.isArray(players)) {
        return;
    }


    const positionMap = {

        top: UI["player-top"],

        right: UI["player-right"],

        left: UI["player-left"],

        bottom: UI["player-bottom"]

    };


    players.forEach(player => {

        if (!player) {
            return;
        }


        const element =
            positionMap[player.position];

        if (!element) {
            return;
        }


        const nameElement =
            element.querySelector(
                ".player-name"
            );

        const statusElement =
            element.querySelector(
                ".player-status"
            );

        const avatarElement =
            element.querySelector(
                ".game-player-avatar"
            );


        setText(
            nameElement,
            player.username ||
            player.name ||
            "بازیکن"
        );


        setText(
            statusElement,
            player.status ||
            ""
        );


        setText(
            avatarElement,
            player.avatar ||
            UI_CONSTANTS.DEFAULT_AVATAR
        );


        element.classList.toggle(
            "is-current-turn",
            player.isCurrentTurn === true
        );


        const indicator =
            element.querySelector(
                ".player-turn-indicator"
            );


        toggle(
            indicator,
            player.isCurrentTurn === true
        );

    });

}


/* ============================================================
   35. TURN INDICATOR
   ============================================================ */

function updateTurnIndicator(
    currentTurn
) {

    UIState.game.currentTurn =
        currentTurn;


    const isMyTurn =
        currentTurn === "bottom" ||
        currentTurn === "me" ||
        currentTurn === "self";


    toggle(
        UI["game-turn-indicator"],
        isMyTurn
    );


    if (UI["player-bottom"]) {

        UI["player-bottom"]
            .classList.toggle(
                "is-current-turn",
                isMyTurn
            );

    }


    if (isMyTurn) {

        setText(
            UI["game-player-status"],
            "نوبت شماست"
        );

    }

}


/* ============================================================
   36. CARD NORMALIZATION
   ============================================================ */

function normalizeCard(card) {

    if (!card) {
        return null;
    }


    if (
        typeof card === "string"
    ) {

        return {

            id: card,

            suit: null,

            rank: card,

            symbol: card

        };

    }


    const suit =
        card.suit ||
        card.color ||
        null;

    const rank =
        card.rank ||
        card.value ||
        card.number ||
        "";


    const suitData =
        UI_CONSTANTS.SUITS[suit];


    return {

        ...card,

        id:
            card.id ||
            `${suit}-${rank}`,

        suit,

        rank,

        suitSymbol:
            card.suitSymbol ||
            suitData?.symbol ||
            "",

        displayRank:
            card.displayRank ||
            UI_CONSTANTS.RANKS[rank] ||
            rank

    };

}


/* ============================================================
   37. CARD HTML
   ============================================================ */

function createCardElement(
    card,
    options = {}
) {

    const normalized =
        normalizeCard(card);

    if (!normalized) {
        return null;
    }


    const {

        playable = true,

        selected = false,

        disabled = false,

        position = null

    } = options;


    const element =
        document.createElement("button");


    element.type = "button";

    element.className =
        "playing-card";


    if (
        normalized.suit === "hearts" ||
        normalized.suit === "diamonds"
    ) {

        element.classList.add(
            "red-card"
        );

    }


    if (playable) {

        element.classList.add(
            "playable"
        );

    }


    if (selected) {

        element.classList.add(
            "selected"
        );

    }


    if (disabled) {

        element.disabled = true;

        element.classList.add(
            "disabled"
        );

    }


    if (position !== null) {

        element.dataset.position =
            String(position);

    }


    element.dataset.cardId =
        normalized.id;


    element.dataset.suit =
        normalized.suit || "";

    element.dataset.rank =
        normalized.rank || "";


    element.innerHTML = `

        <span class="card-corner card-corner-top">

            <span class="card-rank">
                ${escapeHTML(
                    normalized.displayRank
                )}
            </span>

            <span class="card-suit">
                ${escapeHTML(
                    normalized.suitSymbol
                )}
            </span>

        </span>


        <span class="card-center-suit">
            ${escapeHTML(
                normalized.suitSymbol
            )}
        </span>


        <span class="card-corner card-corner-bottom">

            <span class="card-rank">
                ${escapeHTML(
                    normalized.displayRank
                )}
            </span>

            <span class="card-suit">
                ${escapeHTML(
                    normalized.suitSymbol
                )}
            </span>

        </span>

    `;


    return element;

}


/* ============================================================
   38. RENDER PLAYER HAND
   ============================================================ */

function renderPlayerHand(
    cards = [],
    legalCards = []
) {

    if (!UI["player-hand"]) {
        return;
    }


    UI["player-hand"].innerHTML = "";


    if (!Array.isArray(cards) ||
        cards.length === 0) {

        return;

    }


    const legalIds =
        new Set(
            legalCards.map(card => {

                const normalized =
                    normalizeCard(card);

                return normalized?.id;

            })
        );


    cards.forEach(
        (card, index) => {

            const normalized =
                normalizeCard(card);

            if (!normalized) {
                return;
            }


            const playable =
                legalCards.length === 0
                    ? true
                    : legalIds.has(
                        normalized.id
                    );


            const element =
                createCardElement(
                    normalized,
                    {
                        playable,
                        disabled: !playable,
                        position: index
                    }
                );


            if (!element) {
                return;
            }


            element.addEventListener(
                "click",
                () => {

                    if (!playable) {

                        showToast(
                            "این کارت در این نوبت قابل بازی نیست.",
                            "warning"
                        );

                        return;

                    }


                    emitUIEvent(
                        "cardSelected",
                        {
                            card:
                                normalized,

                            index
                        }
                    );

                }
            );


            UI["player-hand"].appendChild(
                element
            );

        }
    );

}


/* ============================================================
   39. SELECT CARD
   ============================================================ */

function selectCard(cardId) {

    const cards =
        $$(".playing-card", UI["player-hand"]);


    cards.forEach(card => {

        card.classList.toggle(
            "selected",
            card.dataset.cardId ===
            String(cardId)
        );

    });

}


/* ============================================================
   40. REMOVE CARD FROM HAND
   ============================================================ */

function removeCardFromHand(cardId) {

    if (!UI["player-hand"]) {
        return;
    }


    const card =
        UI["player-hand"].querySelector(
            `[data-card-id="${CSS.escape(String(cardId))}"]`
        );


    if (card) {

        card.remove();

    }

}


/* ============================================================
   41. PLAYED CARDS
   ============================================================ */

function renderPlayedCards(
    playedCards = {}
) {

    const positions = [

        "top",
        "right",
        "bottom",
        "left"

    ];


    positions.forEach(position => {

        const slot =
            document.getElementById(
                `played-card-${position}`
            );

        if (!slot) {
            return;
        }


        slot.innerHTML = "";


        const card =
            playedCards[position];


        if (!card) {
            return;
        }


        const element =
            createCardElement(
                card,
                {
                    playable: false
                }
            );


        if (element) {

            element.disabled = true;

            slot.appendChild(
                element
            );

        }

    });

}


/* ============================================================
   42. CLEAR TRICK
   ============================================================ */

function clearTrick() {

    const slots =
        $$(".played-card-slot");

    slots.forEach(slot => {

        slot.innerHTML = "";

    });


    UIState.game.playedCards = {};

}


/* ============================================================
   43. SCORE
   ============================================================ */

function updateScore(
    teamScore,
    opponentScore
) {

    UIState.game.teamScore =
        Number(teamScore) || 0;

    UIState.game.opponentScore =
        Number(opponentScore) || 0;


    setText(
        UI["team-score"],
        formatNumber(
            UIState.game.teamScore
        )
    );


    setText(
        UI["opponent-score"],
        formatNumber(
            UIState.game.opponentScore
        )
    );

}


/* ============================================================
   44. ROUND
   ============================================================ */

function updateRound(round) {

    UIState.game.round =
        Number(round) || 1;


    setText(
        UI["current-round"],
        formatNumber(
            UIState.game.round
        )
    );

}


/* ============================================================
   45. GAME START
   ============================================================ */

function startGameUI(game = {}) {

    UIState.game.active =
        true;


    UIState.game = {

        ...UIState.game,

        ...game

    };


    showPage("game");

    renderGame();


    announce(
        "بازی شروع شد."
    );

}


/* ============================================================
   46. GAME END
   ============================================================ */

function showGameResult(result = {}) {

    const {

        won = false,

        title,

        description,

        teamScore = UIState.game.teamScore,

        opponentScore =
            UIState.game.opponentScore,

        coins = 0,

        xp = 0

    } = result;


    setText(
        UI["result-icon"],
        won ? "🏆" : "😔"
    );


    setText(
        UI["result-title"],
        title ||
        (
            won
                ? "پیروز شدید!"
                : "این بازی را باختید"
        )
    );


    setText(
        UI["result-description"],
        description ||
        (
            won
                ? "تیم شما برنده این بازی شد."
                : "این بار موفق به پیروزی نشدید."
        )
    );


    setText(
        UI["result-team-score"],
        formatNumber(teamScore)
    );


    setText(
        UI["result-opponent-score"],
        formatNumber(opponentScore)
    );


    setText(
        UI["result-coins"],
        `${coins >= 0 ? "+" : ""}${formatNumber(coins)}`
    );


    setText(
        UI["result-xp"],
        `${xp >= 0 ? "+" : ""}${formatNumber(xp)} XP`
    );


    openModal(
        "game-result-modal"
    );


    UIState.game.active =
        false;


    announce(
        won
            ? "شما برنده شدید."
            : "بازی به پایان رسید."
    );

}


/* ============================================================
   47. SHOP
   ============================================================ */

function renderShop(
    items = [],
    category = "coins"
) {

    if (!UI["shop-content"]) {
        return;
    }


    UIState.shopItems =
        Array.isArray(items)
            ? items
            : [];


    UI["shop-content"].innerHTML = "";


    const filtered =
        UIState.shopItems.filter(
            item =>
                !item.category ||
                item.category === category
        );


    if (filtered.length === 0) {

        UI["shop-content"].innerHTML = `

            <div class="empty-state">

                <span class="empty-icon">
                    🛒
                </span>

                <p>
                    موردی برای نمایش وجود ندارد
                </p>

                <small>
                    به‌زودی آیتم‌های جدید اضافه می‌شوند.
                </small>

            </div>

        `;

        return;

    }


    filtered.forEach(item => {

        const element =
            document.createElement("div");


        element.className =
            "shop-item";


        element.dataset.itemId =
            item.id || "";


        const price =
            Number(item.price) || 0;


        element.innerHTML = `

            <div class="shop-item-icon">
                ${escapeHTML(
                    item.icon || "🛍️"
                )}
            </div>

            <div class="shop-item-info">

                <strong>
                    ${escapeHTML(
                        item.name || "آیتم"
                    )}
                </strong>

                <small>
                    ${escapeHTML(
                        item.description || ""
                    )}
                </small>

            </div>

            <button
                type="button"
                class="shop-buy-button"
                data-shop-item-id="${escapeHTML(
                    item.id || ""
                )}"
            >

                🪙
                ${formatNumber(price)}

            </button>

        `;


        const buyButton =
            element.querySelector(
                ".shop-buy-button"
            );


        if (buyButton) {

            buyButton.addEventListener(
                "click",
                () => {

                    emitUIEvent(
                        "shopPurchaseRequested",
                        {
                            item
                        }
                    );

                }
            );

        }


        UI["shop-content"].appendChild(
            element
        );

    });

}


/* ============================================================
   48. SHOP TAB
   ============================================================ */

function activateShopTab(category) {

    UI.shopTabs.forEach(tab => {

        tab.classList.toggle(
            "active",
            tab.dataset.shopTab === category
        );

    });


    renderShop(
        UIState.shopItems,
        category
    );

}


/* ============================================================
   49. FRIENDS
   ============================================================ */

function renderFriends(
    friends = [],
    mode = "friends"
) {

    if (!UI["friends-list"]) {
        return;
    }


    UI["friends-list"].innerHTML = "";


    const list =
        mode === "requests"
            ? UIState.friendRequests
            : friends;


    if (!Array.isArray(list) ||
        list.length === 0) {

        UI["friends-list"].innerHTML = `

            <div class="empty-state">

                <span class="empty-icon">
                    ${mode === "requests" ? "📨" : "👥"}
                </span>

                <p>
                    ${
                        mode === "requests"
                            ? "درخواستی وجود ندارد"
                            : "هنوز دوستی ندارید"
                    }
                </p>

                <small>
                    ${
                        mode === "requests"
                            ? "درخواست‌های دوستی اینجا نمایش داده می‌شوند."
                            : "دوستان خود را پیدا کنید و به بازی دعوتشان کنید."
                    }
                </small>

            </div>

        `;

        updateFriendRequestBadge();

        return;

    }


    list.slice(
        0,
        UI_CONSTANTS.MAX_FRIENDS
    ).forEach(friend => {

        const element =
            document.createElement("div");


        element.className =
            "friend-item";


        element.dataset.friendId =
            friend.id || "";


        element.innerHTML = `

            <div class="friend-avatar">
                ${escapeHTML(
                    friend.avatar || "👤"
                )}
            </div>

            <div class="friend-info">

                <strong>
                    ${escapeHTML(
                        friend.username ||
                        friend.name ||
                        "بازیکن"
                    )}
                </strong>

                <small>
                    ${
                        friend.online
                            ? "آنلاین"
                            : "آفلاین"
                    }
                </small>

            </div>

            <div class="friend-actions">

                ${
                    mode === "requests"
                        ? `
                            <button
                                type="button"
                                class="friend-accept-button"
                                data-friend-action="accept"
                            >
                                قبول
                            </button>

                            <button
                                type="button"
                                class="friend-reject-button"
                                data-friend-action="reject"
                            >
                                رد
                            </button>
                        `
                        : `
                            <button
                                type="button"
                                class="friend-action-button"
                                data-friend-action="invite"
                            >
                                دعوت
                            </button>
                        `
                }

            </div>

        `;


        $$(".friend-actions button", element)
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        emitUIEvent(
                            "friendAction",
                            {
                                action:
                                    button.dataset.friendAction,

                                friend
                            }
                        );

                    }
                );

            });


        UI["friends-list"].appendChild(
            element
        );

    });


    updateFriendRequestBadge();

}


/* ============================================================
   50. FRIEND REQUEST BADGE
   ============================================================ */

function updateFriendRequestBadge() {

    const count =
        UIState.friendRequests.length;


    setText(
        UI["friend-request-badge"],
        formatNumber(count)
    );


    toggle(
        UI["friend-request-badge"],
        count > 0
    );

}


/* ============================================================
   51. LEADERBOARD
   ============================================================ */

function renderLeaderboard(
    players = []
) {

    if (!UI["leaderboard-list"]) {
        return;
    }


    UIState.leaderboard =
        Array.isArray(players)
            ? players
            : [];


    UI["leaderboard-list"].innerHTML = "";


    if (UIState.leaderboard.length === 0) {

        UI["leaderboard-list"].innerHTML = `

            <div class="empty-state">

                <span class="empty-icon">
                    🏆
                </span>

                <p>
                    رتبه‌بندی خالی است
                </p>

            </div>

        `;

        return;

    }


    UIState.leaderboard
        .slice(
            0,
            UI_CONSTANTS.MAX_LEADERBOARD_ITEMS
        )
        .forEach((player, index) => {

            const rank =
                Number(player.rank) ||
                index + 1;


            const element =
                document.createElement("div");


            element.className =
                "leaderboard-item";


            if (
                player.id &&
                player.id ===
                UIState.currentUser.id
            ) {

                element.classList.add(
                    "current-player"
                );

            }


            element.innerHTML = `

                <div class="leaderboard-rank">
                    ${formatNumber(rank)}
                </div>

                <div class="leaderboard-avatar">
                    ${escapeHTML(
                        player.avatar || "👤"
                    )}
                </div>

                <div class="leaderboard-player">

                    <strong>
                        ${escapeHTML(
                            player.username ||
                            player.name ||
                            "بازیکن"
                        )}
                    </strong>

                    <small>
                        سطح ${formatNumber(
                            player.level || 1
                        )}
                    </small>

                </div>

                <div class="leaderboard-score">

                    <strong>
                        ${formatNumber(
                            player.rating ||
                            player.score ||
                            0
                        )}
                    </strong>

                    <small>
                        امتیاز
                    </small>

                </div>

            `;


            UI["leaderboard-list"]
                .appendChild(element);

        });

}


/* ============================================================
   52. PROFILE ACHIEVEMENTS
   ============================================================ */

function renderAchievements(
    achievements = []
) {

    if (!UI["achievement-list"]) {
        return;
    }


    UI["achievement-list"].innerHTML = "";


    if (!Array.isArray(achievements) ||
        achievements.length === 0) {

        UI["achievement-list"].innerHTML = `

            <div class="empty-state">

                <span class="empty-icon">
                    🏅
                </span>

                <p>
                    هنوز افتخاری کسب نکرده‌اید
                </p>

            </div>

        `;

        return;

    }


    achievements.forEach(
        achievement => {

            const element =
                document.createElement("div");


            element.className =
                "achievement-item";


            if (achievement.unlocked) {

                element.classList.add(
                    "unlocked"
                );

            }


            element.innerHTML = `

                <div class="achievement-icon">
                    ${escapeHTML(
                        achievement.icon || "🏅"
                    )}
                </div>

                <div class="achievement-info">

                    <strong>
                        ${escapeHTML(
                            achievement.name ||
                            "افتخار"
                        )}
                    </strong>

                    <small>
                        ${escapeHTML(
                            achievement.description ||
                            ""
                        )}
                    </small>

                </div>

            `;


            UI["achievement-list"]
                .appendChild(element);

        }
    );

}


/* ============================================================
   53. HISTORY
   ============================================================ */

function renderHistory(
    history = []
) {

    if (!UI["history-list"]) {
        return;
    }


    UIState.history =
        Array.isArray(history)
            ? history
            : [];


    UI["history-list"].innerHTML = "";


    if (UIState.history.length === 0) {

        UI["history-list"].innerHTML = `

            <div class="empty-state">

                <span class="empty-icon">
                    📜
                </span>

                <p>
                    تاریخچه‌ای وجود ندارد
                </p>

                <small>
                    بازی‌های شما پس از انجام اینجا نمایش داده می‌شوند.
                </small>

            </div>

        `;

        return;

    }


    UIState.history
        .slice(
            0,
            UI_CONSTANTS.MAX_HISTORY_ITEMS
        )
        .forEach(game => {

            const element =
                document.createElement("div");


            element.className =
                "history-item";


            const won =
                Boolean(game.won);


            element.classList.add(
                won
                    ? "history-win"
                    : "history-loss"
            );


            element.innerHTML = `

                <div class="history-result-icon">
                    ${won ? "🏆" : "😔"}
                </div>

                <div class="history-info">

                    <strong>
                        ${
                            won
                                ? "پیروزی"
                                : "شکست"
                        }
                    </strong>

                    <small>
                        ${escapeHTML(
                            game.mode ||
                            "حکم کلاسیک"
                        )}
                    </small>

                    <small>
                        ${
                            game.date
                                ? formatDate(game.date)
                                : ""
                        }
                    </small>

                </div>

                <div class="history-score">

                    <strong>
                        ${formatNumber(
                            game.teamScore || 0
                        )}
                        :
                        ${formatNumber(
                            game.opponentScore || 0
                        )}
                    </strong>

                </div>

            `;


            UI["history-list"]
                .appendChild(element);

        });

}


/* ============================================================
   54. MISSIONS
   ============================================================ */

function renderMissions(
    daily = [],
    weekly = []
) {

    UIState.dailyMissions =
        Array.isArray(daily)
            ? daily
            : [];


    UIState.weeklyMissions =
        Array.isArray(weekly)
            ? weekly
            : [];


    renderMissionList(
        UI["daily-missions"],
        UIState.dailyMissions
    );


    renderMissionList(
        UI["weekly-missions"],
        UIState.weeklyMissions
    );


    renderHomeMission();

}
