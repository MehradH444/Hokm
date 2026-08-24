/* ============================================================
   HOKM ONLINE
   STORAGE ENGINE
   ============================================================

   File:
   storage.js

   Stage:
   5

   Description:
   سیستم کامل ذخیره‌سازی اطلاعات بازی حکم

   مسئولیت‌های این فایل:

   1. مدیریت LocalStorage
   2. ذخیره پروفایل
   3. ذخیره سکه
   4. ذخیره XP و Level
   5. ذخیره آمار بازی
   6. ذخیره تاریخچه بازی‌ها
   7. ذخیره دوستان
   8. ذخیره درخواست‌های دوستی
   9. ذخیره اعلان‌ها
   10. ذخیره مأموریت‌ها
   11. ذخیره تنظیمات
   12. ذخیره آیتم‌های فروشگاه
   13. ذخیره آواتار
   14. ذخیره دستاوردها
   15. ذخیره بازی فعلی
   16. ذخیره اتاق فعلی
   17. ذخیره وضعیت احراز هویت
   18. ذخیره اطلاعات ورود
   19. سیستم Backup
   20. سیستم Restore
   21. سیستم Migration
   22. مدیریت نسخه Storage
   23. جلوگیری از خراب شدن JSON
   24. Reset اطلاعات
   25. Export / Import
   26. Event system
   27. سازگاری با app.js و game.js
   28. آماده برای اتصال به Backend در مراحل بعد

   IMPORTANT:
   این فایل برای نسخه Local/Offline پروژه است.
   در مراحل بعد می‌توان آن را به Database و Backend متصل کرد.

============================================================ */


/* ============================================================
   GLOBAL STORAGE OBJECT
============================================================ */

(function (window) {

    "use strict";


    /* ========================================================
       BASIC CONFIGURATION
    ======================================================== */

    const STORAGE_CONFIG = {

        prefix: "hokm_",

        version: 1,

        schemaVersion: 1,

        backupVersion: 1,

        maxHistoryItems: 100,

        maxNotifications: 100,

        maxFriends: 500,

        maxMessages: 500,

        maxGames: 100,

        maxMissions: 100,

        maxAchievements: 100,

        maxStorageSizeWarning: 4 * 1024 * 1024

    };


    /* ========================================================
       STORAGE KEYS
    ======================================================== */

    const KEYS = {

        PROFILE:
            "profile",

        AUTH:
            "auth",

        SETTINGS:
            "settings",

        WALLET:
            "wallet",

        SHOP:
            "shop",

        FRIENDS:
            "friends",

        FRIEND_REQUESTS:
            "friend_requests",

        NOTIFICATIONS:
            "notifications",

        MISSIONS:
            "missions",

        ACHIEVEMENTS:
            "achievements",

        GAME_HISTORY:
            "game_history",

        CURRENT_GAME:
            "current_game",

        CURRENT_ROOM:
            "current_room",

        CHAT:
            "chat",

        LEADERBOARD:
            "leaderboard",

        DAILY_DATA:
            "daily_data",

        APP_STATE:
            "app_state",

        BACKUP:
            "backup",

        META:
            "meta"

    };


    /* ========================================================
       DEFAULT PROFILE
    ======================================================== */

    const DEFAULT_PROFILE = {

        id: null,

        username: "بازیکن",

        displayName: "بازیکن",

        email: "",

        avatar: "👤",

        avatarId: "default",

        bio: "",

        country: "",

        level: 1,

        xp: 0,

        xpToNextLevel: 100,

        coins: 1000,

        gems: 0,

        rating: 1000,

        rank: 0,

        gamesPlayed: 0,

        gamesWon: 0,

        gamesLost: 0,

        gamesDraw: 0,

        winRate: 0,

        totalTricks: 0,

        totalRounds: 0,

        currentWinStreak: 0,

        bestWinStreak: 0,

        totalPlayTime: 0,

        createdAt: null,

        updatedAt: null,

        lastLoginAt: null,

        isGuest: true,

        isOnline: false,

        status: "online"

    };


    /* ========================================================
       DEFAULT AUTH
    ======================================================== */

    const DEFAULT_AUTH = {

        isLoggedIn: false,

        isGuest: true,

        userId: null,

        username: null,

        email: null,

        sessionToken: null,

        refreshToken: null,

        rememberMe: false,

        loginAt: null,

        lastActivityAt: null

    };


    /* ========================================================
       DEFAULT SETTINGS
    ======================================================== */

    const DEFAULT_SETTINGS = {

        sound: true,

        music: true,

        vibration: true,

        notifications: true,

        darkMode: true,

        language: "fa",

        rtl: true,

        autoSortCards: false,

        confirmExitGame: true,

        showAnimations: true,

        showHints: false,

        reduceMotion: false,

        cardAnimationSpeed: "normal",

        chatEnabled: true,

        chatSound: true,

        onlineStatus: true,

        showProfileToOthers: true,

        showStatistics: true,

        showRank: true,

        allowFriendRequests: true,

        allowGameInvites: true,

        privacyMode: false

    };


    /* ========================================================
       DEFAULT WALLET
    ======================================================== */

    const DEFAULT_WALLET = {

        coins: 1000,

        gems: 0,

        totalCoinsEarned: 1000,

        totalCoinsSpent: 0,

        totalGemsEarned: 0,

        totalGemsSpent: 0,

        transactions: []

    };


    /* ========================================================
       DEFAULT SHOP
    ======================================================== */

    const DEFAULT_SHOP = {

        purchasedItems: [],

        ownedAvatars: [

            "default"

        ],

        equippedAvatar: "default",

        ownedFrames: [

            "default"

        ],

        equippedFrame: "default",

        ownedCardDesigns: [

            "classic"

        ],

        equippedCardDesign: "classic",

        ownedTableDesigns: [

            "classic"

        ],

        equippedTableDesign: "classic",

        purchaseHistory: []

    };


    /* ========================================================
       DEFAULT FRIENDS
    ======================================================== */

    const DEFAULT_FRIENDS = [];


    /* ========================================================
       DEFAULT FRIEND REQUESTS
    ======================================================== */

    const DEFAULT_FRIEND_REQUESTS = [];


    /* ========================================================
       DEFAULT NOTIFICATIONS
    ======================================================== */

    const DEFAULT_NOTIFICATIONS = [];


    /* ========================================================
       DEFAULT MISSIONS
    ======================================================== */

    const DEFAULT_MISSIONS = {

        daily: [],

        weekly: [],

        lastDailyReset: null,

        lastWeeklyReset: null

    };


    /* ========================================================
       DEFAULT ACHIEVEMENTS
    ======================================================== */

    const DEFAULT_ACHIEVEMENTS = [];


    /* ========================================================
       DEFAULT GAME HISTORY
    ======================================================== */

    const DEFAULT_GAME_HISTORY = [];


    /* ========================================================
       DEFAULT CURRENT GAME
    ======================================================== */

    const DEFAULT_CURRENT_GAME = {

        active: false,

        gameId: null,

        roomId: null,

        mode: null,

        status: "idle",

        startedAt: null,

        updatedAt: null,

        playerId: null,

        players: [],

        teamScore: 0,

        opponentScore: 0,

        currentRound: 0,

        currentTrick: 0,

        trump: null,

        turnPlayerId: null,

        gameState: null

    };


    /* ========================================================
       DEFAULT CURRENT ROOM
    ======================================================== */

    const DEFAULT_CURRENT_ROOM = {

        active: false,

        roomId: null,

        roomCode: null,

        roomName: "",

        ownerId: null,

        private: true,

        status: "waiting",

        players: [],

        maxPlayers: 4,

        createdAt: null,

        updatedAt: null

    };


    /* ========================================================
       DEFAULT CHAT
    ======================================================== */

    const DEFAULT_CHAT = {

        rooms: {},

        currentRoomId: null

    };


    /* ========================================================
       DEFAULT LEADERBOARD
    ======================================================== */

    const DEFAULT_LEADERBOARD = {

        global: [],

        friends: [],

        weekly: [],

        updatedAt: null

    };


    /* ========================================================
       DEFAULT DAILY DATA
    ======================================================== */

    const DEFAULT_DAILY_DATA = {

        date: null,

        loginClaimed: false,

        dailyRewardClaimed: false,

        gamesPlayedToday: 0,

        winsToday: 0,

        coinsEarnedToday: 0,

        xpEarnedToday: 0

    };


    /* ========================================================
       DEFAULT APP STATE
    ======================================================== */

    const DEFAULT_APP_STATE = {

        initialized: false,

        firstLaunch: true,

        currentPage: "home",

        previousPage: null,

        loadingComplete: false,

        lastOpenedAt: null,

        lastSavedAt: null,

        appVersion: "1.0.0",

        storageVersion: STORAGE_CONFIG.version

    };


    /* ========================================================
       DEFAULT META
    ======================================================== */

    const DEFAULT_META = {

        version: STORAGE_CONFIG.version,

        schemaVersion: STORAGE_CONFIG.schemaVersion,

        createdAt: null,

        updatedAt: null,

        migrationsApplied: [],

        lastBackupAt: null

    };


    /* ========================================================
       UTILITY FUNCTIONS
    ======================================================== */

    function now() {

        return new Date().toISOString();

    }


    function generateId(prefix) {

        const randomPart = Math.random()
            .toString(36)
            .substring(2, 10);

        const timePart = Date.now()
            .toString(36);

        return (

            prefix +

            "_" +

            timePart +

            "_" +

            randomPart

        );

    }


    function deepClone(value) {

        if (value === undefined) {

            return undefined;

        }

        try {

            return JSON.parse(
                JSON.stringify(value)
            );

        } catch (error) {

            console.error(
                "[HokmStorage] Deep clone error:",
                error
            );

            return value;

        }

    }


    function isObject(value) {

        return (

            value !== null &&

            typeof value === "object" &&

            !Array.isArray(value)

        );

    }


    function mergeObjects(base, extra) {

        const result = deepClone(base);

        if (!isObject(extra)) {

            return result;

        }

        Object.keys(extra).forEach(function (key) {

            if (

                isObject(result[key]) &&

                isObject(extra[key])

            ) {

                result[key] = mergeObjects(
                    result[key],
                    extra[key]
                );

            } else {

                result[key] = deepClone(
                    extra[key]
                );

            }

        });

        return result;

    }


    function getStorageKey(key) {

        return (

            STORAGE_CONFIG.prefix +

            key

        );

    }


    /* ========================================================
       SAFE LOCAL STORAGE CHECK
    ======================================================== */

    function isStorageAvailable() {

        try {

            const testKey =
                "__hokm_storage_test__";

            localStorage.setItem(
                testKey,
                "1"
            );

            localStorage.removeItem(
                testKey
            );

            return true;

        } catch (error) {

            console.error(
                "[HokmStorage] LocalStorage unavailable:",
                error
            );

            return false;

        }

    }


    /* ========================================================
       RAW SET
    ======================================================== */

    function rawSet(key, value) {

        if (!isStorageAvailable()) {

            return false;

        }

        try {

            const serialized =
                JSON.stringify(value);

            localStorage.setItem(
                getStorageKey(key),
                serialized
            );

            return true;

        } catch (error) {

            console.error(
                "[HokmStorage] Failed to save:",
                key,
                error
            );

            return false;

        }

    }


    /* ========================================================
       RAW GET
    ======================================================== */

    function rawGet(key, fallback) {

        if (!isStorageAvailable()) {

            return deepClone(
                fallback
            );

        }

        try {

            const value =
                localStorage.getItem(
                    getStorageKey(key)
                );

            if (value === null) {

                return deepClone(
                    fallback
                );

            }

            return JSON.parse(value);

        } catch (error) {

            console.error(
                "[HokmStorage] Failed to read:",
                key,
                error
            );

            return deepClone(
                fallback
            );

        }

    }


    /* ========================================================
       RAW REMOVE
    ======================================================== */

    function rawRemove(key) {

        if (!isStorageAvailable()) {

            return false;

        }

        try {

            localStorage.removeItem(
                getStorageKey(key)
            );

            return true;

        } catch (error) {

            console.error(
                "[HokmStorage] Failed to remove:",
                key,
                error
            );

            return false;

        }

    }


    /* ========================================================
       RAW EXISTS
    ======================================================== */

    function rawExists(key) {

        if (!isStorageAvailable()) {

            return false;

        }

        try {

            return (

                localStorage.getItem(
                    getStorageKey(key)
                ) !== null

            );

        } catch (error) {

            return false;

        }

    }


    /* ========================================================
       EVENT SYSTEM
    ======================================================== */

    const listeners = {};


    function on(eventName, callback) {

        if (
            typeof callback !== "function"
        ) {

            return function () {};

        }

        if (!listeners[eventName]) {

            listeners[eventName] = [];

        }

        listeners[eventName].push(
            callback
        );

        return function unsubscribe() {

            off(
                eventName,
                callback
            );

        };

    }


    function off(eventName, callback) {

        if (!listeners[eventName]) {

            return;

        }

        listeners[eventName] =
            listeners[eventName].filter(
                function (listener) {

                    return listener !== callback;

                }
            );

    }


    function emit(eventName, data) {

        if (!listeners[eventName]) {

            return;

        }

        listeners[eventName].forEach(
            function (callback) {

                try {

                    callback(
                        deepClone(data)
                    );

                } catch (error) {

                    console.error(
                        "[HokmStorage] Event error:",
                        error
                    );

                }

            }
        );

    }


    /* ========================================================
       GENERIC GET
    ======================================================== */

    function get(key, fallback) {

        return rawGet(
            key,
            fallback
        );

    }


    /* ========================================================
       GENERIC SET
    ======================================================== */

    function set(key, value) {

        const success =
            rawSet(
                key,
                value
            );

        if (success) {

            emit(
                "change",
                {
                    key: key,
                    value: value
                }
            );

        }

        return success;

    }


    /* ========================================================
       GENERIC UPDATE
    ======================================================== */

    function update(key, updater, fallback) {

        const current =
            rawGet(
                key,
                fallback
            );

        let updated;

        try {

            if (
                typeof updater === "function"
            ) {

                updated =
                    updater(
                        deepClone(current)
                    );

            } else if (
                isObject(updater)
            ) {

                updated =
                    mergeObjects(
                        current,
                        updater
                    );

            } else {

                updated =
                    updater;

            }

        } catch (error) {

            console.error(
                "[HokmStorage] Update error:",
                key,
                error
            );

            return current;

        }

        set(
            key,
            updated
        );

        return updated;

    }


    /* ========================================================
       PROFILE
    ======================================================== */

    function getProfile() {

        return mergeObjects(

            DEFAULT_PROFILE,

            get(
                KEYS.PROFILE,
                DEFAULT_PROFILE
            )

        );

    }


    function saveProfile(profile) {

        const current =
            getProfile();

        const updated =
            mergeObjects(
                current,
                profile
            );

        updated.updatedAt =
            now();

        if (!updated.createdAt) {

            updated.createdAt =
                now();

        }

        set(
            KEYS.PROFILE,
            updated
        );

        emit(
            "profileUpdated",
            updated
        );

        return updated;

    }


    function updateProfile(updates) {

        return saveProfile(
            updates
        );

    }


    function resetProfile() {

        const profile =
            deepClone(
                DEFAULT_PROFILE
            );

        profile.createdAt =
            now();

        profile.updatedAt =
            now();

        set(
            KEYS.PROFILE,
            profile
        );

        return profile;

    }


    /* ========================================================
       AUTH
    ======================================================== */

    function getAuth() {

        return mergeObjects(

            DEFAULT_AUTH,

            get(
                KEYS.AUTH,
                DEFAULT_AUTH
            )

        );

    }


    function saveAuth(auth) {

        const updated =
            mergeObjects(
                getAuth(),
                auth
            );

        updated.lastActivityAt =
            now();

        set(
            KEYS.AUTH,
            updated
        );

        emit(
            "authUpdated",
            updated
        );

        return updated;

    }


    function login(data) {

        const auth =
            saveAuth({

                isLoggedIn: true,

                isGuest:
                    Boolean(
                        data &&
                        data.isGuest
                    ),

                userId:
                    data &&
                    data.userId
                        ? data.userId
                        : generateId("user"),

                username:
                    data &&
                    data.username
                        ? data.username
                        : "بازیکن",

                email:
                    data &&
                    data.email
                        ? data.email
                        : "",

                sessionToken:
                    data &&
                    data.sessionToken
                        ? data.sessionToken
                        : null,

                refreshToken:
                    data &&
                    data.refreshToken
                        ? data.refreshToken
                        : null,

                rememberMe:
                    Boolean(
                        data &&
                        data.rememberMe
                    ),

                loginAt:
                    now()

            });


        const profile =
            getProfile();

        profile.id =
            auth.userId;

        profile.username =
            auth.username ||
            profile.username;

        profile.email =
            auth.email ||
            profile.email;

        profile.isGuest =
            auth.isGuest;

        profile.lastLoginAt =
            now();

        saveProfile(
            profile
        );


        return auth;

    }


    function logout() {

        const current =
            getAuth();

        const updated =
            mergeObjects(

                DEFAULT_AUTH,

                {

                    isLoggedIn: false,

                    isGuest: true,

                    userId: null,

                    username: null,

                    email: null,

                    sessionToken: null,

                    refreshToken: null,

                    rememberMe:
                        current.rememberMe,

                    loginAt: null,

                    lastActivityAt:
                        now()

                }

            );

        set(
            KEYS.AUTH,
            updated
        );

        emit(
            "logout",
            updated
        );

        return updated;

    }


    function isLoggedIn() {

        return Boolean(
            getAuth().isLoggedIn
        );

    }


    /* ========================================================
       SETTINGS
    ======================================================== */

    function getSettings() {

        return mergeObjects(

            DEFAULT_SETTINGS,

            get(
                KEYS.SETTINGS,
                DEFAULT_SETTINGS
            )

        );

    }


    function saveSettings(settings) {

        const updated =
            mergeObjects(
                getSettings(),
                settings
            );

        set(
            KEYS.SETTINGS,
            updated
        );

        emit(
            "settingsUpdated",
            updated
        );

        return updated;

    }


    function updateSetting(
        settingName,
        value
    ) {

        const settings =
            getSettings();

        settings[
            settingName
        ] = value;

        return saveSettings(
            settings
        );

    }


    function getSetting(
        settingName,
        fallback
    ) {

        const settings =
            getSettings();

        if (
            settings[
                settingName
            ] === undefined
        ) {

            return fallback;

        }

        return settings[
            settingName
        ];

    }


    /* ========================================================
       WALLET
    ======================================================== */

    function getWallet() {

        return mergeObjects(

            DEFAULT_WALLET,

            get(
                KEYS.WALLET,
                DEFAULT_WALLET
            )

        );

    }


    function saveWallet(wallet) {

        const updated =
            mergeObjects(
                getWallet(),
                wallet
            );

        set(
            KEYS.WALLET,
            updated
        );

        syncCoinsWithProfile();

        emit(
            "walletUpdated",
            updated
        );

        return updated;

    }


    function getCoins() {

        return Number(
            getWallet().coins
        ) || 0;

    }


    function setCoins(
        amount,
        reason
    ) {

        const numericAmount =
            Math.max(
                0,
                Math.floor(
                    Number(amount) || 0
                )
            );

        const wallet =
            getWallet();

        wallet.coins =
            numericAmount;

        wallet.transactions.unshift({

            id:
                generateId(
                    "transaction"
                ),

            type:
                "set",

            amount:
                numericAmount,

            reason:
                reason ||
                "تنظیم موجودی",

            createdAt:
                now()

        });

        trimArray(
            wallet.transactions,
            100
        );

        saveWallet(
            wallet
        );

        return numericAmount;

    }


    function addCoins(
        amount,
        reason
    ) {

        const numericAmount =
            Math.max(
                0,
                Math.floor(
                    Number(amount) || 0
                )
            );

        if (
            numericAmount <= 0
        ) {

            return getCoins();

        }

        const wallet =
            getWallet();

        wallet.coins +=
            numericAmount;

        wallet.totalCoinsEarned +=
            numericAmount;

        wallet.transactions.unshift({

            id:
                generateId(
                    "transaction"
                ),

            type:
                "earn",

            amount:
                numericAmount,

            reason:
                reason ||
                "دریافت سکه",

            createdAt:
                now()

        });

        trimArray(
            wallet.transactions,
            100
        );

        saveWallet(
            wallet
        );

        return wallet.coins;

    }


    function spendCoins(
        amount,
        reason
    ) {

        const numericAmount =
            Math.max(
                0,
                Math.floor(
                    Number(amount) || 0
                )
            );

        const wallet =
            getWallet();

        if (
            numericAmount <= 0
        ) {

            return {

                success: true,

                balance:
                    wallet.coins

            };

        }

        if (
            wallet.coins <
            numericAmount
        ) {

            return {

                success: false,

                balance:
                    wallet.coins,

                required:
                    numericAmount,

                error:
                    "موجودی سکه کافی نیست"

            };

        }

        wallet.coins -=
            numericAmount;

        wallet.totalCoinsSpent +=
            numericAmount;

        wallet.transactions.unshift({

            id:
                generateId(
                    "transaction"
                ),

            type:
                "spend",

            amount:
                numericAmount,

            reason:
                reason ||
                "هزینه سکه",

            createdAt:
                now()

        });

        trimArray(
            wallet.transactions,
            100
        );

        saveWallet(
            wallet
        );

        return {

            success: true,

            balance:
                wallet.coins,

            spent:
                numericAmount

        };

    }


    function syncCoinsWithProfile() {

        const wallet =
            getWallet();

        const profile =
            getProfile();

        if (
            profile.coins !==
            wallet.coins
        ) {

            profile.coins =
                wallet.coins;

            profile.updatedAt =
                now();

            rawSet(
                KEYS.PROFILE,
                profile
            );

        }

    }


    /* ========================================================
       XP / LEVEL SYSTEM
    ======================================================== */

    function getXP() {

        return Number(
            getProfile().xp
        ) || 0;

    }


    function calculateXPForNextLevel(
        level
    ) {

        const safeLevel =
            Math.max(
                1,
                Number(level) || 1
            );

        return Math.floor(
            100 *
            Math.pow(
                1.25,
                safeLevel - 1
            )
        );

    }


    function addXP(
        amount,
        reason
    ) {

        const numericAmount =
            Math.max(
                0,
                Math.floor(
                    Number(amount) || 0
                )
            );

        if (
            numericAmount <= 0
        ) {

            return {

                xpAdded: 0,

                level:
                    getProfile().level,

                leveledUp: false

            };

        }

        const profile =
            getProfile();

        const oldLevel =
            profile.level;

        profile.xp +=
            numericAmount;

        let leveledUp =
            false;

        let levelsGained =
            0;

        let required =
            calculateXPForNextLevel(
                profile.level
            );

        while (
            profile.xp >= required
        ) {

            profile.xp -=
                required;

            profile.level +=
                1;

            levelsGained +=
                1;

            leveledUp =
                true;

            required =
                calculateXPForNextLevel(
                    profile.level
                );

        }

        profile.xpToNextLevel =
            required;

        profile.updatedAt =
            now();

        saveProfile(
            profile
        );

        return {

            xpAdded:
                numericAmount,

            level:
                profile.level,

            oldLevel:
                oldLevel,

            levelsGained:
                levelsGained,

            leveledUp:
                leveledUp,

            reason:
                reason ||
                "دریافت XP"

        };

    }


    /* ========================================================
       GAME STATISTICS
    ======================================================== */

    function updateGameStatistics(
        result
    ) {

        const profile =
            getProfile();

        profile.gamesPlayed += 1;

        if (
            result &&
            result.result === "win"
        ) {

            profile.gamesWon += 1;

            profile.currentWinStreak += 1;

            if (
                profile.currentWinStreak >
                profile.bestWinStreak
            ) {

                profile.bestWinStreak =
                    profile.currentWinStreak;

            }

        } else if (
            result &&
            result.result === "loss"
        ) {

            profile.gamesLost += 1;

            profile.currentWinStreak =
                0;

        } else {

            profile.gamesDraw += 1;

        }

        if (
            result &&
            Number.isFinite(
                Number(
                    result.tricks
                )
            )
        ) {

            profile.totalTricks +=
                Number(
                    result.tricks
                );

        }

        if (
            result &&
            Number.isFinite(
                Number(
                    result.rounds
                )
            )
        ) {

            profile.totalRounds +=
                Number(
                    result.rounds
                );

        }

        if (
            profile.gamesPlayed > 0
        ) {

            profile.winRate =
                Number(
                    (
                        profile.gamesWon /
                        profile.gamesPlayed *
                        100
                    ).toFixed(2)
                );

        }

        profile.updatedAt =
            now();

        saveProfile(
            profile
        );

        return profile;

    }


    /* ========================================================
       GAME HISTORY
    ======================================================== */

    function getGameHistory() {

        const history =
            get(
                KEYS.GAME_HISTORY,
                DEFAULT_GAME_HISTORY
            );

        return Array.isArray(history)
            ? history
            : [];

    }


    function saveGameHistory(
        history
    ) {

        const safeHistory =
            Array.isArray(history)
                ? history
                : [];

        trimArray(
            safeHistory,
            STORAGE_CONFIG.maxHistoryItems
        );

        set(
            KEYS.GAME_HISTORY,
            safeHistory
        );

        return safeHistory;

    }


    function addGameHistory(
        game
    ) {

        if (!game) {

            return null;

        }

        const history =
            getGameHistory();

        const historyItem =
            mergeObjects(

                {

                    id:
                        generateId(
                            "game"
                        ),

                    createdAt:
                        now(),

                    mode:
                        "classic",

                    result:
                        "unknown",

                    teamScore:
                        0,

                    opponentScore:
                        0,

                    duration:
                        0,

                    players:
                        [],

                    trump:
                        null,

                    rounds:
                        0,

                    tricks:
                        0

                },

                game

            );

        history.unshift(
            historyItem
        );

        trimArray(
            history,
            STORAGE_CONFIG.maxHistoryItems
        );

        saveGameHistory(
            history
        );

        return historyItem;

    }


    function clearGameHistory() {

        return saveGameHistory(
            []
        );

    }


    /* ========================================================
       CURRENT GAME
    ======================================================== */

    function getCurrentGame() {

        return mergeObjects(

            DEFAULT_CURRENT_GAME,

            get(
                KEYS.CURRENT_GAME,
                DEFAULT_CURRENT_GAME
            )

        );

    }


    function saveCurrentGame(
        game
    ) {

        const updated =
            mergeObjects(

                getCurrentGame(),

                game

            );

        updated.updatedAt =
            now();

        set(
            KEYS.CURRENT_GAME,
            updated
        );

        emit(
            "currentGameUpdated",
            updated
        );

        return updated;

    }


    function clearCurrentGame() {

        const empty =
            deepClone(
                DEFAULT_CURRENT_GAME
            );

        set(
            KEYS.CURRENT_GAME,
            empty
        );

        emit(
            "currentGameCleared",
            empty
        );

        return empty;

    }


    /* ========================================================
       ROOM
    ======================================================== */

    function getCurrentRoom() {

        return mergeObjects(

            DEFAULT_CURRENT_ROOM,

            get(
                KEYS.CURRENT_ROOM,
                DEFAULT_CURRENT_ROOM
            )

        );

    }


    function saveCurrentRoom(
        room
    ) {

        const updated =
            mergeObjects(

                getCurrentRoom(),

                room

            );

        updated.updatedAt =
            now();

        set(
            KEYS.CURRENT_ROOM,
            updated
        );

        emit(
            "currentRoomUpdated",
            updated
        );

        return updated;

    }


    function clearCurrentRoom() {

        const empty =
            deepClone(
                DEFAULT_CURRENT_ROOM
            );

        set(
            KEYS.CURRENT_ROOM,
            empty
        );

        return empty;

    }


    /* ========================================================
       FRIENDS
    ======================================================== */

    function getFriends() {

        const friends =
            get(
                KEYS.FRIENDS,
                DEFAULT_FRIENDS
            );

        return Array.isArray(friends)
            ? friends
            : [];

    }


    function saveFriends(
        friends
    ) {

        const safeFriends =
            Array.isArray(friends)
                ? friends
                : [];

        trimArray(
            safeFriends,
            STORAGE_CONFIG.maxFriends
        );

        set(
            KEYS.FRIENDS,
            safeFriends
        );

        emit(
            "friendsUpdated",
            safeFriends
        );

        return safeFriends;

    }


    function addFriend(
        friend
    ) {

        if (!friend) {

            return null;

        }

        const friends =
            getFriends();

        const friendId =
            friend.id ||
            friend.userId;

        if (!friendId) {

            return null;

        }

        const existing =
            friends.find(
                function (item) {

                    return (

                        item.id === friendId ||
                        item.userId === friendId

                    );

                }
            );

        if (existing) {

            return existing;

        }

        const newFriend =
            mergeObjects(

                {

                    id:
                        friendId,

                    username:
                        "بازیکن",

                    avatar:
                        "👤",

                    level:
                        1,

                    rating:
                        1000,

                    online:
                        false,

                    addedAt:
                        now()

                },

                friend

            );

        friends.push(
            newFriend
        );

        saveFriends(
            friends
        );

        return newFriend;

    }


    function removeFriend(
        friendId
    ) {

        const friends =
            getFriends();

        const filtered =
            friends.filter(
                function (friend) {

                    return (

                        friend.id !==
                        friendId &&

                        friend.userId !==
                        friendId

                    );

                }
            );

        saveFriends(
            filtered
        );

        return true;

    }


    function isFriend(
        friendId
    ) {

        return getFriends().some(
            function (friend) {

                return (

                    friend.id ===
                    friendId ||

                    friend.userId ===
                    friendId

                );

            }
        );

    }


    /* ========================================================
       FRIEND REQUESTS
    ======================================================== */

    function getFriendRequests() {

        const requests =
            get(
                KEYS.FRIEND_REQUESTS,
                DEFAULT_FRIEND_REQUESTS
            );

        return Array.isArray(requests)
            ? requests
            : [];

    }


    function saveFriendRequests(
        requests
    ) {

        const safeRequests =
            Array.isArray(requests)
                ? requests
                : [];

        set(
            KEYS.FRIEND_REQUESTS,
            safeRequests
        );

        return safeRequests;

    }


    function addFriendRequest(
        request
    ) {

        if (!request) {

            return null;

        }

        const requests =
            getFriendRequests();

        const requestId =
            request.id ||
            generateId(
                "friend_request"
            );

        const item =
            mergeObjects(

                {

                    id:
                        requestId,

                    fromUserId:
                        null,

                    fromUsername:
                        "بازیکن",

                    fromAvatar:
                        "👤",

                    status:
                        "pending",

                    createdAt:
                        now()

                },

                request

            );

        requests.unshift(
            item
        );

        saveFriendRequests(
            requests
        );

        return item;

    }


    /* ========================================================
       NOTIFICATIONS
    ======================================================== */

    function getNotifications() {

        const notifications =
            get(
                KEYS.NOTIFICATIONS,
                DEFAULT_NOTIFICATIONS
            );

        return Array.isArray(
            notifications
        )
            ? notifications
            : [];

    }


    function saveNotifications(
        notifications
    ) {

        const safeNotifications =
            Array.isArray(
                notifications
            )
                ? notifications
                : [];

        trimArray(
            safeNotifications,
            STORAGE_CONFIG.maxNotifications
        );

        set(
            KEYS.NOTIFICATIONS,
            safeNotifications
        );

        emit(
            "notificationsUpdated",
            safeNotifications
        );

        return safeNotifications;

    }


    function addNotification(
        notification
    ) {

        if (!notification) {

            return null;

        }

        const notifications =
            getNotifications();

        const item =
            mergeObjects(

                {

                    id:
                        generateId(
                            "notification"
                        ),

                    type:
                        "system",

                    title:
                        "",

                    message:
                        "",

                    read:
                        false,

                    createdAt:
                        now(),

                    data:
                        {}

                },

                notification

            );

        notifications.unshift(
            item
        );

        trimArray(
            notifications,
            STORAGE_CONFIG.maxNotifications
        );

        saveNotifications(
            notifications
        );

        return item;

    }


    function markNotificationRead(
        notificationId
    ) {

        const notifications =
            getNotifications();

        notifications.forEach(
            function (notification) {

                if (
                    notification.id ===
                    notificationId
                ) {

                    notification.read =
                        true;

                }

            }
        );

        saveNotifications(
            notifications
        );

        return notifications;

    }


    function markAllNotificationsRead() {

        const notifications =
            getNotifications();

        notifications.forEach(
            function (notification) {

                notification.read =
                    true;

            }
        );

        saveNotifications(
            notifications
        );

        return notifications;

    }


    function getUnreadNotificationCount() {

        return getNotifications()
            .filter(
                function (notification) {

                    return !notification.read;

                }
            )
            .length;

    }


    /* ========================================================
       MISSIONS
    ======================================================== */

    function getMissions() {

        return mergeObjects(

            DEFAULT_MISSIONS,

            get(
                KEYS.MISSIONS,
                DEFAULT_MISSIONS
            )

        );

    }


    function saveMissions(
        missions
    ) {

        const updated =
            mergeObjects(
                getMissions(),
                missions
            );

        set(
            KEYS.MISSIONS,
            updated
        );

        emit(
            "missionsUpdated",
            updated
        );

        return updated;

    }


    function addMission(
        type,
        mission
    ) {

        const missions =
            getMissions();

        const category =
            type === "weekly"
                ? "weekly"
                : "daily";

        if (
            !Array.isArray(
                missions[category]
            )
        ) {

            missions[category] =
                [];

        }

        const item =
            mergeObjects(

                {

                    id:
                        generateId(
                            "mission"
                        ),

                    title:
                        "مأموریت",

                    description:
                        "",

                    progress:
                        0,

                    target:
                        1,

                    rewardCoins:
                        0,

                    rewardXP:
                        0,

                    completed:
                        false,

                    claimed:
                        false

                },

                mission

            );

        missions[
            category
        ].push(
            item
        );

        saveMissions(
            missions
        );

        return item;

    }


    function updateMission(
        type,
        missionId,
        updates
    ) {

        const missions =
            getMissions();

        const category =
            type === "weekly"
                ? "weekly"
                : "daily";

        const list =
            missions[category] || [];

        const mission =
            list.find(
                function (item) {

                    return (
                        item.id ===
                        missionId
                    );

                }
            );

        if (!mission) {

            return null;

        }

        Object.assign(
            mission,
            updates || {}
        );

        if (
            mission.progress >=
            mission.target
        ) {

            mission.progress =
                mission.target;

            mission.completed =
                true;

        }

        saveMissions(
            missions
        );

        return mission;

    }


    /* ========================================================
       ACHIEVEMENTS
    ======================================================== */

    function getAchievements() {

        const achievements =
            get(
                KEYS.ACHIEVEMENTS,
                DEFAULT_ACHIEVEMENTS
            );

        return Array.isArray(
            achievements
        )
            ? achievements
            : [];

    }


    function saveAchievements(
        achievements
    ) {

        const safeAchievements =
            Array.isArray(
                achievements
            )
                ? achievements
                : [];

        set(
            KEYS.ACHIEVEMENTS,
            safeAchievements
        );

        return safeAchievements;

    }


    function unlockAchievement(
        achievement
    ) {

        if (!achievement) {

            return null;

        }

        const achievements =
            getAchievements();

        const id =
            achievement.id;

        if (!id) {

            return null;

        }

        const existing =
            achievements.find(
                function (item) {

                    return item.id === id;

                }
            );

        if (existing) {

            if (!existing.unlocked) {

                existing.unlocked =
                    true;

                existing.unlockedAt =
                    now();

            }

            saveAchievements(
                achievements
            );

            return existing;

        }

        const newAchievement =
            mergeObjects(

                {

                    id:
                        id,

                    title:
                        "دستاورد",

                    description:
                        "",

                    icon:
                        "🏆",

                    unlocked:
                        true,

                    unlockedAt:
                        now()

                },

                achievement

            );

        achievements.push(
            newAchievement
        );

        saveAchievements(
            achievements
        );

        return newAchievement;

    }


    /* ========================================================
       SHOP
    ======================================================== */

    function getShop() {

        return mergeObjects(

            DEFAULT_SHOP,

            get(
                KEYS.SHOP,
                DEFAULT_SHOP
            )

        );

    }


    function saveShop(
        shop
    ) {

        const updated =
            mergeObjects(
                getShop(),
                shop
            );

        set(
            KEYS.SHOP,
            updated
        );

        emit(
            "shopUpdated",
            updated
        );

        return updated;

    }


    function purchaseItem(
        item
    ) {

        if (!item) {

            return {

                success: false,

                error:
                    "آیتم نامعتبر است"

            };

        }

        const itemId =
            item.id;

        if (!itemId) {

            return {

                success: false,

                error:
                    "شناسه آیتم وجود ندارد"

            };

        }

        const shop =
            getShop();

        if (
            shop.purchasedItems.includes(
                itemId
            )
        ) {

            return {

                success: false,

                error:
                    "این آیتم قبلاً خریداری شده است"

            };

        }

        const price =
            Math.max(
                0,
                Number(
                    item.price
                ) || 0
            );

        const payment =
            spendCoins(
                price,
                "خرید " +
                (
                    item.name ||
                    itemId
                )
            );

        if (!payment.success) {

            return payment;

        }

        shop.purchasedItems.push(
            itemId
        );

        if (
            item.type ===
            "avatar"
        ) {

            if (
                !shop.ownedAvatars.includes(
                    itemId
                )
            ) {

                shop.ownedAvatars.push(
                    itemId
                );

            }

        }

        if (
            item.type ===
            "frame"
        ) {

            if (
                !shop.ownedFrames.includes(
                    itemId
                )
            ) {

                shop.ownedFrames.push(
                    itemId
                );

            }

        }

        if (
            item.type ===
            "card"
        ) {

            if (
                !shop.ownedCardDesigns.includes(
                    itemId
                )
            ) {

                shop.ownedCardDesigns.push(
                    itemId
                );

            }

        }

        if (
            item.type ===
            "table"
        ) {

            if (
                !shop.ownedTableDesigns.includes(
                    itemId
                )
            ) {

                shop.ownedTableDesigns.push(
                    itemId
                );

            }

        }

        shop.purchaseHistory.unshift({

            id:
                generateId(
                    "purchase"
                ),

            itemId:
                itemId,

            itemName:
                item.name ||
                itemId,

            price:
                price,

            createdAt:
                now()

        });

        saveShop(
            shop
        );

        return {

            success: true,

            item:
                item,

            balance:
                getCoins()

        };

    }


    function equipItem(
        type,
        itemId
    ) {

        const shop =
            getShop();

        if (
            type === "avatar"
        ) {

            if (
                !shop.ownedAvatars.includes(
                    itemId
                )
            ) {

                return false;

            }

            shop.equippedAvatar =
                itemId;

            const profile =
                getProfile();

            profile.avatarId =
                itemId;

            saveProfile(
                profile
            );

        }


        if (
            type === "frame"
        ) {

            if (
                !shop.ownedFrames.includes(
                    itemId
                )
            ) {

                return false;

            }

            shop.equippedFrame =
                itemId;

        }


        if (
            type === "card"
        ) {

            if (
                !shop.ownedCardDesigns.includes(
                    itemId
                )
            ) {

                return false;

            }

            shop.equippedCardDesign =
                itemId;

        }


        if (
            type === "table"
        ) {

            if (
                !shop.ownedTableDesigns.includes(
                    itemId
                )
            ) {

                return false;

            }

            shop.equippedTableDesign =
                itemId;

        }


        saveShop(
            shop
        );

        return true;

    }


    /* ========================================================
       CHAT
    ======================================================== */

    function getChat() {

        return mergeObjects(

            DEFAULT_CHAT,

            get(
                KEYS.CHAT,
                DEFAULT_CHAT
            )

        );

    }


    function saveChat(
        chat
    ) {

        const updated =
            mergeObjects(
                getChat(),
                chat
            );

        set(
            KEYS.CHAT,
            updated
        );

        return updated;

    }


    function addChatMessage(
        roomId,
        message
    ) {

        if (!roomId || !message) {

            return null;

        }

        const chat =
            getChat();

        if (
            !Array.isArray(
                chat.rooms[roomId]
            )
        ) {

            chat.rooms[roomId] =
                [];

        }

        const item =
            mergeObjects(

                {

                    id:
                        generateId(
                            "message"
                        ),

                    roomId:
                        roomId,

                    senderId:
                        null,

                    senderName:
                        "بازیکن",

                    message:
                        "",

                    createdAt:
                        now()

                },

                message

            );

        chat.rooms[
            roomId
        ].push(
            item
        );

        trimArray(
            chat.rooms[roomId],
            STORAGE_CONFIG.maxMessages
        );

        chat.currentRoomId =
            roomId;

        saveChat(
            chat
        );

        return item;

    }


    function getChatMessages(
        roomId
    ) {

        const chat =
            getChat();

        if (
            !roomId
        ) {

            return [];

        }

        if (
            !Array.isArray(
                chat.rooms[roomId]
            )
        ) {

            return [];

        }

        return chat.rooms[
            roomId
        ];

    }


    /* ========================================================
       LEADERBOARD
    ======================================================== */

    function getLeaderboard() {

        return mergeObjects(

            DEFAULT_LEADERBOARD,

            get(
                KEYS.LEADERBOARD,
                DEFAULT_LEADERBOARD
            )

        );

    }


    function saveLeaderboard(
        leaderboard
    ) {

        const updated =
            mergeObjects(

                getLeaderboard(),

                leaderboard

            );

        updated.updatedAt =
            now();

        set(
            KEYS.LEADERBOARD,
            updated
        );

        return updated;

    }


    /* ========================================================
       DAILY DATA
    ======================================================== */

    function getTodayKey() {

        const date =
            new Date();

        return (

            date.getFullYear() +
            "-" +
            String(
                date.getMonth() + 1
            ).padStart(2, "0") +
            "-" +
            String(
                date.getDate()
            ).padStart(2, "0")

        );

    }


    function getDailyData() {

        const current =
            get(
                KEYS.DAILY_DATA,
                DEFAULT_DAILY_DATA
            );

        const today =
            getTodayKey();

        if (
            current.date !== today
        ) {

            const fresh =
                deepClone(
                    DEFAULT_DAILY_DATA
                );

            fresh.date =
                today;

            set(
                KEYS.DAILY_DATA,
                fresh
            );

            return fresh;

        }

        return mergeObjects(

            DEFAULT_DAILY_DATA,

            current

        );

    }


    function saveDailyData(
        data
    ) {

        const updated =
            mergeObjects(

                getDailyData(),

                data

            );

        updated.date =
            getTodayKey();

        set(
            KEYS.DAILY_DATA,
            updated
        );

        return updated;

    }


    function incrementDailyStat(
        field,
        amount
    ) {

        const daily =
            getDailyData();

        const numericAmount =
            Number(amount) || 1;

        daily[field] =
            (
                Number(
                    daily[field]
                ) || 0
            ) +
            numericAmount;

        saveDailyData(
            daily
        );

        return daily[field];

    }


    /* ========================================================
       APP STATE
    ======================================================== */

    function getAppState() {

        return mergeObjects(

            DEFAULT_APP_STATE,

            get(
                KEYS.APP_STATE,
                DEFAULT_APP_STATE
            )

        );

    }


    function saveAppState(
        state
    ) {

        const updated =
            mergeObjects(

                getAppState(),

                state

            );

        updated.lastSavedAt =
            now();

        set(
            KEYS.APP_STATE,
            updated
        );

        return updated;

    }


    function setCurrentPage(
        page
    ) {

        const state =
            getAppState();

        state.previousPage =
            state.currentPage;

        state.currentPage =
            page;

        saveAppState(
            state
        );

        return state;

    }


    /* ========================================================
       META
    ======================================================== */

    function getMeta() {

        return mergeObjects(

            DEFAULT_META,

            get(
                KEYS.META,
                DEFAULT_META
            )

        );

    }


    function saveMeta(
        meta
    ) {

        const updated =
            mergeObjects(

                getMeta(),

                meta

            );

        updated.updatedAt =
            now();

        set(
            KEYS.META,
            updated
        );

        return updated;

    }


    /* ========================================================
       ARRAY UTILITY
    ======================================================== */

    function trimArray(
        array,
        maximum
    ) {

        if (
            !Array.isArray(array)
        ) {

            return array;

        }

        if (
            array.length >
            maximum
        ) {

            array.splice(
                maximum
            );

        }

        return array;

    }


    /* ========================================================
       INITIALIZE STORAGE
    ======================================================== */

    function initialize() {

        const initialized =
            rawExists(
                KEYS.META
            );

        if (!initialized) {

            const timestamp =
                now();

            const meta =
                deepClone(
                    DEFAULT_META
                );

            meta.createdAt =
                timestamp;

            meta.updatedAt =
                timestamp;

            saveMeta(
                meta
            );

            set(
                KEYS.PROFILE,
                deepClone(
                    DEFAULT_PROFILE
                )
            );

            set(
                KEYS.AUTH,
                deepClone(
                    DEFAULT_AUTH
                )
            );

            set(
                KEYS.SETTINGS,
                deepClone(
                    DEFAULT_SETTINGS
                )
            );

            set(
                KEYS.WALLET,
                deepClone(
                    DEFAULT_WALLET
                )
            );

            set(
                KEYS.SHOP,
                deepClone(
                    DEFAULT_SHOP
                )
            );

            set(
                KEYS.FRIENDS,
                []
            );

            set(
                KEYS.FRIEND_REQUESTS,
                []
            );

            set(
                KEYS.NOTIFICATIONS,
                []
            );

            set(
                KEYS.MISSIONS,
                deepClone(
                    DEFAULT_MISSIONS
                )
            );

            set(
                KEYS.ACHIEVEMENTS,
                []
            );

            set(
                KEYS.GAME_HISTORY,
                []
            );

            set(
                KEYS.CURRENT_GAME,
                deepClone(
                    DEFAULT_CURRENT_GAME
                )
            );

            set(
                KEYS.CURRENT_ROOM,
                deepClone(
                    DEFAULT_CURRENT_ROOM
                )
            );

            set(
                KEYS.CHAT,
                deepClone(
                    DEFAULT_CHAT
                )
            );

            set(
                KEYS.LEADERBOARD,
                deepClone(
                    DEFAULT_LEADERBOARD
                )
            );

            set(
                KEYS.DAILY_DATA,
                deepClone(
                    DEFAULT_DAILY_DATA
                )
            );

            set(
                KEYS.APP_STATE,
                deepClone(
                    DEFAULT_APP_STATE
                )
            );

        }

        runMigrations();

        const state =
            getAppState();

        state.initialized =
            true;

        state.firstLaunch =
            !initialized;

        state.lastOpenedAt =
            now();

        saveAppState(
            state
        );

        return true;

    }


    /* ========================================================
       MIGRATION SYSTEM
    ======================================================== */

    function runMigrations() {

        const meta =
            getMeta();

        const currentVersion =
            Number(
                meta.schemaVersion
            ) || 1;

        const targetVersion =
            STORAGE_CONFIG.schemaVersion;

        if (
            currentVersion >=
            targetVersion
        ) {

            return;

        }

        for (
            let version =
                currentVersion + 1;

            version <=
            targetVersion;

            version++
        ) {

            applyMigration(
                version
            );

            meta.migrationsApplied.push(
                version
            );

        }

        meta.schemaVersion =
            targetVersion;

        meta.version =
            STORAGE_CONFIG.version;

        saveMeta(
            meta
        );

    }


    function applyMigration(
        version
    ) {

        switch (version) {

            case 2:

                /*
                 * Future migration.
                 */

                break;


            case 3:

                /*
                 * Future migration.
                 */

                break;


            default:

                break;

        }

    }


    /* ========================================================
       BACKUP
    ======================================================== */

    function createBackup() {

        const backup = {

            version:
                STORAGE_CONFIG.backupVersion,

            createdAt:
                now(),

            data: {}

        };

        Object.keys(
            KEYS
        ).forEach(
            function (name) {

                const key =
                    KEYS[name];

                backup.data[key] =
                    rawGet(
                        key,
                        null
                    );

            }
        );

        set(
            KEYS.BACKUP,
            backup
        );

        const meta =
            getMeta();

        meta.lastBackupAt =
            backup.createdAt;

        saveMeta(
            meta
        );

        return backup;

    }


    function getBackup() {

        return get(
            KEYS.BACKUP,
            null
        );

    }


    /* ========================================================
       RESTORE BACKUP
    ======================================================== */

    function restoreBackup(
        backup
    ) {

        if (
            !backup ||
            !backup.data
        ) {

            return {

                success: false,

                error:
                    "Backup نامعتبر است"

            };

        }

        try {

            Object.keys(
                backup.data
            ).forEach(
                function (key) {

                    if (
                        key ===
                        KEYS.BACKUP
                    ) {

                        return;

                    }

                    rawSet(
                        key,
                        backup.data[key]
                    );

                }
            );

            return {

                success: true

            };

        } catch (error) {

            console.error(
                "[HokmStorage] Restore error:",
                error
            );

            return {

                success: false,

                error:
                    error.message

            };

        }

    }


    /* ========================================================
       EXPORT DATA
    ======================================================== */

    function exportData() {

        const data = {

            application:
                "Hokm Online",

            version:
                STORAGE_CONFIG.version,

            exportedAt:
                now(),

            data: {}

        };

        Object.keys(
            KEYS
        ).forEach(
            function (name) {

                const key =
                    KEYS[name];

                if (
                    key ===
                    KEYS.BACKUP
                ) {

                    return;

                }

                data.data[key] =
                    rawGet(
                        key,
                        null
                    );

            }
        );

        return data;

    }


    /* ========================================================
       IMPORT DATA
    ======================================================== */

    function importData(
        importedData
    ) {

        if (
            !importedData ||
            !importedData.data
        ) {

            return {

                success: false,

                error:
                    "اطلاعات وارد شده نامعتبر است"

            };

        }

        try {

            Object.keys(
                importedData.data
            ).forEach(
                function (key) {

                    if (
                        Object.values(
                            KEYS
                        ).includes(
                            key
                        )
                    ) {

                        rawSet(
                            key,
                            importedData.data[key]
                        );

                    }

                }
            );

            return {

                success: true

            };

        } catch (error) {

            console.error(
                "[HokmStorage] Import error:",
                error
            );

            return {

                success: false,

                error:
                    error.message

            };

        }

    }


    /* ========================================================
       CLEAR CURRENT SESSION
    ======================================================== */

    function clearSession() {

        clearCurrentGame();

        clearCurrentRoom();

        const chat =
            getChat();

        chat.currentRoomId =
            null;

        saveChat(
            chat
        );

        return true;

    }


    /* ========================================================
       CLEAR ALL DATA
    ======================================================== */

    function clearAll() {

        if (
            !isStorageAvailable()
        ) {

            return false;

        }

        try {

            const prefix =
                STORAGE_CONFIG.prefix;

            const keysToRemove =
                [];

            for (
