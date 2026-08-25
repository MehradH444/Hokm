/* =========================================================
   HOKM ONLINE
   LEADERBOARD SYSTEM
   File: leaderboard.js
   Stage: 16

   سیستم کامل رتبه‌بندی بازی حکم

   امکانات:
   ---------------------------------------------------------
   1. رتبه‌بندی جهانی
   2. رتبه‌بندی دوستان
   3. رتبه‌بندی هفتگی
   4. رتبه‌بندی بر اساس امتیاز
   5. رتبه‌بندی بر اساس تعداد برد
   6. رتبه‌بندی بر اساس XP
   7. رتبه‌بندی بر اساس تعداد بازی
   8. رتبه‌بندی بر اساس درصد برد
   9. رتبه‌بندی بر اساس سکه
   10. جستجوی بازیکن
   11. صفحه‌بندی
   12. نمایش رتبه بازیکن فعلی
   13. نمایش بازیکنان اطراف کاربر
   14. کش محلی
   15. حالت آفلاین
   16. پشتیبانی از Supabase در صورت اتصال
   17. بروزرسانی دستی
   18. بروزرسانی خودکار
   19. مدیریت خطا
   20. جلوگیری از درخواست‌های همزمان
   21. رندر امن HTML
   22. پشتیبانی از RTL
   23. API عمومی برای سایر فایل‌ها
   24. Event Bus داخلی
   25. اتصال به سیستم بازی
   26. اتصال به پروفایل
   27. اتصال به احراز هویت
   28. نمایش رتبه‌های اول
   29. نمایش رتبه کاربر
   30. نمایش وضعیت بارگذاری
   31. نمایش حالت خالی
   32. نمایش خطا
   33. نمایش وضعیت آفلاین
   34. پشتیبانی از صفحات بزرگ
   35. جلوگیری از XSS در داده‌های بازیکنان
========================================================= */

(function () {
    "use strict";


    /* =========================================================
       CONFIGURATION
    ========================================================== */

    const CONFIG = {

        /* نام جدول کاربران در Supabase */
        tableName: "profiles",

        /* تعداد کاربران در هر صفحه */
        pageSize: 20,

        /* حداکثر تعداد صفحات قابل نگهداری در کش */
        maxCachedPages: 10,

        /* مدت اعتبار کش */
        cacheDuration: 60 * 1000,

        /* زمان بروزرسانی خودکار */
        autoRefreshInterval: 60 * 1000,

        /* حداقل فاصله بین درخواست‌های بروزرسانی */
        refreshCooldown: 1500,

        /* کلید اصلی LocalStorage */
        storageKey: "hokm_leaderboard_cache_v1",

        /* کلید تنظیمات */
        settingsKey: "hokm_leaderboard_settings_v1",

        /* حالت پیش‌فرض */
        defaultCategory: "global",

        /* مرتب‌سازی پیش‌فرض */
        defaultSort: "rating",

        /* تعداد بازیکنان اطراف کاربر */
        nearbyPlayersCount: 2,

        /* تعداد رتبه‌های بالای جدول */
        topPlayersCount: 3
    };


    /* =========================================================
       CATEGORIES
    ========================================================== */

    const CATEGORIES = {

        global: {
            id: "global",
            title: "جهانی",
            description: "برترین بازیکنان جهان",
            sort: "rating"
        },

        friends: {
            id: "friends",
            title: "دوستان",
            description: "رتبه‌بندی بین دوستان شما",
            sort: "rating"
        },

        weekly: {
            id: "weekly",
            title: "هفتگی",
            description: "برترین بازیکنان این هفته",
            sort: "weeklyRating"
        }
    };


    /* =========================================================
       SORT OPTIONS
    ========================================================== */

    const SORT_OPTIONS = {

        rating: {
            id: "rating",
            label: "امتیاز",
            field: "rating"
        },

        wins: {
            id: "wins",
            label: "برد",
            field: "wins"
        },

        experience: {
            id: "experience",
            label: "تجربه",
            field: "experience"
        },

        games: {
            id: "games",
            label: "بازی",
            field: "games"
        },

        winRate: {
            id: "winRate",
            label: "درصد برد",
            field: "winRate"
        },

        coins: {
            id: "coins",
            label: "سکه",
            field: "coins"
        },

        weeklyRating: {
            id: "weeklyRating",
            label: "امتیاز هفتگی",
            field: "weeklyRating"
        }
    };


    /* =========================================================
       STATE
    ========================================================== */

    const state = {

        initialized: false,

        currentCategory: CONFIG.defaultCategory,

        currentSort:
            CONFIG.defaultSort,

        currentPage: 1,

        pageSize:
            CONFIG.pageSize,

        totalPlayers: 0,

        totalPages: 1,

        players: [],

        filteredPlayers: [],

        currentUser: null,

        currentUserRank: null,

        nearbyPlayers: [],

        searchQuery: "",

        loading: false,

        refreshing: false,

        error: null,

        offline: false,

        lastUpdated: 0,

        lastRequestTime: 0,

        requestId: 0,

        autoRefreshTimer: null,

        searchTimer: null,

        refreshTimer: null,

        cache: {},

        friends: [],

        initializedDom: false,

        eventListenersAttached: false
    };


    /* =========================================================
       DOM REFERENCES
    ========================================================== */

    const DOM = {

        page:
            document.getElementById("leaderboard-page"),

        list:
            document.getElementById("leaderboard-list"),

        tabs:
            document.querySelectorAll(
                ".leaderboard-tab"
            ),

        pageHeader:
            document.querySelector(
                "#leaderboard-page .page-header"
            )
    };


    /* =========================================================
       UTILITY FUNCTIONS
    ========================================================== */

    function safeString(value, fallback = "") {

        if (
            value === null ||
            value === undefined
        ) {
            return fallback;
        }

        return String(value);
    }


    function safeNumber(value, fallback = 0) {

        const number =
            Number(value);

        if (
            Number.isFinite(number)
        ) {
            return number;
        }

        return fallback;
    }


    function clamp(
        value,
        min,
        max
    ) {

        return Math.min(
            Math.max(value, min),
            max
        );
    }


    function escapeHTML(value) {

        const text =
            safeString(value);

        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatNumber(value) {

        const number =
            safeNumber(value);

        return number.toLocaleString(
            "fa-IR"
        );
    }


    function formatPercent(value) {

        const number =
            safeNumber(value);

        return `${number.toFixed(1)}٪`;
    }


    function formatDate(timestamp) {

        if (!timestamp) {
            return "نامشخص";
        }

        try {

            const date =
                new Date(timestamp);

            return date.toLocaleDateString(
                "fa-IR",
                {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );

        } catch (error) {

            return "نامشخص";
        }
    }


    function getNow() {

        return Date.now();
    }


    function isOnline() {

        return (
            typeof navigator !== "undefined" &&
            navigator.onLine !== false
        );
    }


    function generateId() {

        return (
            "lb_" +
            Date.now().toString(36) +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 10)
        );
    }


    /* =========================================================
       LOCAL STORAGE
    ========================================================== */

    function loadCache() {

        try {

            const raw =
                localStorage.getItem(
                    CONFIG.storageKey
                );

            if (!raw) {
                state.cache = {};
                return;
            }

            const parsed =
                JSON.parse(raw);

            if (
                parsed &&
                typeof parsed === "object"
            ) {

                state.cache = parsed;

            } else {

                state.cache = {};
            }

        } catch (error) {

            console.warn(
                "[Leaderboard] Cache load failed:",
                error
            );

            state.cache = {};
        }
    }


    function saveCache() {

        try {

            const entries =
                Object.entries(
                    state.cache
                );

            if (
                entries.length >
                CONFIG.maxCachedPages
            ) {

                entries
                    .sort(
                        (
                            [, a],
                            [, b]
                        ) =>
                            safeNumber(b.timestamp) -
                            safeNumber(a.timestamp)
                    )
                    .slice(
                        CONFIG.maxCachedPages
                    )
                    .forEach(
                        ([key]) => {
                            delete state.cache[key];
                        }
                    );
            }

            localStorage.setItem(
                CONFIG.storageKey,
                JSON.stringify(
                    state.cache
                )
            );

        } catch (error) {

            console.warn(
                "[Leaderboard] Cache save failed:",
                error
            );
        }
    }


    function clearCache() {

        state.cache = {};

        try {

            localStorage.removeItem(
                CONFIG.storageKey
            );

        } catch (error) {

            console.warn(
                "[Leaderboard] Cache clear failed:",
                error
            );
        }
    }


    function getCacheKey() {

        return [
            state.currentCategory,
            state.currentSort,
            state.currentPage,
            state.searchQuery
        ].join("|");
    }


    function isCacheValid(cacheItem) {

        if (!cacheItem) {
            return false;
        }

        const age =
            getNow() -
            safeNumber(
                cacheItem.timestamp
            );

        return (
            age <
            CONFIG.cacheDuration
        );
    }


    /* =========================================================
       USER / AUTH HELPERS
    ========================================================== */

    function getCurrentUserId() {

        try {

            if (
                window.hokmAuth &&
                typeof window.hokmAuth.getCurrentUser ===
                    "function"
            ) {

                const user =
                    window.hokmAuth.getCurrentUser();

                if (user) {

                    return (
                        user.id ||
                        user.userId ||
                        null
                    );
                }
            }

        } catch (error) {

            console.warn(
                "[Leaderboard] Auth lookup failed:",
                error
            );
        }


        try {

            if (
                window.hokmProfile &&
                typeof window.hokmProfile.getCurrentProfile ===
                    "function"
            ) {

                const profile =
                    window.hokmProfile.getCurrentProfile();

                if (profile) {

                    return (
                        profile.id ||
                        profile.userId ||
                        null
                    );
                }
            }

        } catch (error) {

            console.warn(
                "[Leaderboard] Profile lookup failed:",
                error
            );
        }


        try {

            const saved =
                localStorage.getItem(
                    "hokm_current_user"
                );

            if (saved) {

                const user =
                    JSON.parse(saved);

                return (
                    user.id ||
                    user.userId ||
                    null
                );
            }

        } catch (error) {
            /* Ignore */
        }


        return null;
    }


    function getCurrentUserProfile() {

        try {

            if (
                window.hokmProfile &&
                typeof window.hokmProfile.getCurrentProfile ===
                    "function"
            ) {

                const profile =
                    window.hokmProfile.getCurrentProfile();

                if (profile) {
                    return profile;
                }
            }

        } catch (error) {
            /* Ignore */
        }


        try {

            if (
                window.hokmAuth &&
                typeof window.hokmAuth.getCurrentUser ===
                    "function"
            ) {

                const user =
                    window.hokmAuth.getCurrentUser();

                if (user) {
                    return user;
                }
            }

        } catch (error) {
            /* Ignore */
        }


        return null;
    }


    /* =========================================================
       PROFILE NORMALIZATION
    ========================================================== */

    function normalizePlayer(
        rawPlayer,
        index = 0
    ) {

        const player =
            rawPlayer || {};


        const games =
            safeNumber(
                player.gamesPlayed ??
                player.games ??
                player.totalGames ??
                0
            );


        const wins =
            safeNumber(
                player.wins ??
                player.totalWins ??
                0
            );


        const losses =
            safeNumber(
                player.losses ??
                player.totalLosses ??
                Math.max(
                    games - wins,
                    0
                )
            );


        let winRate =
            safeNumber(
                player.winRate
            );


        if (
            winRate <= 0 &&
            games > 0
        ) {

            winRate =
                (wins / games) *
                100;
        }


        const experience =
            safeNumber(
                player.experience ??
                player.xp ??
                player.totalXp ??
                0
            );


        const rating =
            safeNumber(
                player.rating ??
                player.elo ??
                player.rankPoints ??
                1000
            );


        const weeklyRating =
            safeNumber(
                player.weeklyRating ??
                player.weeklyScore ??
                player.weeklyPoints ??
                rating
            );


        const coins =
            safeNumber(
                player.coins ??
                player.balance ??
                0
            );


        const level =
            safeNumber(
                player.level ??
                Math.floor(
                    experience / 100
                ) + 1,
                1
            );


        const id =
            safeString(
                player.id ??
                player.userId ??
                player.uid ??
                `player-${index}`
            );


        const username =
            safeString(
                player.username ??
                player.displayName ??
                player.name ??
                "بازیکن"
            );


        const avatar =
            safeString(
                player.avatar ??
                player.avatarUrl ??
                player.photoURL ??
                player.photoUrl ??
                "👤"
            );


        return {

            id,

            username,

            displayName:
                username,

            avatar,

            avatarUrl:
                player.avatarUrl ??
                player.photoURL ??
                null,

            rating,

            wins,

            losses,

            gamesPlayed:
                games,

            winRate:
                clamp(
                    winRate,
                    0,
                    100
                ),

            experience,

            xp:
                experience,

            level:

                Math.max(
                    level,
                    1
                ),

            coins,

            weeklyRating,

            weeklyWins:
                safeNumber(
                    player.weeklyWins
                ),

            weeklyGames:
                safeNumber(
                    player.weeklyGames
                ),

            country:
                safeString(
                    player.country
                ),

            online:
                Boolean(
                    player.online ??
                    false
                ),

            updatedAt:
                player.updated_at ??
                player.updatedAt ??
                null,

            createdAt:
                player.created_at ??
                player.createdAt ??
                null
        };
    }


    /* =========================================================
       SORTING
    ========================================================== */

    function sortPlayers(
        players,
        sortKey = state.currentSort
    ) {

        const list =
            Array.isArray(players)
                ? [...players]
                : [];


        list.sort(
            (a, b) => {

                const av =
                    getSortValue(
                        a,
                        sortKey
                    );

                const bv =
                    getSortValue(
                        b,
                        sortKey
                    );


                if (bv !== av) {
                    return bv - av;
                }


                /*
                 * اگر مقدار اصلی برابر بود:
                 * اول برد بیشتر
                 * سپس امتیاز بیشتر
                 * سپس نام
                 */

                if (
                    b.wins !==
                    a.wins
                ) {

                    return (
                        b.wins -
                        a.wins
                    );
                }


                if (
                    b.rating !==
                    a.rating
                ) {

                    return (
                        b.rating -
                        a.rating
                    );
                }


                return a.username.localeCompare(
                    b.username,
                    "fa"
                );
            }
        );


        return list;
    }


    function getSortValue(
        player,
        sortKey
    ) {

        if (!player) {
            return 0;
        }


        switch (sortKey) {

            case "rating":
                return safeNumber(
                    player.rating
                );

            case "wins":
                return safeNumber(
                    player.wins
                );

            case "experience":
                return safeNumber(
                    player.experience
                );

            case "games":
                return safeNumber(
                    player.gamesPlayed
                );

            case "winRate":
                return safeNumber(
                    player.winRate
                );

            case "coins":
                return safeNumber(
                    player.coins
                );

            case "weeklyRating":
                return safeNumber(
                    player.weeklyRating
                );

            default:
                return safeNumber(
                    player.rating
                );
        }
    }


    /* =========================================================
       RANK CALCULATION
    ========================================================== */

    function calculateRanks(
        players
    ) {

        const sorted =
            sortPlayers(
                players
            );


        return sorted.map(
            (player, index) => ({

                ...player,

                rank:
                    index + 1
            })
        );
    }


    function findPlayerRank(
        players,
        playerId
    ) {

        if (
            !playerId ||
            !Array.isArray(players)
        ) {

            return null;
        }


        const sorted =
            sortPlayers(
                players
            );


        const index =
            sorted.findIndex(
                player =>
                    String(player.id) ===
                    String(playerId)
            );


        if (index === -1) {
            return null;
        }


        return index + 1;
    }


    /* =========================================================
       SUPABASE ACCESS
    ========================================================== */

    function getSupabaseClient() {

        try {

            if (
                window.supabaseClient
            ) {

                return window.supabaseClient;
            }


            if (
                window.hokmSupabase
            ) {

                return window.hokmSupabase;
            }


            if (
                window.supabase &&
                typeof window.supabase.from ===
                    "function"
            ) {

                return window.supabase;
            }

        } catch (error) {

            console.warn(
                "[Leaderboard] Supabase lookup failed:",
                error
            );
        }


        return null;
    }


    function hasSupabase() {

        return Boolean(
            getSupabaseClient()
        );
    }


    /* =========================================================
       LOAD GLOBAL DATA FROM SUPABASE
    ========================================================== */

    async function fetchGlobalPlayers() {

        const client =
            getSupabaseClient();


        if (!client) {

            return null;
        }


        try {

            let query =
                client
                    .from(
                        CONFIG.tableName
                    )
                    .select(
                        "*",
                        {
                            count: "exact"
                        }
                    );


            /*
             * مرتب‌سازی سمت سرور
             */

            let field =
                "rating";


            switch (
                state.currentSort
            ) {

                case "wins":
                    field = "wins";
                    break;

                case "experience":
                    field = "experience";
                    break;

                case "games":
                    field = "games_played";
                    break;

                case "winRate":
                    field = "win_rate";
                    break;

                case "coins":
                    field = "coins";
                    break;

                case "weeklyRating":
                    field = "weekly_rating";
                    break;

                default:
                    field = "rating";
            }


            query =
                query.order(
                    field,
                    {
                        ascending: false,
                        nullsFirst: false
                    }
                );


            /*
             * جستجو
             */

            if (
                state.searchQuery
            ) {

                const search =
                    state.searchQuery
                        .replace(
                            /[%_]/g,
                            ""
                        )
                        .trim();


                if (search) {

                    query =
                        query.ilike(
                            "username",
                            `%${search}%`
                        );
                }
            }


            const from =
                (
                    state.currentPage -
                    1
                ) *
                state.pageSize;


            const to =
                from +
                state.pageSize -
                1;


            query =
                query.range(
                    from,
                    to
                );


            const result =
                await query;


            if (result.error) {

                throw result.error;
            }


            const rows =
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : [];


            const players =
                rows.map(
                    normalizePlayer
                );


            return {

                players,

                count:
                    safeNumber(
                        result.count,
                        players.length
                    )
            };

        } catch (error) {

            console.warn(
                "[Leaderboard] Supabase global fetch failed:",
                error
            );

            throw error;
        }
    }


    /* =========================================================
       FETCH FRIENDS
    ========================================================== */

    async function fetchFriendIds() {

        /*
         * اگر سیستم friends قبلی API داشته باشد
         * از آن استفاده می‌کنیم.
         */

        try {

            if (
                window.hokmFriends &&
                typeof window.hokmFriends.getFriendIds ===
                    "function"
            ) {

                const result =
                    await window.hokmFriends.getFriendIds();

                if (
                    Array.isArray(result)
                ) {

                    return result.map(
                        String
                    );
                }
            }

        } catch (error) {

            console.warn(
                "[Leaderboard] Friend API failed:",
                error
            );
        }


        /*
         * تلاش برای خواندن LocalStorage
         */

        const keys = [

            "hokm_friends",

            "hokmFriends",

            "friends",

            "hokm_friend_list"
        ];


        for (
            const key of keys
        ) {

            try {

                const raw =
                    localStorage.getItem(
                        key
                    );

                if (!raw) {
                    continue;
                }


                const parsed =
                    JSON.parse(raw);


                if (
                    Array.isArray(
                        parsed
                    )
                {

                    return parsed
                        .map(
                            friend =>
                                String(
                                    friend.id ??
                                    friend.userId ??
                                    friend.uid ??
                                    friend
                                )
                        );
                }

            } catch (error) {
                /* Try next key */
            }
        }


        return [];
    }


    async function fetchFriendsPlayers() {

        const friendIds =
            await fetchFriendIds();


        state.friends =
            friendIds;


        const currentUserId =
            getCurrentUserId();


        if (
            currentUserId
        ) {

            if (
                !friendIds.includes(
                    String(
                        currentUserId
                    )
                )
            ) {

                friendIds.push(
                    String(
                        currentUserId
                    )
                );
            }
        }


        /*
         * اگر Supabase موجود باشد
         */

        const client =
            getSupabaseClient();


        if (client) {

            try {

                if (
                    friendIds.length === 0
                ) {

                    return {
                        players: [],
                        count: 0
                    };
                }


                let query =
                    client
                        .from(
                            CONFIG.tableName
                        )
                        .select("*")
                        .in(
                            "id",
                            friendIds
                        );


                query =
                    query.order(
                        "rating",
                        {
                            ascending: false,
                            nullsFirst: false
                        }
                    );


                const result =
                    await query;


                if (result.error) {
                    throw result.error;
                }


                let players =
                    (
                        Array.isArray(
                            result.data
                        )
                            ? result.data
                            : []
                    ).map(
                        normalizePlayer
                    );


                /*
                 * جستجوی دوست
                 */

                if (
                    state.searchQuery
                ) {

                    const queryText =
                        state.searchQuery
                            .toLowerCase()
                            .trim();


                    players =
                        players.filter(
                            player =>
                                player.username
                                    .toLowerCase()
                                    .includes(
                                        queryText
                                    )
                        );
                }


                players =
                    sortPlayers(
                        players,
                        state.currentSort
                    );


                const total =
                    players.length;


                const start =
                    (
                        state.currentPage -
                        1
                    ) *
                    state.pageSize;


                const paginated =
                    players.slice(
                        start,
                        start +
                            state.pageSize
                    );


                return {

                    players:
                        paginated,

                    count:
                        total
                };

            } catch (error) {

                console.warn(
                    "[Leaderboard] Supabase friends fetch failed:",
                    error
                );

                /*
                 * در صورت شکست Supabase
                 * از local data استفاده می‌شود.
                 */
            }
        }


        /*
         * Local fallback
         */

        const localPlayers =
            getLocalPlayers();


        const friendSet =
            new Set(
                friendIds.map(
                    String
                )
            );


        let players =
            localPlayers.filter(
                player =>
                    friendSet.has(
                        String(
                            player.id
                        )
                    )
            );


        if (
            currentUserId &&
            !players.some(
                player =>
                    String(
                        player.id
                    ) ===
                    String(
                        currentUserId
                    )
            )
        ) {

            const current =
                localPlayers.find(
                    player =>
                        String(
                            player.id
                        ) ===
                        String(
                            currentUserId
                        )
                );


            if (current) {
                players.push(
                    current
                );
            }
        }


        if (
            state.searchQuery
        ) {

            const search =
                state.searchQuery
                    .toLowerCase()
                    .trim();


            players =
                players.filter(
                    player =>
                        player.username
                            .toLowerCase()
                            .includes(
                                search
                            )
                );
        }


        players =
            sortPlayers(
                players
            );


        const total =
            players.length;


        const start =
            (
                state.currentPage -
                1
            ) *
            state.pageSize;


        return {

            players:
                players.slice(
                    start,
                    start +
                        state.pageSize
                ),

            count:
                total
        };
    }


    /* =========================================================
       WEEKLY DATA
    ========================================================== */

    async function fetchWeeklyPlayers() {

        const client =
            getSupabaseClient();


        if (client) {

            try {

                let query =
                    client
                        .from(
                            CONFIG.tableName
                        )
                        .select("*");


                query =
                    query.order(
                        "weekly_rating",
                        {
                            ascending: false,
                            nullsFirst: false
                        }
                    );


                const from =
                    (
                        state.currentPage -
                        1
                    ) *
                    state.pageSize;


                const to =
                    from +
                    state.pageSize -
                    1;


                query =
                    query.range(
                        from,
                        to
                    );


                const result =
                    await query;


                if (result.error) {
                    throw result.error;
                }


                let players =
                    (
                        Array.isArray(
                            result.data
                        )
                            ? result.data
                            : []
                    ).map(
                        normalizePlayer
                    );


                if (
                    state.searchQuery
                ) {

                    const search =
                        state.searchQuery
                            .toLowerCase()
                            .trim();


                    players =
                        players.filter(
                            player =>
                                player.username
                                    .toLowerCase()
                                    .includes(
                                        search
                                    )
                        );
                }


                return {

                    players,

                    count:
                        players.length
                };

            } catch (error) {

                console.warn(
                    "[Leaderboard] Weekly Supabase fetch failed:",
                    error
                );
            }
        }


        /*
         * Local fallback
         */

        let players =
            getLocalPlayers();


        if (
            state.searchQuery
        ) {

            const search =
                state.searchQuery
                    .toLowerCase()
                    .trim();


            players =
                players.filter(
                    player =>
                        player.username
                            .toLowerCase()
                            .includes(
                                search
                            )
                );
        }


        players =
            sortPlayers(
                players,
                "weeklyRating"
            );


        const total =
            players.length;


        const start =
            (
                state.currentPage -
                1
            ) *
            state.pageSize;


        return {

            players:
                players.slice(
                    start,
                    start +
                        state.pageSize
                ),

            count:
                total
        };
    }


    /* =========================================================
       LOCAL PLAYERS
    ========================================================== */

    function getLocalPlayers() {

        const players = [];


        /*
         * داده‌های ساخته شده توسط سیستم بازی
         */

        const possibleKeys = [

            "hokm_players",

            "hokm_profiles",

            "hokm_leaderboard_players",

            "hokm_users"
        ];


        for (
            const key of possibleKeys
        ) {

            try {

                const raw =
                    localStorage.getItem(
                        key
                    );


                if (!raw) {
                    continue;
                }


                const parsed =
                    JSON.parse(raw);


                if (
                    Array.isArray(
                        parsed
                    )
                {

                    parsed.forEach(
                        player => {

                            players.push(
                                normalizePlayer(
                                    player
                                )
                            );
                        }
                    );

                } else if (
                    parsed &&
                    typeof parsed ===
                        "object"
                ) {

                    Object.values(
                        parsed
                    ).forEach(
                        player => {

                            if (
                                player &&
                                typeof player ===
                                    "object"
                            ) {

                                players.push(
                                    normalizePlayer(
                                        player
                                    )
                                );
                            }
                        }
                    );
                }

            } catch (error) {
                /* Ignore malformed storage */
            }
        }


        /*
         * بازیکن فعلی را نیز اضافه کن
         */

        const currentProfile =
            getCurrentUserProfile();


        if (currentProfile) {

            const normalized =
                normalizePlayer(
                    currentProfile
                );


            const exists =
                players.some(
                    player =>
                        String(
                            player.id
                        ) ===
                        String(
                            normalized.id
                        )
                );


            if (!exists) {

                players.push(
                    normalized
                );
            }
        }


        /*
         * اگر هیچ بازیکنی وجود نداشت،
         * داده آزمایشی نمی‌سازیم.
         */

        return deduplicatePlayers(
            players
        );
    }


    function deduplicatePlayers(
        players
    ) {

        const map =
            new Map();


        players.forEach(
            player => {

                if (!player) {
                    return;
                }


                const key =
                    String(
                        player.id
                    );


                if (
                    !map.has(key)
                ) {

                    map.set(
                        key,
                        player
                    );
                }
            }
        );


        return Array.from(
            map.values()
        );
    }


    /* =========================================================
       LOAD LEADERBOARD
    ========================================================== */

    async function loadLeaderboard(
        options = {}
    ) {

        if (
            state.loading &&
            !options.force
        ) {

            return;
        }


        const now =
            getNow();


        if (
            !options.force &&
            now -
                state.lastRequestTime <
                CONFIG.refreshCooldown
        ) {

            return;
        }


        state.lastRequestTime =
            now;


        state.loading = true;

        state.error = null;

        state.offline =
            !isOnline();


        const requestId =
            ++state.requestId;


        renderLoading();


        try {

            const cacheKey =
                getCacheKey();


            /*
             * ابتدا کش معتبر
             */

            if (
                !options.force &&
                !options.skipCache
            ) {

                const cached =
                    state.cache[
                        cacheKey
                    ];


                if (
                    isCacheValid(
                        cached
                    )
                ) {

                    applyLeaderboardResult(
                        cached.data,
                        false
                    );


                    state.loading =
                        false;


                    return;
                }
            }


            let result = null;


            /*
             * انتخاب منبع اطلاعات
             */

            if (
                state.currentCategory ===
                "friends"
            ) {

                result =
                    await fetchFriendsPlayers();

            } else if (
                state.currentCategory ===
                "weekly"
            ) {

                result =
                    await fetchWeeklyPlayers();

            } else {

                result =
                    await fetchGlobalPlayers();
            }


            /*
             * جلوگیری از اعمال نتیجه
             * درخواست قدیمی
             */

            if (
                requestId !==
                state.requestId
            ) {

                return;
            }


            /*
             * اگر Supabase وجود نداشت
             * از Local fallback استفاده کن
             */

            if (!result) {

                result =
                    getLocalLeaderboardResult();
            }


            applyLeaderboardResult(
                result,
                true
            );


            /*
             * ذخیره کش
             */

            state.cache[
                cacheKey
            ] = {

                timestamp:
                    getNow(),

                data:
                    result
            };


            saveCache();


        } catch (error) {

            console.error(
                "[Leaderboard] Load failed:",
                error
            );


            state.error =
                error;


            /*
             * تلاش نهایی از کش
             */

            const cacheKey =
                getCacheKey();


            const cached =
                state.cache[
                    cacheKey
                ];


            if (cached) {

                applyLeaderboardResult(
                    cached.data,
                    false
                );

            } else {

                const fallback =
                    getLocalLeaderboardResult();


                if (
                    fallback.players.length >
                    0
                ) {

                    applyLeaderboardResult(
                        fallback,
                        false
                    );

                } else {

                    renderError(
                        "دریافت رتبه‌بندی با مشکل مواجه شد."
                    );
                }
            }

        } finally {

            if (
                requestId ===
                state.requestId
            ) {

                state.loading =
                    false;
            }
        }
    }


    function getLocalLeaderboardResult() {

        let players =
            getLocalPlayers();


        if (
            state.searchQuery
        ) {

            const search =
                state.searchQuery
                    .toLowerCase()
                    .trim();


            players =
                players.filter(
                    player =>
                        player.username
                            .toLowerCase()
                            .includes(
                                search
                            )
                );
        }


        players =
            sortPlayers(
                players
            );


        const total =
            players.length;


        const start =
            (
                state.currentPage -
                1
            ) *
            state.pageSize;


        return {

            players:
                players.slice(
                    start,
                    start +
                        state.pageSize
                ),

            count:
                total
        };
    }


    function applyLeaderboardResult(
        result,
        fresh
    ) {

        const players =
            Array.isArray(
                result?.players
            )
                ? result.players.map(
                    normalizePlayer
                )
                : [];


        state.players =
            calculateRanks(
                players
            );


        state.filteredPlayers =
            state.players;


        state.totalPlayers =
            safeNumber(
                result?.count,
                players.length
            );


        state.totalPages =
            Math.max(
                1,
                Math.ceil(
                    state.totalPlayers /
                        state.pageSize
                )
            );


        state.currentPage =
            clamp(
                state.currentPage,
                1,
                state.totalPages
            );


        state.lastUpdated =
            getNow();


        state.offline =
            !isOnline();


        /*
         * رتبه کاربر فعلی
         */

        updateCurrentUserRank();


        /*
         * بازیکنان اطراف کاربر
         */

        updateNearbyPlayers();


        /*
         * نمایش
         */

        renderLeaderboard();


        /*
         * اعلام بروزرسانی
         */

        emit(
            "leaderboard:updated",
            {
                category:
                    state.currentCategory,

                sort:
                    state.currentSort,

                count:
                    state.totalPlayers,

                fresh:
                    Boolean(fresh)
            }
        );
    }


    /* =========================================================
       CURRENT USER RANK
    ========================================================== */

    function updateCurrentUserRank() {

        const userId =
            getCurrentUserId();


        if (!userId) {

            state.currentUser =
                getCurrentUserProfile();


            state.currentUserRank =
                null;


            return;
        }


        state.currentUser =
            getCurrentUserProfile();


        /*
         * در داده فعلی
         */

        const localRank =
            findPlayerRank(
                state.players,
                userId
            );


        if (
            localRank !== null
        ) {

            state.currentUserRank =
                localRank;

            return;
        }


        /*
         * اگر کاربر در صفحه فعلی نیست،
         * رتبه واقعی را از اطلاعات محلی
         * یا سرور محاسبه می‌کنیم.
         */

        const localPlayers =
            getLocalPlayers();


        state.currentUserRank =
            findPlayerRank(
                localPlayers,
                userId
            );
    }


    /* =========================================================
       NEARBY PLAYERS
    ========================================================== */

    function updateNearbyPlayers() {

        const userId =
            getCurrentUserId();


        if (!userId) {

            state.nearbyPlayers =
                [];

            return;
        }


        const allPlayers =
            getLocalPlayers();


        const sorted =
            sortPlayers(
                allPlayers
            );


        const index =
            sorted.findIndex(
                player =>
                    String(
                        player.id
                    ) ===
                    String(
                        userId
                    )
            );


        if (index === -1) {

            state.nearbyPlayers =
                [];

            return;
        }


        const start =
            Math.max(
                0,
                index -
                    CONFIG.nearbyPlayersCount
            );


        const end =
            Math.min(
                sorted.length,
                index +
                    CONFIG.nearbyPlayersCount +
                    1
            );


        state.nearbyPlayers =
            sorted.slice(
                start,
                end
            ).map(
                (player, offset) => ({

                    ...player,

                    rank:
                        start +
                        offset +
                        1
                })
            );
    }


    /* =========================================================
       RENDERING
    ========================================================== */

    function renderLoading() {

        if (!DOM.list) {
            return;
        }


        DOM.list.innerHTML = `

            <div class="leaderboard-loading">

                <div class="leaderboard-loading-spinner">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>

                <p>
                    در حال دریافت رتبه‌بندی...
                </p>

            </div>

        `;
    }


    function renderError(
        message
    ) {

        if (!DOM.list) {
            return;
        }


        DOM.list.innerHTML = `

            <div class="leaderboard-error">

                <div class="leaderboard-error-icon">
                    ⚠️
                </div>

                <h3>
                    خطا در دریافت رتبه‌بندی
                </h3>

                <p>
                    ${escapeHTML(message)}
                </p>

                <button
                    type="button"
                    class="primary-button leaderboard-retry-button"
                    data-letry="leaderboard"
                >
                    تلاش دوباره
                </button>

            </div>

        `;
    }


    function renderLeaderboard() {

        if (!DOM.list) {
            return;
        }


        if (
            state.totalPlayers === 0 &&
            state.players.length === 0
        ) {

            renderEmpty();
            return;
        }


        const topPlayers =
            getTopPlayers();


        const rankingPlayers =
            state.players;


        DOM.list.innerHTML = `

            ${renderLeaderboardHeader()}

            ${renderTopThree(
                topPlayers
            )}

            ${renderCurrentUserSummary()}

            ${renderRankingList(
                rankingPlayers
            )}

            ${renderPagination()}

            ${renderLastUpdated()}

        `;


        attachDynamicListeners();
    }


    function renderLeaderboardHeader() {

        const category =
            CATEGORIES[
                state.currentCategory
            ] ||
            CATEGORIES.global;


        const sort =
            SORT_OPTIONS[
                state.currentSort
            ] ||
            SORT_OPTIONS.rating;


        return `

            <div class="leaderboard-controls">

                <div class="leaderboard-title-block">

                    <h2>
                        ${escapeHTML(
                            category.title
                        )}
                    </h2>

                    <p>
                        ${escapeHTML(
                            category.description
                        )}
                    </p>

                </div>


                <div class="leaderboard-sort-wrapper">

                    <label
                        for="leaderboard-sort-select"
                    >
                        مرتب‌سازی
                    </label>

                    <select
                        id="leaderboard-sort-select"
                        class="leaderboard-sort-select"
                    >

                        ${Object.values(
                            SORT_OPTIONS
                        )
                            .map(
                                option => `
                                    <option
                                        value="${escapeHTML(
                                            option.id
                                        )}"
                                        ${
                                            option.id ===
                                            sort.id
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        ${escapeHTML(
                                            option.label
                                        )}
                                    </option>
                                `
                            )
                            .join("")}

                    </select>

                </div>

            </div>


            <div class="leaderboard-search">

                <input
                    id="leaderboard-search-input"
                    type="search"
                    value="${escapeHTML(
                        state.searchQuery
                    )}"
                    placeholder="جستجوی بازیکن..."
                    autocomplete="off"
                    maxlength="50"
                >

                <button
                    id="leaderboard-search-button"
                    type="button"
                    class="search-button"
                    aria-label="جستجو"
                >
                    🔍
                </button>

                ${
                    state.searchQuery
                        ? `
                            <button
                                id="leaderboard-clear-search"
                                type="button"
                                class="leaderboard-clear-search"
                                aria-label="پاک کردن جستجو"
                            >
                                ×
                            </button>
                        `
                        : ""
                }

            </div>

        `;
    }


    /* =========================================================
       TOP THREE
    ========================================================== */

    function getTopPlayers() {

        const local =
            getLocalPlayers();


        const source =
            local.length >
            0
                ? local
                : state.players;


        return sortPlayers(
            source,
            state.currentSort
        ).slice(
            0,
            CONFIG.topPlayersCount
        );
    }


    function renderTopThree(
        players
    ) {

        if (
            !Array.isArray(
                players
            ) ||
            players.length === 0
        ) {

            return "";
        }


        const first =
            players[0] || null;


        const second =
            players[1] || null;


        const third =
            players[2] || null;


        return `

            <section
                class="leaderboard-podium"
                aria-label="برترین بازیکنان"
            >

                ${
                    second
                        ? renderPodiumPlayer(
                            second,
                            2
                        )
                        : ""
                }


                ${
                    first
                        ? renderPodiumPlayer(
                            first,
                            1
                        )
                        : ""
                }


                ${
                    third
                        ? renderPodiumPlayer(
                            third,
                            3
                        )
                        : ""
                }

            </section>

        `;
    }


    function renderPodiumPlayer(
        player,
        rank
    ) {

        const isCurrent =
            String(
                player.id
            ) ===
            String(
                getCurrentUserId()
            );


        return `

            <article
                class="
                    leaderboard-podium-player
                    podium-rank-${rank}
                    ${
                        isCurrent
                            ? "current-player"
                            : ""
                    }
                "
            >

                <div class="podium-crown">
                    ${
                        rank === 1
                            ? "👑"
                            : rank === 2
                            ? "🥈"
                            : "🥉"
                    }
                </div>


                <div class="leaderboard-avatar podium-avatar">

                    ${renderAvatar(
                        player
                    )}

                </div>


                <div class="podium-rank">
                    ${formatNumber(rank)}
                </div>


                <strong class="podium-username">
                    ${escapeHTML(
                        player.username
                    )}
                </strong>


                <span class="podium-rating">
                    ${formatNumber(
                        getSortValue(
                            player,
                            state.currentSort
                        )
                    )}
                </span>


                <span class="podium-rating-label">
                    ${
                        SORT_OPTIONS[
                            state.currentSort
                        ]?.label ||
                        "امتیاز"
                    }
                </span>

            </article>

        `;
    }


    /* =========================================================
       AVATAR
    ========================================================== */

    function renderAvatar(
        player,
        small = false
    ) {

        if (
            player.avatarUrl
        ) {

            return `

                <img
                    src="${escapeHTML(
                        player.avatarUrl
                    )}"
                    alt="${escapeHTML(
                        player.username
                    )}"
                    class="${
                        small
                            ? "small-avatar-image"
                            : "avatar-image"
                    }"
                    loading="lazy"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                >

                <span
                    class="${
                        small
                            ? "small-avatar-fallback"
                            : "avatar-fallback"
                    }"
                    style="display:none;"
                >
                    👤
                </span>

            `;
        }


        const avatar =
            player.avatar ||
            "👤";


        /*
         * اگر آواتار ایموجی است
         */

        if (
            !/^https?:\/\//i.test(
                avatar
            )
        ) {

            return escapeHTML(
                avatar
            );
        }


        return "👤";
    }


    /* =========================================================
       CURRENT USER SUMMARY
    ========================================================== */

    function renderCurrentUserSummary() {

        const user =
            state.currentUser;


        if (!user) {
            return "";
        }


        const rank =
            state.currentUserRank;


        const profile =
            normalizePlayer(
                user
            );


        return `

            <section
                class="leaderboard-my-rank"
            >

                <div class="my-rank-icon">
                    📊
                </div>


                <div class="my-rank-info">

                    <span>
                        رتبه شما
                    </span>

                    <strong>
                        ${
                            rank
                                ? `#${formatNumber(
                                      rank
                                  )}`
                                : "در حال محاسبه..."
                        }
                    </strong>

                </div>


                <div class="my-rank-stats">

                    <div>

                        <span>
                            امتیاز
                        </span>

                        <strong>
                            ${formatNumber(
                                profile.rating
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            برد
                        </span>

                        <strong>
                            ${formatNumber(
                                profile.wins
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            برد %
                        </span>

                        <strong>
                            ${formatPercent(
                                profile.winRate
                            )}
                        </strong>

                    </div>

                </div>

            </section>

        `;
    }


    /* =========================================================
       RANKING LIST
    ========================================================== */

    function renderRankingList(
        players
    ) {

        if (
            !Array.isArray(
                players
            ) ||
            players.length === 0
        ) {

            return renderEmpty();
        }


        return `

            <div class="leaderboard-table">

                <div
                    class="leaderboard-table-header"
                >

                    <span>
                        رتبه
                    </span>

                    <span>
                        بازیکن
                    </span>

                    <span>
                        ${escapeHTML(
                            SORT_OPTIONS[
                                state.currentSort
                            ]?.label ||
                            "امتیاز"
                        )}
                    </span>

                </div>


                <div
                    class="leaderboard-table-body"
                >

                    ${players
                        .map(
                            (player, index) =>
                                renderRankingPlayer(
                                    player,
                                    index
                                )
                        )
                        .join("")}

                </div>

            </div>

        `;
    }


    function renderRankingPlayer(
        player,
        index
    ) {

        const rank =
            player.rank ||
            (
                (
                    state.currentPage -
                    1
                ) *
                state.pageSize +
                index +
                1
            );


        const currentUserId =
            getCurrentUserId();


        const isCurrent =
            currentUserId &&
            String(
                player.id
            ) ===
            String(
                currentUserId
            );


        const value =
            getSortValue(
                player,
                state.currentSort
            );


        return `

            <article
                class="
                    leaderboard-player-row
                    ${
                        isCurrent
                            ? "current-user-row"
                            : ""
                    }
                "
                data-player-id="${escapeHTML(
                    player.id
                )}"
            >

                <div
                    class="
                        player-rank
                        ${
                            rank <= 3
                                ? `rank-${rank}`
                                : ""
                        }
                    "
                >

                    ${
                        rank === 1
                            ? "🥇"
                            : rank === 2
                            ? "🥈"
                            : rank === 3
                            ? "🥉"
                            : formatNumber(
                                  rank
                              )
                    }

                </div>


                <div class="leaderboard-player">

                    <div
                        class="leaderboard-avatar"
                    >

                        ${renderAvatar(
                            player,
                            true
                        )}

                    </div>


                    <div
                        class="leaderboard-player-info"
                    >

                        <strong>
                            ${escapeHTML(
                                player.username
                            )}
                        </strong>


                        <div
                            class="leaderboard-player-meta"
                        >

                            <span>
                                سطح
                                ${formatNumber(
                                    player.level
                                )}
                            </span>


                            <span>
                                ${formatNumber(
                                    player.wins
                                )}
                                برد
                            </span>


                            ${
                                player.online
                                    ? `
                                        <span class="online-status">
                                            آنلاین
                                        </span>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                </div>


                <div
                    class="leaderboard-score"
                >

                    <strong>
                        ${formatNumber(
                            value
                        )}
                    </strong>


                    ${
                        state.currentSort ===
                        "winRate"
                            ? `
                                <small>
                                    ${formatPercent(
                                        player.winRate
                                    )}
                                </small>
                            `
                            : ""
                    }

                </div>

            </article>

        `;
    }


    /* =========================================================
       PAGINATION
    ========================================================== */

    function renderPagination() {

        if (
            state.totalPages <= 1
        ) {

            return "";
        }


        const current =
            state.currentPage;


        const total =
            state.totalPages;


        const pages =
            createPaginationPages(
                current,
                total
            );


        return `

            <div
                class="leaderboard-pagination"
                aria-label="صفحه‌بندی"
            >

                <button
                    type="button"
                    class="pagination-button"
                    data-page-action="previous"
                    ${
                        current <= 1
                            ? "disabled"
                            : ""
                    }
                    aria-label="صفحه قبل"
                >
                    →
                </button>


                <div
                    class="pagination-pages"
                >

                    ${pages
                        .map(
                            page =>
                                page === "..."
                                    ? `
                                        <span class="pagination-dots">
                                            ...
                                        </span>
                                    `
                                    : `
                                        <button
                                            type="button"
                                            class="
                                                pagination-page
                                                ${
                                                    page ===
                                                    current
                                                        ? "active"
                                                        : ""
                                                }
                                            "
                                            data-page="${page}"
                                        >
                                            ${formatNumber(
                                                page
                                            )}
                                        </button>
                                    `
                        )
                        .join("")}

                </div>


                <button
                    type="button"
                    class="pagination-button"
                    data-page-action="next"
                    ${
                        current >= total
                            ? "disabled"
                            : ""
                    }
                    aria-label="صفحه بعد"
                >
                    ←
                </button>

            </div>

        `;
    }


    function createPaginationPages(
        current,
        total
    ) {

        const pages = [];


        if (total <= 7) {

            for (
                let i = 1;
                i <= total;
                i++
            ) {

                pages.push(i);
            }

            return pages;
        }


        pages.push(1);


        if (current > 4) {
            pages.push("...");
        }


        const start =
            Math.max(
                2,
                current - 1
            );


        const end =
            Math.min(
                total - 1,
                current + 1
            );


        for (
            let i = start;
            i <= end;
            i++
        ) {

            pages.push(i);
        }


        if (
            current <
            total - 3
        ) {

            pages.push("...");
        }


        pages.push(total);


        return pages;
    }


    /* =========================================================
       LAST UPDATED
    ========================================================== */

    function renderLastUpdated() {

        const time =
            state.lastUpdated
                ? formatDate(
                      state.lastUpdated
                  )
                : "هنوز بروزرسانی نشده";


        return `

            <div
                class="leaderboard-footer"
            >

                <span>
                    آخرین بروزرسانی:
                    ${escapeHTML(
                        time
                    )}
                </span>


                ${
                    state.offline
                        ? `
                            <span class="leaderboard-offline">
                                ⚠️ حالت آفلاین
                            </span>
                        `
                        : ""
                }


                <button
                    type="button"
                    id="leaderboard-refresh-button"
                    class="leaderboard-refresh-button"
                >
                    ↻ بروزرسانی
                </button>

            </div>

        `;
    }


    /* =========================================================
       EMPTY STATE
    ========================================================== */

    function renderEmpty() {

        return `

            <div
                class="leaderboard-empty"
            >

                <div class="leaderboard-empty-icon">
                    🏆
                </div>

                <h3>
                    بازیکنی پیدا نشد
                </h3>

                <p>
                    ${
                        state.searchQuery
                            ? "برای عبارت جستجو شده بازیکنی وجود ندارد."
                            : "هنوز اطلاعات رتبه‌بندی در دسترس نیست."
                    }
                </p>


                ${
                    state.searchQuery
                        ? `
                            <button
                                type="button"
                                id="empty-clear-search"
                                class="secondary-button"
                            >
                                پاک کردن جستجو
                            </button>
                        `
                        : ""
                }

            </div>

        `;
    }


    /* =========================================================
       DYNAMIC EVENT LISTENERS
    ========================================================== */

    function attachDynamicListeners() {

        const sortSelect =
            document.getElementById(
                "leaderboard-sort-select"
            );


        if (sortSelect) {

            sortSelect.addEventListener(
                "change",
                event => {

                    setSort(
                        event.target.value
                    );
                }
            );
        }


        const searchInput =
            document.getElementById(
                "leaderboard-search-input"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                event => {

                    handleSearchInput(
                        event.target.value
                    );
                }
            );


            searchInput.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        performSearch(
                            searchInput.value
                        );
                    }
                }
            );
        }


        const searchButton =
            document.getElementById(
                "leaderboard-search-button"
            );


        if (searchButton) {

            searchButton.addEventListener(
                "click",
                () => {

                    const input =
                        document.getElementById(
                            "leaderboard-search-input"
                        );


                    performSearch(
                        input
                            ? input.value
                            : ""
                    );
                }
            );
        }


        const clearButton =
            document.getElementById(
                "leaderboard-clear-search"
            );


        if (clearButton) {

            clearButton.addEventListener(
                "click",
                () => {

                    clearSearch();
                }
            );
        }


        const emptyClear =
            document.getElementById(
                "empty-clear-search"
            );


        if (emptyClear) {

            emptyClear.addEventListener(
                "click",
                () => {

                    clearSearch();
                }
            );
        }


        const refreshButton =
            document.getElementById(
                "leaderboard-refresh-button"
            );


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                () => {

                    refresh(
                        true
                    );
                }
            );
        }


        const retryButton =
            document.querySelector(
                ".leaderboard-retry-button"
            );


        if (retryButton) {

            retryButton.addEventListener(
                "click",
                () => {

                    refresh(
                        true
                    );
                }
            );
        }


        const pageButtons =
            document.querySelectorAll(
                "[data-page]"
            );


        pageButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const page =
                            Number(
                                button.dataset.page
                            );


                        if (
                            Number.isFinite(
                                page
                            )
                        ) {

                            goToPage(
                                page
                            );
                        }
                    }
                );
            }
        );


        const actionButtons =
            document.querySelectorAll(
                "[data-page-action]"
            );


        actionButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const action =
                            button.dataset
                                .pageAction;


                        if (
                            action ===
                            "previous"
                        ) {

                            previousPage();

                        } else if (
                            action ===
                            "next"
                        ) {

                            nextPage();
                        }
                    }
                );
            }
        );
    }


    /* =========================================================
       SEARCH
    ========================================================== */

    function handleSearchInput(
        value
    ) {

        state.searchQuery =
            safeString(
                value
            ).trim();


        clearTimeout(
            state.searchTimer
        );


        state.searchTimer =
            setTimeout(
                () => {

                    performSearch(
                        state.searchQuery
                    );

                },
                400
            );
    }


    function performSearch(
        value
    ) {

        state.searchQuery =
            safeString(
                value
            ).trim();


        state.currentPage =
            1;


        loadLeaderboard({
            force: true,
            skipCache: true
        });
    }


    function clearSearch() {

        state.searchQuery =
            "";


        state.currentPage =
            1;


        loadLeaderboard({
            force: true,
            skipCache: true
        });
    }


    /* =========================================================
       TABS
    ========================================================== */

    function initializeTabs() {

        if (
            !DOM.tabs ||
            DOM.tabs.length === 0
        ) {

            return;
        }


        DOM.tabs.forEach(
            tab => {

                tab.addEventListener(
                    "click",
                    () => {

                        const category =
                            tab.dataset
                                .leaderboardTab;


                        if (
                            category
                        ) {

                            setCategory(
                                category
                            );
                        }
                    }
                );
            }
        );
    }


    function setCategory(
        category
    ) {

        if (
            !CATEGORIES[
                category
            ]
        ) {

            return;
        }


        state.currentCategory =
            category;


        state.currentPage =
            1;


        state.searchQuery =
            "";


        /*
         * برای هفتگی
         * مرتب‌سازی پیش‌فرض هفتگی
         */

        if (
            category ===
            "weekly"
        ) {

            state.currentSort =
                "weeklyRating";

        } else {

            state.currentSort =
                "rating";
        }


        updateActiveTab();


        loadLeaderboard({
            force: true,
            skipCache: false
        });


        emit(
            "leaderboard:categoryChanged",
            {
                category
            }
        );
    }


    function updateActiveTab() {

        if (
            !DOM.tabs
        ) {
            return;
        }


        DOM.tabs.forEach(
            tab => {

                const category =
                    tab.dataset
                        .leaderboardTab;


                tab.classList.toggle(
                    "active",
                    category ===
                        state.currentCategory
                );
            }
        );
    }


    /* =========================================================
       SORT
    ========================================================== */

    function setSort(
        sort
    ) {

        if (
            !SORT_OPTIONS[
                sort
            ]
        ) {

            return;
        }


        state.currentSort =
            sort;


        state.currentPage =
            1;


        loadLeaderboard({
            force: true,
            skipCache: false
        });


        emit(
            "leaderboard:sortChanged",
            {
                sort
            }
        );
    }


    /* =========================================================
       PAGINATION FUNCTIONS
    ========================================================== */

    function goToPage(
        page
    ) {

        const target =
            Number(page);


        if (
            !Number.isFinite(
                target
            )
        ) {

            return;
        }


        if (
            target < 1 ||
            target >
                state.totalPages
        ) {

            return;
        }


        if (
            target ===
            state.currentPage
        ) {

            return;
        }


        state.currentPage =
            target;


        loadLeaderboard({
            force: false,
            skipCache: false
        });
    }


    function nextPage() {

        if (
            state.currentPage <
            state.totalPages
        ) {

            goToPage(
                state.currentPage + 1
            );
        }
    }


    function previousPage() {

        if (
            state.currentPage >
            1
        ) {

            goToPage(
                state.currentPage - 1
            );
        }
    }


    /* =========================================================
       REFRESH
    ========================================================== */

    async function refresh(
        force = true
    ) {

        if (
            state.refreshing
        ) {

            return;
        }


        state.refreshing =
            true;


        try {

            clearCurrentPageCache();


            await loadLeaderboard({
                force,
                skipCache: true
            });

        } finally {

            state.refreshing =
                false;
        }
    }


    function clearCurrentPageCache() {

        const key =
            getCacheKey();


        delete state.cache[
            key
        ];


        saveCache();
    }


    /* =========================================================
       AUTO REFRESH
    ========================================================== */

    function startAutoRefresh() {

        stopAutoRefresh();


        state.autoRefreshTimer =
            setInterval(
                () => {

                    /*
                     * فقط زمانی که صفحه رتبه‌بندی
                     * قابل مشاهده باشد
                     */

                    if (
                        isLeaderboardVisible()
                    ) {

                        refresh(
                            false
                        );
                    }

                },
                CONFIG.autoRefreshInterval
            );
    }


    function stopAutoRefresh() {

        if (
            state.autoRefreshTimer
        ) {

            clearInterval(
                state.autoRefreshTimer
            );


            state.autoRefreshTimer =
                null;
        }
    }


    function isLeaderboardVisible() {

        if (!DOM.page) {
            return false;
        }


        return (
            !DOM.page.classList.contains(
                "hidden"
            ) &&
            (
                DOM.page.classList.contains(
                    "active-page"
                ) ||
                getComputedStyle(
                    DOM.page
                ).display !==
                    "none"
            )
        );
    }


    /* =========================================================
       ONLINE / OFFLINE
    ========================================================== */

    function handleOnline() {

        state.offline =
            false;


        updateConnectionState();


        if (
            isLeaderboardVisible()
        ) {

            refresh(
                true
            );
        }
    }


    function handleOffline() {

        state.offline =
            true;


        updateConnectionState();


        /*
         * اگر اطلاعات قبلی داریم،
         * همان اطلاعات را نگه می‌داریم.
         */

        emit(
            "leaderboard:offline",
            {}
        );
    }


    function updateConnectionState() {

        if (
            state.offline
        ) {

            emit(
                "connection:offline",
                {
                    source:
                        "leaderboard"
                }
            );

        } else {

            emit(
                "connection:online",
                {
                    source:
                        "leaderboard"
                }
            );
        }
    }


    /* =========================================================
       GLOBAL EVENTS
    ========================================================== */

    function emit(
        eventName,
        detail = {}
    ) {

        try {

            document.dispatchEvent(
                new CustomEvent(
                    eventName,
                    {
                        detail
                    }
                )
            );

        } catch (error) {

            console.warn(
                "[Leaderboard] Event error:",
                error
            );
        }
    }


    function attachGlobalEvents() {

        if (
            state.eventListenersAttached
        ) {

            return;
        }


        state.eventListenersAttached =
            true;


        window.addEventListener(
            "online",
            handleOnline
        );


        window.addEventListener(
            "offline",
            handleOffline
        );


        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState ===
                    "visible"
                ) {

                    if (
                        isLeaderboardVisible()
                    ) {

                        refresh(
                            false
                        );
                    }
                }
            }
        );


        /*
         * بازی تمام شد
         */

        document.addEventListener(
            "hokm:gameFinished",
            () => {

                clearCurrentPageCache();


                if (
                    isLeaderboardVisible()
                ) {

                    refresh(
                        true
                    );
                }
            }
        );


        /*
         * پروفایل بروزرسانی شد
         */

        document.addEventListener(
            "profile:updated",
            () => {

                state.currentUser =
                    getCurrentUserProfile();


                updateCurrentUserRank();


                if (
                    isLeaderboardVisible()
                ) {

                    refresh(
                        true
                    );
                }
            }
        );


        /*
         * نتیجه بازی
         */

        document.addEventListener(
            "game:result",
            () => {

                clearCurrentPageCache();

            }
        );


        /*
         * ورود کاربر
         */

        document.addEventListener(
            "auth:login",
            () => {

                state.currentUser =
                    getCurrentUserProfile();


                state.currentPage =
                    1;


                clearCache();


                if (
                    isLeaderboardVisible()
                ) {

                    refresh(
                        true
                    );
                }
            }
        );


        /*
         * خروج کاربر
         */

        document.addEventListener(
            "auth:logout",
            () => {

                state.currentUser =
                    null;


                state.currentUserRank =
                    null;


                state.nearbyPlayers =
                    [];


                if (
                    isLeaderboardVisible()
                ) {

                    refresh(
                        true
                    );
                }
            }
        );


        /*
         * تغییر دوستان
         */

        document.addEventListener(
            "friends:updated",
            () => {

                if (
                    state.currentCategory ===
                    "friends"
                ) {

                    refresh(
                        true
                    );
                }
            }
        );
    }


    /* =========================================================
       INITIALIZATION
    ========================================================== */

    function initialize() {

        if (
            state.initialized
        ) {

            return;
        }


        state.initialized =
            true;


        loadCache();


        state.currentUser =
            getCurrentUserProfile();


        state.offline =
            !isOnline();


        initializeTabs();


        attachGlobalEvents();


        startAutoRefresh();


        /*
         * اولین بار اگر صفحه موجود است
         */

        if (
            DOM.page &&
            isLeaderboardVisible()
        ) {

            loadLeaderboard({
                force: false,
                skipCache: false
            });
        }


        /*
         * API آماده شد
         */

        emit(
            "leaderboard:ready",
            {}
        );
    }


    /* =========================================================
       PAGE ACTIVATION
    ========================================================== */

    function onPageOpened() {

        state.currentUser =
            getCurrentUserProfile();


        updateActiveTab();


        loadLeaderboard({
            force: false,
            skipCache: false
        });
    }


    /* =========================================================
       PUBLIC API
    ========================================================== */

    const api = {

        /* Initialization */

        init:
            initialize,

        initialize:
            initialize,


        /* Loading */

        load:
            loadLeaderboard,

        refresh:
            refresh,


        /* Category */

        setCategory:
            setCategory,

        getCategory:
            () =>
                state.currentCategory,


        /* Sorting */

        setSort:
            setSort,

        getSort:
            () =>
                state.currentSort,


        /* Search */

        search:
            performSearch,

        clearSearch:
            clearSearch,


        /* Pagination */

        goToPage:
            goToPage,

        nextPage:
            nextPage,

        previousPage:
            previousPage,


        /* Data */

        getPlayers:
            () =>
                [...state.players],

        getCurrentUser:
            () =>
                state.currentUser,

        getCurrentUserRank:
            () =>
                state.currentUserRank,

        getNearbyPlayers:
            () =>
                [...state.nearbyPlayers],


        /* Cache */

        clearCache:
            clearCache,

        clearCurrentPageCache:
            clearCurrentPageCache,


        /* Status */

        isLoading:
            () =>
                state.loading,

        isOffline:
            () =>
                state.offline,

        getState:
            () => ({
                ...state,
                players:
                    [...state.players],
                filteredPlayers:
                    [
                        ...state.filteredPlayers
                    ],
                nearbyPlayers:
                    [
                        ...state.nearbyPlayers
                    ],
                friends:
                    [...state.friends]
            }),


        /* UI */

        isVisible:
            isLeaderboardVisible,

        onPageOpened:
            onPageOpened,


        /* Utilities */

        normalizePlayer:
            normalizePlayer,

        calculateRanks:
            calculateRanks,

        sortPlayers:
            sortPlayers
    };


    /* =========================================================
       EXPOSE GLOBAL API
    ========================================================== */

    window.hokmLeaderboard =
        api;


    /*
     * نام جایگزین برای سازگاری
     */

    window.Leaderboard =
        api;


    /* =========================================================
       BOOT
    ========================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();
    }


    /* =========================================================
       FINAL LOG
    ========================================================== */

    console.log(
        "%cHOKM Leaderboard initialized",
        "font-weight:bold;"
    );


})();
