/* ================================================================
   HOKM ONLINE
   WALLET SYSTEM
   wallet.js

   مرحله ۸ پروژه

   مسئولیت‌های این فایل:

   1. مدیریت موجودی سکه
   2. افزایش سکه
   3. کاهش سکه
   4. انتقال/تغییر موجودی
   5. پاداش بازی
   6. پاداش روزانه
   7. پاداش مأموریت
   8. پاداش برد
   9. هزینه ورود به بازی
   10. هزینه‌های داخل بازی
   11. تاریخچه تراکنش‌ها
   12. جلوگیری از موجودی منفی
   13. جلوگیری از اجرای همزمان تراکنش‌ها
   14. اعتبارسنجی داده‌ها
   15. ذخیره‌سازی امن در localStorage برای نسخه فعلی
   16. ایجاد رویداد برای هماهنگی سایر فایل‌ها
   17. به‌روزرسانی خودکار UI
   18. API عمومی برای سایر فایل‌های پروژه

   نکته:

   این فایل در نسخه فعلی برای حالت Local/Offline طراحی شده است.
   در نسخه آنلاین، همین API می‌تواند به Backend / Supabase متصل شود.

================================================================ */


/* ================================================================
   GLOBAL WALLET NAMESPACE
================================================================ */

(function (window) {

    "use strict";


    /* ============================================================
       CONSTANTS
    ============================================================ */

    const WALLET_VERSION = 1;

    const WALLET_STORAGE_KEY = "hokm_wallet_v1";

    const WALLET_TRANSACTION_KEY = "hokm_wallet_transactions_v1";

    const WALLET_LOCK_KEY = "hokm_wallet_transaction_lock";

    const WALLET_EVENT_NAME = "hokm:wallet-updated";

    const WALLET_TRANSACTION_EVENT = "hokm:wallet-transaction";

    const WALLET_ERROR_EVENT = "hokm:wallet-error";


    /* ============================================================
       DEFAULT VALUES
    ============================================================ */

    const DEFAULT_COINS = 1000;

    const MINIMUM_COINS = 0;

    const MAXIMUM_COINS = 999999999;

    const MAX_TRANSACTION_HISTORY = 500;

    const MAX_TRANSACTION_AMOUNT = 100000000;


    /* ============================================================
       TRANSACTION TYPES
    ============================================================ */

    const TRANSACTION_TYPES = Object.freeze({

        INITIAL: "initial",

        PURCHASE: "purchase",

        GAME_ENTRY: "game_entry",

        GAME_REWARD: "game_reward",

        WIN_REWARD: "win_reward",

        LOSS_REWARD: "loss_reward",

        DAILY_REWARD: "daily_reward",

        MISSION_REWARD: "mission_reward",

        ACHIEVEMENT_REWARD: "achievement_reward",

        BONUS: "bonus",

        GIFT: "gift",

        REFUND: "refund",

        SHOP_PURCHASE: "shop_purchase",

        GAME_EXPENSE: "game_expense",

        ADMIN_ADJUSTMENT: "admin_adjustment",

        PENALTY: "penalty",

        CORRECTION: "correction",

        UNKNOWN: "unknown"

    });


    /* ============================================================
       TRANSACTION DIRECTIONS
    ============================================================ */

    const TRANSACTION_DIRECTION = Object.freeze({

        CREDIT: "credit",

        DEBIT: "debit"

    });


    /* ============================================================
       WALLET STATE
    ============================================================ */

    let walletState = {

        version: WALLET_VERSION,

        coins: DEFAULT_COINS,

        totalEarned: 0,

        totalSpent: 0,

        lifetimeEarned: 0,

        lifetimeSpent: 0,

        lastTransactionId: null,

        lastTransactionAt: null,

        createdAt: null,

        updatedAt: null

    };


    /* ============================================================
       INTERNAL STATE
    ============================================================ */

    let transactionHistory = [];

    let transactionLock = false;

    let initialized = false;


    /* ============================================================
       UTILITY: CURRENT TIME
    ============================================================ */

    function getTimestamp() {

        return new Date().toISOString();

    }


    /* ============================================================
       UTILITY: UNIQUE ID
    ============================================================ */

    function createId(prefix) {

        const randomPart = Math.random()
            .toString(36)
            .substring(2, 10);

        const timePart = Date.now()
            .toString(36);

        return `${prefix}_${timePart}_${randomPart}`;

    }


    /* ============================================================
       UTILITY: SAFE NUMBER
    ============================================================ */

    function safeNumber(value, fallback = 0) {

        const number = Number(value);

        if (!Number.isFinite(number)) {

            return fallback;

        }

        return number;

    }


    /* ============================================================
       UTILITY: INTEGER
    ============================================================ */

    function safeInteger(value, fallback = 0) {

        const number = Number(value);

        if (!Number.isFinite(number)) {

            return fallback;

        }

        return Math.floor(number);

    }


    /* ============================================================
       UTILITY: CLAMP
    ============================================================ */

    function clamp(value, min, max) {

        return Math.min(
            Math.max(value, min),
            max
        );

    }


    /* ============================================================
       UTILITY: CLONE
    ============================================================ */

    function clone(data) {

        try {

            return JSON.parse(
                JSON.stringify(data)
            );

        } catch (error) {

            return data;

        }

    }


    /* ============================================================
       STORAGE HELPERS
    ============================================================ */

    function storageAvailable() {

        try {

            const testKey = "__hokm_wallet_test__";

            localStorage.setItem(
                testKey,
                "1"
            );

            localStorage.removeItem(
                testKey
            );

            return true;

        } catch (error) {

            return false;

        }

    }


    /* ============================================================
       SAVE WALLET
    ============================================================ */

    function saveWallet() {

        try {

            localStorage.setItem(
                WALLET_STORAGE_KEY,
                JSON.stringify(walletState)
            );

            return true;

        } catch (error) {

            console.error(
                "[Wallet] Failed to save wallet:",
                error
            );

            return false;

        }

    }


    /* ============================================================
       LOAD WALLET
    ============================================================ */

    function loadWallet() {

        if (!storageAvailable()) {

            return false;

        }


        try {

            const raw = localStorage.getItem(
                WALLET_STORAGE_KEY
            );


            if (!raw) {

                return false;

            }


            const parsed = JSON.parse(raw);


            if (!parsed || typeof parsed !== "object") {

                return false;

            }


            walletState = {

                version:
                    safeInteger(
                        parsed.version,
                        WALLET_VERSION
                    ),

                coins:
                    clamp(
                        safeInteger(
                            parsed.coins,
                            DEFAULT_COINS
                        ),
                        MINIMUM_COINS,
                        MAXIMUM_COINS
                    ),

                totalEarned:
                    Math.max(
                        0,
                        safeInteger(
                            parsed.totalEarned,
                            0
                        )
                    ),

                totalSpent:
                    Math.max(
                        0,
                        safeInteger(
                            parsed.totalSpent,
                            0
                        )
                    ),

                lifetimeEarned:
                    Math.max(
                        0,
                        safeInteger(
                            parsed.lifetimeEarned,
                            parsed.totalEarned || 0
                        )
                    ),

                lifetimeSpent:
                    Math.max(
                        0,
                        safeInteger(
                            parsed.lifetimeSpent,
                            parsed.totalSpent || 0
                        )
                    ),

                lastTransactionId:
                    parsed.lastTransactionId || null,

                lastTransactionAt:
                    parsed.lastTransactionAt || null,

                createdAt:
                    parsed.createdAt || getTimestamp(),

                updatedAt:
                    parsed.updatedAt || getTimestamp()

            };


            return true;

        } catch (error) {

            console.error(
                "[Wallet] Failed to load wallet:",
                error
            );

            return false;

        }

    }


    /* ============================================================
       SAVE TRANSACTION HISTORY
    ============================================================ */

    function saveTransactionHistory() {

        try {

            localStorage.setItem(
                WALLET_TRANSACTION_KEY,
                JSON.stringify(transactionHistory)
            );

            return true;

        } catch (error) {

            console.error(
                "[Wallet] Failed to save transactions:",
                error
            );

            return false;

        }

    }


    /* ============================================================
       LOAD TRANSACTION HISTORY
    ============================================================ */

    function loadTransactionHistory() {

        if (!storageAvailable()) {

            transactionHistory = [];

            return false;

        }


        try {

            const raw = localStorage.getItem(
                WALLET_TRANSACTION_KEY
            );


            if (!raw) {

                transactionHistory = [];

                return false;

            }


            const parsed = JSON.parse(raw);


            if (!Array.isArray(parsed)) {

                transactionHistory = [];

                return false;

            }


            transactionHistory = parsed
                .filter(
                    transaction =>
                        transaction &&
                        typeof transaction === "object"
                )
                .slice(
                    0,
                    MAX_TRANSACTION_HISTORY
                );


            return true;

        } catch (error) {

            console.error(
                "[Wallet] Failed to load transaction history:",
                error
            );

            transactionHistory = [];

            return false;

        }

    }


    /* ============================================================
       CREATE DEFAULT WALLET
    ============================================================ */

    function createDefaultWallet() {

        const now = getTimestamp();

        walletState = {

            version: WALLET_VERSION,

            coins: DEFAULT_COINS,

            totalEarned: 0,

            totalSpent: 0,

            lifetimeEarned: 0,

            lifetimeSpent: 0,

            lastTransactionId: null,

            lastTransactionAt: null,

            createdAt: now,

            updatedAt: now

        };


        transactionHistory = [];

        saveWallet();

        saveTransactionHistory();

    }


    /* ============================================================
       VALIDATE AMOUNT
    ============================================================ */

    function validateAmount(amount) {

        const numericAmount = safeInteger(
            amount,
            NaN
        );


        if (!Number.isFinite(numericAmount)) {

            return {

                valid: false,

                amount: 0,

                error: "مقدار سکه معتبر نیست."

            };

        }


        if (numericAmount <= 0) {

            return {

                valid: false,

                amount: numericAmount,

                error: "مقدار سکه باید بیشتر از صفر باشد."

            };

        }


        if (
            numericAmount >
            MAX_TRANSACTION_AMOUNT
        ) {

            return {

                valid: false,

                amount: numericAmount,

                error: "مقدار تراکنش بیش از حد مجاز است."

            };

        }


        return {

            valid: true,

            amount: numericAmount,

            error: null

        };

    }


    /* ============================================================
       VALIDATE TRANSACTION TYPE
    ============================================================ */

    function validateTransactionType(type) {

        if (!type) {

            return TRANSACTION_TYPES.UNKNOWN;

        }


        const values =
            Object.values(
                TRANSACTION_TYPES
            );


        if (values.includes(type)) {

            return type;

        }


        return TRANSACTION_TYPES.UNKNOWN;

    }


    /* ============================================================
       GET WALLET STATE
    ============================================================ */

    function getWallet() {

        return clone(walletState);

    }


    /* ============================================================
       GET COINS
    ============================================================ */

    function getCoins() {

        return walletState.coins;

    }


    /* ============================================================
       GET BALANCE
    ============================================================ */

    function getBalance() {

        return {

            coins: walletState.coins,

            totalEarned:
                walletState.totalEarned,

            totalSpent:
                walletState.totalSpent,

            lifetimeEarned:
                walletState.lifetimeEarned,

            lifetimeSpent:
                walletState.lifetimeSpent

        };

    }


    /* ============================================================
       CHECK SUFFICIENT FUNDS
    ============================================================ */

    function hasEnoughCoins(amount) {

        const validation =
            validateAmount(amount);


        if (!validation.valid) {

            return false;

        }


        return (
            walletState.coins >=
            validation.amount
        );

    }


    /* ============================================================
       ACQUIRE TRANSACTION LOCK
    ============================================================ */

    function acquireLock() {

        if (transactionLock) {

            return false;

        }


        transactionLock = true;

        return true;

    }


    /* ============================================================
       RELEASE TRANSACTION LOCK
    ============================================================ */

    function releaseLock() {

        transactionLock = false;

    }


    /* ============================================================
       DISPATCH EVENT
    ============================================================ */

    function dispatchWalletEvent(
        eventName,
        detail
    ) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    eventName,
                    {
                        detail: clone(detail)
                    }
                )
            );

        } catch (error) {

            console.warn(
                "[Wallet] Event dispatch failed:",
                error
            );

        }

    }


    /* ============================================================
       UPDATE UI
    ============================================================ */

    function updateWalletUI() {

        const coins = walletState.coins;


        const selectors = [

            "#home-coins",

            "#shop-coins",

            "#wallet-coins",

            "#header-coins",

            "[data-wallet-coins]"

        ];


        selectors.forEach(
            selector => {

                try {

                    const elements =
                        document.querySelectorAll(
                            selector
                        );


                    elements.forEach(
                        element => {

                            element.textContent =
                                formatCoins(coins);

                        }
                    );

                } catch (error) {

                    /* Ignore UI selector errors */

                }

            }
        );


        dispatchWalletEvent(
            WALLET_EVENT_NAME,
            {

                wallet:
                    getWallet(),

                balance:
                    getBalance()

            }
        );

    }


    /* ============================================================
       FORMAT COINS
    ============================================================ */

    function formatCoins(amount) {

        const number =
            safeInteger(
                amount,
                0
            );


        try {

            return number.toLocaleString(
                "fa-IR"
            );

        } catch (error) {

            return String(number);

        }

    }


    /* ============================================================
       FORMAT TRANSACTION DATE
    ============================================================ */

    function formatTransactionDate(
        timestamp
    ) {

        if (!timestamp) {

            return "";

        }


        try {

            const date =
                new Date(timestamp);


            return date.toLocaleString(
                "fa-IR",
                {

                    year: "numeric",

                    month: "2-digit",

                    day: "2-digit",

                    hour: "2-digit",

                    minute: "2-digit"

                }
            );

        } catch (error) {

            return timestamp;

        }

    }


    /* ============================================================
       ADD TRANSACTION
    ============================================================ */

    function addTransaction(
        transaction
    ) {

        transactionHistory.unshift(
            transaction
        );


        if (
            transactionHistory.length >
            MAX_TRANSACTION_HISTORY
        ) {

            transactionHistory =
                transactionHistory.slice(
                    0,
                    MAX_TRANSACTION_HISTORY
                );

        }


        saveTransactionHistory();

    }


    /* ============================================================
       CREATE TRANSACTION
    ============================================================ */

    function createTransaction({

        amount,

        direction,

        type,

        description,

        metadata = {},

        balanceBefore,

        balanceAfter

    }) {

        const timestamp =
            getTimestamp();


        return {

            id:
                createId(
                    "wallet_tx"
                ),

            version:
                WALLET_VERSION,

            amount:

                safeInteger(
                    amount,
                    0
                ),

            direction,

            type:
                validateTransactionType(
                    type
                ),

            description:
                description ||
                "تراکنش کیف پول",

            balanceBefore:
                safeInteger(
                    balanceBefore,
                    0
                ),

            balanceAfter:
                safeInteger(
                    balanceAfter,
                    0
                ),

            metadata:
                clone(metadata),

            createdAt:
                timestamp

        };

    }


    /* ============================================================
       CREDIT COINS
    ============================================================ */

    function addCoins(
        amount,
        options = {}
    ) {

        const validation =
            validateAmount(amount);


        if (!validation.valid) {

            return {

                success: false,

                error:
                    validation.error,

                balance:
                    getBalance()

            };

        }


        if (!acquireLock()) {

            return {

                success: false,

                error:
                    "تراکنش دیگری در حال انجام است.",

                balance:
                    getBalance()

            };

        }


        try {

            const coins =
                validation.amount;


            const balanceBefore =
                walletState.coins;


            const balanceAfter =
                balanceBefore +
                coins;


            if (
                balanceAfter >
                MAXIMUM_COINS
            ) {

                return {

                    success: false,

                    error:
                        "موجودی کیف پول بیش از حد مجاز می‌شود.",

                    balance:
                        getBalance()

                };

            }


            const transaction =
                createTransaction({

                    amount:
                        coins,

                    direction:
                        TRANSACTION_DIRECTION.CREDIT,

                    type:
                        options.type ||
                        TRANSACTION_TYPES.BONUS,

                    description:
                        options.description ||
                        "دریافت سکه",

                    metadata:
                        options.metadata ||
                        {},

                    balanceBefore,

                    balanceAfter

                });


            walletState.coins =
                balanceAfter;


            walletState.totalEarned +=
                coins;


            walletState.lifetimeEarned +=
                coins;


            walletState.lastTransactionId =
                transaction.id;


            walletState.lastTransactionAt =
                transaction.createdAt;


            walletState.updatedAt =
                transaction.createdAt;


            addTransaction(
                transaction
            );


            saveWallet();


            updateWalletUI();


            dispatchWalletEvent(
                WALLET_TRANSACTION_EVENT,
                transaction
            );


            return {

                success: true,

                transaction:
                    clone(transaction),

                amount:
                    coins,

                balance:
                    getBalance()

            };

        } finally {

            releaseLock();

        }

    }


    /* ============================================================
       REMOVE COINS
    ============================================================ */

    function removeCoins(
        amount,
        options = {}
    ) {

        const validation =
            validateAmount(amount);


        if (!validation.valid) {

            return {

                success: false,

                error:
                    validation.error,

                balance:
                    getBalance()

            };

        }


        if (!acquireLock()) {

            return {

                success: false,

                error:
                    "تراکنش دیگری در حال انجام است.",

                balance:
                    getBalance()

            };

        }


        try {

            const coins =
                validation.amount;


            const balanceBefore =
                walletState.coins;


            if (
                balanceBefore <
                coins
            ) {

                return {

                    success: false,

                    error:
                        "موجودی سکه کافی نیست.",

                    code:
                        "INSUFFICIENT_FUNDS",

                    required:
                        coins,

                    available:
                        balanceBefore,

                    balance:
                        getBalance()

                };

            }


            const balanceAfter =
                balanceBefore -
                coins;


            const transaction =
                createTransaction({

                    amount:
                        coins,

                    direction:
                        TRANSACTION_DIRECTION.DEBIT,

                    type:
                        options.type ||
                        TRANSACTION_TYPES.GAME_EXPENSE,

                    description:
                        options.description ||
                        "هزینه سکه",

                    metadata:
                        options.metadata ||
                        {},

                    balanceBefore,

                    balanceAfter

                });


            walletState.coins =
                balanceAfter;


            walletState.totalSpent +=
                coins;


            walletState.lifetimeSpent +=
                coins;


            walletState.lastTransactionId =
                transaction.id;


            walletState.lastTransactionAt =
                transaction.createdAt;


            walletState.updatedAt =
                transaction.createdAt;


            addTransaction(
                transaction
            );


            saveWallet();


            updateWalletUI();


            dispatchWalletEvent(
                WALLET_TRANSACTION_EVENT,
                transaction
            );


            return {

                success: true,

                transaction:
                    clone(transaction),

                amount:
                    coins,

                balance:
                    getBalance()

            };

        } finally {

            releaseLock();

        }

    }


    /* ============================================================
       ADD BONUS
    ============================================================ */

    function addBonus(
        amount,
        description = "پاداش"
    ) {

        return addCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.BONUS,

                description

            }
        );

    }


    /* ============================================================
       DAILY REWARD
    ============================================================ */

    function addDailyReward(
        amount = 100
    ) {

        return addCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.DAILY_REWARD,

                description:
                    "پاداش روزانه"

            }
        );

    }


    /* ============================================================
       GAME REWARD
    ============================================================ */

    function addGameReward(
        amount,
        gameData = {}
    ) {

        return addCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.GAME_REWARD,

                description:
                    "پاداش پایان بازی",

                metadata:
                    {

                        gameId:
                            gameData.gameId ||
                            null,

                        result:
                            gameData.result ||
                            null,

                        mode:
                            gameData.mode ||
                            null

                    }

            }
        );

    }


    /* ============================================================
       WIN REWARD
    ============================================================ */

    function addWinReward(
        amount,
        gameData = {}
    ) {

        return addCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.WIN_REWARD,

                description:
                    "پاداش برد بازی",

                metadata:
                    {

                        gameId:
                            gameData.gameId ||
                            null,

                        mode:
                            gameData.mode ||
                            null,

                        score:
                            gameData.score ||
                            null

                    }

            }
        );

    }


    /* ============================================================
       LOSS REWARD
    ============================================================ */

    function addLossReward(
        amount,
        gameData = {}
    ) {

        return addCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.LOSS_REWARD,

                description:
                    "پاداش بازی",

                metadata:
                    {

                        gameId:
                            gameData.gameId ||
                            null,

                        mode:
                            gameData.mode ||
                            null

                    }

            }
        );

    }


    /* ============================================================
       MISSION REWARD
    ============================================================ */

    function addMissionReward(
        amount,
        missionData = {}
    ) {

        return addCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.MISSION_REWARD,

                description:
                    missionData.description ||
                    "پاداش مأموریت",

                metadata:
                    {

                        missionId:
                            missionData.missionId ||
                            null,

                        missionTitle:
                            missionData.title ||
                            null

                    }

            }
        );

    }


    /* ============================================================
       ACHIEVEMENT REWARD
    ============================================================ */

    function addAchievementReward(
        amount,
        achievementData = {}
    ) {

        return addCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.ACHIEVEMENT_REWARD,

                description:
                    achievementData.description ||
                    "پاداش افتخار",

                metadata:
                    {

                        achievementId:
                            achievementData.id ||
                            null,

                        achievementTitle:
                            achievementData.title ||
                            null

                    }

            }
        );

    }


    /* ============================================================
       PURCHASE
    ============================================================ */

    function purchase(
        amount,
        purchaseData = {}
    ) {

        return addCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.PURCHASE,

                description:
                    purchaseData.description ||
                    "خرید سکه",

                metadata:
                    {

                        productId:
                            purchaseData.productId ||
                            null,

                        productName:
                            purchaseData.productName ||
                            null,

                        provider:
                            purchaseData.provider ||
                            null,

                        reference:
                            purchaseData.reference ||
                            null

                    }

            }
        );

    }


    /* ============================================================
       SHOP PURCHASE
    ============================================================ */

    function spendForShop(
        amount,
        itemData = {}
    ) {

        return removeCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.SHOP_PURCHASE,

                description:
                    itemData.description ||
                    "خرید آیتم از فروشگاه",

                metadata:
                    {

                        itemId:
                            itemData.itemId ||
                            null,

                        itemName:
                            itemData.itemName ||
                            null,

                        quantity:
                            itemData.quantity ||
                            1

                    }

            }
        );

    }


    /* ============================================================
       GAME ENTRY FEE
    ============================================================ */

    function payGameEntry(
        amount,
        gameData = {}
    ) {

        return removeCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.GAME_ENTRY,

                description:
                    "هزینه ورود به بازی",

                metadata:
                    {

                        gameId:
                            gameData.gameId ||
                            null,

                        mode:
                            gameData.mode ||
                            null,

                        roomId:
                            gameData.roomId ||
                            null

                    }

            }
        );

    }


    /* ============================================================
       GAME EXPENSE
    ============================================================ */

    function payGameExpense(
        amount,
        expenseData = {}
    ) {

        return removeCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.GAME_EXPENSE,

                description:
                    expenseData.description ||
                    "هزینه داخل بازی",

                metadata:
                    clone(expenseData)

            }
        );

    }


    /* ============================================================
       REFUND
    ============================================================ */

    function refund(
        amount,
        refundData = {}
    ) {

        return addCoins(
            amount,
            {

                type:
                    TRANSACTION_TYPES.REFUND,

                description:
                    refundData.description ||
                    "بازگشت سکه",

                metadata:
                    clone(refundData)

            }
        );

    }


    /* ============================================================
       CHECK GAME ENTRY
    ============================================================ */

    function canEnterGame(
        amount
    ) {

        const validation =
            validateAmount(amount);


        if (!validation.valid) {

            return {

                allowed: false,

                reason:
                    validation.error,

                required:
                    0,

                available:
                    getCoins()

            };

        }


        if (
            getCoins() <
            validation.amount
        ) {

            return {

                allowed: false,

                reason:
                    "سکه کافی برای ورود به بازی ندارید.",

                required:
                    validation.amount,

                available:
                    getCoins(),

                missing:
                    validation.amount -
                    getCoins()

            };

        }


        return {

            allowed: true,

            reason: null,

            required:
                validation.amount,

            available:
                getCoins(),

            missing: 0

        };

    }


    /* ============================================================
       GET TRANSACTIONS
    ============================================================ */

    function getTransactions(
        options = {}
    ) {

        let result =
            [...transactionHistory];


        if (options.type) {

            result =
                result.filter(
                    transaction =>
                        transaction.type ===
                        options.type
                );

        }


        if (options.direction) {

            result =
                result.filter(
                    transaction =>
                        transaction.direction ===
                        options.direction
                );

        }


        if (
            Number.isFinite(
                Number(options.limit)
            )
        ) {

            const limit =
                Math.max(
                    0,
                    Math.floor(
                        Number(options.limit)
                    )
                );


            result =
                result.slice(
                    0,
                    limit
                );

        }


        return clone(result);

    }


    /* ============================================================
       GET TRANSACTION BY ID
    ============================================================ */

    function getTransactionById(
        transactionId
    ) {

        if (!transactionId) {

            return null;

        }


        const transaction =
            transactionHistory.find(
                item =>
                    item.id ===
                    transactionId
            );


        return transaction
            ? clone(transaction)
            : null;

    }


    /* ============================================================
       GET RECENT TRANSACTIONS
    ============================================================ */

    function getRecentTransactions(
        limit = 10
    ) {

        const safeLimit =
            Math.max(
                0,
                Math.floor(
                    safeNumber(
                        limit,
                        10
                    )
                )
            );


        return clone(
            transactionHistory.slice(
                0,
                safeLimit
            )
        );

    }


    /* ============================================================
       GET EARNED TRANSACTIONS
    ============================================================ */

    function getEarnedTransactions() {

        return getTransactions({

            direction:
                TRANSACTION_DIRECTION.CREDIT

        });

    }


    /* ============================================================
       GET SPENT TRANSACTIONS
    ============================================================ */

    function getSpentTransactions() {

        return getTransactions({

            direction:
                TRANSACTION_DIRECTION.DEBIT

        });

    }


    /* ============================================================
       GET TRANSACTION SUMMARY
    ============================================================ */

    function getTransactionSummary() {

        let earned = 0;

        let spent = 0;

        let earnedCount = 0;

        let spentCount = 0;


        transactionHistory.forEach(
            transaction => {

                const amount =
                    safeInteger(
                        transaction.amount,
                        0
                    );


                if (
                    transaction.direction ===
                    TRANSACTION_DIRECTION.CREDIT
                ) {

                    earned += amount;

                    earnedCount++;

                }


                if (
                    transaction.direction ===
                    TRANSACTION_DIRECTION.DEBIT
                ) {

                    spent += amount;

                    spentCount++;

                }

            }
        );


        return {

            currentBalance:
                walletState.coins,

            earned,

            spent,

            earnedCount,

            spentCount,

            transactionCount:
                transactionHistory.length

        };

    }


    /* ============================================================
       RESET WALLET
       
       فقط برای توسعه و تست.
       در نسخه نهایی باید دسترسی به این تابع محدود شود.
    ============================================================ */

    function resetWallet(
        options = {}
    ) {

        const allowReset =
            options.confirm === true;


        if (!allowReset) {

            return {

                success: false,

                error:
                    "برای ریست کیف پول باید تأیید صریح ارسال شود."

            };

        }


        createDefaultWallet();

        updateWalletUI();


        return {

            success: true,

            balance:
                getBalance()

        };

    }


    /* ============================================================
       REPAIR WALLET
       
       برای اصلاح داده‌های خراب LocalStorage.
    ============================================================ */

    function repairWallet() {

        const currentCoins =
            clamp(
                safeInteger(
                    walletState.coins,
                    DEFAULT_COINS
                ),
                MINIMUM_COINS,
                MAXIMUM_COINS
            );


        walletState.coins =
            currentCoins;


        walletState.totalEarned =
            Math.max(
                0,
                safeInteger(
                    walletState.totalEarned,
                    0
                )
            );


        walletState.totalSpent =
            Math.max(
                0,
                safeInteger(
                    walletState.totalSpent,
                    0
                )
            );


        walletState.lifetimeEarned =
            Math.max(
                0,
                safeInteger(
                    walletState.lifetimeEarned,
                    walletState.totalEarned
                )
            );


        walletState.lifetimeSpent =
            Math.max(
                0,
                safeInteger(
                    walletState.lifetimeSpent,
                    walletState.totalSpent
                )
            );


        walletState.version =
            WALLET_VERSION;


        walletState.updatedAt =
            getTimestamp();


        saveWallet();

        saveTransactionHistory();

        updateWalletUI();


        return getWallet();

    }


    /* ============================================================
       EXPORT WALLET DATA
       
       برای Backup / مهاجرت آینده.
    ============================================================ */

    function exportData() {

        return {

            version:
                WALLET_VERSION,

            wallet:
                getWallet(),

            transactions:
                getTransactions(),

            exportedAt:
                getTimestamp()

        };

    }


    /* ============================================================
       IMPORT WALLET DATA
       
       در نسخه آنلاین نباید بدون اعتبارسنجی سرور استفاده شود.
    ============================================================ */

    function importData(
        data,
        options = {}
    ) {

        if (!data || typeof data !== "object") {

            return {

                success: false,

                error:
                    "داده کیف پول معتبر نیست."

            };

        }


        if (
            options.confirm !== true
        ) {

            return {

                success: false,

                error:
                    "برای وارد کردن کیف پول باید تأیید صریح ارسال شود."

            };

        }


        const importedWallet =
            data.wallet;


        if (
            !importedWallet ||
            typeof importedWallet !== "object"
        ) {

            return {

                success: false,

                error:
                    "ساختار کیف پول واردشده معتبر نیست."

            };

        }


        const importedCoins =
            safeInteger(
                importedWallet.coins,
                NaN
            );


        if (
            !Number.isFinite(
                importedCoins
            )
        ) {

            return {

                success: false,

                error:
                    "موجودی واردشده معتبر نیست."

            };

        }


        if (
            importedCoins <
            MINIMUM_COINS ||
            importedCoins >
            MAXIMUM_COINS
        ) {

            return {

                success: false,

                error:
                    "موجودی واردشده خارج از محدوده مجاز است."

            };

        }


        walletState = {

            version:
                WALLET_VERSION,

            coins:
                importedCoins,

            totalEarned:
                Math.max(
                    0,
                    safeInteger(
                        importedWallet.totalEarned,
                        0
                    )
                ),

            totalSpent:
                Math.max(
                    0,
                    safeInteger(
                        importedWallet.totalSpent,
                        0
                    )
                ),

            lifetimeEarned:
                Math.max(
                    0,
                    safeInteger(
                        importedWallet.lifetimeEarned,
                        0
                    )
                ),

            lifetimeSpent:
                Math.max(
                    0,
                    safeInteger(
                        importedWallet.lifetimeSpent,
                        0
                    )
                ),

            lastTransactionId:
                importedWallet.lastTransactionId ||
                null,

            lastTransactionAt:
                importedWallet.lastTransactionAt ||
                null,

            createdAt:
                importedWallet.createdAt ||
                getTimestamp(),

            updatedAt:
                getTimestamp()

        };


        if (Array.isArray(data.transactions)) {

            transactionHistory =
                data.transactions
                    .filter(
                        transaction =>
                            transaction &&
                            typeof transaction === "object"
                    )
                    .slice(
                        0,
                        MAX_TRANSACTION_HISTORY
                    );

        } else {

            transactionHistory = [];

        }


        saveWallet();

        saveTransactionHistory();

        updateWalletUI();


        return {

            success: true,

            balance:
                getBalance(),

            transactions:
                getTransactions()

        };

    }


    /* ============================================================
       MIGRATE OLD COIN DATA
       
       اگر نسخه‌های قدیمی پروژه کلید سکه دیگری داشته باشند،
       می‌توان اینجا اطلاعات را به کیف پول جدید منتقل کرد.
    ============================================================ */

    function migrateLegacyCoins() {

        const legacyKeys = [

            "hokm_coins",

            "coins",

            "playerCoins",

            "userCoins",

            "walletCoins"

        ];


        for (
            let index = 0;
            index < legacyKeys.length;
            index++
        ) {

            const key =
                legacyKeys[index];


            try {

                const raw =
                    localStorage.getItem(
                        key
                    );


                if (raw === null) {

                    continue;

                }


                const parsed =
                    safeInteger(
                        raw,
                        NaN
                    );


                if (
                    !Number.isFinite(parsed) ||
                    parsed < 0
                ) {

                    continue;

                }


                walletState.coins =
                    clamp(
                        parsed,
                        MINIMUM_COINS,
                        MAXIMUM_COINS
                    );


                walletState.updatedAt =
                    getTimestamp();


                saveWallet();


                return true;

            } catch (error) {

                console.warn(
                    "[Wallet] Legacy migration failed:",
                    error
                );

            }

        }


        return false;

    }


    /* ============================================================
       INITIALIZE WALLET
    ============================================================ */

    function initialize() {

        if (initialized) {

            return getWallet();

        }


        const loaded =
            loadWallet();


        if (!loaded) {

            const migrated =
                migrateLegacyCoins();


            if (!migrated) {

                createDefaultWallet();

            }

        }


        loadTransactionHistory();


        repairWallet();


        initialized = true;


        updateWalletUI();


        return getWallet();

    }


    /* ============================================================
       STORAGE EVENT
       
       برای هماهنگی چند Tab / Window.
    ============================================================ */

    function handleStorageEvent(
        event
    ) {

        if (
            event.key ===
            WALLET_STORAGE_KEY
        ) {

            loadWallet();

            updateWalletUI();

        }


        if (
            event.key ===
            WALLET_TRANSACTION_KEY
        ) {

            loadTransactionHistory();

            updateWalletUI();

        }

    }


    /* ============================================================
       PAGE VISIBILITY
       
       هنگام برگشتن کاربر به صفحه، کیف پول دوباره بررسی می‌شود.
    ============================================================ */

    function handleVisibilityChange() {

        if (
            document.visibilityState ===
            "visible"
        ) {

            loadWallet();

            loadTransactionHistory();

            repairWallet();

        }

    }


    /* ============================================================
       ERROR HANDLER
    ============================================================ */

    function emitWalletError(
        message,
        code = "WALLET_ERROR"
    ) {

        const detail = {

            message,

            code,

            timestamp:
                getTimestamp()

        };


        dispatchWalletEvent(
            WALLET_ERROR_EVENT,
            detail
        );


        return detail;

    }


    /* ============================================================
       PUBLIC API
    ============================================================ */

    const Wallet = {

        /* VERSION */

        version:
            WALLET_VERSION,


        /* CONSTANTS */

        constants: {

            DEFAULT_COINS,

            MINIMUM_COINS,

            MAXIMUM_COINS,

            MAX_TRANSACTION_HISTORY,

            MAX_TRANSACTION_AMOUNT

        },


        /* TYPES */

        transactionTypes:
            TRANSACTION_TYPES,


        transactionDirections:
            TRANSACTION_DIRECTION,


        /* INITIALIZATION */

        initialize,


        /* WALLET */

        getWallet,

        getBalance,

        getCoins,

        hasEnoughCoins,


        /* COIN OPERATIONS */

        addCoins,

        removeCoins,

        addBonus,

        purchase,

        refund,


        /* REWARDS */

        addDailyReward,

        addGameReward,

        addWinReward,

        addLossReward,

        addMissionReward,

        addAchievementReward,


        /* GAME */

        canEnterGame,

        payGameEntry,

        payGameExpense,


        /* SHOP */

        spendForShop,


        /* TRANSACTIONS */

        getTransactions,

        getTransactionById,

        getRecentTransactions,

        getEarnedTransactions,

        getSpentTransactions,

        getTransactionSummary,


        /* FORMATTING */

        formatCoins,

        formatTransactionDate,


        /* DATA */

        exportData,

        importData,


        /* MAINTENANCE */

        repairWallet,

        resetWallet,


        /* ERRORS */

        emitWalletError

    };


    /* ============================================================
       EXPOSE GLOBAL API
    ============================================================ */

    window.Wallet = Wallet;

    window.HokmWallet = Wallet;


    /* ============================================================
       EVENT LISTENERS
    ============================================================ */

    window.addEventListener(
        "storage",
        handleStorageEvent
    );


    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );


    /* ============================================================
       AUTO INITIALIZATION
    ============================================================ */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                initialize();

            },
            {
                once: true
            }
        );

    } else {

        initialize();

    }


    /* ============================================================
       DEVELOPMENT HELPERS
       
       این بخش فقط برای توسعه است و در محیط Production
       عملاً API اصلی Wallet استفاده می‌شود.
    ============================================================ */

    window.HokmWalletDebug = {

        getState:
            function () {

                return getWallet();

            },


        getTransactions:
            function () {

                return getTransactions();

            },


        getSummary:
            function () {

                return getTransactionSummary();

            },


        addCoins:
            function (amount) {

                return addCoins(
                    amount,
                    {

                        type:
                            TRANSACTION_TYPES.ADMIN_ADJUSTMENT,

                        description:
                            "افزایش آزمایشی سکه"

                    }
                );

            },


        removeCoins:
            function (amount) {

                return removeCoins(
                    amount,
                    {

                        type:
                            TRANSACTION_TYPES.ADMIN_ADJUSTMENT,

                        description:
                            "کاهش آزمایشی سکه"

                    }
                );

            },


        reset:
            function () {

                return resetWallet({

                    confirm: true

                });

            }

    };


    /* ============================================================
       FINAL LOG
    ============================================================ */

    console.log(
        "[Hokm Wallet] Wallet system initialized."
    );


})(window);
