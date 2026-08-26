/* ============================================================
   HOKM ONLINE
   CONFIGURATION FILE
   Stage 24
   File: config.js

   توضیح:
   این فایل مرکز تنظیمات پروژه بازی حکم است.

   وظایف این فایل:
   1. تنظیمات عمومی برنامه
   2. تنظیمات محیط اجرا
   3. تنظیمات Supabase
   4. تنظیمات API
   5. تنظیمات بازی حکم
   6. تنظیمات بازیکنان
   7. تنظیمات کارت‌ها و خال‌ها
   8. تنظیمات اتاق بازی
   9. تنظیمات Matchmaking
   10. تنظیمات چت
   11. تنظیمات پروفایل
   12. تنظیمات سکه و XP
   13. تنظیمات مأموریت‌ها
   14. تنظیمات رتبه‌بندی
   15. تنظیمات اعلان‌ها
   16. تنظیمات ذخیره‌سازی محلی
   17. تنظیمات UI
   18. تنظیمات صدا و لرزش
   19. Feature Flags
   20. تنظیمات امنیتی سمت کلاینت
   21. توابع کمکی
   22. سازگاری با فایل‌های قبلی پروژه

   نکته مهم:
   هیچ Secret یا Service Role Key نباید در این فایل قرار بگیرد.
   فقط Supabase URL و Anon/Public Key برای کلاینت مجاز هستند.
============================================================ */


/* ============================================================
   GLOBAL ROOT
============================================================ */

(function () {
    "use strict";


    /* ==========================================================
       ENVIRONMENT
    ========================================================== */

    const runtimeEnvironment =
        window.__HOKM_ENVIRONMENT__ ||
        "development";


    const runtimeSettings =
        window.__HOKM_RUNTIME_CONFIG__ ||
        {};



    /* ==========================================================
       APPLICATION INFORMATION
    ========================================================== */

    const APP = {

        name: "حکم",

        englishName: "Hokm Online",

        version: "1.0.0",

        configVersion: "1.0.0",

        environment: runtimeEnvironment,

        language: "fa",

        locale: "fa-IR",

        direction: "rtl",

        timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "Asia/Tehran",

        platform: "web",

        mobileFirst: true,

        supportedPlatforms: [
            "android",
            "ios",
            "web"
        ],

        developerMode:
            runtimeEnvironment === "development",

        debug:
            runtimeEnvironment === "development",

        maintenanceMode: false,

        minimumSupportedVersion: "1.0.0"

    };



    /* ==========================================================
       ENVIRONMENT SETTINGS
    ========================================================== */

    const ENVIRONMENT = {

        development: {
            name: "development",

            enableLogs: true,

            enableDebugPanel: true,

            enableLocalStorage: true,

            enableOfflineMode: true,

            enableMockData: true,

            enableMockPlayers: true,

            enableAnalytics: false,

            enableCrashReporting: false
        },


        production: {
            name: "production",

            enableLogs: false,

            enableDebugPanel: false,

            enableLocalStorage: true,

            enableOfflineMode: false,

            enableMockData: false,

            enableMockPlayers: false,

            enableAnalytics: true,

            enableCrashReporting: true
        },


        testing: {
            name: "testing",

            enableLogs: true,

            enableDebugPanel: true,

            enableLocalStorage: false,

            enableOfflineMode: true,

            enableMockData: true,

            enableMockPlayers: true,

            enableAnalytics: false,

            enableCrashReporting: false
        }

    };



    const CURRENT_ENVIRONMENT =
        ENVIRONMENT[runtimeEnvironment] ||
        ENVIRONMENT.development;



    /* ==========================================================
       SUPABASE CONFIGURATION
    ========================================================== */

    /*
       این دو مقدار را بعداً با اطلاعات پروژه Supabase خودت
       جایگزین می‌کنی.

       مثال:

       window.__SUPABASE_URL__ =
           "https://xxxxxxxx.supabase.co";

       window.__SUPABASE_ANON_KEY__ =
           "eyJ...";

       فقط ANON/PUBLIC KEY مجاز است.

       هرگز این موارد را داخل فایل قرار نده:
       - service_role key
       - database password
       - JWT secret
       - private server key
    */


    const SUPABASE = {

        enabled:
            Boolean(
                window.__SUPABASE_URL__ &&
                window.__SUPABASE_ANON_KEY__
            ),

        url:
            window.__SUPABASE_URL__ ||
            "",

        anonKey:
            window.__SUPABASE_ANON_KEY__ ||
            "",

        options: {

            auth: {

                autoRefreshToken: true,

                persistSession: true,

                detectSessionInUrl: true,

                flowType: "pkce"

            },

            realtime: {

                enabled: true,

                heartbeatIntervalMs: 30000,

                reconnectDelayMs: 2000,

                maxReconnectAttempts: 10

            },

            global: {

                headers: {

                    "x-application-name":
                        "hokm-online"

                }

            }

        }

    };



    /* ==========================================================
       API CONFIGURATION
    ========================================================== */

    const API = {

        enabled: true,

        baseUrl:
            runtimeSettings.apiBaseUrl ||
            "",

        version: "v1",

        timeout: 15000,

        retry: {

            enabled: true,

            maxAttempts: 3,

            delayMs: 1000,

            backoffMultiplier: 2

        },

        endpoints: {

            health:
                "/health",

            profile:
                "/profile",

            players:
                "/players",

            rooms:
                "/rooms",

            matches:
                "/matches",

            leaderboard:
                "/leaderboard",

            friends:
                "/friends",

            notifications:
                "/notifications",

            missions:
                "/missions",

            shop:
                "/shop",

            wallet:
                "/wallet",

            chat:
                "/chat",

            reports:
                "/reports"

        }

    };



    /* ==========================================================
       GAME GENERAL SETTINGS
    ========================================================== */

    const GAME = {

        name: "Hokm",

        displayName: "حکم",

        type: "card",

        playersPerGame: 4,

        teamsPerGame: 2,

        playersPerTeam: 2,

        cardsPerDeck: 52,

        cardsPerPlayer: 13,

        suitsCount: 4,

        ranksCount: 13,

        tricksPerRound: 13,

        cardsPerTrick: 4,

        tricksRequiredToWinRound: 7,

        maxTricksPerRound: 13,

        targetTeamScore: 7,

        maxTeamScorePerRound: 13,

        firstDealer: "random",

        trumpChooser: "hakem",

        trumpMustBeSelected: true,

        mustFollowSuit: true,

        allowTrumpWhenOffSuit: true,

        allowAnyCardIfVoid: true,

        allowIllegalMoves: false,

        allowUndoMove: false,

        allowUndoAfterCardPlayed: false,

        gameStartsAfterAllPlayersReady: true,

        gameStartsAutomatically: true,

        roundStartsAutomatically: true,

        trickStartsAutomatically: true,

        nextTrickDelayMs: 1200,

        nextRoundDelayMs: 1800,

        resultDisplayDurationMs: 5000,

        turnTimeoutSeconds: 30,

        reconnectGracePeriodSeconds: 45,

        idleWarningSeconds: 20,

        maxReconnectAttempts: 10

    };



    /* ==========================================================
       HOKM RULES
    ========================================================== */

    const HOKM_RULES = {

        deck: {

            totalCards: 52,

            cardsPerSuit: 13,

            suits: [

                "spades",

                "hearts",

                "diamonds",

                "clubs"

            ],

            ranks: [

                "2",

                "3",

                "4",

                "5",

                "6",

                "7",

                "8",

                "9",

                "10",

                "J",

                "Q",

                "K",

                "A"

            ]

        },


        rankValues: {

            "2": 2,

            "3": 3,

            "4": 4,

            "5": 5,

            "6": 6,

            "7": 7,

            "8": 8,

            "9": 9,

            "10": 10,

            "J": 11,

            "Q": 12,

            "K": 13,

            "A": 14

        },


        suits: {

            spades: {

                id: "spades",

                symbol: "♠",

                name: "پیک",

                color: "black"

            },

            hearts: {

                id: "hearts",

                symbol: "♥",

                name: "دل",

                color: "red"

            },

            diamonds: {

                id: "diamonds",

                symbol: "♦",

                name: "خشت",

                color: "red"

            },

            clubs: {

                id: "clubs",

                symbol: "♣",

                name: "گشنیز",

                color: "black"

            }

        },


        scoring: {

            tricksNeededToWin: 7,

            pointsForRoundWin: 1,

            pointsForRoundLoss: 0,

            pointsForMatchWin: 1,

            shutoutBonusEnabled: true,

            shutoutBonus: 1,

            capotBonusEnabled: true,

            capotBonus: 1

        },


        legalPlay: {

            mustFollowLeadSuit: true,

            trumpBeatsNonTrump: true,

            higherTrumpBeatsLowerTrump: true,

            higherSameSuitBeatsLowerSameSuit: true,

            offSuitAllowedWhenVoid: true

        }

    };



    /* ==========================================================
       PLAYER SETTINGS
    ========================================================== */

    const PLAYER = {

        username: {

            minLength: 3,

            maxLength: 30,

            pattern:
                /^[A-Za-z0-9_\u0600-\u06FF]+$/,

            allowSpaces: false

        },


        password: {

            minLength: 8,

            maxLength: 100

        },


        email: {

            maxLength: 120

        },


        avatar: {

            default: "👤",

            maxCustomSize: 2 * 1024 * 1024,

            allowedTypes: [

                "image/jpeg",

                "image/png",

                "image/webp"

            ]

        },


        level: {

            startingLevel: 1,

            startingXP: 0,

            maxLevel: 100,

            baseXP: 100,

            xpMultiplier: 1.25

        },


        statistics: {

            games: 0,

            wins: 0,

            losses: 0,

            draws: 0,

            winRate: 0,

            totalTricks: 0,

            bestWinStreak: 0,

            currentWinStreak: 0

        }

    };



    /* ==========================================================
       ROOM SETTINGS
    ========================================================== */

    const ROOM = {

        codeLength: 6,

        codeCharacters:
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",

        minPlayers: 2,

        maxPlayers: 4,

        requiredPlayersForGame: 4,

        maxSpectators: 20,

        nameMinLength: 1,

        nameMaxLength: 40,

        defaultName: "اتاق حکم",

        privateByDefault: true,

        allowJoiningAfterGameStarted: false,

        allowSpectators: true,

        allowInviteLinks: true,

        allowRejoin: true,

        rejoinTimeoutSeconds: 45,

        autoDeleteEmptyRoom: true,

        emptyRoomDeleteAfterSeconds: 300,

        readyRequired: true,

        ownerCanStartGame: true,

        allPlayersMustBeReady: true

    };



    /* ==========================================================
       MATCHMAKING
    ========================================================== */

    const MATCHMAKING = {

        enabled: true,

        modes: {

            classic: {

                id: "classic",

                name: "حکم کلاسیک",

                players: 4,

                ranked: false,

                practice: false,

                entryFee: 0

            },


            ranked: {

                id: "ranked",

                name: "رقابتی",

                players: 4,

                ranked: true,

                practice: false,

                entryFee: 0

            },


            practice: {

                id: "practice",

                name: "تمرینی",

                players: 4,

                ranked: false,

                practice: true,

                entryFee: 0

            }

        },


        queueTimeoutSeconds: 60,

        searchIntervalMs: 2000,

        maxSearchTimeSeconds: 120,

        skillMatching: {

            enabled: true,

            initialRatingRange: 100,

            rangeIncreasePerSecond: 10,

            maximumRatingRange: 500

        }

    };



    /* ==========================================================
       RANKING SETTINGS
    ========================================================== */

    const RANKING = {

        initialRating: 1000,

        minimumRating: 0,

        maximumRating: 5000,

        kFactor: 32,

        provisionalGames: 10,

        tiers: [

            {

                id: "bronze",

                name: "برنز",

                minRating: 0,

                maxRating: 1199

            },

            {

                id: "silver",

                name: "نقره‌ای",

                minRating: 1200,

                maxRating: 1499

            },

            {

                id: "gold",

                name: "طلایی",

                minRating: 1500,

                maxRating: 1799

            },

            {

                id: "platinum",

                name: "پلاتینیوم",

                minRating: 1800,

                maxRating: 2199

            },

            {

                id: "diamond",

                name: "الماس",

                minRating: 2200,

                maxRating: 2699

            },

            {

                id: "master",

                name: "استاد",

                minRating: 2700,

                maxRating: 3199

            },

            {

                id: "grandmaster",

                name: "استاد بزرگ",

                minRating: 3200,

                maxRating: 5000

            }

        ],

        leaderboardLimit: 100,

        weeklyResetDay: 6,

        weeklyResetHour: 0

    };



    /* ==========================================================
       ECONOMY
    ========================================================== */

    const ECONOMY = {

        startingCoins: 1000,

        minimumCoins: 0,

        maximumCoins: 999999999,

        currency: {

            id: "coin",

            name: "سکه",

            symbol: "🪙"

        },


        rewards: {

            gameParticipation: 10,

            win: 50,

            loss: 10,

            rankedWin: 75,

            rankedLoss: 15,

            practiceWin: 15,

            dailyMission: 100,

            weeklyMission: 500

        },


        xp: {

            gameParticipation: 20,

            win: 50,

            loss: 10,

            rankedWin: 75,

            rankedLoss: 15,

            practiceWin: 20,

            dailyMission: 100,

            weeklyMission: 500

        },


        transaction: {

            minimumAmount: 1,

            maximumAmount: 100000000,

            preventNegativeBalance: true,

            useIntegerOnly: true

        }

    };



    /* ==========================================================
       SHOP
    ========================================================== */

    const SHOP = {

        enabled: true,

        tabs: [

            "coins",

            "items",

            "avatars"

        ],


        refreshIntervalHours: 24,

        featuredItemsLimit: 6,

        purchaseConfirmation: true,

        preventDuplicatePurchase: true,

        inventoryEnabled: true

    };



    /* ==========================================================
       FRIEND SYSTEM
    ========================================================== */

    const FRIENDS = {

        enabled: true,

        maximumFriends: 500,

        maximumPendingRequests: 100,

        requestExpirationDays: 30,

        allowBlocking: true,

        allowUnblocking: true,

        allowSearch: true,

        searchMinimumCharacters: 2,

        onlineStatusEnabled: true

    };



    /* ==========================================================
       CHAT
    ========================================================== */

    const CHAT = {

        enabled: true,

        maximumMessageLength: 250,

        minimumMessageLength: 1,

        historyLimit: 100,

        typingIndicator: true,

        typingTimeoutMs: 3000,

        messageRateLimit: {

            enabled: true,

            maxMessages: 8,

            windowSeconds: 10

        },


        profanityFilter: {

            enabled: true,

            action: "block"

        },


        spamProtection: {

            enabled: true,

            duplicateMessageLimit: 3,

            duplicateWindowSeconds: 20

        }

    };



    /* ==========================================================
       NOTIFICATIONS
    ========================================================== */

    const NOTIFICATIONS = {

        enabled: true,

        maximumStored: 100,

        autoMarkRead: false,

        types: [

            "friend_request",

            "friend_accept",

            "game_invite",

            "game_result",

            "mission_complete",

            "reward",

            "system",

            "announcement"

        ]

    };



    /* ==========================================================
       MISSIONS
    ========================================================== */

    const MISSIONS = {

        enabled: true,

        dailyResetHour: 0,

        weeklyResetDay: 6,

        dailyLimit: 3,

        weeklyLimit: 5,

        rewards: {

            daily: {

                coins: 100,

                xp: 100

            },

            weekly: {

                coins: 500,

                xp: 500

            }

        }

    };



    /* ==========================================================
       HISTORY
    ========================================================== */

    const HISTORY = {

        enabled: true,

        maximumLocalRecords: 100,

        maximumVisibleRecords: 50,

        storeCompletedGames: true,

        storePlayers: true,

        storeScores: true,

        storeResult: true,

        storeDate: true

    };



    /* ==========================================================
       PROFILE
    ========================================================== */

    const PROFILE = {

        showStatistics: true,

        showAchievements: true,

        showWinRate: true,

        showRating: true,

        showOnlineStatus: true,

        editableFields: [

            "username",

            "avatar"

        ]

    };



    /* ==========================================================
       ACHIEVEMENTS
    ========================================================== */

    const ACHIEVEMENTS = {

        enabled: true,

        maximumDisplayed: 50,

        definitions: [

            {

                id: "first_game",

                title: "اولین بازی",

                description:
                    "اولین بازی حکم خود را انجام دهید",

                requirement: {

                    type: "games",

                    value: 1

                },

                reward: {

                    coins: 50,

                    xp: 50

                }

            },


            {

                id: "first_win",

                title: "اولین پیروزی",

                description:
                    "اولین بازی خود را ببرید",

                requirement: {

                    type: "wins",

                    value: 1

                },

                reward: {

                    coins: 100,

                    xp: 100

                }

            },


            {

                id: "ten_games",

                title: "بازیکن فعال",

                description:
                    "۱۰ بازی انجام دهید",

                requirement: {

                    type: "games",

                    value: 10

                },

                reward: {

                    coins: 200,

                    xp: 200

                }

            },


            {

                id: "fifty_games",

                title: "حکم‌باز",

                description:
                    "۵۰ بازی انجام دهید",

                requirement: {

                    type: "games",

                    value: 50

                },

                reward: {

                    coins: 500,

                    xp: 500

                }

            },


            {

                id: "ten_wins",

                title: "ده پیروزی",

                description:
                    "۱۰ بازی را ببرید",

                requirement: {

                    type: "wins",

                    value: 10

                },

                reward: {

                    coins: 500,

                    xp: 500

                }

            }

        ]

    };



    /* ==========================================================
       AUDIO
    ========================================================== */

    const AUDIO = {

        enabled: true,

        musicEnabled: true,

        soundEnabled: true,

        defaultVolume: 0.7,

        musicVolume: 0.4,

        effectsVolume: 0.8,

        sounds: {

            cardPlay:
                "assets/audio/card-play.mp3",

            cardDeal:
                "assets/audio/card-deal.mp3",

            cardWin:
                "assets/audio/card-win.mp3",

            turn:
                "assets/audio/turn.mp3",

            notification:
                "assets/audio/notification.mp3",

            button:
                "assets/audio/button.mp3",

            win:
                "assets/audio/win.mp3",

            lose:
                "assets/audio/lose.mp3"

        }

    };



    /* ==========================================================
       VIBRATION
    ========================================================== */

    const VIBRATION = {

        enabled: true,

        supported:

            typeof navigator !== "undefined" &&

            "vibrate" in navigator,

        patterns: {

            button: 20,

            cardPlay: 15,

            turn: [30, 30, 30],

            notification: [50, 50, 50],

            win: [50, 50, 100],

            lose: [100]

        }

    };



    /* ==========================================================
       UI SETTINGS
    ========================================================== */

    const UI = {

        theme: "dark",

        defaultTheme: "dark",

        responsive: true,

        mobileFirst: true,

        animations: true,

        reducedMotionRespect: true,

        touchSupport: true,

        minimumTouchTarget: 44,

        toastDurationMs: 3000,

        modalAnimationDurationMs: 250,

        pageTransitionDurationMs: 250,

        loadingMinimumDurationMs: 500,

        notificationBadgeMaximum: 99

    };



    /* ==========================================================
       CARD UI SETTINGS
    ========================================================== */

    const CARD_UI = {

        animationDurationMs: 250,

        hoverEnabled: true,

        dragEnabled: false,

        selectable: true,

        selectedOffsetPx: 18,

        disabledOpacity: 0.55,

        playableOpacity: 1,

        cardWidthMobile: 64,

        cardHeightMobile: 92,

        cardWidthTablet: 74,

        cardHeightTablet: 106,

        cardWidthDesktop: 82,

        cardHeightDesktop: 118,

        overlapMobile: 22,

        overlapTablet: 28,

        overlapDesktop: 34

    };



    /* ==========================================================
       CONNECTION SETTINGS
    ========================================================== */

    const CONNECTION = {

        enabled: true,

        pingIntervalMs: 15000,

        timeoutMs: 10000,

        reconnect: {

            enabled: true,

            initialDelayMs: 1000,

            maximumDelayMs: 30000,

            multiplier: 2,

            maximumAttempts: 10

        },


        status: {

            onlineText: "متصل",

            offlineText: "اتصال اینترنت قطع شده است",

            reconnectingText: "در حال اتصال مجدد...",

            connectingText: "در حال اتصال..."

        }

    };



    /* ==========================================================
       LOCAL STORAGE
    ========================================================== */

    const STORAGE = {

        enabled: true,

        prefix: "hokm_",

        keys: {

            session:
                "hokm_session",

            user:
                "hokm_user",

            profile:
                "hokm_profile",

            settings:
                "hokm_settings",

            game:
                "hokm_game",

            room:
                "hokm_room",

            history:
                "hokm_history",

            missions:
                "hokm_missions",

            friends:
                "hokm_friends",

            notifications:
                "hokm_notifications",

            inventory:
                "hokm_inventory",

            wallet:
                "hokm_wallet",

            chat:
                "hokm_chat",

            theme:
                "hokm_theme"

        },

        expiration: {

            sessionDays: 30,

            cacheDays: 7,

            historyDays: 90

        }

    };



    /* ==========================================================
       SECURITY SETTINGS
    ========================================================== */

    const SECURITY = {

        clientSideValidation: true,

        sanitizeUserInput: true,

        preventHtmlInChat: true,

        maxLoginAttempts: 5,

        loginLockoutMinutes: 15,

        sessionTimeoutMinutes: 60 * 24 * 30,

        requireHttpsInProduction: true,

        allowLocalhostInDevelopment: true,

        neverStorePassword: true,

        neverStorePlainTextPassword: true,

        neverStoreServiceRoleKey: true,

        neverTrustClientScore: true,

        neverTrustClientCoins: true,

        neverTrustClientWinner: true

    };



    /* ==========================================================
       RATE LIMITS
    ========================================================== */

    const RATE_LIMITS = {

        login: {

            maxRequests: 5,

            windowSeconds: 60

        },


        register: {

            maxRequests: 3,

            windowSeconds: 300

        },


        roomCreate: {

            maxRequests: 10,

            windowSeconds: 60

        },


        roomJoin: {

            maxRequests: 20,

            windowSeconds: 60

        },


        friendRequest: {

            maxRequests: 20,

            windowSeconds: 300

        },


        chat: {

            maxRequests: 8,

            windowSeconds: 10

        }

    };



    /* ==========================================================
       FEATURE FLAGS
    ========================================================== */

    const FEATURES = {

        authentication: true,

        guestLogin: true,

        registration: true,

        passwordReset: true,

        profile: true,

        friends: true,

        privateRooms: true,

        quickMatch: true,

        classicMode: true,

        rankedMode: true,

        practiceMode: true,

        multiplayer: true,

        realtime: true,

        chat: true,

        shop: true,

        wallet: true,

        leaderboard: true,

        missions: true,

        achievements: true,

        notifications: true,

        history: true,

        settings: true,

        sound: true,

        music: true,

        vibration: true,

        offlineMode: true,

        analytics: false,

        pushNotifications: false,

        tournaments: false,

        clans: false,

        spectatorMode: false,

        voiceChat: false,

        privateMessaging: false

    };



    /* ==========================================================
       ANALYTICS
    ========================================================== */

    const ANALYTICS = {

        enabled:
            Boolean(CURRENT_ENVIRONMENT.enableAnalytics),

        trackPageViews: true,

        trackGameEvents: true,

        trackErrors: true,

        trackPerformance: true,

        anonymize: true,

        events: [

            "app_open",

            "login",

            "register",

            "guest_login",

            "room_created",

            "room_joined",

            "game_started",

            "card_played",

            "trick_completed",

            "round_completed",

            "game_completed",

            "mission_completed",

            "shop_purchase",

            "friend_added",

            "logout"

        ]

    };



    /* ==========================================================
       ERROR HANDLING
    ========================================================== */

    const ERRORS = {

        showTechnicalDetails:
            runtimeEnvironment === "development",

        logToConsole:
            CURRENT_ENVIRONMENT.enableLogs,

        maximumStoredErrors: 50,

        messages: {

            generic:
                "خطایی رخ داد. دوباره تلاش کنید.",

            network:
                "اتصال به سرور برقرار نشد.",

            authentication:
                "احراز هویت انجام نشد.",

            room:
                "مشکلی در اتاق بازی رخ داد.",

            game:
                "مشکلی در بازی رخ داد.",

            database:
                "خطا در ارتباط با پایگاه داده.",

            permission:
                "شما اجازه انجام این کار را ندارید."

        }

    };



    /* ==========================================================
       DATE & TIME
    ========================================================== */

    const DATE_TIME = {

        locale: "fa-IR",

        hour12: false,

        defaultDateFormat:
            "yyyy/MM/dd",

        defaultTimeFormat:
            "HH:mm",

        isoFormat: true,

        serverTimePreferred: true

    };



    /* ==========================================================
       CACHE
    ========================================================== */

    const CACHE = {

        enabled: true,

        version: "1",

        maximumAgeSeconds:
            60 * 60 * 24 * 7,

        keys: {

            profile:
                "profile",

            leaderboard:
                "leaderboard",

            shop:
                "shop",

            missions:
                "missions",

            friends:
                "friends"

        }

    };



    /* ==========================================================
       DATABASE TABLE NAMES
    ========================================================== */

    /*
       این نام‌ها باید با جدول‌هایی که در database.sql
       مرحله ۲۳ ساخته شده‌اند هماهنگ باشند.

       در صورت تغییر نام جدول در SQL، فقط این بخش
       باید اصلاح شود.
    */

    const DATABASE = {

        schema: "public",

        tables: {

            profiles:
                "profiles",

            users:
                "users",

            rooms:
                "rooms",

            roomPlayers:
                "room_players",

            games:
                "games",

            gamePlayers:
                "game_players",

            rounds:
                "rounds",

            tricks:
                "tricks",

            playedCards:
                "played_cards",

            friends:
                "friends",

            friendRequests:
                "friend_requests",

            notifications:
                "notifications",

            missions:
                "missions",

            playerMissions:
                "player_missions",

            achievements:
                "achievements",

            playerAchievements:
                "player_achievements",

            leaderboard:
                "leaderboard",

            wallet:
                "wallet",

            walletTransactions:
                "wallet_transactions",

            shopItems:
                "shop_items",

            inventory:
                "inventory",

            chatMessages:
                "chat_messages",

            reports:
                "reports",

            settings:
                "settings"

        }

    };



    /* ==========================================================
       REALTIME CHANNELS
    ========================================================== */

    const REALTIME = {

        enabled: true,

        channels: {

            room:
                "room:",

            game:
                "game:",

            chat:
                "chat:",

            player:
                "player:",

            notifications:
                "notifications:"

        },


        events: {

            playerJoined:
                "player_joined",

            playerLeft:
                "player_left",

            playerReady:
                "player_ready",

            gameStarted:
                "game_started",

            cardPlayed:
                "card_played",

            trickCompleted:
                "trick_completed",

            roundCompleted:
                "round_completed",

            gameCompleted:
                "game_completed",

            playerDisconnected:
                "player_disconnected",

            playerReconnected:
                "player_reconnected",

            chatMessage:
                "chat_message",

            roomUpdated:
                "room_updated"

        }

    };



    /* ==========================================================
       GAME STATES
    ========================================================== */

    const GAME_STATES = {

        IDLE:
            "idle",

        CREATING:
            "creating",

        WAITING:
            "waiting",

        READY:
            "ready",

        STARTING:
            "starting",

        DEALING:
            "dealing",

        TRUMP_SELECTION:
            "trump_selection",

        PLAYING:
            "playing",

        TRICK_COMPLETE:
            "trick_complete",

        ROUND_COMPLETE:
            "round_complete",

        GAME_COMPLETE:
            "game_complete",

        PAUSED:
            "paused",

        RECONNECTING:
            "reconnecting",

        ABANDONED:
            "abandoned",

        ERROR:
            "error"

    };



    /* ==========================================================
       PLAYER POSITIONS
    ========================================================== */

    const PLAYER_POSITIONS = {

        BOTTOM:
            "bottom",

        LEFT:
            "left",

        TOP:
            "top",

        RIGHT:
            "right"

    };



    /* ==========================================================
       TEAM SETTINGS
    ========================================================== */

    const TEAMS = {

        A: {

            id: "team-a",

            name: "تیم شما",

            players: [

                0,

                2

            ]

        },


        B: {

            id: "team-b",

            name: "حریف",

            players: [

                1,

                3

            ]

        }

    };



    /* ==========================================================
       CARD RANK ORDER
    ========================================================== */

    const CARD_RANK_ORDER = [

        "2",

        "3",

        "4",

        "5",

        "6",

        "7",

        "8",

        "9",

        "10",

        "J",

        "Q",

        "K",

        "A"

    ];



    /* ==========================================================
       CARD SUIT ORDER
    ========================================================== */

    const CARD_SUIT_ORDER = [

        "spades",

        "hearts",

        "diamonds",

        "clubs"

    ];



    /* ==========================================================
       DEFAULT SETTINGS
    ========================================================== */

    const DEFAULT_SETTINGS = {

        sound: true,

        music: true,

        vibration: true,

        darkMode: true,

        language: "fa",

        notifications: true,

        autoSortCards: true,

        showAnimations: true,

        showTurnIndicator: true,

        confirmLeaveGame: true

    };



    /* ==========================================================
       VALIDATION CONFIGURATION
    ========================================================== */

    const VALIDATION = {

        roomCode: {

            minLength:
                ROOM.codeLength,

            maxLength:
                ROOM.codeLength,

            pattern:
                /^[A-Z0-9]+$/

        },


        roomName: {

            minLength:
                ROOM.nameMinLength,

            maxLength:
                ROOM.nameMaxLength

        },


        chatMessage: {

            minLength:
                CHAT.minimumMessageLength,

            maxLength:
                CHAT.maximumMessageLength

        },


        username: {

            minLength:
                PLAYER.username.minLength,

            maxLength:
                PLAYER.username.maxLength,

            pattern:
                PLAYER.username.pattern

        }

    };



    /* ==========================================================
       HELPER FUNCTIONS
    ========================================================== */


    function isProduction() {

        return APP.environment === "production";

    }



    function isDevelopment() {

        return APP.environment === "development";

    }



    function isTesting() {

        return APP.environment === "testing";

    }



    function getSupabaseConfig() {

        return {

            url: SUPABASE.url,

            anonKey: SUPABASE.anonKey,

            enabled: SUPABASE.enabled,

            options: SUPABASE.options

        };

    }



    function getApiUrl(endpoint = "") {

        const base =
            String(API.baseUrl || "")
                .replace(/\/+$/, "");

        const path =
            String(endpoint || "")
                .replace(/^\/+/, "");

        if (!base) {

            return path
                ? `/${path}`
                : "";

        }

        return path
            ? `${base}/${path}`
            : base;

    }



    function getStorageKey(key) {

        const storageKey =
            STORAGE.keys[key] || key;

        return `${STORAGE.prefix}${storageKey}`;

    }



    function getSuit(suitId) {

        return HOKM_RULES.suits[suitId] || null;

    }



    function getRankValue(rank) {

        return HOKM_RULES.rankValues[rank] || 0;

    }



    function isValidSuit(suit) {

        return CARD_SUIT_ORDER.includes(suit);

    }



    function isValidRank(rank) {

        return CARD_RANK_ORDER.includes(rank);

    }



    function getTeamByPlayerIndex(playerIndex) {

        if (
            TEAMS.A.players.includes(playerIndex)
        ) {

            return TEAMS.A;

        }

        if (
            TEAMS.B.players.includes(playerIndex)
        ) {

            return TEAMS.B;

        }

        return null;

    }



    function getPlayerPosition(index) {

        const positions = [

            PLAYER_POSITIONS.BOTTOM,

            PLAYER_POSITIONS.LEFT,

            PLAYER_POSITIONS.TOP,

            PLAYER_POSITIONS.RIGHT

        ];

        return positions[index] || null;

    }



    function getGameStateLabel(state) {

        const labels = {

            idle:
                "آماده",

            creating:
                "در حال ساخت",

            waiting:
                "در انتظار بازیکنان",

            ready:
                "آماده",

            starting:
                "در حال شروع",

            dealing:
                "در حال پخش کارت",

            trump_selection:
                "انتخاب حکم",

            playing:
                "در حال بازی",

            trick_complete:
                "پایان دست",

            round_complete:
                "پایان راند",

            game_complete:
                "پایان بازی",

            paused:
                "متوقف",

            reconnecting:
                "در حال اتصال مجدد",

            abandoned:
                "ترک شده",

            error:
                "خطا"

        };

        return labels[state] || state;

    }



    function getRatingTier(rating) {

        const value =
            Number(rating) || 0;

        return (
            RANKING.tiers.find(
                tier =>
                    value >= tier.minRating &&
                    value <= tier.maxRating
            ) ||
            RANKING.tiers[0]
        );

    }



    function calculateLevelFromXP(xp) {

        let level =
            PLAYER.level.startingLevel;

        let requiredXP =
            PLAYER.level.baseXP;

        let remainingXP =
            Math.max(0, Number(xp) || 0);


        while (
            remainingXP >= requiredXP &&
            level < PLAYER.level.maxLevel
        ) {

            remainingXP -= requiredXP;

            level += 1;

            requiredXP =
                Math.floor(
                    PLAYER.level.baseXP *
                    Math.pow(
                        PLAYER.level.xpMultiplier,
                        level - 1
                    )
                );

        }


        return {

            level,

            currentXP:
                remainingXP,

            nextLevelXP:
                requiredXP

        };

    }



    function calculateWinRate(
        wins,
        games
    ) {

        const totalGames =
            Number(games) || 0;

        const totalWins =
            Number(wins) || 0;

        if (totalGames <= 0) {

            return 0;

        }

        return Math.round(
            (totalWins / totalGames) * 100
        );

    }



    function generateRoomCode() {

        let code = "";

        const chars =
            ROOM.codeCharacters;

        for (
            let i = 0;
            i < ROOM.codeLength;
            i++
        ) {

            const index =
                Math.floor(
                    Math.random() * chars.length
                );

            code += chars[index];

        }

        return code;

    }



    function sanitizeText(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        const text =
            String(value);

        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }



    function isValidUsername(username) {

        const value =
            String(username || "").trim();

        if (
            value.length <
            PLAYER.username.minLength
        ) {

            return false;

        }

        if (
            value.length >
            PLAYER.username.maxLength
        ) {

            return false;

        }

        return PLAYER.username.pattern.test(value);

    }



    function isValidRoomCode(code) {

        const value =
            String(code || "")
                .trim()
                .toUpperCase();

        return (
            value.length === ROOM.codeLength &&
            VALIDATION.roomCode.pattern.test(value)
        );

    }



    function isValidChatMessage(message) {

        const value =
            String(message || "").trim();

        return (
            value.length >= CHAT.minimumMessageLength &&
            value.length <= CHAT.maximumMessageLength
        );

    }



    function clamp(
        value,
        min,
        max
    ) {

        const number =
            Number(value);

        if (Number.isNaN(number)) {

            return min;

        }

        return Math.min(
            Math.max(number, min),
            max
        );

    }



    function deepFreeze(object) {

        if (
            object === null ||
            typeof object !== "object"
        ) {

            return object;

        }

        Object.freeze(object);

        Object.getOwnPropertyNames(object)
            .forEach(
                property => {

                    const value =
                        object[property];

                    if (
                        value &&
                        typeof value === "object" &&
                        !Object.isFrozen(value)
                    ) {

                        deepFreeze(value);

                    }

                }
            );

        return object;

    }



    /* ==========================================================
       CONFIG OBJECT
    ========================================================== */

    const HOKM_CONFIG = {

        APP,

        ENVIRONMENT,

        CURRENT_ENVIRONMENT,

        SUPABASE,

        API,

        GAME,

        HOKM_RULES,

        PLAYER,

        ROOM,

        MATCHMAKING,

        RANKING,

        ECONOMY,

        SHOP,

        FRIENDS,

        CHAT,

        NOTIFICATIONS,

        MISSIONS,

        HISTORY,

        PROFILE,

        ACHIEVEMENTS,

        AUDIO,

        VIBRATION,

        UI,

        CARD_UI,

        CONNECTION,

        STORAGE,

        SECURITY,

        RATE_LIMITS,

        FEATURES,

        ANALYTICS,

        ERRORS,

        DATE_TIME,

        CACHE,

        DATABASE,

        REALTIME,

        GAME_STATES,

        PLAYER_POSITIONS,

        TEAMS,

        CARD_RANK_ORDER,

        CARD_SUIT_ORDER,

        DEFAULT_SETTINGS,

        VALIDATION,


        helpers: {

            isProduction,

            isDevelopment,

            isTesting,

            getSupabaseConfig,

            getApiUrl,

            getStorageKey,

            getSuit,

            getRankValue,

            isValidSuit,

            isValidRank,

            getTeamByPlayerIndex,

            getPlayerPosition,

            getGameStateLabel,

            getRatingTier,

            calculateLevelFromXP,

            calculateWinRate,

            generateRoomCode,

            sanitizeText,

            isValidUsername,

            isValidRoomCode,

            isValidChatMessage,

            clamp

        }

    };



    /* ==========================================================
       BACKWARD COMPATIBILITY
    ========================================================== */

    /*
       برای اینکه فایل‌های قبلی پروژه بتوانند از نام‌های مختلف
       تنظیمات استفاده کنند، چند Alias عمومی نیز قرار می‌دهیم.
    */


    window.HOKM_CONFIG =
        deepFreeze(HOKM_CONFIG);


    window.APP_CONFIG =
        window.HOKM_CONFIG;


    window.CONFIG =
        window.HOKM_CONFIG;



    /* ==========================================================
       BACKWARD COMPATIBILITY CONSTANTS
    ========================================================== */

    window.HOKM_GAME_CONFIG =
        HOKM_CONFIG.GAME;


    window.HOKM_RULES =
        HOKM_CONFIG.HOKM_RULES;


    window.HOKM_SUPABASE_CONFIG =
        HOKM_CONFIG.SUPABASE;


    window.HOKM_STORAGE_CONFIG =
        HOKM_CONFIG.STORAGE;



    /* ==========================================================
       DEVELOPMENT LOG
    ========================================================== */

    if (
        HOKM_CONFIG.APP.debug &&
        HOKM_CONFIG.CURRENT_ENVIRONMENT.enableLogs
    ) {

        console.log(
            "[HOKM CONFIG] Configuration loaded successfully."
        );

        console.log(
            "[HOKM CONFIG] Environment:",
            HOKM_CONFIG.APP.environment
        );

        console.log(
            "[HOKM CONFIG] Version:",
            HOKM_CONFIG.APP.version
        );

        console.log(
            "[HOKM CONFIG] Supabase enabled:",
            HOKM_CONFIG.SUPABASE.enabled
        );

    }



    /* ==========================================================
       SECURITY CHECK
    ========================================================== */

    if (
        isProduction() &&
        SECURITY.requireHttpsInProduction
    ) {

        const isLocalhost =
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1";

        const isSecure =
            location.protocol === "https:";

        if (
            !isSecure &&
            !isLocalhost
        ) {

            console.warn(
                "[HOKM SECURITY] Production mode should use HTTPS."
            );

        }

    }



    /* ==========================================================
       SUPABASE CONFIG CHECK
    ========================================================== */

    if (
        isProduction() &&
        !SUPABASE.enabled
    ) {

        console.warn(
            "[HOKM CONFIG] Supabase configuration is missing."
        );

    }



    /* ==========================================================
       PUBLIC READY FLAG
    ========================================================== */

    window.__HOKM_CONFIG_READY__ = true;



    /* ==========================================================
       END OF CONFIG.JS
    ========================================================== */

})();
