/* ============================================================
   HOKM ONLINE
   PROFESSIONAL MISSIONS & PROGRESSION SYSTEM
   File: missions.js
   Stage: 17+

   ============================================================
   مسئولیت‌های این فایل:
   ============================================================

   - سیستم مأموریت‌های روزانه
   - سیستم مأموریت‌های هفتگی
   - سیستم مأموریت‌های ماهانه
   - سیستم درخت پیشرفت مأموریت‌ها
   - شاخه‌های مأموریت
   - Tier / Stage مأموریت‌ها
   - وابستگی بین مأموریت‌ها
   - باز شدن مرحله‌ای مأموریت‌ها
   - مدیریت پیشرفت
   - تکمیل مأموریت
   - دریافت پاداش
   - سکه
   - XP
   - ریست روزانه
   - ریست هفتگی
   - ریست ماهانه
   - ذخیره‌سازی LocalStorage
   - مهاجرت اطلاعات نسخه‌های قبلی
   - رویدادهای مأموریت
   - هماهنگی با UI
   - هماهنگی با Wallet
   - هماهنگی با Profile
   - هماهنگی با Game
   - آماده‌سازی برای Backend
   - آماده‌سازی برای Mission Tree UI

   ============================================================
   قانون مهم:
   ============================================================

   این فایل هیچ قابلیت قبلی سیستم مأموریت را حذف نمی‌کند.

   APIهای قبلی حفظ شده‌اند:

   HokmMissions.initialize()
   HokmMissions.getState()
   HokmMissions.getAll()
   HokmMissions.getDaily()
   HokmMissions.getWeekly()
   HokmMissions.getCompleted()
   HokmMissions.getClaimable()
   HokmMissions.find()
   HokmMissions.getProgress()
   HokmMissions.update()
   HokmMissions.updateByType()
   HokmMissions.complete()
   HokmMissions.claimReward()
   HokmMissions.render()
   HokmMissions.reset()
   HokmMissions.types
   HokmMissions.categories

   ============================================================ */


/* ============================================================
   1. GLOBAL NAMESPACE
============================================================ */

window.HokmMissions = window.HokmMissions || {};


/* ============================================================
   2. STORAGE
============================================================ */

const MISSIONS_STORAGE_KEY = "hokm_missions_v2";

const OLD_MISSIONS_STORAGE_KEY = "hokm_missions_v1";

const MISSION_VERSION = 2;


/* ============================================================
   3. RESET SETTINGS
============================================================ */

const DAILY_MISSION_RESET_HOUR = 0;

const WEEKLY_MISSION_RESET_DAY = 1;

const MONTHLY_MISSION_RESET_DAY = 1;


/* ============================================================
   4. LIMITS
============================================================ */

const MAX_DAILY_MISSIONS = 5;

const MAX_WEEKLY_MISSIONS = 5;

const MAX_MONTHLY_MISSIONS = 7;


/* ============================================================
   5. MISSION TYPES
============================================================ */

const MISSION_TYPES = {

    PLAY_GAMES: "play_games",

    WIN_GAMES: "win_games",

    PLAY_TRICKS: "play_tricks",

    WIN_TRICKS: "win_tricks",

    SCORE_ROUNDS: "score_rounds",

    EARN_COINS: "earn_coins",

    EARN_XP: "earn_xp",

    USE_TRUMP: "use_trump",

    WIN_WITH_TRUMP: "win_with_trump",

    PLAY_WITH_FRIEND: "play_with_friend",

    COMPLETE_GAMES: "complete_games",

    PLAY_RANKED: "play_ranked",

    WIN_RANKED: "win_ranked",

    PLAY_PRACTICE: "play_practice",

    PLAY_PRIVATE: "play_private",

    LOGIN: "login",

    SEND_MESSAGES: "send_messages",

    WIN_STREAK: "win_streak",

    PERFECT_GAME: "perfect_game",

    PLAY_CONSECUTIVE_DAYS: "play_consecutive_days",

    EARN_REWARDS: "earn_rewards",

    COMPLETE_MISSIONS: "complete_missions"

};


/* ============================================================
   6. MISSION CATEGORIES
============================================================ */

const MISSION_CATEGORIES = {

    DAILY: "daily",

    WEEKLY: "weekly",

    MONTHLY: "monthly",

    TREE: "tree"

};


/* ============================================================
   7. MISSION STATUS
============================================================ */

const MISSION_STATUS = {

    LOCKED: "locked",

    AVAILABLE: "available",

    IN_PROGRESS: "in_progress",

    COMPLETED: "completed",

    CLAIMED: "claimed"


};


/* ============================================================
   8. TREE BRANCHES
============================================================ */

const MISSION_BRANCHES = {

    BEGINNER: {

        id: "beginner",

        title: "شروع مسیر",

        description: "مسیر آشنایی و شروع پیشرفت در حکم",

        icon: "🌱",

        color: "green"

    },

    PLAY: {

        id: "play",

        title: "بازی و تجربه",

        description: "با انجام بازی‌های بیشتر مهارت خود را افزایش بده",

        icon: "🃏",

        color: "blue"

    },

    WIN: {

        id: "win",

        title: "مسیر پیروزی",

        description: "روی بردهای بیشتر تمرکز کن",

        icon: "🏆",

        color: "gold"

    },

    RANKED: {

        id: "ranked",

        title: "رقابتی",

        description: "وارد رقابت حرفه‌ای شو",

        icon: "👑",

        color: "purple"

    },

    FRIENDS: {

        id: "friends",

        title: "دوستان",

        description: "با دوستانت بازی کن",

        icon: "👥",

        color: "cyan"

    },

    MASTER: {

        id: "master",

        title: "استاد حکم",

        description: "مسیر پیشرفته برای بازیکنان حرفه‌ای",

        icon: "💎",

        color: "red"

    }

};


/* ============================================================
   9. TREE TIERS
============================================================ */

const MISSION_TIERS = {

    TIER_1: {

        id: 1,

        title: "شروع",

        icon: "🌱"

    },

    TIER_2: {

        id: 2,

        title: "تازه‌کار",

        icon: "⭐"

    },

    TIER_3: {

        id: 3,

        title: "ماهر",

        icon: "🔥"

    },

    TIER_4: {

        id: 4,

        title: "حرفه‌ای",

        icon: "🏆"

    },

    TIER_5: {

        id: 5,

        title: "استاد",

        icon: "👑"

    }

};


/* ============================================================
   10. DAILY MISSION DEFINITIONS
============================================================ */

const DAILY_MISSION_DEFINITIONS = [

    {

        id: "daily_login",

        type: MISSION_TYPES.LOGIN,

        title: "ورود روزانه",

        description: "امروز وارد بازی شو.",

        target: 1,

        rewardCoins: 50,

        rewardXP: 10,

        icon: "📅",

        branch: "beginner",

        tier: 1

    },

    {

        id: "daily_play_1",

        type: MISSION_TYPES.PLAY_GAMES,

        title: "یک بازی حکم انجام بده",

        description: "یک بازی حکم را کامل کن.",

        target: 1,

        rewardCoins: 100,

        rewardXP: 25,

        icon: "🃏",

        branch: "play",

        tier: 1

    },

    {

        id: "daily_play_3",

        type: MISSION_TYPES.PLAY_GAMES,

        title: "سه بازی انجام بده",

        description: "سه بازی حکم را کامل کن.",

        target: 3,

        rewardCoins: 250,

        rewardXP: 60,

        icon: "🎮",

        branch: "play",

        tier: 2

    },

    {

        id: "daily_win_1",

        type: MISSION_TYPES.WIN_GAMES,

        title: "یک پیروزی کسب کن",

        description: "در یک بازی حکم پیروز شو.",

        target: 1,

        rewardCoins: 150,

        rewardXP: 40,

        icon: "🏆",

        branch: "win",

        tier: 2

    },

    {

        id: "daily_win_2",

        type: MISSION_TYPES.WIN_GAMES,

        title: "دو پیروزی کسب کن",

        description: "دو بازی حکم را با پیروزی به پایان برسان.",

        target: 2,

        rewardCoins: 300,

        rewardXP: 80,

        icon: "🥇",

        branch: "win",

        tier: 3

    },

    {

        id: "daily_tricks_5",

        type: MISSION_TYPES.WIN_TRICKS,

        title: "پنج دست ببر",

        description: "در مجموع پنج دست را برنده شو.",

        target: 5,

        rewardCoins: 200,

        rewardXP: 50,

        icon: "♠️",

        branch: "win",

        tier: 2

    },

    {

        id: "daily_tricks_10",

        type: MISSION_TYPES.WIN_TRICKS,

        title: "ده دست ببر",

        description: "در مجموع ده دست را برنده شو.",

        target: 10,

        rewardCoins: 350,

        rewardXP: 90,

        icon: "🃏",

        branch: "win",

        tier: 3

    },

    {

        id: "daily_coins_500",

        type: MISSION_TYPES.EARN_COINS,

        title: "۵۰۰ سکه به دست بیاور",

        description: "در مجموع ۵۰۰ سکه کسب کن.",

        target: 500,

        rewardCoins: 150,

        rewardXP: 40,

        icon: "🪙",

        branch: "play",

        tier: 2

    },

    {

        id: "daily_ranked_1",

        type: MISSION_TYPES.PLAY_RANKED,

        title: "یک بازی رقابتی انجام بده",

        description: "یک بازی در حالت رقابتی انجام بده.",

        target: 1,

        rewardCoins: 200,

        rewardXP: 60,

        icon: "🏆",

        branch: "ranked",

        tier: 3

    },

    {

        id: "daily_friend_game",

        type: MISSION_TYPES.PLAY_WITH_FRIEND,

        title: "با یک دوست بازی کن",

        description: "با یکی از دوستانت یک بازی انجام بده.",

        target: 1,

        rewardCoins: 250,

        rewardXP: 70,

        icon: "👥",

        branch: "friends",

        tier: 2

    }

];


/* ============================================================
   11. WEEKLY MISSION DEFINITIONS
============================================================ */

const WEEKLY_MISSION_DEFINITIONS = [

    {

        id: "weekly_play_10",

        type: MISSION_TYPES.PLAY_GAMES,

        title: "ده بازی انجام بده",

        description: "در طول هفته ده بازی حکم انجام بده.",

        target: 10,

        rewardCoins: 800,

        rewardXP: 250,

        icon: "🎮",

        branch: "play",

        tier: 2

    },

    {

        id: "weekly_play_25",

        type: MISSION_TYPES.PLAY_GAMES,

        title: "بیست و پنج بازی انجام بده",

        description: "در طول هفته بیست و پنج بازی انجام بده.",

        target: 25,

        rewardCoins: 1800,

        rewardXP: 500,

        icon: "🔥",

        branch: "play",

        tier: 3

    },

    {

        id: "weekly_win_10",

        type: MISSION_TYPES.WIN_GAMES,

        title: "ده پیروزی",

        description: "در طول هفته ده بازی را ببر.",

        target: 10,

        rewardCoins: 1500,

        rewardXP: 450,

        icon: "🏆",

        branch: "win",

        tier: 3

    },

    {

        id: "weekly_win_20",

        type: MISSION_TYPES.WIN_GAMES,

        title: "بیست پیروزی",

        description: "در طول هفته بیست بازی را ببر.",

        target: 20,

        rewardCoins: 3000,

        rewardXP: 800,

        icon: "👑",

        branch: "win",

        tier: 4

    },

    {

        id: "weekly_tricks_50",

        type: MISSION_TYPES.WIN_TRICKS,

        title: "پنجاه دست پیروز شو",

        description: "در طول هفته پنجاه دست را برنده شو.",

        target: 50,

        rewardCoins: 1200,

        rewardXP: 350,

        icon: "♠️",

        branch: "win",

        tier: 3

    },

    {

        id: "weekly_tricks_100",

        type: MISSION_TYPES.WIN_TRICKS,

        title: "صد دست پیروز شو",

        description: "در طول هفته صد دست را برنده شو.",

        target: 100,

        rewardCoins: 2500,

        rewardXP: 700,

        icon: "💎",

        branch: "master",

        tier: 4

    },

    {

        id: "weekly_ranked_10",

        type: MISSION_TYPES.PLAY_RANKED,

        title: "ده بازی رقابتی",

        description: "ده بازی رقابتی انجام بده.",

        target: 10,

        rewardCoins: 1200,

        rewardXP: 400,

        icon: "🏅",

        branch: "ranked",

        tier: 3

    },

    {

        id: "weekly_ranked_win_5",

        type: MISSION_TYPES.WIN_RANKED,

        title: "پنج برد رقابتی",

        description: "پنج بازی رقابتی را ببر.",

        target: 5,

        rewardCoins: 1800,

        rewardXP: 600,

        icon: "👑",

        branch: "ranked",

        tier: 4

    },

    {

        id: "weekly_coins_5000",

        type: MISSION_TYPES.EARN_COINS,

        title: "۵۰۰۰ سکه کسب کن",

        description: "در طول هفته ۵۰۰۰ سکه کسب کن.",

        target: 5000,

        rewardCoins: 1000,

        rewardXP: 300,

        icon: "🪙",

        branch: "play",

        tier: 3

    },

    {

        id: "weekly_friend_5",

        type: MISSION_TYPES.PLAY_WITH_FRIEND,

        title: "با دوستانت بازی کن",

        description: "با دوستانت پنج بازی انجام بده.",

        target: 5,

        rewardCoins: 1000,

        rewardXP: 350,

        icon: "👥",

        branch: "friends",

        tier: 3

    }

];


/* ============================================================
   12. MONTHLY MISSION DEFINITIONS
============================================================ */

const MONTHLY_MISSION_DEFINITIONS = [

    {

        id: "monthly_play_50",

        type: MISSION_TYPES.PLAY_GAMES,

        title: "۵۰ بازی در ماه",

        description: "در طول این ماه ۵۰ بازی حکم انجام بده.",

        target: 50,

        rewardCoins: 5000,

        rewardXP: 1500,

        icon: "🎮",

        branch: "play",

        tier: 3

    },

    {

        id: "monthly_play_100",

        type: MISSION_TYPES.PLAY_GAMES,

        title: "۱۰۰ بازی در ماه",

        description: "در طول این ماه ۱۰۰ بازی حکم انجام بده.",

        target: 100,

        rewardCoins: 10000,

        rewardXP: 3000,

        icon: "🔥",

        branch: "play",

        tier: 4

    },

    {

        id: "monthly_win_50",

        type: MISSION_TYPES.WIN_GAMES,

        title: "۵۰ پیروزی در ماه",

        description: "در طول این ماه ۵۰ بازی را ببر.",

        target: 50,

        rewardCoins: 8000,

        rewardXP: 2500,

        icon: "🏆",

        branch: "win",

        tier: 4

    },

    {

        id: "monthly_ranked_25",

        type: MISSION_TYPES.PLAY_RANKED,

        title: "۲۵ بازی رقابتی",

        description: "در طول این ماه ۲۵ بازی رقابتی انجام بده.",

        target: 25,

        rewardCoins: 6000,

        rewardXP: 2000,

        icon: "🏅",

        branch: "ranked",

        tier: 4

    },

    {

        id: "monthly_ranked_win_15",

        type: MISSION_TYPES.WIN_RANKED,

        title: "۱۵ برد رقابتی",

        description: "در طول این ماه ۱۵ بازی رقابتی را ببر.",

        target: 15,

        rewardCoins: 10000,

        rewardXP: 3500,

        icon: "👑",

        branch: "ranked",

        tier: 5

    },

    {

        id: "monthly_friend_20",

        type: MISSION_TYPES.PLAY_WITH_FRIEND,

        title: "۲۰ بازی با دوستان",

        description: "در طول این ماه ۲۰ بازی با دوستانت انجام بده.",

        target: 20,

        rewardCoins: 5000,

        rewardXP: 1800,

        icon: "👥",

        branch: "friends",

        tier: 4

    },

    {

        id: "monthly_tricks_500",

        type: MISSION_TYPES.WIN_TRICKS,

        title: "۵۰۰ دست پیروز شو",

        description: "در طول این ماه ۵۰۰ دست را برنده شو.",

        target: 500,

        rewardCoins: 12000,

        rewardXP: 4000,

        icon: "💎",

        branch: "master",

        tier: 5

    },

    {

        id: "monthly_coins_25000",

        type: MISSION_TYPES.EARN_COINS,

        title: "۲۵۰۰۰ سکه کسب کن",

        description: "در طول این ماه ۲۵۰۰۰ سکه به دست بیاور.",

        target: 25000,

        rewardCoins: 7500,

        rewardXP: 2500,

        icon: "🪙",

        branch: "master",

        tier: 5

    }

];


/* ============================================================
   13. PERMANENT TREE DEFINITIONS
============================================================ */

const MISSION_TREE_DEFINITIONS = [

    {

        id: "tree_start",

        branch: "beginner",

        tier: 1,

        order: 1,

        type: MISSION_TYPES.LOGIN,

        title: "شروع سفر",

        description: "اولین قدم را در مسیر پیشرفت بردار.",

        target: 1,

        rewardCoins: 100,

        rewardXP: 25,

        icon: "🌱",

        prerequisites: []

    },

    {

        id: "tree_first_game",

        branch: "play",

        tier: 1,

        order: 2,

        type: MISSION_TYPES.PLAY_GAMES,

        title: "اولین بازی",

        description: "اولین بازی کامل خود را انجام بده.",

        target: 1,

        rewardCoins: 200,

        rewardXP: 50,

        icon: "🃏",

        prerequisites: [

            "tree_start"

        ]

    },

    {

        id: "tree_five_games",

        branch: "play",

        tier: 2,

        order: 3,

        type: MISSION_TYPES.PLAY_GAMES,

        title: "پنج بازی",

        description: "پنج بازی کامل انجام بده.",

        target: 5,

        rewardCoins: 500,

        rewardXP: 150,

        icon: "🎮",

        prerequisites: [

            "tree_first_game"

        ]

    },

    {

        id: "tree_first_win",

        branch: "win",

        tier: 2,

        order: 4,

        type: MISSION_TYPES.WIN_GAMES,

        title: "اولین پیروزی",

        description: "اولین برد خود را ثبت کن.",

        target: 1,

        rewardCoins: 500,

        rewardXP: 150,

        icon: "🏆",

        prerequisites: [

            "tree_first_game"

        ]

    },

    {

        id: "tree_ten_wins",

        branch: "win",

        tier: 3,

        order: 5,

        type: MISSION_TYPES.WIN_GAMES,

        title: "ده پیروزی",

        description: "۱۰ بازی را با پیروزی به پایان برسان.",

        target: 10,

        rewardCoins: 1500,

        rewardXP: 500,

        icon: "🥇",

        prerequisites: [

            "tree_first_win",

            "tree_five_games"

        ]

    },

    {

        id: "tree_ranked_start",

        branch: "ranked",

        tier: 3,

        order: 6,

        type: MISSION_TYPES.PLAY_RANKED,

        title: "ورود به رقابت",

        description: "اولین بازی رقابتی خود را انجام بده.",

        target: 1,

        rewardCoins: 750,

        rewardXP: 250,

        icon: "🏅",

        prerequisites: [

            "tree_first_win"

        ]

    },

    {

        id: "tree_ranked_wins",

        branch: "ranked",

        tier: 4,

        order: 7,

        type: MISSION_TYPES.WIN_RANKED,

        title: "سلطه در رقابت",

        description: "۱۰ بازی رقابتی را ببر.",

        target: 10,

        rewardCoins: 3000,

        rewardXP: 1000,

        icon: "👑",

        prerequisites: [

            "tree_ranked_start",

            "tree_ten_wins"

        ]

    },

    {

        id: "tree_master",

        branch: "master",

        tier: 5,

        order: 8,

        type: MISSION_TYPES.WIN_GAMES,

        title: "استاد حکم",

        description: "مسیر اصلی پیشرفت را کامل کن.",

        target: 50,

        rewardCoins: 10000,

        rewardXP: 5000,

        icon: "💎",

        prerequisites: [

            "tree_ranked_wins",

            "tree_ten_wins"

        ]

    }

];


/* ============================================================
   14. INTERNAL STATE
============================================================ */

let missionsState = {

    version: MISSION_VERSION,

    daily: [],

    weekly: [],

    monthly: [],

    tree: [],

    lastDailyReset: null,

    lastWeeklyReset: null,

    lastMonthlyReset: null,

    initialized: false

};


/* ============================================================
   15. INTERNAL FLAGS
============================================================ */

let missionsDOMEventsInitialized = false;

let missionsGameEventsInitialized = false;


/* ============================================================
   16. DATE UTILS
============================================================ */

function missionNow() {

    return new Date();

}


function missionDateKey(date = missionNow()) {

    return [

        date.getFullYear(),

        String(date.getMonth() + 1).padStart(2, "0"),

        String(date.getDate()).padStart(2, "0")

    ].join("-");

}


function missionWeekKey(date = missionNow()) {

    const current = new Date(date);

    const day = current.getDay();

    const diff = day === 0

        ? -6

        : 1 - day;

    const monday = new Date(current);

    monday.setDate(current.getDate() + diff);

    monday.setHours(0, 0, 0, 0);

    return missionDateKey(monday);

}


function missionMonthKey(date = missionNow()) {

    return [

        date.getFullYear(),

        String(date.getMonth() + 1).padStart(2, "0")

    ].join("-");

}


/* ============================================================
   17. GENERIC UTILS
============================================================ */

function clampMissionProgress(value, target) {

    const numericValue = Number(value) || 0;

    const numericTarget = Number(target) || 1;

    return Math.max(

        0,

        Math.min(

            numericValue,

            numericTarget

        )

    );

}


function cloneMissionData(value) {

    try {

        return JSON.parse(

            JSON.stringify(value)

        );

    } catch (error) {

        return value;

    }

}


/* ============================================================
   18. CREATE MISSION INSTANCE
============================================================ */

function createMissionInstance(

    definition,

    category,

    extra = {}

) {

    return {

        id: definition.id,

        type: definition.type,

        category: category,

        branch: definition.branch || "beginner",

        tier: definition.tier || 1,

        order: definition.order || 0,

        title: definition.title,

        description: definition.description,

        target: Number(definition.target) || 1,

        progress: Number(extra.progress) || 0,

        rewardCoins: Number(definition.rewardCoins) || 0,

        rewardXP: Number(definition.rewardXP) || 0,

        icon: definition.icon || "🎯",

        prerequisites: Array.isArray(

            definition.prerequisites

        )

            ? [...definition.prerequisites]

            : [],

        completed:

            extra.completed === true,

        claimed:

            extra.claimed === true,

        unlocked:

            extra.unlocked !== false,

        status:

            extra.status ||

            (

                extra.unlocked === false

                    ? MISSION_STATUS.LOCKED

                    : MISSION_STATUS.AVAILABLE

            ),

        createdAt:

            extra.createdAt ||

            Date.now(),

        completedAt:

            extra.completedAt ||

            null,

        claimedAt:

            extra.claimedAt ||

            null

    };

}


/* ============================================================
   19. SELECT RANDOM MISSIONS
============================================================ */

function shuffleMissionArray(array) {

    for (

        let i = array.length - 1;

        i > 0;

        i--

    ) {

        const randomIndex = Math.floor(

            Math.random() * (i + 1)

        );

        [

            array[i],

            array[randomIndex]

        ] = [

            array[randomIndex],

            array[i]

        ];

    }

    return array;

}


function selectMissionDefinitions(

    definitions,

    max

) {

    const list = [...definitions];

    shuffleMissionArray(list);

    return list.slice(

        0,

        Math.min(

            max,

            list.length

        )

    );

}


/* ============================================================
   20. CREATE DAILY
============================================================ */

function selectDailyMissions() {

    return selectMissionDefinitions(

        DAILY_MISSION_DEFINITIONS,

        MAX_DAILY_MISSIONS

    ).map(

        definition =>

            createMissionInstance(

                definition,

                MISSION_CATEGORIES.DAILY

            )

    );

}


/* ============================================================
   21. CREATE WEEKLY
============================================================ */

function selectWeeklyMissions() {

    return selectMissionDefinitions(

        WEEKLY_MISSION_DEFINITIONS,

        MAX_WEEKLY_MISSIONS

    ).map(

        definition =>

            createMissionInstance(

                definition,

                MISSION_CATEGORIES.WEEKLY

            )

    );

}


/* ============================================================
   22. CREATE MONTHLY
============================================================ */

function selectMonthlyMissions() {

    return selectMissionDefinitions(

        MONTHLY_MISSION_DEFINITIONS,

        MAX_MONTHLY_MISSIONS

    ).map(

        definition =>

            createMissionInstance(

                definition,

                MISSION_CATEGORIES.MONTHLY

            )

    );

}


/* ============================================================
   23. CREATE TREE
============================================================ */

function createMissionTree() {

    const existingTree =

        Array.isArray(missionsState.tree)

            ? missionsState.tree

            : [];

    const existingMap = new Map();

    existingTree.forEach(

        mission => {

            if (mission && mission.id) {

                existingMap.set(

                    mission.id,

                    mission

                );

            }

        }

    );

    const tree = MISSION_TREE_DEFINITIONS.map(

        definition => {

            const old =

                existingMap.get(

                    definition.id

                );

            return createMissionInstance(

                definition,

                MISSION_CATEGORIES.TREE,

                old || {}

            );

        }

    );

    updateMissionTreeStatuses(tree);

    return tree;

}


/* ============================================================
   24. TREE STATUS
============================================================ */

function updateMissionTreeStatuses(

    tree = missionsState.tree

) {

    if (!Array.isArray(tree)) {

        return;

    }

    const map = new Map();

    tree.forEach(

        mission => {

            map.set(

                mission.id,

                mission

            );

        }

    );

    tree.forEach(

        mission => {

            if (mission.claimed) {

                mission.unlocked = true;

                mission.status =

                    MISSION_STATUS.CLAIMED;

                return;

            }

            if (mission.completed) {

                mission.unlocked = true;

                mission.status =

                    MISSION_STATUS.COMPLETED;

                return;

            }

            const prerequisites =

                Array.isArray(

                    mission.prerequisites

                )

                    ? mission.prerequisites

                    : [];

            const unlocked =

                prerequisites.length === 0 ||

                prerequisites.every(

                    prerequisiteId => {

                        const prerequisite =

                            map.get(

                                prerequisiteId

                            );

                        return prerequisite &&

                            prerequisite.claimed;

                    }

                );

            mission.unlocked = unlocked;

            mission.status = unlocked

                ? (

                    mission.progress > 0

                        ? MISSION_STATUS.IN_PROGRESS

                        : MISSION_STATUS.AVAILABLE

                )

                : MISSION_STATUS.LOCKED;

        }

    );

}


/* ============================================================
   25. SAVE STATE
============================================================ */

function saveMissionsState() {

    try {

        missionsState.version =

            MISSION_VERSION;

        localStorage.setItem(

            MISSIONS_STORAGE_KEY,

            JSON.stringify(

                missionsState

            )

        );

        return true;

    } catch (error) {

        console.error(

            "Mission state save error:",

            error

        );

        return false;

    }

}


/* ============================================================
   26. LOAD NEW STATE
============================================================ */

function loadNewMissionState() {

    try {

        const rawData =

            localStorage.getItem(

                MISSIONS_STORAGE_KEY

            );

        if (!rawData) {

            return false;

        }

        const parsedData =

            JSON.parse(rawData);

        if (!parsedData) {

            return false;

        }

        missionsState = {

            ...missionsState,

            ...parsedData,

            version:

                MISSION_VERSION

        };

        return true;

    } catch (error) {

        console.error(

            "New mission state load error:",

            error

        );

        return false;

    }

}


/* ============================================================
   27. MIGRATE OLD STATE
============================================================ */

function migrateOldMissionState() {

    try {

        const oldRaw =

            localStorage.getItem(

                OLD_MISSIONS_STORAGE_KEY

            );

        if (!oldRaw) {

            return false;

        }

        const oldData =

            JSON.parse(oldRaw);

        if (!oldData) {

            return false;

        }

        if (

            Array.isArray(oldData.daily)

        ) {

            missionsState.daily =

                oldData.daily;

        }

        if (

            Array.isArray(oldData.weekly)

        ) {

            missionsState.weekly =

                oldData.weekly;

        }

        missionsState.lastDailyReset =

            oldData.lastDailyReset ||

            null;

        missionsState.lastWeeklyReset =

            oldData.lastWeeklyReset ||

            null;

        missionsState.monthly = [];

        missionsState.tree = [];

        return true;

    } catch (error) {

        console.error(

            "Mission migration error:",

            error

        );

        return false;

    }

}


/* ============================================================
   28. NORMALIZE LOADED MISSIONS
============================================================ */

function normalizeMissionCollection(

    collection,

    category

) {

    if (!Array.isArray(collection)) {

        return [];

    }

    return collection.map(

        mission => ({

            ...mission,

            category:

                mission.category ||

                category,

            progress:

                Number(mission.progress) || 0,

            target:

                Number(mission.target) || 1,

            rewardCoins:

                Number(mission.rewardCoins) || 0,

            rewardXP:

                Number(mission.rewardXP) || 0,

            completed:

                mission.completed === true,

            claimed:

                mission.claimed === true,

            unlocked:

                mission.unlocked !== false

        })

    );

}


/* ============================================================
   29. INITIALIZE
============================================================ */

function initializeMissions() {

    if (missionsState.initialized) {

        checkMissionResets();

        updateMissionTreeStatuses();

        renderAllMissions();

        return getMissionsState();

    }

    const loaded =

        loadNewMissionState();

    if (!loaded) {

        migrateOldMissionState();

    }

    const today =

        missionDateKey();

    const currentWeek =

        missionWeekKey();

    const currentMonth =

        missionMonthKey();

    missionsState.daily =

        normalizeMissionCollection(

            missionsState.daily,

            MISSION_CATEGORIES.DAILY

        );

    missionsState.weekly =

        normalizeMissionCollection(

            missionsState.weekly,

            MISSION_CATEGORIES.WEEKLY

        );

    missionsState.monthly =

        normalizeMissionCollection(

            missionsState.monthly,

            MISSION_CATEGORIES.MONTHLY

        );

    if (

        missionsState.daily.length === 0

    ) {

        missionsState.daily =

            selectDailyMissions();

        missionsState.lastDailyReset =

            today;

    }

    if (

        missionsState.weekly.length === 0

    ) {

        missionsState.weekly =

            selectWeeklyMissions();

        missionsState.lastWeeklyReset =

            currentWeek;

    }

    if (

        missionsState.monthly.length === 0

    ) {

        missionsState.monthly =

            selectMonthlyMissions();

        missionsState.lastMonthlyReset =

            currentMonth;

    }

    missionsState.tree =

        normalizeMissionCollection(

            missionsState.tree,

            MISSION_CATEGORIES.TREE

        );

    if (

        missionsState.tree.length === 0

    ) {

        missionsState.tree =

            createMissionTree();

    }

    missionsState.initialized = true;

    checkMissionResets();

    updateMissionTreeStatuses();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "missionsInitialized",

        getMissionsState()

    );

    return getMissionsState();

}


/* ============================================================
   30. RESET CHECK
============================================================ */

function checkMissionResets() {

    const today =

        missionDateKey();

    const currentWeek =

        missionWeekKey();

    const currentMonth =

        missionMonthKey();

    let changed = false;

    if (

        missionsState.lastDailyReset !==

        today

    ) {

        missionsState.daily =

            selectDailyMissions();

        missionsState.lastDailyReset =

            today;

        changed = true;

        dispatchMissionEvent(

            "dailyMissionsReset",

            missionsState.daily

        );

    }

    if (

        missionsState.lastWeeklyReset !==

        currentWeek

    ) {

        missionsState.weekly =

            selectWeeklyMissions();

        missionsState.lastWeeklyReset =

            currentWeek;

        changed = true;

        dispatchMissionEvent(

            "weeklyMissionsReset",

            missionsState.weekly

        );

    }

    if (

        missionsState.lastMonthlyReset !==

        currentMonth

    ) {

        missionsState.monthly =

            selectMonthlyMissions();

        missionsState.lastMonthlyReset =

            currentMonth;

        changed = true;

        dispatchMissionEvent(

            "monthlyMissionsReset",

            missionsState.monthly

        );

    }

    updateMissionTreeStatuses();

    if (changed) {

        saveMissionsState();

        renderAllMissions();

    }

    return changed;

}


/* ============================================================
   31. GET STATE
============================================================ */

function getMissionsState() {

    return cloneMissionData(

        missionsState

    );

}


/* ============================================================
   32. GET ALL
============================================================ */

function getAllMissions() {

    return [

        ...missionsState.daily,

        ...missionsState.weekly,

        ...missionsState.monthly,

        ...missionsState.tree

    ];

}


/* ============================================================
   33. GET TEMPORARY MISSIONS
============================================================ */

function getTemporaryMissions() {

    return [

        ...missionsState.daily,

        ...missionsState.weekly,

        ...missionsState.monthly

    ];

}


/* ============================================================
   34. FIND MISSION
============================================================ */

function findMission(missionId) {

    return getAllMissions().find(

        mission =>

            mission.id === missionId

    ) || null;

}


/* ============================================================
   35. FIND TREE MISSION
============================================================ */

function findTreeMission(missionId) {

    return (

        missionsState.tree.find(

            mission =>

                mission.id === missionId

        ) || null

    );

}


/* ============================================================
   36. UPDATE SINGLE MISSION
============================================================ */

function updateMissionProgress(

    missionId,

    amount = 1

) {

    const mission =

        findMission(missionId);

    if (!mission) {

        return false;

    }

    if (mission.claimed) {

        return false;

    }

    if (

        mission.category ===

            MISSION_CATEGORIES.TREE &&

        mission.unlocked === false

    ) {

        return false;

    }

    const previousProgress =

        mission.progress;

    mission.progress =

        clampMissionProgress(

            mission.progress +

            Number(amount || 0),

            mission.target

        );

    if (

        mission.progress >=

            mission.target &&

        !mission.completed

    ) {

        mission.completed = true;

        mission.status =

            MISSION_STATUS.COMPLETED;

        mission.completedAt =

            Date.now();

        dispatchMissionEvent(

            "missionCompleted",

            mission

        );

    } else if (

        mission.progress >

        0

    ) {

        mission.status =

            MISSION_STATUS.IN_PROGRESS;

    }

    if (

        previousProgress !==

        mission.progress

    ) {

        updateMissionTreeStatuses();

        saveMissionsState();

        renderAllMissions();

        dispatchMissionEvent(

            "missionProgressUpdated",

            mission

        );

    }

    return true;

}


/* ============================================================
   37. UPDATE BY TYPE
============================================================ */

function updateMissionsByType(

    type,

    amount = 1,

    options = {}

) {

    const missions =

        getAllMissions();

    let updated = false;

    missions.forEach(

        mission => {

            if (

                mission.type !== type

            ) {

                return;

            }

            if (

                options.category &&

                mission.category !==

                    options.category

            ) {

                return;

            }

            if (mission.claimed) {

                return;

            }

            if (

                mission.category ===

                    MISSION_CATEGORIES.TREE &&

                mission.unlocked === false

            ) {

                return;

            }

            const before =

                mission.progress;

            mission.progress =

                clampMissionProgress(

                    mission.progress +

                    Number(amount || 0),

                    mission.target

                );

            if (

                mission.progress >=

                    mission.target &&

                !mission.completed

            ) {

                mission.completed = true;

                mission.status =

                    MISSION_STATUS.COMPLETED;

                mission.completedAt =

                    Date.now();

                dispatchMissionEvent(

                    "missionCompleted",

                    mission

                );

            } else if (

                mission.progress > 0

            ) {

                mission.status =

                    MISSION_STATUS.IN_PROGRESS;

            }

            if (

                before !==

                mission.progress

            ) {

                updated = true;

                dispatchMissionEvent(

                    "missionProgressUpdated",

                    mission

                );

            }

        }

    );

    if (updated) {

        updateMissionTreeStatuses();

        saveMissionsState();

        renderAllMissions();

    }

    return updated;

}


/* ============================================================
   38. CLAIM REWARD
============================================================ */

function claimMissionReward(

    missionId

) {

    const mission =

        findMission(missionId);

    if (!mission) {

        return {

            success: false,

            reason: "MISSION_NOT_FOUND"

        };

    }

    if (

        mission.category ===

            MISSION_CATEGORIES.TREE &&

        mission.unlocked === false

    ) {

        return {

            success: false,

            reason: "MISSION_LOCKED"

        };

    }

    if (!mission.completed) {

        return {

            success: false,

            reason: "MISSION_NOT_COMPLETED"

        };

    }

    if (mission.claimed) {

        return {

            success: false,

            reason: "REWARD_ALREADY_CLAIMED"

        };

    }

    mission.claimed = true;

    mission.claimedAt =

        Date.now();

    mission.status =

        MISSION_STATUS.CLAIMED;

    const reward = {

        coins:

            Number(

                mission.rewardCoins

            ) || 0,

        xp:

            Number(

                mission.rewardXP

            ) || 0

    };

    applyMissionReward(reward);

    updateMissionTreeStatuses();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "missionRewardClaimed",

        {

            mission,

            reward

        }

    );

    showMissionToast(

        `پاداش «${mission.title}» دریافت شد`

    );

    return {

        success: true,

        mission,

        reward

    };

}


/* ============================================================
   39. APPLY REWARD
============================================================ */

function applyMissionReward(

    reward

) {

    const coins =

        Number(reward.coins) || 0;

    const xp =

        Number(reward.xp) || 0;

    if (

        window.HokmWallet &&

        typeof window.HokmWallet.addCoins ===

            "function"

    ) {

        try {

            window.HokmWallet.addCoins(

                coins,

                "mission_reward"

            );

        } catch (error) {

            console.warn(

                "Wallet reward error:",

                error

            );

            addCoinsFallback(

                coins

            );

        }

    } else {

        addCoinsFallback(

            coins

        );

    }

    if (

        window.HokmProfile &&

        typeof window.HokmProfile.addXP ===

            "function"

    ) {

        try {

            window.HokmProfile.addXP(

                xp,

                "mission_reward"

            );

        } catch (error) {

            console.warn(

                "Profile XP reward error:",

                error

            );

            addXPFallback(

                xp

            );

        }

    } else {

        addXPFallback(

            xp

        );

    }

}


/* ============================================================
   40. FALLBACK COINS
============================================================ */

function addCoinsFallback(

    amount

) {

    if (!amount) {

        return;

    }

    try {

        const current =

            Number(

                localStorage.getItem(

                    "hokm_coins"

                )

            ) || 0;

        localStorage.setItem(

            "hokm_coins",

            String(

                current + amount

            )

        );

    } catch (error) {

        console.error(

            "Coin fallback error:",

            error

        );

    }

}


/* ============================================================
   41. FALLBACK XP
============================================================ */

function addXPFallback(

    amount

) {

    if (!amount) {

        return;

    }

    try {

        const current =

            Number(

                localStorage.getItem(

                    "hokm_xp"

                )

            ) || 0;

        localStorage.setItem(

            "hokm_xp",

            String(

                current + amount

            )

        );

    } catch (error) {

        console.error(

            "XP fallback error:",

            error

        );

    }

}


/* ============================================================
   42. GAME EVENTS
============================================================ */

function registerGameEvents() {

    if (

        missionsGameEventsInitialized

    ) {

        return;

    }

    missionsGameEventsInitialized =

        true;

    window.addEventListener(

        "hokm:gameCompleted",

        event => {

            const data =

                event.detail || {};

            updateMissionsByType(

                MISSION_TYPES.COMPLETE_GAMES,

                1

            );

            updateMissionsByType(

                MISSION_TYPES.PLAY_GAMES,

                1

            );

            if (

                data.won === true

            ) {

                updateMissionsByType(

                    MISSION_TYPES.WIN_GAMES,

                    1

                );

            }

            if (

                data.mode ===

                    "ranked"

            ) {

                updateMissionsByType(

                    MISSION_TYPES.PLAY_RANKED,

                    1

                );

                if (

                    data.won === true

                ) {

                    updateMissionsByType(

                        MISSION_TYPES.WIN_RANKED,

                        1

                    );

                }

            }

            if (

                data.mode ===

                    "practice"

            ) {

                updateMissionsByType(

                    MISSION_TYPES.PLAY_PRACTICE,

                    1

                );

            }

            if (

                data.mode ===

                    "private"

            ) {

                updateMissionsByType(

                    MISSION_TYPES.PLAY_PRIVATE,

                    1

                );

            }

            if (

                data.withFriend === true

            ) {

                updateMissionsByType(

                    MISSION_TYPES.PLAY_WITH_FRIEND,

                    1

                );

            }

        }

    );

    window.addEventListener(

        "hokm:trickWon",

        event => {

            const data =

                event.detail || {};

            updateMissionsByType(

                MISSION_TYPES.WIN_TRICKS,

                Number(

                    data.count

                ) || 1

            );

        }

    );

    window.addEventListener(

        "hokm:coinsEarned",

        event => {

            const data =

                event.detail || {};

            updateMissionsByType(

                MISSION_TYPES.EARN_COINS,

                Number(

                    data.amount

                ) || 0

            );

        }

    );

    window.addEventListener(

        "hokm:xpEarned",

        event => {

            const data =

                event.detail || {};

            updateMissionsByType(

                MISSION_TYPES.EARN_XP,

                Number(

                    data.amount

                ) || 0

            );

        }

    );

    window.addEventListener(

        "hokm:login",

        () => {

            updateMissionsByType(

                MISSION_TYPES.LOGIN,

                1

            );

        }

    );

    window.addEventListener(

        "hokm:messageSent",

        () => {

            updateMissionsByType(

                MISSION_TYPES.SEND_MESSAGES,

                1

            );

        }

    );

}


/* ============================================================
   43. DISPATCH EVENT
============================================================ */

function dispatchMissionEvent(

    eventName,

    detail

) {

    try {

        window.dispatchEvent(

            new CustomEvent(

                `hokm:missions:${eventName}`,

                {

                    detail: detail

                }

            )

        );

    } catch (error) {

        console.warn(

            "Mission event error:",

            error

        );

    }

}


/* ============================================================
   44. RENDER ALL
============================================================ */

function renderAllMissions() {

    renderDailyMissions();

    renderWeeklyMissions();

    renderMonthlyMissions();

    renderMissionTree();

    updateHomeMissionWidget();

}


/* ============================================================
   45. RENDER DAILY
============================================================ */

function renderDailyMissions() {

    const container =

        document.getElementById(

            "daily-missions"

        );

    if (!container) {

        return;

    }

    container.innerHTML = "";

    missionsState.daily.forEach(

        mission => {

            container.appendChild(

                createMissionElement(

                    mission

                )

            );

        }

    );

}


/* ============================================================
   46. RENDER WEEKLY
============================================================ */

function renderWeeklyMissions() {

    const container =

        document.getElementById(

            "weekly-missions"

        );

    if (!container) {

        return;

    }

    container.innerHTML = "";

    missionsState.weekly.forEach(

        mission => {

            container.appendChild(

                createMissionElement(

                    mission

                )

            );

        }

    );

}


/* ============================================================
   47. RENDER MONTHLY
============================================================ */

function renderMonthlyMissions() {

    const container =

        document.getElementById(

            "monthly-missions"

        );

    if (!container) {

        return;

    }

    container.innerHTML = "";

    missionsState.monthly.forEach(

        mission => {

            container.appendChild(

                createMissionElement(

                    mission

                )

            );

        }

    );

}


/* ============================================================
   48. CREATE NORMAL MISSION ELEMENT
============================================================ */

function createMissionElement(

    mission

) {

    const wrapper =

        document.createElement(

            "div"

        );

    wrapper.className =

        "mission-item";

    wrapper.dataset.missionId =

        mission.id;

    wrapper.dataset.branch =

        mission.branch || "";

    wrapper.dataset.tier =

        mission.tier || 1;

    if (mission.completed) {

        wrapper.classList.add(

            "mission-completed"

        );

    }

    if (mission.claimed) {

        wrapper.classList.add(

            "mission-claimed"

        );

    }

    if (

        mission.unlocked === false

    ) {

        wrapper.classList.add(

            "mission-locked"

        );

    }

    const progressPercentage =

        mission.target > 0

            ? Math.round(

                (

                    mission.progress /

                    mission.target

                ) * 100

            )

            : 0;

    const safePercentage =

        Math.max(

            0,

            Math.min(

                100,

                progressPercentage

            )

        );

    wrapper.innerHTML = `

        <div class="mission-item-icon">

            ${escapeMissionHTML(

                mission.icon

            )}

        </div>

        <div class="mission-item-content">

            <div class="mission-item-header">

                <strong>

                    ${escapeMissionHTML(

                        mission.title

                    )}

                </strong>

            </div>

            <p>

                ${escapeMissionHTML(

                    mission.description

                )}

            </p>

            <div class="mission-item-progress">

                <div class="progress-bar">

                    <div

                        class="progress-fill"

                        style="width: ${safePercentage}%"

                    ></div>

                </div>

                <span>

                    ${mission.progress}/${mission.target}

                </span>

            </div>

            <div class="mission-item-reward">

                <span>

                    🪙 ${mission.rewardCoins}

                </span>

                <span>

                    ⭐ ${mission.rewardXP} XP

                </span>

            </div>

        </div>

        <div class="mission-item-action">

            ${

                mission.claimed

                    ? `

                        <span

                            class="mission-claimed-label"

                        >

                            دریافت شد ✓

                        </span>

                    `

                    : mission.completed

                        ? `

                            <button

                                type="button"

                                class="primary-button mission-claim-button"

                                data-mission-id="${escapeMissionHTML(

                                    mission.id

                                )}"

                            >

                                دریافت پاداش

                            </button>

                        `

                        : mission.unlocked === false

                            ? `

                                <span

                                    class="mission-progress-label"

                                >

                                    🔒 قفل

                                </span>

                            `

                            : `

                                <span

                                    class="mission-progress-label"

                                >

                                    در حال انجام

                                </span>

                            `

            }

        </div>

    `;

    return wrapper;

}


/* ============================================================
   49. RENDER TREE
============================================================ */

function renderMissionTree() {

    const container =

        document.getElementById(

            "mission-tree"

        );

    if (!container) {

        return;

    }

    updateMissionTreeStatuses();

    container.innerHTML = "";

    const branches =

        Object.values(

            MISSION_BRANCHES

        );

    branches.forEach(

        branch => {

            const branchMissions =

                missionsState.tree

                    .filter(

                        mission =>

                            mission.branch ===

                            branch.id

                    )

                    .sort(

                        (a, b) =>

                            a.order -

                            b.order

                    );

            if (

                branchMissions.length === 0

            ) {

                return;

            }

            const branchElement =

                createMissionBranchElement(

                    branch,

                    branchMissions

                );

            container.appendChild(

                branchElement

            );

        }

    );

}


/* ============================================================
   50. CREATE TREE BRANCH
============================================================ */

function createMissionBranchElement(

    branch,

    missions

) {

    const branchWrapper =

        document.createElement(

            "section"

        );

    branchWrapper.className =

        "mission-tree-branch";

    branchWrapper.dataset.branch =

        branch.id;

    branchWrapper.innerHTML = `

        <div class="mission-tree-branch-header">

            <div class="mission-tree-branch-icon">

                ${escapeMissionHTML(

                    branch.icon

                )}

            </div>

            <div>

                <h3>

                    ${escapeMissionHTML(

                        branch.title

                    )}

                </h3>

                <p>

                    ${escapeMissionHTML(

                        branch.description

                    )}

                </p>

            </div>

        </div>

        <div class="mission-tree-path"></div>

    `;

    const path =

        branchWrapper.querySelector(

            ".mission-tree-path"

        );

    missions.forEach(

        (mission, index) => {

            const node =

                createMissionTreeNode(

                    mission,

                    index <

                        missions.length - 1

                );

            path.appendChild(

                node

            );

        }

    );

    return branchWrapper;

}


/* ============================================================
   51. CREATE TREE NODE
============================================================ */

function createMissionTreeNode(

    mission,

    hasNext

) {

    const node =

        document.createElement(

            "div"

        );

    node.className =

        "mission-tree-node";

    node.dataset.missionId =

        mission.id;

    node.dataset.status =

        mission.status;

    node.dataset.tier =

        mission.tier;

    if (mission.claimed) {

        node.classList.add(

            "tree-node-claimed"

        );

    } else if (

        mission.completed

    ) {

        node.classList.add(

            "tree-node-completed"

        );

    } else if (

        mission.unlocked

    ) {

        node.classList.add(

            "tree-node-unlocked"

        );

    } else {

        node.classList.add(

            "tree-node-locked"

        );

    }

    const percentage =

        mission.target > 0

            ? Math.round(

                (

                    mission.progress /

                    mission.target

                ) * 100

            )

            : 0;

    node.innerHTML = `

        <div class="mission-tree-node-card">

            <div class="mission-tree-node-top">

                <span class="mission-tree-node-tier">

                    مرحله ${mission.tier}

                </span>

                <span class="mission-tree-node-icon">

                    ${escapeMissionHTML(

                        mission.icon

                    )}

                </span>

            </div>

            <h4>

                ${escapeMissionHTML(

                    mission.title

                )}

            </h4>

            <p>

                ${escapeMissionHTML(

                    mission.description

                )}

            </p>

            <div class="mission-tree-progress">

                <div

                    class="mission-tree-progress-fill"

                    style="width:${Math.min(

                        100,

                        Math.max(

                            0,

                            percentage

                        )

                    )}%"

                ></div>

            </div>

            <div class="mission-tree-node-footer">

                <span>

                    ${mission.progress}/${mission.target}

                </span>

                <span>

                    🪙 ${mission.rewardCoins}

                </span>

            </div>

            ${

                mission.claimed

                    ? `

                        <div class="mission-tree-status">

                            ✓ دریافت شد

                        </div>

                    `

                    : mission.completed

                        ? `

                            <button

                                type="button"

                                class="mission-claim-button"

                                data-mission-id="${escapeMissionHTML(

                                    mission.id

                                )}"

                            >

                                دریافت پاداش

                            </button>

                        `

                        : mission.unlocked

                            ? `

                                <div class="mission-tree-status">

                                    ${

                                        mission.progress > 0

                                            ? "در حال پیشرفت"

                                            : "باز شده"

                                    }

                                </div>

                            `

                            : `

                                <div class="mission-tree-status">

                                    🔒 با تکمیل مرحله قبل باز می‌شود

                                </div>

                            `

            }

        </div>

        ${

            hasNext

                ? `

                    <div class="mission-tree-connector">

                        <span></span>

                    </div>

                `

                : ""

        }

    `;

    return node;

}


/* ============================================================
   52. ESCAPE HTML
============================================================ */

function escapeMissionHTML(

    value

) {

    return String(value)

        .replace(

            /&/g,

            "&amp;"

        )

        .replace(

            /</g,

            "&lt;"

        )

        .replace(

            />/g,

            "&gt;"

        )

        .replace(

            /"/g,

            "&quot;"

        )

        .replace(

            /'/g,

            "&#039;"

        );

}


/* ============================================================
   53. CLAIM BUTTON HANDLER
============================================================ */

function handleMissionContainerClick(

    event

) {

    const button =

        event.target.closest(

            ".mission-claim-button"

        );

    if (!button) {

        return;

    }

    const missionId =

        button.dataset.missionId;

    if (!missionId) {

        return;

    }

    claimMissionReward(

        missionId

    );

}


/* ============================================================
   54. HOME MISSION WIDGET
============================================================ */

function updateHomeMissionWidget() {

    const titleElement =

        document.getElementById(

            "daily-mission-title"

        );

    const progressElement =

        document.getElementById(

            "daily-mission-progress"

        );

    const countElement =

        document.getElementById(

            "daily-mission-count"

        );

    if (

        !titleElement ||

        !progressElement ||

        !countElement

    ) {

        return;

    }

    const mission =

        missionsState.daily.find(

            item =>

                !item.claimed

        ) ||

        missionsState.daily[0];

    if (!mission) {

        return;

    }

    titleElement.textContent =

        mission.title;

    const percentage =

        mission.target > 0

            ? Math.round(

                (

                    mission.progress /

                    mission.target

                ) * 100

            )

            : 0;

    progressElement.style.width =

        `${Math.min(

            100,

            Math.max(

                0,

                percentage

            )

        )}%`;

    countElement.textContent =

        `${mission.progress}/${mission.target}`;

}


/* ============================================================
   55. TOAST
============================================================ */

function showMissionToast(

    message

) {

    if (

        window.HokmUI &&

        typeof window.HokmUI.showToast ===

            "function"

    ) {

        window.HokmUI.showToast(

            message,

            "success"

        );

        return;

    }

    const container =

        document.getElementById(

            "toast-container"

        );

    if (!container) {

        return;

    }

    const toast =

        document.createElement(

            "div"

        );

    toast.className =

        "toast success-toast";

    toast.textContent =

        message;

    container.appendChild(

        toast

    );

    setTimeout(

        () => {

            toast.classList.add(

                "toast-hide"

            );

            setTimeout(

                () => {

                    toast.remove();

                },

                300

            );

        },

        3000

    );

}


/* ============================================================
   56. GET DAILY
============================================================ */

function getDailyMissions() {

    return cloneMissionData(

        missionsState.daily

    );

}


/* ============================================================
   57. GET WEEKLY
============================================================ */

function getWeeklyMissions() {

    return cloneMissionData(

        missionsState.weekly

    );

}


/* ============================================================
   58. GET MONTHLY
============================================================ */

function getMonthlyMissions() {

    return cloneMissionData(

        missionsState.monthly

    );

}


/* ============================================================
   59. GET TREE
============================================================ */

function getMissionTree() {

    updateMissionTreeStatuses();

    return cloneMissionData(

        missionsState.tree

    );

}


/* ============================================================
   60. GET BRANCH
============================================================ */

function getMissionBranch(

    branchId

) {

    return cloneMissionData(

        missionsState.tree.filter(

            mission =>

                mission.branch ===

                branchId

        )

    );

}


/* ============================================================
   61. GET COMPLETED
============================================================ */

function getCompletedMissions() {

    return getAllMissions().filter(

        mission =>

            mission.completed

    );

}


/* ============================================================
   62. GET CLAIMABLE
============================================================ */

function getClaimableMissions() {

    return getAllMissions().filter(

        mission =>

            mission.completed &&

            !mission.claimed &&

            mission.unlocked !== false

    );

}


/* ============================================================
   63. GET LOCKED TREE MISSIONS
============================================================ */

function getLockedTreeMissions() {

    return missionsState.tree.filter(

        mission =>

            mission.unlocked === false

    );

}


/* ============================================================
   64. GET MISSION PROGRESS
============================================================ */

function getMissionProgress(

    missionId

) {

    const mission =

        findMission(

            missionId

        );

    if (!mission) {

        return null;

    }

    return {

        progress:

            mission.progress,

        target:

            mission.target,

        percentage:

            mission.target > 0

                ? Math.round(

                    (

                        mission.progress /

                        mission.target

                    ) * 100

                )

                : 0,

        completed:

            mission.completed,

        claimed:

            mission.claimed,

        unlocked:

            mission.unlocked !== false,

        status:

            mission.status

    };

}


/* ============================================================
   65. COMPLETE MISSION DIRECTLY
============================================================ */

function completeMission(

    missionId

) {

    const mission =

        findMission(

            missionId

        );

    if (!mission) {

        return false;

    }

    if (

        mission.category ===

            MISSION_CATEGORIES.TREE &&

        mission.unlocked === false

    ) {

        return false;

    }

    mission.progress =

        mission.target;

    mission.completed =

        true;

    mission.status =

        MISSION_STATUS.COMPLETED;

    mission.completedAt =

        Date.now();

    updateMissionTreeStatuses();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "missionCompleted",

        mission

    );

    return true;

}


/* ============================================================
   66. RESET ALL
============================================================ */

function resetAllMissions() {

    missionsState.daily =

        selectDailyMissions();

    missionsState.weekly =

        selectWeeklyMissions();

    missionsState.monthly =

        selectMonthlyMissions();

    missionsState.lastDailyReset =

        missionDateKey();

    missionsState.lastWeeklyReset =

        missionWeekKey();

    missionsState.lastMonthlyReset =

        missionMonthKey();

    updateMissionTreeStatuses();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "missionsReset",

        getMissionsState()

    );

}


/* ============================================================
   67. RESET DAILY ONLY
============================================================ */

function resetDailyMissions() {

    missionsState.daily =

        selectDailyMissions();

    missionsState.lastDailyReset =

        missionDateKey();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "dailyMissionsReset",

        missionsState.daily

    );

}


/* ============================================================
   68. RESET WEEKLY ONLY
============================================================ */

function resetWeeklyMissions() {

    missionsState.weekly =

        selectWeeklyMissions();

    missionsState.lastWeeklyReset =

        missionWeekKey();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "weeklyMissionsReset",

        missionsState.weekly

    );

}


/* ============================================================
   69. RESET MONTHLY ONLY
============================================================ */

function resetMonthlyMissions() {

    missionsState.monthly =

        selectMonthlyMissions();

    missionsState.lastMonthlyReset =

        missionMonthKey();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "monthlyMissionsReset",

        missionsState.monthly

    );

}


/* ============================================================
   70. RESET TREE
============================================================ */

function resetMissionTree() {

    missionsState.tree =

        MISSION_TREE_DEFINITIONS.map(

            definition =>

                createMissionInstance(

                    definition,

                    MISSION_CATEGORIES.TREE

                )

        );

    updateMissionTreeStatuses();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "missionTreeReset",

        getMissionTree()

    );

}


/* ============================================================
   71. GET TREE PROGRESS
============================================================ */

function getMissionTreeProgress() {

    const tree =

        missionsState.tree;

    if (!tree.length) {

        return {

            total: 0,

            completed: 0,

            claimed: 0,

            percentage: 0

        };

    }

    const completed =

        tree.filter(

            mission =>

                mission.completed

        ).length;

    const claimed =

        tree.filter(

            mission =>

                mission.claimed

        ).length;

    return {

        total:

            tree.length,

        completed:

            completed,

        claimed:

            claimed,

        percentage:

            Math.round(

                (

                    claimed /

                    tree.length

                ) * 100

            )

    };

}


/* ============================================================
   72. GET BRANCH PROGRESS
============================================================ */

function getBranchProgress(

    branchId

) {

    const missions =

        missionsState.tree.filter(

            mission =>

                mission.branch ===

                branchId

        );

    if (!missions.length) {

        return {

            total: 0,

            completed: 0,

            claimed: 0,

            percentage: 0

        };

    }

    const claimed =

        missions.filter(

            mission =>

                mission.claimed

        ).length;

    const completed =

        missions.filter(

            mission =>

                mission.completed

        ).length;

    return {

        total:

            missions.length,

        completed:

            completed,

        claimed:

            claimed,

        percentage:

            Math.round(

                (

                    claimed /

                    missions.length

                ) * 100

            )

    };

}


/* ============================================================
   73. DOM EVENTS
============================================================ */

function initializeMissionDOMEvents() {

    if (

        missionsDOMEventsInitialized

    ) {

        return;

    }

    missionsDOMEventsInitialized =

        true;

    const containers = [

        "daily-missions",

        "weekly-missions",

        "monthly-missions",

        "mission-tree"

    ];

    containers.forEach(

        id => {

            const container =

                document.getElementById(

                    id

                );

            if (!container) {

                return;

            }

            container.addEventListener(

                "click",

                handleMissionContainerClick

            );

        }

    );

}


/* ============================================================
   74. REFRESH
============================================================ */

function refreshMissions() {

    checkMissionResets();

    updateMissionTreeStatuses();

    renderAllMissions();

    saveMissionsState();

    return getMissionsState();

}


/* ============================================================
   75. PUBLIC API
============================================================ */

window.HokmMissions = {

    /* Core */

    initialize:

        initializeMissions,

    refresh:

        refreshMissions,

    getState:

        getMissionsState,

    getAll:

        getAllMissions,

    find:

        findMission,


    /* Daily */

    getDaily:

        getDailyMissions,

    resetDaily:

        resetDailyMissions,


    /* Weekly */

    getWeekly:

        getWeeklyMissions,

    resetWeekly:

        resetWeeklyMissions,


    /* Monthly */

    getMonthly:

        getMonthlyMissions,

    resetMonthly:

        resetMonthlyMissions,


    /* Tree */

    getTree:

        getMissionTree,

    getBranch:

        getMissionBranch,

    getBranchProgress:

        getBranchProgress,

    getTreeProgress:

        getMissionTreeProgress,

    getLockedTree:

        getLockedTreeMissions,

    resetTree:

        resetMissionTree,


    /* Progress */

    getProgress:

        getMissionProgress,

    update:

        updateMissionProgress,

    updateByType:

        updateMissionsByType,

    complete:

        completeMission,


    /* Rewards */

    claimReward:

        claimMissionReward,

    getClaimable:

        getClaimableMissions,


    /* Statistics */

    getCompleted:

        getCompletedMissions,


    /* UI */

    render:

        renderAllMissions,


    /* Reset */

    reset:

        resetAllMissions,


    /* Constants */

    types:

        MISSION_TYPES,

    categories:

        MISSION_CATEGORIES,

    statuses:

        MISSION_STATUS,

    branches:

        MISSION_BRANCHES,

    tiers:

        MISSION_TIERS

};


/* ============================================================
   76. STARTUP
============================================================ */

function startMissionsSystem() {

    initializeMissions();

    initializeMissionDOMEvents();

    registerGameEvents();

}


/* ============================================================
   77. DOM READY
============================================================ */

if (

    document.readyState ===

    "loading"

) {

    document.addEventListener(

        "DOMContentLoaded",

        startMissionsSystem,

        {

            once: true

        }

    );

} else {

    startMissionsSystem();

}


/* ============================================================
   78. PERIODIC RESET CHECK
============================================================ */

setInterval(

    () => {

        if (

            !missionsState.initialized

        ) {

            return;

        }

        checkMissionResets();

    },

    60 * 1000

);


/* ============================================================
   79. PAGE VISIBILITY
============================================================ */

document.addEventListener(

    "visibilitychange",

    () => {

        if (

            document.visibilityState ===

            "visible"

        ) {

            checkMissionResets();

            updateMissionTreeStatuses();

            renderAllMissions();

        }

    }

);


/* ============================================================
   80. BACKWARD COMPATIBILITY
============================================================ */

/*
   برای اینکه فایل‌های قبلی پروژه که ممکن است
   مستقیماً این توابع را صدا بزنند دچار مشکل نشوند،
   API اصلی همچنان از طریق HokmMissions در دسترس است.

   هیچ API قبلی حذف نشده است.
*/


/* ============================================================
   81. DEBUG API
============================================================ */

window.HokmMissionsDebug = {

    state:

        () =>

            getMissionsState(),

    tree:

        () =>

            getMissionTree(),

    daily:

        () =>

            getDailyMissions(),

    weekly:

        () =>

            getWeeklyMissions(),

    monthly:

        () =>

            getMonthlyMissions(),

    progress:

        () =>

            getMissionTreeProgress(),

    resetAll:

        () =>

            resetAllMissions()

};


/* ============================================================
   END OF missions.js
============================================================ */
