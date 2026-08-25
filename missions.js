/* ============================================================
   HOKM ONLINE
   MISSIONS SYSTEM
   File: missions.js
   Stage: 17

   مسئولیت‌های این فایل:
   - سیستم مأموریت‌های روزانه
   - سیستم مأموریت‌های هفتگی
   - مدیریت پیشرفت مأموریت‌ها
   - تکمیل مأموریت‌ها
   - دریافت پاداش
   - ذخیره‌سازی مأموریت‌ها
   - ریست روزانه
   - ریست هفتگی
   - هماهنگی با UI
   - رویدادهای مأموریت
   - آماده‌سازی برای اتصال به Backend در مراحل بعدی

   نکته:
   این فایل به صورت مستقل نوشته شده و هیچ قابلیت
   قبلی پروژه را حذف نمی‌کند.
============================================================ */


/* ============================================================
   1. GLOBAL NAMESPACE
============================================================ */

window.HokmMissions = window.HokmMissions || {};


/* ============================================================
   2. CONSTANTS
============================================================ */

const MISSIONS_STORAGE_KEY = "hokm_missions_v1";

const MISSION_VERSION = 1;

const DAILY_MISSION_RESET_HOUR = 0;

const WEEKLY_MISSION_RESET_DAY = 6;

const MAX_DAILY_MISSIONS = 5;

const MAX_WEEKLY_MISSIONS = 5;


/* ============================================================
   3. MISSION TYPES
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

    SEND_MESSAGES: "send_messages"

};


/* ============================================================
   4. MISSION CATEGORIES
============================================================ */

const MISSION_CATEGORIES = {

    DAILY: "daily",

    WEEKLY: "weekly"

};


/* ============================================================
   5. DEFAULT MISSION DEFINITIONS
============================================================ */

const DAILY_MISSION_DEFINITIONS = [

    {
        id: "daily_play_1",
        type: MISSION_TYPES.PLAY_GAMES,
        title: "یک بازی حکم انجام بده",
        description: "یک بازی حکم را کامل کن.",
        target: 1,
        rewardCoins: 100,
        rewardXP: 25,
        icon: "🃏"
    },

    {
        id: "daily_play_3",
        type: MISSION_TYPES.PLAY_GAMES,
        title: "سه بازی انجام بده",
        description: "سه بازی حکم را کامل کن.",
        target: 3,
        rewardCoins: 250,
        rewardXP: 60,
        icon: "🎮"
    },

    {
        id: "daily_win_1",
        type: MISSION_TYPES.WIN_GAMES,
        title: "یک پیروزی کسب کن",
        description: "در یک بازی حکم پیروز شو.",
        target: 1,
        rewardCoins: 150,
        rewardXP: 40,
        icon: "🏆"
    },

    {
        id: "daily_win_2",
        type: MISSION_TYPES.WIN_GAMES,
        title: "دو پیروزی کسب کن",
        description: "دو بازی حکم را با پیروزی به پایان برسان.",
        target: 2,
        rewardCoins: 300,
        rewardXP: 80,
        icon: "🥇"
    },

    {
        id: "daily_tricks_5",
        type: MISSION_TYPES.WIN_TRICKS,
        title: "پنج دست ببر",
        description: "در مجموع پنج دست را برنده شو.",
        target: 5,
        rewardCoins: 200,
        rewardXP: 50,
        icon: "♠️"
    },

    {
        id: "daily_tricks_10",
        type: MISSION_TYPES.WIN_TRICKS,
        title: "ده دست ببر",
        description: "در مجموع ده دست را برنده شو.",
        target: 10,
        rewardCoins: 350,
        rewardXP: 90,
        icon: "🃏"
    },

    {
        id: "daily_coins_500",
        type: MISSION_TYPES.EARN_COINS,
        title: "۵۰۰ سکه به دست بیاور",
        description: "در مجموع ۵۰۰ سکه کسب کن.",
        target: 500,
        rewardCoins: 150,
        rewardXP: 40,
        icon: "🪙"
    },

    {
        id: "daily_ranked_1",
        type: MISSION_TYPES.PLAY_RANKED,
        title: "یک بازی رقابتی انجام بده",
        description: "یک بازی در حالت رقابتی انجام بده.",
        target: 1,
        rewardCoins: 200,
        rewardXP: 60,
        icon: "🏆"
    },

    {
        id: "daily_friend_game",
        type: MISSION_TYPES.PLAY_WITH_FRIEND,
        title: "با یک دوست بازی کن",
        description: "با یکی از دوستانت یک بازی انجام بده.",
        target: 1,
        rewardCoins: 250,
        rewardXP: 70,
        icon: "👥"
    },

    {
        id: "daily_login",
        type: MISSION_TYPES.LOGIN,
        title: "ورود روزانه",
        description: "امروز وارد بازی شو.",
        target: 1,
        rewardCoins: 50,
        rewardXP: 10,
        icon: "📅"
    }

];


/* ============================================================
   6. WEEKLY MISSION DEFINITIONS
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
        icon: "🎮"
    },

    {
        id: "weekly_play_25",
        type: MISSION_TYPES.PLAY_GAMES,
        title: "بیست و پنج بازی انجام بده",
        description: "در طول هفته بیست و پنج بازی انجام بده.",
        target: 25,
        rewardCoins: 1800,
        rewardXP: 500,
        icon: "🔥"
    },

    {
        id: "weekly_win_10",
        type: MISSION_TYPES.WIN_GAMES,
        title: "ده پیروزی",
        description: "در طول هفته ده بازی را ببر.",
        target: 10,
        rewardCoins: 1500,
        rewardXP: 450,
        icon: "🏆"
    },

    {
        id: "weekly_win_20",
        type: MISSION_TYPES.WIN_GAMES,
        title: "بیست پیروزی",
        description: "در طول هفته بیست بازی را ببر.",
        target: 20,
        rewardCoins: 3000,
        rewardXP: 800,
        icon: "👑"
    },

    {
        id: "weekly_tricks_50",
        type: MISSION_TYPES.WIN_TRICKS,
        title: "پنجاه دست پیروز شو",
        description: "در طول هفته پنجاه دست را برنده شو.",
        target: 50,
        rewardCoins: 1200,
        rewardXP: 350,
        icon: "♠️"
    },

    {
        id: "weekly_tricks_100",
        type: MISSION_TYPES.WIN_TRICKS,
        title: "صد دست پیروز شو",
        description: "در طول هفته صد دست را برنده شو.",
        target: 100,
        rewardCoins: 2500,
        rewardXP: 700,
        icon: "💎"
    },

    {
        id: "weekly_ranked_10",
        type: MISSION_TYPES.PLAY_RANKED,
        title: "ده بازی رقابتی",
        description: "ده بازی رقابتی انجام بده.",
        target: 10,
        rewardCoins: 1200,
        rewardXP: 400,
        icon: "🏅"
    },

    {
        id: "weekly_ranked_win_5",
        type: MISSION_TYPES.WIN_RANKED,
        title: "پنج برد رقابتی",
        description: "پنج بازی رقابتی را ببر.",
        target: 5,
        rewardCoins: 1800,
        rewardXP: 600,
        icon: "👑"
    },

    {
        id: "weekly_coins_5000",
        type: MISSION_TYPES.EARN_COINS,
        title: "۵۰۰۰ سکه کسب کن",
        description: "در طول هفته ۵۰۰۰ سکه کسب کن.",
        target: 5000,
        rewardCoins: 1000,
        rewardXP: 300,
        icon: "🪙"
    },

    {
        id: "weekly_friend_5",
        type: MISSION_TYPES.PLAY_WITH_FRIEND,
        title: "با دوستانت بازی کن",
        description: "با دوستانت پنج بازی انجام بده.",
        target: 5,
        rewardCoins: 1000,
        rewardXP: 350,
        icon: "👥"
    }

];


/* ============================================================
   7. INTERNAL STATE
============================================================ */

let missionsState = {

    version: MISSION_VERSION,

    daily: [],

    weekly: [],

    lastDailyReset: null,

    lastWeeklyReset: null,

    initialized: false

};


/* ============================================================
   8. UTILITY FUNCTIONS
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

    const diff = current.getDate() - day + 1;

    const firstDay = new Date(

        current.getFullYear(),

        current.getMonth(),

        diff

    );

    return missionDateKey(firstDay);

}


function clampMissionProgress(value, target) {

    const numericValue = Number(value) || 0;

    const numericTarget = Number(target) || 1;

    return Math.max(

        0,

        Math.min(numericValue, numericTarget)

    );

}


/* ============================================================
   9. CREATE MISSION INSTANCE
============================================================ */

function createMissionInstance(definition, category) {

    return {

        id: definition.id,

        type: definition.type,

        category: category,

        title: definition.title,

        description: definition.description,

        target: definition.target,

        progress: 0,

        rewardCoins: definition.rewardCoins,

        rewardXP: definition.rewardXP,

        icon: definition.icon,

        completed: false,

        claimed: false,

        createdAt: Date.now(),

        completedAt: null,

        claimedAt: null

    };

}


/* ============================================================
   10. SELECT MISSIONS
============================================================ */

function selectDailyMissions() {

    const definitions = [...DAILY_MISSION_DEFINITIONS];

    shuffleMissionArray(definitions);

    return definitions

        .slice(0, MAX_DAILY_MISSIONS)

        .map(definition =>

            createMissionInstance(

                definition,

                MISSION_CATEGORIES.DAILY

            )

        );

}


function selectWeeklyMissions() {

    const definitions = [...WEEKLY_MISSION_DEFINITIONS];

    shuffleMissionArray(definitions);

    return definitions

        .slice(0, MAX_WEEKLY_MISSIONS)

        .map(definition =>

            createMissionInstance(

                definition,

                MISSION_CATEGORIES.WEEKLY

            )

        );

}


/* ============================================================
   11. SHUFFLE
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


/* ============================================================
   12. SAVE STATE
============================================================ */

function saveMissionsState() {

    try {

        localStorage.setItem(

            MISSIONS_STORAGE_KEY,

            JSON.stringify(missionsState)

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
   13. LOAD STATE
============================================================ */

function loadMissionsState() {

    try {

        const rawData = localStorage.getItem(

            MISSIONS_STORAGE_KEY

        );

        if (!rawData) {

            return false;

        }

        const parsedData = JSON.parse(rawData);

        if (!parsedData) {

            return false;

        }

        missionsState = {

            ...missionsState,

            ...parsedData

        };

        return true;

    } catch (error) {

        console.error(

            "Mission state load error:",

            error

        );

        return false;

    }

}


/* ============================================================
   14. INITIALIZE
============================================================ */

function initializeMissions() {

    if (missionsState.initialized) {

        checkMissionResets();

        return getMissionsState();

    }

    loadMissionsState();

    const today = missionDateKey();

    const currentWeek = missionWeekKey();

    if (

        !Array.isArray(missionsState.daily) ||

        missionsState.daily.length === 0

    ) {

        missionsState.daily = selectDailyMissions();

        missionsState.lastDailyReset = today;

    }

    if (

        !Array.isArray(missionsState.weekly) ||

        missionsState.weekly.length === 0

    ) {

        missionsState.weekly = selectWeeklyMissions();

        missionsState.lastWeeklyReset = currentWeek;

    }

    missionsState.initialized = true;

    checkMissionResets();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "missionsInitialized",

        getMissionsState()

    );

    return getMissionsState();

}


/* ============================================================
   15. RESET CHECK
============================================================ */

function checkMissionResets() {

    const today = missionDateKey();

    const currentWeek = missionWeekKey();

    let changed = false;

    if (

        missionsState.lastDailyReset !== today

    ) {

        missionsState.daily = selectDailyMissions();

        missionsState.lastDailyReset = today;

        changed = true;

        dispatchMissionEvent(

            "dailyMissionsReset",

            missionsState.daily

        );

    }

    if (

        missionsState.lastWeeklyReset !== currentWeek

    ) {

        missionsState.weekly = selectWeeklyMissions();

        missionsState.lastWeeklyReset = currentWeek;

        changed = true;

        dispatchMissionEvent(

            "weeklyMissionsReset",

            missionsState.weekly

        );

    }

    if (changed) {

        saveMissionsState();

        renderAllMissions();

    }

    return changed;

}


/* ============================================================
   16. GET STATE
============================================================ */

function getMissionsState() {

    return JSON.parse(

        JSON.stringify(missionsState)

    );

}


/* ============================================================
   17. GET ALL MISSIONS
============================================================ */

function getAllMissions() {

    return [

        ...missionsState.daily,

        ...missionsState.weekly

    ];

}


/* ============================================================
   18. FIND MISSION
============================================================ */

function findMission(missionId) {

    return getAllMissions().find(

        mission => mission.id === missionId

    ) || null;

}


/* ============================================================
   19. UPDATE MISSION
============================================================ */

function updateMissionProgress(

    missionId,

    amount = 1

) {

    const mission = findMission(missionId);

    if (!mission) {

        return false;

    }

    if (mission.claimed) {

        return false;

    }

    const previousProgress = mission.progress;

    mission.progress = clampMissionProgress(

        mission.progress + Number(amount || 0),

        mission.target

    );

    if (

        mission.progress >= mission.target &&

        !mission.completed

    ) {

        mission.completed = true;

        mission.completedAt = Date.now();

        dispatchMissionEvent(

            "missionCompleted",

            mission

        );

    }

    if (

        previousProgress !== mission.progress

    ) {

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
   20. UPDATE BY TYPE
============================================================ */

function updateMissionsByType(

    type,

    amount = 1,

    options = {}

) {

    const missions = getAllMissions();

    let updated = false;

    missions.forEach(mission => {

        if (mission.type !== type) {

            return;

        }

        if (options.category &&

            mission.category !== options.category) {

            return;

        }

        if (mission.claimed) {

            return;

        }

        const before = mission.progress;

        mission.progress = clampMissionProgress(

            mission.progress + Number(amount || 0),

            mission.target

        );

        if (

            mission.progress >= mission.target &&

            !mission.completed

        ) {

            mission.completed = true;

            mission.completedAt = Date.now();

            dispatchMissionEvent(

                "missionCompleted",

                mission

            );

        }

        if (before !== mission.progress) {

            updated = true;

            dispatchMissionEvent(

                "missionProgressUpdated",

                mission

            );

        }

    });

    if (updated) {

        saveMissionsState();

        renderAllMissions();

    }

    return updated;

}


/* ============================================================
   21. CLAIM REWARD
============================================================ */

function claimMissionReward(missionId) {

    const mission = findMission(missionId);

    if (!mission) {

        return {

            success: false,

            reason: "MISSION_NOT_FOUND"

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

    mission.claimedAt = Date.now();

    const reward = {

        coins: Number(mission.rewardCoins) || 0,

        xp: Number(mission.rewardXP) || 0

    };

    applyMissionReward(reward);

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
   22. APPLY REWARD
============================================================ */

function applyMissionReward(reward) {

    const coins = Number(reward.coins) || 0;

    const xp = Number(reward.xp) || 0;

    if (

        window.HokmWallet &&

        typeof window.HokmWallet.addCoins === "function"

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

        }

    } else {

        addCoinsFallback(coins);

    }

    if (

        window.HokmProfile &&

        typeof window.HokmProfile.addXP === "function"

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

        }

    } else {

        addXPFallback(xp);

    }

}


/* ============================================================
   23. FALLBACK COINS
============================================================ */

function addCoinsFallback(amount) {

    if (!amount) {

        return;

    }

    try {

        const current = Number(

            localStorage.getItem(

                "hokm_coins"

            )

        ) || 0;

        localStorage.setItem(

            "hokm_coins",

            String(current + amount)

        );

    } catch (error) {

        console.error(

            "Coin fallback error:",

            error

        );

    }

}


/* ============================================================
   24. FALLBACK XP
============================================================ */

function addXPFallback(amount) {

    if (!amount) {

        return;

    }

    try {

        const current = Number(

            localStorage.getItem(

                "hokm_xp"

            )

        ) || 0;

        localStorage.setItem(

            "hokm_xp",

            String(current + amount)

        );

    } catch (error) {

        console.error(

            "XP fallback error:",

            error

        );

    }

}


/* ============================================================
   25. GAME EVENTS
============================================================ */

function registerGameEvents() {

    window.addEventListener(

        "hokm:gameCompleted",

        event => {

            const data = event.detail || {};

            updateMissionsByType(

                MISSION_TYPES.COMPLETE_GAMES,

                1

            );

            updateMissionsByType(

                MISSION_TYPES.PLAY_GAMES,

                1

            );

            if (data.won === true) {

                updateMissionsByType(

                    MISSION_TYPES.WIN_GAMES,

                    1

                );

            }

            if (data.mode === "ranked") {

                updateMissionsByType(

                    MISSION_TYPES.PLAY_RANKED,

                    1

                );

                if (data.won === true) {

                    updateMissionsByType(

                        MISSION_TYPES.WIN_RANKED,

                        1

                    );

                }

            }

            if (data.mode === "practice") {

                updateMissionsByType(

                    MISSION_TYPES.PLAY_PRACTICE,

                    1

                );

            }

            if (data.mode === "private") {

                updateMissionsByType(

                    MISSION_TYPES.PLAY_PRIVATE,

                    1

                );

            }

            if (data.withFriend === true) {

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

            const data = event.detail || {};

            updateMissionsByType(

                MISSION_TYPES.WIN_TRICKS,

                Number(data.count) || 1

            );

        }

    );


    window.addEventListener(

        "hokm:coinsEarned",

        event => {

            const data = event.detail || {};

            updateMissionsByType(

                MISSION_TYPES.EARN_COINS,

                Number(data.amount) || 0

            );

        }

    );


    window.addEventListener(

        "hokm:xpEarned",

        event => {

            const data = event.detail || {};

            updateMissionsByType(

                MISSION_TYPES.EARN_XP,

                Number(data.amount) || 0

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
   26. DISPATCH EVENT
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
   27. RENDER ALL
============================================================ */

function renderAllMissions() {

    renderDailyMissions();

    renderWeeklyMissions();

    updateHomeMissionWidget();

}


/* ============================================================
   28. RENDER DAILY
============================================================ */

function renderDailyMissions() {

    const container = document.getElementById(

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
   29. RENDER WEEKLY
============================================================ */

function renderWeeklyMissions() {

    const container = document.getElementById(

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
   30. CREATE MISSION ELEMENT
============================================================ */

function createMissionElement(mission) {

    const wrapper = document.createElement("div");

    wrapper.className = "mission-item";

    wrapper.dataset.missionId = mission.id;

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

    const progressPercentage =

        mission.target > 0

            ? Math.round(

                (

                    mission.progress /

                    mission.target

                ) * 100

            )

            : 0;

    wrapper.innerHTML = `

        <div class="mission-item-icon">

            ${escapeMissionHTML(mission.icon)}

        </div>

        <div class="mission-item-content">

            <div class="mission-item-header">

                <strong>

                    ${escapeMissionHTML(mission.title)}

                </strong>

            </div>

            <p>

                ${escapeMissionHTML(mission.description)}

            </p>

            <div class="mission-item-progress">

                <div class="progress-bar">

                    <div

                        class="progress-fill"

                        style="width: ${progressPercentage}%"

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

                        <span class="mission-claimed-label">

                            دریافت شد ✓

                        </span>

                    `

                    : mission.completed

                        ? `

                            <button

                                type="button"

                                class="primary-button mission-claim-button"

                                data-mission-id="${mission.id}"

                            >

                                دریافت پاداش

                            </button>

                        `

                        : `

                            <span class="mission-progress-label">

                                در حال انجام

                            </span>

                        `

            }

        </div>

    `;

    return wrapper;

}


/* ============================================================
   31. ESCAPE HTML
============================================================ */

function escapeMissionHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


/* ============================================================
   32. CLAIM BUTTON HANDLER
============================================================ */

function handleMissionContainerClick(event) {

    const button = event.target.closest(

        ".mission-claim-button"

    );

    if (!button) {

        return;

    }

    const missionId = button.dataset.missionId;

    if (!missionId) {

        return;

    }

    claimMissionReward(missionId);

}


/* ============================================================
   33. HOME MISSION WIDGET
============================================================ */

function updateHomeMissionWidget() {

    const titleElement = document.getElementById(

        "daily-mission-title"

    );

    const progressElement = document.getElementById(

        "daily-mission-progress"

    );

    const countElement = document.getElementById(

        "daily-mission-count"

    );

    if (!titleElement ||

        !progressElement ||

        !countElement) {

        return;

    }

    const mission = missionsState.daily.find(

        item => !item.claimed

    ) || missionsState.daily[0];

    if (!mission) {

        return;

    }

    titleElement.textContent = mission.title;

    const percentage = mission.target > 0

        ? Math.round(

            (

                mission.progress /

                mission.target

            ) * 100

        )

        : 0;

    progressElement.style.width =

        `${percentage}%`;

    countElement.textContent =

        `${mission.progress}/${mission.target}`;

}


/* ============================================================
   34. TOAST
============================================================ */

function showMissionToast(message) {

    if (

        window.HokmUI &&

        typeof window.HokmUI.showToast === "function"

    ) {

        window.HokmUI.showToast(

            message,

            "success"

        );

        return;

    }

    const container = document.getElementById(

        "toast-container"

    );

    if (!container) {

        return;

    }

    const toast = document.createElement("div");

    toast.className = "toast success-toast";

    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("toast-hide");

        setTimeout(() => {

            toast.remove();

        }, 300);

    }, 3000);

}


/* ============================================================
   35. GET DAILY MISSIONS
============================================================ */

function getDailyMissions() {

    return missionsState.daily.map(

        mission => ({ ...mission })

    );

}


/* ============================================================
   36. GET WEEKLY MISSIONS
============================================================ */

function getWeeklyMissions() {

    return missionsState.weekly.map(

        mission => ({ ...mission })

    );

}


/* ============================================================
   37. GET COMPLETED MISSIONS
============================================================ */

function getCompletedMissions() {

    return getAllMissions().filter(

        mission => mission.completed

    );

}


/* ============================================================
   38. GET CLAIMABLE MISSIONS
============================================================ */

function getClaimableMissions() {

    return getAllMissions().filter(

        mission =>

            mission.completed &&

            !mission.claimed

    );

}


/* ============================================================
   39. GET MISSION PROGRESS
============================================================ */

function getMissionProgress(missionId) {

    const mission = findMission(missionId);

    if (!mission) {

        return null;

    }

    return {

        progress: mission.progress,

        target: mission.target,

        percentage:

            mission.target > 0

                ? Math.round(

                    (

                        mission.progress /

                        mission.target

                    ) * 100

                )

                : 0,

        completed: mission.completed,

        claimed: mission.claimed

    };

}


/* ============================================================
   40. COMPLETE MISSION DIRECTLY
============================================================ */

function completeMission(missionId) {

    const mission = findMission(missionId);

    if (!mission) {

        return false;

    }

    mission.progress = mission.target;

    mission.completed = true;

    mission.completedAt = Date.now();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "missionCompleted",

        mission

    );

    return true;

}


/* ============================================================
   41. RESET ALL MISSIONS
============================================================ */

function resetAllMissions() {

    missionsState.daily = selectDailyMissions();

    missionsState.weekly = selectWeeklyMissions();

    missionsState.lastDailyReset =

        missionDateKey();

    missionsState.lastWeeklyReset =

        missionWeekKey();

    saveMissionsState();

    renderAllMissions();

    dispatchMissionEvent(

        "missionsReset",

        getMissionsState()

    );

}


/* ============================================================
   42. INITIALIZE DOM EVENTS
============================================================ */

function initializeMissionDOMEvents() {

    const dailyContainer = document.getElementById(

        "daily-missions"

    );

    const weeklyContainer = document.getElementById(

        "weekly-missions"

    );

    if (dailyContainer) {

        dailyContainer.addEventListener(

            "click",

            handleMissionContainerClick

        );

    }

    if (weeklyContainer) {

        weeklyContainer.addEventListener(

            "click",

            handleMissionContainerClick

        );

    }

}


/* ============================================================
   43. PUBLIC API
============================================================ */

window.HokmMissions = {

    initialize: initializeMissions,

    getState: getMissionsState,

    getAll: getAllMissions,

    getDaily: getDailyMissions,

    getWeekly: getWeeklyMissions,

    getCompleted: getCompletedMissions,

    getClaimable: getClaimableMissions,

    find: findMission,

    getProgress: getMissionProgress,

    update: updateMissionProgress,

    updateByType: updateMissionsByType,

    complete: completeMission,

    claimReward: claimMissionReward,

    render: renderAllMissions,

    reset: resetAllMissions,

    types: MISSION_TYPES,

    categories: MISSION_CATEGORIES

};


/* ============================================================
   44. STARTUP
============================================================ */

function startMissionsSystem() {

    initializeMissions();

    initializeMissionDOMEvents();

    registerGameEvents();

}


/* ============================================================
   45. DOM READY
============================================================ */

if (document.readyState === "loading") {

    document.addEventListener(

        "DOMContentLoaded",

        startMissionsSystem

    );

} else {

    startMissionsSystem();

}


/* ============================================================
   END OF missions.js
============================================================ */
