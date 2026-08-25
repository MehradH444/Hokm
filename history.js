/* ============================================================
   HOKM ONLINE
   HISTORY.JS
   مرحله ۱۹
   سیستم کامل تاریخچه بازی‌ها

   مسئولیت‌های این فایل:
   ------------------------------------------------------------
   1. ذخیره تاریخچه بازی‌ها
   2. خواندن تاریخچه
   3. ثبت بازی جدید
   4. ثبت برد و باخت
   5. محاسبه درصد برد
   6. نمایش تاریخچه در صفحه
   7. فیلتر تاریخچه
   8. جستجوی تاریخچه
   9. مرتب‌سازی تاریخچه
   10. نمایش جزئیات بازی
   11. حذف یک رکورد
   12. پاک کردن کامل تاریخچه
   13. صفحه‌بندی
   14. آمار کلی
   15. هماهنگی با localStorage
   16. هماهنگی با storage.js در صورت وجود
   17. هماهنگی با profile.js در صورت وجود
   18. هماهنگی با wallet.js در صورت وجود
   19. Event System
   20. API عمومی برای سایر فایل‌ها
   ============================================================ */

(function (window) {

    "use strict";


    /* ============================================================
       CONFIGURATION
       ============================================================ */

    const HISTORY_CONFIG = {

        STORAGE_KEY: "hokm_game_history",

        VERSION: 1,

        MAX_RECORDS: 500,

        PAGE_SIZE: 10,

        DATE_LOCALE: "fa-IR",

        DEFAULT_GAME_TYPE: "classic",

        DEFAULT_MODE: "classic",

        DEFAULT_RESULT: "unknown",

        MAX_SEARCH_LENGTH: 100,

        EVENTS: {

            HISTORY_UPDATED: "hokm:history-updated",

            GAME_ADDED: "hokm:game-added",

            GAME_DELETED: "hokm:game-deleted",

            HISTORY_CLEARED: "hokm:history-cleared",

            HISTORY_FILTERED: "hokm:history-filtered"

        }

    };


    /* ============================================================
       PRIVATE STATE
       ============================================================ */

    let historyState = {

        records: [],

        filteredRecords: [],

        currentPage: 1,

        pageSize: HISTORY_CONFIG.PAGE_SIZE,

        searchQuery: "",

        filterResult: "all",

        filterMode: "all",

        filterDate: "all",

        sortBy: "date",

        sortDirection: "desc",

        selectedRecordId: null,

        initialized: false

    };


    /* ============================================================
       UTILITY FUNCTIONS
       ============================================================ */

    function generateId() {

        const timestamp = Date.now();

        const randomPart = Math.random()
            .toString(36)
            .substring(2, 10);

        return `game_${timestamp}_${randomPart}`;

    }


    function safeNumber(value, fallback = 0) {

        const number = Number(value);

        if (!Number.isFinite(number)) {

            return fallback;

        }

        return number;

    }


    function safeString(value, fallback = "") {

        if (value === null || value === undefined) {

            return fallback;

        }

        return String(value);

    }


    function cloneObject(object) {

        try {

            return JSON.parse(JSON.stringify(object));

        } catch (error) {

            return object;

        }

    }


    function normalizeResult(result) {

        const value = safeString(result)
            .trim()
            .toLowerCase();

        if (
            value === "win" ||
            value === "won" ||
            value === "victory" ||
            value === "برد"
        ) {

            return "win";

        }

        if (
            value === "loss" ||
            value === "lose" ||
            value === "lost" ||
            value === "defeat" ||
            value === "باخت"
        ) {

            return "loss";

        }

        if (
            value === "draw" ||
            value === "tie" ||
            value === "مساوی"
        ) {

            return "draw";

        }

        return "unknown";

    }


    function normalizeMode(mode) {

        const value = safeString(mode)
            .trim()
            .toLowerCase();

        const knownModes = [

            "classic",

            "ranked",

            "practice",

            "private",

            "quick",

            "custom"

        ];

        if (knownModes.includes(value)) {

            return value;

        }

        return HISTORY_CONFIG.DEFAULT_MODE;

    }


    function getModeTitle(mode) {

        const titles = {

            classic: "حکم کلاسیک",

            ranked: "حکم رقابتی",

            practice: "تمرینی",

            private: "اتاق خصوصی",

            quick: "بازی سریع",

            custom: "بازی سفارشی"

        };

        return titles[mode] || "حکم کلاسیک";

    }


    function getResultTitle(result) {

        const titles = {

            win: "برد",

            loss: "باخت",

            draw: "مساوی",

            unknown: "نامشخص"

        };

        return titles[result] || titles.unknown;

    }


    function getResultIcon(result) {

        const icons = {

            win: "🏆",

            loss: "❌",

            draw: "🤝",

            unknown: "🃏"

        };

        return icons[result] || icons.unknown;

    }


    function getResultClass(result) {

        const classes = {

            win: "history-win",

            loss: "history-loss",

            draw: "history-draw",

            unknown: "history-unknown"

        };

        return classes[result] || classes.unknown;

    }


    function formatNumber(value) {

        return safeNumber(value)
            .toLocaleString("fa-IR");

    }


    function formatDate(timestamp) {

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {

            return "تاریخ نامشخص";

        }

        return new Intl.DateTimeFormat(
            HISTORY_CONFIG.DATE_LOCALE,
            {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).format(date);

    }


    function formatTime(timestamp) {

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {

            return "--:--";

        }

        return new Intl.DateTimeFormat(
            HISTORY_CONFIG.DATE_LOCALE,
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        ).format(date);

    }


    function formatDateTime(timestamp) {

        return `${formatDate(timestamp)} - ${formatTime(timestamp)}`;

    }


    function escapeHTML(value) {

        const div = document.createElement("div");

        div.textContent = safeString(value);

        return div.innerHTML;

    }


    function dispatchEvent(eventName, detail = {}) {

        try {

            const event = new CustomEvent(
                eventName,
                {
                    detail
                }
            );

            window.dispatchEvent(event);

        } catch (error) {

            console.warn(
                "History event error:",
                error
            );

        }

    }


    /* ============================================================
       STORAGE
       ============================================================ */

    function loadFromStorage() {

        try {

            /*
             * اگر storage.js سیستم خودش را ارائه کرده باشد،
             * ابتدا از آن استفاده می‌کنیم.
             */

            if (
                window.HokmStorage &&
                typeof window.HokmStorage.get === "function"
            ) {

                const stored = window.HokmStorage.get(
                    HISTORY_CONFIG.STORAGE_KEY
                );

                if (Array.isArray(stored)) {

                    return stored;

                }

            }


            const raw = localStorage.getItem(
                HISTORY_CONFIG.STORAGE_KEY
            );

            if (!raw) {

                return [];

            }

            const parsed = JSON.parse(raw);

            if (!Array.isArray(parsed)) {

                return [];

            }

            return parsed;

        } catch (error) {

            console.error(
                "History load error:",
                error
            );

            return [];

        }

    }


    function saveToStorage(records) {

        try {

            const clonedRecords = cloneObject(records);

            if (
                window.HokmStorage &&
                typeof window.HokmStorage.set === "function"
            ) {

                window.HokmStorage.set(
                    HISTORY_CONFIG.STORAGE_KEY,
                    clonedRecords
                );

                return true;

            }


            localStorage.setItem(

                HISTORY_CONFIG.STORAGE_KEY,

                JSON.stringify(clonedRecords)

            );

            return true;

        } catch (error) {

            console.error(
                "History save error:",
                error
            );

            return false;

        }

    }


    /* ============================================================
       RECORD NORMALIZATION
       ============================================================ */

    function normalizeRecord(record) {

        if (!record || typeof record !== "object") {

            return null;

        }


        const now = Date.now();

        const normalized = {

            id:
                safeString(record.id) ||
                generateId(),

            version:
                safeNumber(
                    record.version,
                    HISTORY_CONFIG.VERSION
                ),

            timestamp:
                safeNumber(
                    record.timestamp,
                    now
                ),

            startedAt:
                safeNumber(
                    record.startedAt,
                    safeNumber(record.timestamp, now)
                ),

            endedAt:
                safeNumber(
                    record.endedAt,
                    safeNumber(record.timestamp, now)
                ),

            mode:
                normalizeMode(record.mode),

            gameType:
                safeString(
                    record.gameType,
                    HISTORY_CONFIG.DEFAULT_GAME_TYPE
                ),

            result:
                normalizeResult(record.result),

            score: {

                myTeam:
                    safeNumber(
                        record.score &&
                        record.score.myTeam,
                        0
                    ),

                opponentTeam:
                    safeNumber(
                        record.score &&
                        record.score.opponentTeam,
                        0
                    )

            },

            tricks: {

                won:
                    safeNumber(
                        record.tricks &&
                        record.tricks.won,
                        0
                    ),

                lost:
                    safeNumber(
                        record.tricks &&
                        record.tricks.lost,
                        0
                    )

            },

            trump:
                safeString(
                    record.trump,
                    ""
                ),

            player: {

                id:
                    safeString(
                        record.player &&
                        record.player.id,
                        ""
                    ),

                username:
                    safeString(
                        record.player &&
                        record.player.username,
                        "بازیکن"
                    )

            },

            team: {

                players:
                    Array.isArray(
                        record.team &&
                        record.team.players
                    )
                        ? cloneObject(
                            record.team.players
                        )
                        : []

            },

            opponents:
                Array.isArray(record.opponents)
                    ? cloneObject(record.opponents)
                    : [],

            coins: {

                earned:
                    safeNumber(
                        record.coins &&
                        record.coins.earned,
                        0
                    ),

                lost:
                    safeNumber(
                        record.coins &&
                        record.coins.lost,
                        0
                    ),

                net:
                    safeNumber(
                        record.coins &&
                        record.coins.net,
                        0
                    )

            },

            xp: {

                earned:
                    safeNumber(
                        record.xp &&
                        record.xp.earned,
                        0
                    )

            },

            ranked: {

                ratingBefore:
                    safeNumber(
                        record.ranked &&
                        record.ranked.ratingBefore,
                        0
                    ),

                ratingAfter:
                    safeNumber(
                        record.ranked &&
                        record.ranked.ratingAfter,
                        0
                    ),

                ratingChange:
                    safeNumber(
                        record.ranked &&
                        record.ranked.ratingChange,
                        0
                    )

            },

            room: {

                id:
                    safeString(
                        record.room &&
                        record.room.id,
                        ""
                    ),

                code:
                    safeString(
                        record.room &&
                        record.room.code,
                        ""
                    ),

                name:
                    safeString(
                        record.room &&
                        record.room.name,
                        ""
                    )

            },

            durationSeconds:
                Math.max(
                    0,
                    safeNumber(
                        record.durationSeconds,
                        0
                    )
                ),

            metadata:
                record.metadata &&
                typeof record.metadata === "object"
                    ? cloneObject(record.metadata)
                    : {}

        };


        /*
         * اگر net مشخص نشده باشد،
         * از earned و lost محاسبه می‌کنیم.
         */

        if (
            normalized.coins.net === 0 &&
            (
                normalized.coins.earned !== 0 ||
                normalized.coins.lost !== 0
            )
        ) {

            normalized.coins.net =
                normalized.coins.earned -
                normalized.coins.lost;

        }


        return normalized;

    }


    /* ============================================================
       LOAD AND INITIALIZE
       ============================================================ */

    function initialize() {

        if (historyState.initialized) {

            return getState();

        }


        const storedRecords = loadFromStorage();

        historyState.records = storedRecords
            .map(normalizeRecord)
            .filter(Boolean)
            .sort(
                (a, b) =>
                    b.timestamp -
                    a.timestamp
            );


        if (
            historyState.records.length >
            HISTORY_CONFIG.MAX_RECORDS
        ) {

            historyState.records =
                historyState.records.slice(
                    0,
                    HISTORY_CONFIG.MAX_RECORDS
                );

            saveToStorage(
                historyState.records
            );

        }


        historyState.initialized = true;

        applyFilters();

        return getState();

    }


    function getState() {

        return cloneObject({

            records:
                historyState.records,

            filteredRecords:
                historyState.filteredRecords,

            currentPage:
                historyState.currentPage,

            pageSize:
                historyState.pageSize,

            searchQuery:
                historyState.searchQuery,

            filterResult:
                historyState.filterResult,

            filterMode:
                historyState.filterMode,

            filterDate:
                historyState.filterDate,

            sortBy:
                historyState.sortBy,

            sortDirection:
                historyState.sortDirection,

            selectedRecordId:
                historyState.selectedRecordId,

            initialized:
                historyState.initialized

        });

    }


    /* ============================================================
       ADD GAME RECORD
       ============================================================ */

    function addGame(gameData = {}) {

        initialize();


        const record = normalizeRecord({

            ...gameData,

            id:
                safeString(gameData.id) ||
                generateId(),

            timestamp:
                safeNumber(
                    gameData.timestamp,
                    Date.now()
                )

        });


        if (!record) {

            return null;

        }


        /*
         * اگر همان ID قبلاً وجود داشته باشد،
         * رکورد جدید ایجاد نمی‌کنیم.
         */

        const duplicateIndex =
            historyState.records.findIndex(
                item =>
                    item.id === record.id
            );


        if (duplicateIndex !== -1) {

            historyState.records[
                duplicateIndex
            ] = record;

        } else {

            historyState.records.unshift(
                record
            );

        }


        /*
         * محدود کردن تعداد رکوردها
         */

        if (
            historyState.records.length >
            HISTORY_CONFIG.MAX_RECORDS
        ) {

            historyState.records =
                historyState.records.slice(
                    0,
                    HISTORY_CONFIG.MAX_RECORDS
                );

        }


        saveToStorage(
            historyState.records
        );


        historyState.currentPage = 1;

        applyFilters();


        dispatchEvent(
            HISTORY_CONFIG.EVENTS.GAME_ADDED,
            {
                record: cloneObject(record)
            }
        );


        dispatchEvent(
            HISTORY_CONFIG.EVENTS.HISTORY_UPDATED,
            {
                records:
                    cloneObject(
                        historyState.records
                    )
            }
        );


        /*
         * به‌روزرسانی UI در صورت وجود
         */

        render();


        return cloneObject(record);

    }


    /* ============================================================
       CREATE RECORD FROM GAME
       ============================================================ */

    function recordGameResult(gameData = {}) {

        const normalizedResult =
            normalizeResult(
                gameData.result
            );


        const recordData = {

            id:
                gameData.id,

            timestamp:
                gameData.timestamp ||
                Date.now(),

            startedAt:
                gameData.startedAt ||
                Date.now(),

            endedAt:
                gameData.endedAt ||
                Date.now(),

            mode:
                gameData.mode ||
                "classic",

            gameType:
                gameData.gameType ||
                "hokm",

            result:
                normalizedResult,

            score: {

                myTeam:
                    gameData.myTeamScore ??
                    gameData.score?.myTeam ??
                    0,

                opponentTeam:
                    gameData.opponentTeamScore ??
                    gameData.score?.opponentTeam ??
                    0

            },

            tricks: {

                won:
                    gameData.tricksWon ??
                    gameData.tricks?.won ??
                    0,

                lost:
                    gameData.tricksLost ??
                    gameData.tricks?.lost ??
                    0

            },

            trump:
                gameData.trump ||
                "",

            player: {

                id:
                    gameData.playerId ||
                    window.currentUser?.id ||
                    "",

                username:
                    gameData.username ||
                    window.currentUser?.username ||
                    "بازیکن"

            },

            team: {

                players:
                    gameData.teamPlayers ||
                    gameData.team?.players ||
                    []

            },

            opponents:
                gameData.opponents ||
                [],

            coins: {

                earned:
                    gameData.coinsEarned ??
                    gameData.coins?.earned ??
                    0,

                lost:
                    gameData.coinsLost ??
                    gameData.coins?.lost ??
                    0,

                net:
                    gameData.coinsNet ??
                    gameData.coins?.net ??
                    0

            },

            xp: {

                earned:
                    gameData.xpEarned ??
                    gameData.xp?.earned ??
                    0

            },

            ranked: {

                ratingBefore:
                    gameData.ratingBefore ??
                    gameData.ranked?.ratingBefore ??
                    0,

                ratingAfter:
                    gameData.ratingAfter ??
                    gameData.ranked?.ratingAfter ??
                    0,

                ratingChange:
                    gameData.ratingChange ??
                    gameData.ranked?.ratingChange ??
                    0

            },

            room: {

                id:
                    gameData.roomId ||
                    gameData.room?.id ||
                    "",

                code:
                    gameData.roomCode ||
                    gameData.room?.code ||
                    "",

                name:
                    gameData.roomName ||
                    gameData.room?.name ||
                    ""

            },

            durationSeconds:
                gameData.durationSeconds ||
                Math.floor(
                    (
                        (
                            gameData.endedAt ||
                            Date.now()
                        ) -
                        (
                            gameData.startedAt ||
                            Date.now()
                        )
                    ) / 1000
                ),

            metadata:
                gameData.metadata ||
                {}

        };


        return addGame(recordData);

    }


    /* ============================================================
       GET RECORD BY ID
       ============================================================ */

    function getGame(gameId) {

        initialize();


        const record =
            historyState.records.find(
                item =>
                    item.id === gameId
            );


        return record
            ? cloneObject(record)
            : null;

    }


    /* ============================================================
       DELETE RECORD
       ============================================================ */

    function deleteGame(gameId) {

        initialize();


        const index =
            historyState.records.findIndex(
                item =>
                    item.id === gameId
            );


        if (index === -1) {

            return false;

        }


        const deletedRecord =
            historyState.records[index];


        historyState.records.splice(
            index,
            1
        );


        saveToStorage(
            historyState.records
        );


        applyFilters();


        dispatchEvent(
            HISTORY_CONFIG.EVENTS.GAME_DELETED,
            {
                record:
                    cloneObject(
                        deletedRecord
                    )
            }
        );


        dispatchEvent(
            HISTORY_CONFIG.EVENTS.HISTORY_UPDATED,
            {
                records:
                    cloneObject(
                        historyState.records
                    )
            }
        );


        render();


        return true;

    }


    /* ============================================================
       CLEAR HISTORY
       ============================================================ */

    function clearHistory() {

        initialize();


        historyState.records = [];

        historyState.filteredRecords = [];

        historyState.currentPage = 1;

        historyState.selectedRecordId = null;


        saveToStorage([]);


        dispatchEvent(
            HISTORY_CONFIG.EVENTS.HISTORY_CLEARED,
            {}
        );


        dispatchEvent(
            HISTORY_CONFIG.EVENTS.HISTORY_UPDATED,
            {
                records: []
            }
        );


        render();


        return true;

    }


    /* ============================================================
       SEARCH
       ============================================================ */

    function setSearchQuery(query) {

        const normalizedQuery =
            safeString(query)
                .trim()
                .substring(
                    0,
                    HISTORY_CONFIG.MAX_SEARCH_LENGTH
                );


        historyState.searchQuery =
            normalizedQuery;

        historyState.currentPage = 1;

        applyFilters();

        return getFilteredRecords();

    }


    /* ============================================================
       FILTER BY RESULT
       ============================================================ */

    function setResultFilter(result) {

        const validResults = [

            "all",

            "win",

            "loss",

            "draw",

            "unknown"

        ];


        historyState.filterResult =
            validResults.includes(result)
                ? result
                : "all";


        historyState.currentPage = 1;

        applyFilters();

        return getFilteredRecords();

    }


    /* ============================================================
       FILTER BY MODE
       ============================================================ */

    function setModeFilter(mode) {

        const normalized =
            safeString(mode)
                .trim()
                .toLowerCase();


        historyState.filterMode =
            normalized || "all";


        historyState.currentPage = 1;

        applyFilters();

        return getFilteredRecords();

    }


    /* ============================================================
       FILTER BY DATE
       ============================================================ */

    function setDateFilter(dateFilter) {

        const validFilters = [

            "all",

            "today",

            "yesterday",

            "week",

            "month"

        ];


        historyState.filterDate =
            validFilters.includes(
                dateFilter
            )
                ? dateFilter
                : "all";


        historyState.currentPage = 1;

        applyFilters();

        return getFilteredRecords();

    }


    /* ============================================================
       DATE FILTER HELPER
       ============================================================ */

    function matchesDateFilter(
        timestamp,
        filter
    ) {

        if (filter === "all") {

            return true;

        }


        const now = new Date();

        const date = new Date(timestamp);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return false;

        }


        if (filter === "today") {

            return (
                date.getFullYear() ===
                    now.getFullYear() &&

                date.getMonth() ===
                    now.getMonth() &&

                date.getDate() ===
                    now.getDate()
            );

        }


        if (filter === "yesterday") {

            const yesterday =
                new Date(now);

            yesterday.setDate(
                yesterday.getDate() - 1
            );


            return (
                date.getFullYear() ===
                    yesterday.getFullYear() &&

                date.getMonth() ===
                    yesterday.getMonth() &&

                date.getDate() ===
                    yesterday.getDate()
            );

        }


        if (filter === "week") {

            const weekAgo =
                new Date(now);

            weekAgo.setDate(
                weekAgo.getDate() - 7
            );


            return date >= weekAgo;

        }


        if (filter === "month") {

            const monthAgo =
                new Date(now);

            monthAgo.setMonth(
                monthAgo.getMonth() - 1
            );


            return date >= monthAgo;

        }


        return true;

    }


    /* ============================================================
       APPLY FILTERS
       ============================================================ */

    function applyFilters() {

        let records =
            historyState.records.slice();


        /*
         * Search
         */

        const query =
            historyState.searchQuery
                .trim()
                .toLowerCase();


        if (query) {

            records =
                records.filter(record => {

                    const searchableText = [

                        record.id,

                        record.player.username,

                        record.mode,

                        getModeTitle(
                            record.mode
                        ),

                        getResultTitle(
                            record.result
                        ),

                        record.room.name,

                        record.room.code,

                        record.trump,

                        ...record.opponents.map(
                            opponent =>
                                safeString(
                                    opponent.username ||
                                    opponent.name
                                )
                        ),

                        ...record.team.players.map(
                            player =>
                                safeString(
                                    player.username ||
                                    player.name
                                )
                        )

                    ]
                        .join(" ")
                        .toLowerCase();


                    return searchableText.includes(
                        query
                    );

                });

        }


        /*
         * Result filter
         */

        if (
            historyState.filterResult !==
            "all"
        ) {

            records =
                records.filter(
                    record =>
                        record.result ===
                        historyState.filterResult
                );

        }


        /*
         * Mode filter
         */

        if (
            historyState.filterMode !==
            "all"
        ) {

            records =
                records.filter(
                    record =>
                        record.mode ===
                        historyState.filterMode
                );

        }


        /*
         * Date filter
         */

        if (
            historyState.filterDate !==
            "all"
        ) {

            records =
                records.filter(
                    record =>
                        matchesDateFilter(
                            record.timestamp,
                            historyState.filterDate
                        )
                );

        }


        /*
         * Sorting
         */

        records.sort(
            createSortFunction(
                historyState.sortBy,
                historyState.sortDirection
            )
        );


        historyState.filteredRecords =
            records;


        /*
         * اصلاح صفحه در صورت خروج از محدوده
         */

        const totalPages =
            getTotalPages();


        if (
            historyState.currentPage >
            totalPages &&
            totalPages > 0
        ) {

            historyState.currentPage =
                totalPages;

        }


        dispatchEvent(
            HISTORY_CONFIG.EVENTS.HISTORY_FILTERED,
            {
                records:
                    cloneObject(records)
            }
        );


        return records;

    }


    /* ============================================================
       SORT FUNCTION
       ============================================================ */

    function createSortFunction(
        sortBy,
        direction
    ) {

        const multiplier =
            direction === "asc"
                ? 1
                : -1;


        return function (a, b) {

            let result = 0;


            if (sortBy === "date") {

                result =
                    safeNumber(a.timestamp) -
                    safeNumber(b.timestamp);

            }


            else if (
                sortBy === "score"
            ) {

                const aScore =
                    safeNumber(
                        a.score.myTeam
                    ) -
                    safeNumber(
                        a.score.opponentTeam
                    );


                const bScore =
                    safeNumber(
                        b.score.myTeam
                    ) -
                    safeNumber(
                        b.score.opponentTeam
                    );


                result =
                    aScore -
                    bScore;

            }


            else if (
                sortBy === "coins"
            ) {

                result =
                    safeNumber(
                        a.coins.net
                    ) -
                    safeNumber(
                        b.coins.net
                    );

            }


            else if (
                sortBy === "xp"
            ) {

                result =
                    safeNumber(
                        a.xp.earned
                    ) -
                    safeNumber(
                        b.xp.earned
                    );

            }


            else if (
                sortBy === "duration"
            ) {

                result =
                    safeNumber(
                        a.durationSeconds
                    ) -
                    safeNumber(
                        b.durationSeconds
                    );

            }


            else if (
                sortBy === "result"
            ) {

                result =
                    getResultTitle(
                        a.result
                    ).localeCompare(
                        getResultTitle(
                            b.result
                        ),
                        "fa"
                    );

            }


            return result * multiplier;

        };

    }


    /* ============================================================
       SET SORT
       ============================================================ */

    function setSort(
        sortBy,
        direction = null
    ) {

        const allowedSorts = [

            "date",

            "score",

            "coins",

            "xp",

            "duration",

            "result"

        ];


        if (
            !allowedSorts.includes(
                sortBy
            )
        ) {

            sortBy = "date";

        }


        if (direction !== null) {

            historyState.sortDirection =
                direction === "asc"
                    ? "asc"
                    : "desc";

        }

        else {

            if (
                historyState.sortBy ===
                sortBy
            ) {

                historyState.sortDirection =
                    historyState.sortDirection ===
                    "asc"
                        ? "desc"
                        : "asc";

            }

        }


        historyState.sortBy =
            sortBy;


        historyState.currentPage = 1;

        applyFilters();

        render();

        return getFilteredRecords();

    }


    /* ============================================================
       GET FILTERED RECORDS
       ============================================================ */

    function getFilteredRecords() {

        initialize();

        return cloneObject(
            historyState.filteredRecords
        );

    }


    /* ============================================================
       PAGINATION
       ============================================================ */

    function getTotalPages() {

        if (
            historyState.filteredRecords.length ===
            0
        ) {

            return 0;

        }


        return Math.ceil(

            historyState.filteredRecords.length /
            historyState.pageSize

        );

    }


    function getCurrentPageRecords() {

        const start =
            (
                historyState.currentPage -
                1
            ) *
            historyState.pageSize;


        const end =
            start +
            historyState.pageSize;


        return historyState.filteredRecords.slice(
            start,
            end
        );

    }


    function goToPage(page) {

        const totalPages =
            getTotalPages();


        let targetPage =
            safeNumber(
                page,
                1
            );


        if (targetPage < 1) {

            targetPage = 1;

        }


        if (
            totalPages > 0 &&
            targetPage > totalPages
        ) {

            targetPage =
                totalPages;

        }


        historyState.currentPage =
            targetPage;


        render();


        return getCurrentPageRecords();

    }


    function nextPage() {

        return goToPage(
            historyState.currentPage + 1
        );

    }


    function previousPage() {

        return goToPage(
            historyState.currentPage - 1
        );

    }


    /* ============================================================
       STATISTICS
       ============================================================ */

    function getStatistics(records = null) {

        initialize();


        const source =
            Array.isArray(records)
                ? records
                : historyState.records;


        const total =
            source.length;


        let wins = 0;

        let losses = 0;

        let draws = 0;

        let unknown = 0;

        let totalCoins = 0;

        let totalXP = 0;

        let totalDuration = 0;

        let totalTricksWon = 0;

        let totalTricksLost = 0;


        source.forEach(record => {

            if (
                record.result === "win"
            ) {

                wins++;

            }

            else if (
                record.result === "loss"
            ) {

                losses++;

            }

            else if (
                record.result === "draw"
            ) {

                draws++;

            }

            else {

                unknown++;

            }


            totalCoins +=
                safeNumber(
                    record.coins.net
                );


            totalXP +=
                safeNumber(
                    record.xp.earned
                );


            totalDuration +=
                safeNumber(
                    record.durationSeconds
                );


            totalTricksWon +=
                safeNumber(
                    record.tricks.won
                );


            totalTricksLost +=
                safeNumber(
                    record.tricks.lost
                );

        });


        const completedGames =
            wins +
            losses +
            draws;


        const winRate =
            completedGames > 0

                ? (
                    wins /
                    completedGames
                ) *
                100

                : 0;


        const averageDuration =
            total > 0

                ? totalDuration /
                    total

                : 0;


        return {

            total,

            completedGames,

            wins,

            losses,

            draws,

            unknown,

            winRate,

            totalCoins,

            totalXP,

            totalDuration,

            averageDuration,

            totalTricksWon,

            totalTricksLost

        };

    }


    /* ============================================================
       STREAK
       ============================================================ */

    function getWinStreak() {

        initialize();


        const sorted =
            historyState.records
                .slice()
                .sort(
                    (a, b) =>
                        b.timestamp -
                        a.timestamp
                );


        let currentStreak = 0;


        for (
            const record of sorted
        ) {

            if (
                record.result ===
                "win"
            ) {

                currentStreak++;

            }

            else {

                break;

            }

        }


        return currentStreak;

    }


    function getBestWinStreak() {

        initialize();


        const sorted =
            historyState.records
                .slice()
                .sort(
                    (a, b) =>
                        a.timestamp -
                        b.timestamp
                );


        let current = 0;

        let best = 0;


        sorted.forEach(record => {

            if (
                record.result ===
                "win"
            ) {

                current++;

                if (
                    current >
                    best
                ) {

                    best = current;

                }

            }

            else {

                current = 0;

            }

        });


        return best;

    }


    /* ============================================================
       MODE STATISTICS
       ============================================================ */

    function getModeStatistics() {

        initialize();


        const result = {};


        historyState.records.forEach(
            record => {

                const mode =
                    record.mode ||
                    "classic";


                if (!result[mode]) {

                    result[mode] = {

                        mode,

                        title:
                            getModeTitle(
                                mode
                            ),

                        total: 0,

                        wins: 0,

                        losses: 0,

                        draws: 0,

                        winRate: 0

                    };

                }


                result[mode].total++;


                if (
                    record.result ===
                    "win"
                ) {

                    result[mode].wins++;

                }

                else if (
                    record.result ===
                    "loss"
                ) {

                    result[mode].losses++;

                }

                else if (
                    record.result ===
                    "draw"
                ) {

                    result[mode].draws++;

                }

            }
        );


        Object.values(result)
            .forEach(item => {

                const completed =
                    item.wins +
                    item.losses +
                    item.draws;


                item.winRate =
                    completed > 0

                        ? (
                            item.wins /
                            completed
                        ) *
                        100

                        : 0;

            });


        return result;

    }


    /* ============================================================
       RENDER HISTORY PAGE
       ============================================================ */

    function render() {

        const container =
            document.getElementById(
                "history-list"
            );


        if (!container) {

            return;

        }


        initialize();


        const records =
            getCurrentPageRecords();


        /*
         * اگر رکوردی وجود ندارد
         */

        if (
            records.length === 0
        ) {

            renderEmptyState(
                container
            );

            return;

        }


        container.innerHTML = "";


        /*
         * ساخت لیست
         */

        records.forEach(
            record => {

                const element =
                    createHistoryItem(
                        record
                    );

                container.appendChild(
                    element
                );

            }
        );


        /*
         * صفحه‌بندی
         */

        const pagination =
            createPagination();


        if (pagination) {

            container.appendChild(
                pagination
            );

        }

    }


    /* ============================================================
       EMPTY STATE
       ============================================================ */

    function renderEmptyState(
        container
    ) {

        const hasFilters =
            Boolean(
                historyState.searchQuery ||
                historyState.filterResult !== "all" ||
                historyState.filterMode !== "all" ||
                historyState.filterDate !== "all"
            );


        if (hasFilters) {

            container.innerHTML = `

                <div class="empty-state history-empty-state">

                    <span class="empty-icon">
                        🔍
                    </span>

                    <p>
                        نتیجه‌ای پیدا نشد
                    </p>

                    <small>
                        فیلترها یا عبارت جستجو را تغییر دهید
                    </small>

                    <button
                        type="button"
                        class="secondary-button"
                        data-history-action="clear-filters"
                    >
                        پاک کردن فیلترها
                    </button>

                </div>

            `;

            return;

        }


        container.innerHTML = `

            <div class="empty-state history-empty-state">

                <span class="empty-icon">
                    📜
                </span>

                <p>
                    هنوز بازی‌ای انجام نداده‌اید
                </p>

                <small>
                    اولین بازی حکم خود را شروع کنید
                </small>

                <button
                    type="button"
                    class="primary-button"
                    data-history-action="start-game"
                >
                    شروع بازی
                </button>

            </div>

        `;

    }


    /* ============================================================
       CREATE HISTORY ITEM
       ============================================================ */

    function createHistoryItem(
        record
    ) {

        const article =
            document.createElement(
                "article"
            );


        article.className =
            `history-item ${getResultClass(
                record.result
            )}`;


        article.dataset.historyId =
            record.id;


        const scoreText =

            `${formatNumber(
                record.score.myTeam
            )} : ${formatNumber(
                record.score.opponentTeam
            )}`;


        const coinsNet =
            safeNumber(
                record.coins.net
            );


        let coinsHTML = "";


        if (coinsNet > 0) {

            coinsHTML = `
                <span class="history-coins positive">
                    🪙 +${formatNumber(coinsNet)}
                </span>
            `;

        }

        else if (coinsNet < 0) {

            coinsHTML = `
                <span class="history-coins negative">
                    🪙 ${formatNumber(coinsNet)}
                </span>
            `;

        }

        else {

            coinsHTML = `
                <span class="history-coins neutral">
                    🪙 0
                </span>
            `;

        }


        article.innerHTML = `

            <div class="history-result-icon">
                ${getResultIcon(record.result)}
            </div>


            <div class="history-main">

                <div class="history-top-row">

                    <strong class="history-game-title">
                        ${escapeHTML(
                            getModeTitle(
                                record.mode
                            )
                        )}
                    </strong>

                    <span class="history-result-label">
                        ${escapeHTML(
                            getResultTitle(
                                record.result
                            )
                        )}
                    </span>

                </div>


                <div class="history-middle-row">

                    <span class="history-score">
                        ${scoreText}
                    </span>

                    <span class="history-date">
                        ${escapeHTML(
                            formatDateTime(
                                record.timestamp
                            )
                        )}
                    </span>

                </div>


                <div class="history-bottom-row">

                    <span class="history-opponents">

                        ${
                            record.opponents.length > 0

                            ? `حریف: ${escapeHTML(
                                record.opponents
                                    .map(
                                        opponent =>
                                            opponent.username ||
                                            opponent.name ||
                                            "بازیکن"
                                    )
                                    .join("، ")
                            )}`

                            : "بازی حکم"

                        }

                    </span>

                    ${coinsHTML}

                </div>

            </div>


            <button
                type="button"
                class="history-details-button"
                data-history-action="details"
                data-history-id="${escapeHTML(
                    record.id
                )}"
                aria-label="جزئیات بازی"
            >
                →
            </button>

        `;


        return article;

    }


    /* ============================================================
       CREATE PAGINATION
       ============================================================ */

    function createPagination() {

        const totalPages =
            getTotalPages();


        if (
            totalPages <= 1
        ) {

            return null;

        }


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "history-pagination";


        const previousButton =
            document.createElement(
                "button"
            );


        previousButton.type =
            "button";


        previousButton.className =
            "pagination-button";


        previousButton.textContent =
            "→";


        previousButton.disabled =
            historyState.currentPage <= 1;


        previousButton.dataset.historyPage =
            String(
                historyState.currentPage - 1
            );


        wrapper.appendChild(
            previousButton
        );


        const maxVisiblePages = 5;


        let startPage = Math.max(

            1,

            historyState.currentPage -
            Math.floor(
                maxVisiblePages / 2
            )

        );


        let endPage = Math.min(

            totalPages,

            startPage +
            maxVisiblePages -
            1

        );


        if (
            endPage -
            startPage +
            1 <
            maxVisiblePages
        ) {

            startPage = Math.max(

                1,

                endPage -
                maxVisiblePages +
                1

            );

        }


        for (
            let page = startPage;
            page <= endPage;
            page++
        ) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "pagination-button";


            if (
                page ===
                historyState.currentPage
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.textContent =
                formatNumber(page);


            button.dataset.historyPage =
                String(page);


            wrapper.appendChild(
                button
            );

        }


        const nextButton =
            document.createElement(
                "button"
            );


        nextButton.type =
            "button";


        nextButton.className =
            "pagination-button";


        nextButton.textContent =
            "←";


        nextButton.disabled =
            historyState.currentPage >=
            totalPages;


        nextButton.dataset.historyPage =
            String(
                historyState.currentPage + 1
            );


        wrapper.appendChild(
            nextButton
        );


        return wrapper;

    }


    /* ============================================================
       DETAILS MODAL
       ============================================================ */

    function showGameDetails(
        gameId
    ) {

        const record =
            getGame(gameId);


        if (!record) {

            return false;

        }


        historyState.selectedRecordId =
            gameId;


        const existing =
            document.getElementById(
                "history-details-modal"
            );


        if (existing) {

            existing.remove();

        }


        const modal =
            document.createElement(
                "div"
            );


        modal.id =
            "history-details-modal";


        modal.className =
            "modal-overlay history-details-overlay";


        modal.setAttribute(
            "role",
            "dialog"
        );


        modal.setAttribute(
            "aria-modal",
            "true"
        );


        const score =
            `${formatNumber(
                record.score.myTeam
            )} : ${formatNumber(
                record.score.opponentTeam
            )}`;


        const duration =
            formatDuration(
                record.durationSeconds
            );


        modal.innerHTML = `

            <div class="modal history-details-modal">

                <button
                    type="button"
                    class="modal-close"
                    data-history-action="close-details"
                    aria-label="بستن"
                >
                    ×
                </button>


                <div class="modal-icon">
                    ${getResultIcon(
                        record.result
                    )}
                </div>


                <h2>
                    جزئیات بازی
                </h2>


                <p class="history-detail-result">
                    ${escapeHTML(
                        getResultTitle(
                            record.result
                        )
                    )}
                </p>


                <div class="history-detail-score">

                    <span>
                        امتیاز
                    </span>

                    <strong>
                        ${score}
                    </strong>

                </div>


                <div class="history-detail-grid">


                    <div class="history-detail-row">

                        <span>
                            حالت بازی
                        </span>

                        <strong>
                            ${escapeHTML(
                                getModeTitle(
                                    record.mode
                                )
                            )}
                        </strong>

                    </div>


                    <div class="history-detail-row">

                        <span>
                            تاریخ
                        </span>

                        <strong>
                            ${escapeHTML(
                                formatDate(
                                    record.timestamp
                                )
                            )}
                        </strong>

                    </div>


                    <div class="history-detail-row">

                        <span>
                            ساعت
                        </span>

                        <strong>
                            ${escapeHTML(
                                formatTime(
                                    record.timestamp
                                )
                            )}
                        </strong>

                    </div>


                    <div class="history-detail-row">

                        <span>
                            مدت بازی
                        </span>

                        <strong>
                            ${escapeHTML(
                                duration
                            )}
                        </strong>

                    </div>


                    <div class="history-detail-row">

                        <span>
                            دست‌های برده
                        </span>

                        <strong>
                            ${formatNumber(
                                record.tricks.won
                            )}
                        </strong>

                    </div>


                    <div class="history-detail-row">

                        <span>
                            دست‌های باخته
                        </span>

                        <strong>
                            ${formatNumber(
                                record.tricks.lost
                            )}
                        </strong>

                    </div>


                    ${
                        record.trump

                        ? `

                            <div class="history-detail-row">

                                <span>
                                    حکم
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        record.trump
                                    )}
                                </strong>

                            </div>

                        `

                        : ""

                    }


                    <div class="history-detail-row">

                        <span>
                            سکه
                        </span>

                        <strong>
                            ${record.coins.net >= 0 ? "+" : ""}
                            ${formatNumber(
                                record.coins.net
                            )}
                        </strong>

                    </div>


                    <div class="history-detail-row">

                        <span>
                            XP
                        </span>

                        <strong>
                            +${formatNumber(
                                record.xp.earned
                            )}
                        </strong>

                    </div>


                    ${
                        record.ranked.ratingChange !== 0

                        ? `

                            <div class="history-detail-row">

                                <span>
                                    تغییر ریتینگ
                                </span>

                                <strong>
                                    ${
                                        record.ranked.ratingChange >= 0
                                            ? "+"
                                            : ""
                                    }

                                    ${formatNumber(
                                        record.ranked.ratingChange
                                    )}

                                </strong>

                            </div>

                        `

                        : ""

                    }

                </div>


                ${
                    record.opponents.length > 0

                    ? `

                        <div class="history-detail-section">

                            <h3>
                                حریفان
                            </h3>

                            <div class="history-detail-players">

                                ${record.opponents
                                    .map(
                                        opponent => `

                                            <div class="history-detail-player">

                                                <span>
                                                    👤
                                                </span>

                                                <strong>
                                                    ${escapeHTML(
                                                        opponent.username ||
                                                        opponent.name ||
                                                        "بازیکن"
                                                    )}
                                                </strong>

                                            </div>

                                        `
                                    )
                                    .join("")
                                }

                            </div>

                        </div>

                    `

                    : ""

                }


                <div class="modal-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        data-history-action="close-details"
                    >
                        بستن
                    </button>


                    <button
                        type="button"
                        class="danger-button"
                        data-history-action="delete"
                        data-history-id="${escapeHTML(
                            record.id
                        )}"
                    >
                        حذف رکورد
                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        requestAnimationFrame(
            () => {

                modal.classList.add(
                    "visible"
                );

            }
        );


        return true;

    }


    /* ============================================================
       CLOSE DETAILS
       ============================================================ */

    function closeDetails() {

        const modal =
            document.getElementById(
                "history-details-modal"
            );


        if (!modal) {

            return;

        }


        modal.classList.remove(
            "visible"
        );


        setTimeout(
            () => {

                if (modal.parentNode) {

                    modal.parentNode.removeChild(
                        modal
                    );

                }

            },
            200
        );


        historyState.selectedRecordId =
            null;

    }


    /* ============================================================
       FORMAT DURATION
       ============================================================ */

    function formatDuration(
        seconds
    ) {

        seconds =
            Math.max(
                0,
                Math.floor(
                    safeNumber(seconds)
                )
            );


        const minutes =
            Math.floor(
                seconds / 60
            );


        const remainingSeconds =
            seconds % 60;


        if (
            minutes === 0
        ) {

            return `${formatNumber(
                remainingSeconds
            )} ثانیه`;

        }


        if (
            minutes < 60
        ) {

            return `${formatNumber(
                minutes
            )} دقیقه و ${formatNumber(
                remainingSeconds
            )} ثانیه`;

        }


        const hours =
            Math.floor(
                minutes / 60
            );


        const remainingMinutes =
            minutes % 60;


        return `${formatNumber(
            hours
        )} ساعت و ${formatNumber(
            remainingMinutes
        )} دقیقه`;

    }


    /* ============================================================
       CLEAR FILTERS
       ============================================================ */

    function clearFilters() {

        historyState.searchQuery =
            "";

        historyState.filterResult =
            "all";

        historyState.filterMode =
            "all";

        historyState.filterDate =
            "all";

        historyState.currentPage =
            1;


        applyFilters();

        render();

        return getFilteredRecords();

    }


    /* ============================================================
       EXPORT HISTORY
       ============================================================ */

    function exportHistory() {

        initialize();


        const data = {

            version:
                HISTORY_CONFIG.VERSION,

            exportedAt:
                Date.now(),

            records:
                cloneObject(
                    historyState.records
                )

        };


        const json =
            JSON.stringify(
                data,
                null,
                2
            );


        try {

            const blob =
                new Blob(
                    [json],
                    {
                        type:
                            "application/json"
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            const anchor =
                document.createElement(
                    "a"
                );


            anchor.href =
                url;


            anchor.download =
                `hokm-history-${Date.now()}.json`;


            document.body.appendChild(
                anchor
            );


            anchor.click();


            anchor.remove();


            URL.revokeObjectURL(
                url
            );


            return true;

        } catch (error) {

            console.error(
                "History export error:",
                error
            );


            return false;

        }

    }


    /* ============================================================
       IMPORT HISTORY
       ============================================================ */

    function importHistory(
        jsonData
    ) {

        try {

            let parsed =
                typeof jsonData === "string"

                    ? JSON.parse(
                        jsonData
                    )

                    : jsonData;


            let records = [];


            if (
                Array.isArray(parsed)
            ) {

                records = parsed;

            }

            else if (
                parsed &&
                Array.isArray(
                    parsed.records
                )
            ) {

                records =
                    parsed.records;

            }

            else {

                return {

                    success: false,

                    message:
                        "فرمت تاریخچه نامعتبر است."

                };

            }


            const normalized =
                records
                    .map(
                        normalizeRecord
                    )
                    .filter(Boolean);


            /*
             * جلوگیری از رکوردهای تکراری
             */

            const existingIds =
                new Set(
                    historyState.records.map(
                        record =>
                            record.id
                    )
                );


            normalized.forEach(
                record => {

                    if (
                        !existingIds.has(
                            record.id
                        )
                    ) {

                        historyState.records.push(
                            record
                        );

                    }

                }
            );


            historyState.records.sort(
                (a, b) =>
                    b.timestamp -
                    a.timestamp
            );


            if (
                historyState.records.length >
                HISTORY_CONFIG.MAX_RECORDS
            ) {

                historyState.records =
                    historyState.records.slice(
                        0,
                        HISTORY_CONFIG.MAX_RECORDS
                    );

            }


            saveToStorage(
                historyState.records
            );


            applyFilters();

            render();


            dispatchEvent(
                HISTORY_CONFIG.EVENTS.HISTORY_UPDATED,
                {
                    records:
                        cloneObject(
                            historyState.records
                        )
                }
            );


            return {

                success: true,

                imported:
                    normalized.length,

                total:
                    historyState.records.length

            };

        } catch (error) {

            console.error(
                "History import error:",
                error
            );


            return {

                success: false,

                message:
                    "خطا در وارد کردن تاریخچه."

            };

        }

    }


    /* ============================================================
       EVENT HANDLERS
       ============================================================ */

    function handleHistoryClick(
        event
    ) {

        const target =
            event.target.closest(
                "[data-history-action]"
            );


        if (!target) {

            return;

        }


        const action =
            target.dataset.historyAction;


        const gameId =
            target.dataset.historyId;


        if (
            action ===
            "details"
        ) {

            showGameDetails(
                gameId
            );

            return;

        }


        if (
            action ===
            "close-details"
        ) {

            closeDetails();

            return;

        }


        if (
            action ===
            "delete"
        ) {

            confirmDelete(
                gameId
            );

            return;

        }


        if (
            action ===
            "clear-filters"
        ) {

            clearFilters();

            return;

        }


        if (
            action ===
            "start-game"
        ) {

            startGameFromHistory();

            return;

        }

    }


    /* ============================================================
       DELETE CONFIRMATION
       ============================================================ */

    function confirmDelete(
        gameId
    ) {

        const record =
            getGame(gameId);


        if (!record) {

            return;

        }


        /*
         * استفاده از سیستم confirmation
         * موجود در app.js در صورت وجود
         */

        if (
            window.HokmUI &&
            typeof window.HokmUI.confirm ===
                "function"
        ) {

            window.HokmUI.confirm({

                title:
                    "حذف بازی",

                message:
                    "آیا مطمئن هستید که می‌خواهید این رکورد را حذف کنید؟",

                confirmText:
                    "حذف",

                cancelText:
                    "انصراف",

                danger:
                    true,

                onConfirm:
                    () => {

                        deleteGame(
                            gameId
                        );

                        closeDetails();

                    }

            });


            return;

        }


        /*
         * fallback
         */

        const confirmed =
            window.confirm(
                "آیا مطمئن هستید که می‌خواهید این رکورد را حذف کنید؟"
            );


        if (confirmed) {

            deleteGame(
                gameId
            );

            closeDetails();

        }

    }


    /* ============================================================
       START GAME FROM HISTORY
       ============================================================ */

    function startGameFromHistory() {

        /*
         * اگر app.js سیستم navigation دارد
         */

        if (
            typeof window.navigateTo ===
            "function"
        ) {

            window.navigateTo(
                "home"
            );

        }


        /*
         * اگر game.js تابع start دارد
         */

        if (
            window.HokmGame &&
            typeof window.HokmGame.start ===
                "function"
        ) {

            try {

                window.HokmGame.start();

            } catch (error) {

                console.warn(
                    "Could not start game:",
                    error
                );

            }

        }


        /*
         * fallback برای UI
         */

        const quickButton =
            document.getElementById(
                "quick-match-button"
            );


        if (
            quickButton
        ) {

            quickButton.click();

        }

    }


    /* ============================================================
       INITIAL EVENT BINDING
       ============================================================ */

    function bindEvents() {

        document.addEventListener(
            "click",
            handleHistoryClick
        );


        /*
         * Pagination
         */

        document.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        "[data-history-page]"
                    );


                if (!button) {

                    return;

                }


                const page =
                    Number(
                        button.dataset.historyPage
                    );


                if (
                    Number.isFinite(page)
                ) {

                    goToPage(page);

                }

            }
        );


        /*
         * واکنش به باز شدن صفحه تاریخچه
         */

        window.addEventListener(
            "hokm:page-changed",
            function (event) {

                if (
                    event.detail &&
                    event.detail.page ===
                    "history"
                ) {

                    render();

                }

            }
        );


        /*
         * وقتی بازی تمام می‌شود
         */

        window.addEventListener(
            "hokm:game-ended",
            function (event) {

                if (
                    event.detail
                ) {

                    recordGameResult(
                        event.detail
                    );

                }

            }
        );


        /*
         * اگر game.js از event دیگری استفاده کند
         */

        window.addEventListener(
            "gameEnded",
            function (event) {

                if (
                    event.detail
                ) {

                    recordGameResult(
                        event.detail
                    );

                }

            }
        );


        /*
         * وقتی profile تغییر می‌کند
         */

        window.addEventListener(
            "hokm:profile-updated",
            function () {

                /*
                 * تاریخچه در رندر بعدی
                 * اطلاعات جدید کاربر را دریافت می‌کند.
                 */

                render();

            }
        );

    }


    /* ============================================================
       HISTORY PAGE UI HELPERS
       ============================================================ */

    function getHistorySummaryHTML() {

        const stats =
            getStatistics();


        return `

            <div class="history-summary">

                <div class="history-stat-card">

                    <span>
                        کل بازی‌ها
                    </span>

                    <strong>
                        ${formatNumber(
                            stats.total
                        )}
                    </strong>

                </div>


                <div class="history-stat-card">

                    <span>
                        بردها
                    </span>

                    <strong>
                        ${formatNumber(
                            stats.wins
                        )}
                    </strong>

                </div>


                <div class="history-stat-card">

                    <span>
                        باخت‌ها
                    </span>

                    <strong>
                        ${formatNumber(
                            stats.losses
                        )}
                    </strong>

                </div>


                <div class="history-stat-card">

                    <span>
                        درصد برد
                    </span>

                    <strong>
                        ${formatNumber(
                            Math.round(
                                stats.winRate
                            )
                        )}٪
                    </strong>

                </div>

            </div>

        `;

    }


    /* ============================================================
       RESET HISTORY
       ============================================================ */

    function reset() {

        historyState = {

            records: [],

            filteredRecords: [],

            currentPage: 1,

            pageSize:
                HISTORY_CONFIG.PAGE_SIZE,

            searchQuery: "",

            filterResult: "all",

            filterMode: "all",

            filterDate: "all",

            sortBy: "date",

            sortDirection: "desc",

            selectedRecordId: null,

            initialized: false

        };


        initialize();


        render();

    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    const HistoryAPI = {

        version:
            HISTORY_CONFIG.VERSION,

        config:
            cloneObject(
                HISTORY_CONFIG
            ),

        initialize,

        reset,

        addGame,

        recordGameResult,

        getGame,

        deleteGame,

        clearHistory,

        getState,

        getRecords:
            () => {

                initialize();

                return cloneObject(
                    historyState.records
                );

            },

        getFilteredRecords,

        setSearchQuery,

        setResultFilter,

        setModeFilter,

        setDateFilter,

        clearFilters,

        setSort,

        getCurrentPageRecords,

        getTotalPages,

        goToPage,

        nextPage,

        previousPage,

        getStatistics,

        getModeStatistics,

        getWinStreak,

        getBestWinStreak,

        showGameDetails,

        closeDetails,

        formatDate,

        formatTime,

        formatDateTime,

        formatDuration,

        getModeTitle,

        getResultTitle,

        getResultIcon,

        getResultClass,

        getHistorySummaryHTML,

        exportHistory,

        importHistory,

        render

    };


    /* ============================================================
       GLOBAL NAMESPACE
       ============================================================ */

    window.HokmHistory =
        HistoryAPI;


    /*
     * سازگاری با نام ساده‌تر
     */

    window.History =
        HistoryAPI;


    /* ============================================================
       AUTO INITIALIZATION
       ============================================================ */

    function boot() {

        try {

            initialize();

            bindEvents();

        } catch (error) {

            console.error(
                "History.js initialization error:",
                error
            );

        }

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            boot,
            {
                once: true
            }
        );

    }

    else {

        boot();

    }


})(window);


/* ================================================================
   END OF HISTORY.JS
   ================================================================ */
