/* ============================================================
   HOKM ONLINE
   PROFILE.JS
   مرحله ۷ پروژه

   مسئولیت‌های این فایل:

   1. مدیریت پروفایل بازیکن
   2. نمایش نام کاربری
   3. نمایش شناسه کاربر
   4. مدیریت آواتار
   5. نمایش سطح بازیکن
   6. سیستم XP
   7. نمایش تعداد بازی‌ها
   8. نمایش بردها
   9. نمایش باخت‌ها
   10. محاسبه درصد برد
   11. مدیریت افتخارات
   12. ویرایش نام نمایشی
   13. تغییر آواتار
   14. ذخیره اطلاعات
   15. هماهنگی با storage.js
   16. هماهنگی با auth.js
   17. ایجاد رویدادهای عمومی برای سایر فایل‌ها
   18. جلوگیری از خراب شدن اطلاعات قبلی
   19. پشتیبانی از بازیکن مهمان
   20. آماده‌سازی برای Multiplayer
   21. آماده‌سازی برای Leaderboard
   22. آماده‌سازی برای Wallet
   23. آماده‌سازی برای Shop
   24. آماده‌سازی برای Notifications
   25. آماده‌سازی برای سرور و Supabase در آینده

   توجه:
   این فایل هیچ‌کدام از قابلیت‌های فایل‌های قبلی را حذف نمی‌کند.
============================================================ */


/* ============================================================
   NAMESPACE اصلی پروفایل
============================================================ */

window.HokmProfile = window.HokmProfile || {};


/* ============================================================
   تنظیمات اصلی
============================================================ */

const PROFILE_CONFIG = {

    storageKey: "hokm_profile",

    defaultAvatar: "👤",

    defaultUsername: "بازیکن",

    defaultLevel: 1,

    defaultXP: 0,

    defaultCoins: 1000,

    maxUsernameLength: 30,

    minUsernameLength: 3,

    maxBioLength: 150,

    xpBase: 100,

    xpMultiplier: 1.35

};


/* ============================================================
   آواتارهای پیش‌فرض
============================================================ */

const DEFAULT_AVATARS = [

    "👤",
    "😀",
    "😎",
    "🤠",
    "🦁",
    "🐯",
    "🐼",
    "🦊",
    "🐺",
    "🐸",
    "🐵",
    "🦄",
    "🐲",
    "👑",
    "🎩",
    "🧙",
    "🧛",
    "🥷",
    "🤖",
    "👽",
    "🎮",
    "♠️",
    "♥️",
    "♦️",
    "♣️"

];


/* ============================================================
   افتخارات اولیه
============================================================ */

const DEFAULT_ACHIEVEMENTS = [

    {
        id: "first_game",
        title: "اولین بازی",
        description: "اولین بازی حکم خود را انجام دهید.",
        icon: "🃏",
        unlocked: false,
        progress: 0,
        target: 1,
        rewardXP: 50,
        rewardCoins: 50
    },

    {
        id: "first_win",
        title: "اولین پیروزی",
        description: "اولین بازی خود را ببرید.",
        icon: "🏆",
        unlocked: false,
        progress: 0,
        target: 1,
        rewardXP: 100,
        rewardCoins: 100
    },

    {
        id: "five_games",
        title: "بازیکن فعال",
        description: "۵ بازی انجام دهید.",
        icon: "🎮",
        unlocked: false,
        progress: 0,
        target: 5,
        rewardXP: 100,
        rewardCoins: 150
    },

    {
        id: "ten_games",
        title: "حکم‌باز",
        description: "۱۰ بازی انجام دهید.",
        icon: "🃏",
        unlocked: false,
        progress: 0,
        target: 10,
        rewardXP: 200,
        rewardCoins: 250
    },

    {
        id: "twenty_wins",
        title: "قهرمان",
        description: "۲۰ بازی را ببرید.",
        icon: "👑",
        unlocked: false,
        progress: 0,
        target: 20,
        rewardXP: 500,
        rewardCoins: 500
    },

    {
        id: "fifty_games",
        title: "بازیکن حرفه‌ای",
        description: "۵۰ بازی انجام دهید.",
        icon: "⭐",
        unlocked: false,
        progress: 0,
        target: 50,
        rewardXP: 750,
        rewardCoins: 750
    },

    {
        id: "hundred_games",
        title: "افسانه حکم",
        description: "۱۰۰ بازی انجام دهید.",
        icon: "🔥",
        unlocked: false,
        progress: 0,
        target: 100,
        rewardXP: 1500,
        rewardCoins: 1500
    }

];


/* ============================================================
   وضعیت داخلی پروفایل
============================================================ */

let profileState = null;

let profileInitialized = false;


/* ============================================================
   ابزارهای عمومی DOM
============================================================ */

function profileGetElement(id) {

    return document.getElementById(id);

}


function profileQuery(selector) {

    return document.querySelector(selector);

}


function profileQueryAll(selector) {

    return Array.from(document.querySelectorAll(selector));

}


/* ============================================================
   تولید شناسه کاربر
============================================================ */

function generateProfileUserId() {

    const timestamp = Date.now().toString(36);

    const random = Math.random()
        .toString(36)
        .substring(2, 8);

    return `HKM-${timestamp}-${random}`.toUpperCase();

}


/* ============================================================
   ایجاد ساختار پیش‌فرض پروفایل
============================================================ */

function createDefaultProfile() {

    return {

        id: generateProfileUserId(),

        username: PROFILE_CONFIG.defaultUsername,

        displayName: PROFILE_CONFIG.defaultUsername,

        avatar: PROFILE_CONFIG.defaultAvatar,

        bio: "",

        level: PROFILE_CONFIG.defaultLevel,

        xp: PROFILE_CONFIG.defaultXP,

        totalXP: PROFILE_CONFIG.defaultXP,

        coins: PROFILE_CONFIG.defaultCoins,

        stats: {

            games: 0,

            wins: 0,

            losses: 0,

            draws: 0,

            abandoned: 0,

            tricksWon: 0,

            tricksLost: 0,

            roundsWon: 0,

            roundsLost: 0,

            perfectGames: 0,

            currentWinStreak: 0,

            bestWinStreak: 0

        },

        ranking: {

            rating: 1000,

            rank: 0,

            league: "Bronze",

            wins: 0,

            losses: 0

        },

        achievements: cloneAchievements(),

        preferences: {

            profilePublic: true,

            showOnlineStatus: true

        },

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString()

    };

}


/* ============================================================
   کپی افتخارات
============================================================ */

function cloneAchievements() {

    return DEFAULT_ACHIEVEMENTS.map(function(achievement) {

        return {

            id: achievement.id,

            title: achievement.title,

            description: achievement.description,

            icon: achievement.icon,

            unlocked: achievement.unlocked,

            progress: achievement.progress,

            target: achievement.target,

            rewardXP: achievement.rewardXP,

            rewardCoins: achievement.rewardCoins

        };

    });

}


/* ============================================================
   ادغام ایمن اطلاعات پروفایل
============================================================ */

function normalizeProfile(profile) {

    const defaultProfile = createDefaultProfile();

    const incoming = profile || {};

    const normalized = {

        ...defaultProfile,

        ...incoming,

        stats: {

            ...defaultProfile.stats,

            ...(incoming.stats || {})

        },

        ranking: {

            ...defaultProfile.ranking,

            ...(incoming.ranking || {})

        },

        preferences: {

            ...defaultProfile.preferences,

            ...(incoming.preferences || {})

        }

    };


    if (

        !Array.isArray(incoming.achievements) ||

        incoming.achievements.length === 0

    ) {

        normalized.achievements = cloneAchievements();

    }

    else {

        normalized.achievements = mergeAchievements(
            cloneAchievements(),
            incoming.achievements
        );

    }


    if (!normalized.id) {

        normalized.id = generateProfileUserId();

    }


    if (!normalized.username) {

        normalized.username = PROFILE_CONFIG.defaultUsername;

    }


    if (!normalized.displayName) {

        normalized.displayName = normalized.username;

    }


    if (!normalized.avatar) {

        normalized.avatar = PROFILE_CONFIG.defaultAvatar;

    }


    if (!Number.isFinite(Number(normalized.level))) {

        normalized.level = PROFILE_CONFIG.defaultLevel;

    }


    if (!Number.isFinite(Number(normalized.xp))) {

        normalized.xp = PROFILE_CONFIG.defaultXP;

    }


    if (!Number.isFinite(Number(normalized.totalXP))) {

        normalized.totalXP = normalized.xp;

    }


    normalized.level = Math.max(
        1,
        Math.floor(Number(normalized.level))
    );


    normalized.xp = Math.max(
        0,
        Number(normalized.xp)
    );


    normalized.totalXP = Math.max(
        0,
        Number(normalized.totalXP)
    );


    normalized.updatedAt = new Date().toISOString();


    return normalized;

}


/* ============================================================
   ادغام افتخارات
============================================================ */

function mergeAchievements(defaults, saved) {

    return defaults.map(function(defaultAchievement) {

        const savedAchievement = saved.find(function(item) {

            return item && item.id === defaultAchievement.id;

        });


        if (!savedAchievement) {

            return defaultAchievement;

        }


        return {

            ...defaultAchievement,

            ...savedAchievement

        };

    });

}


/* ============================================================
   دریافت پروفایل از storage.js
============================================================ */

function loadProfileFromStorage() {

    let savedProfile = null;


    try {

        if (

            window.HokmStorage &&

            typeof window.HokmStorage.get === "function"

        ) {

            savedProfile =
                window.HokmStorage.get(
                    PROFILE_CONFIG.storageKey
                );

        }

    }

    catch (error) {

        console.warn(
            "HokmProfile: خطا در خواندن storage.js",
            error
        );

    }


    if (!savedProfile) {

        try {

            const raw = localStorage.getItem(
                PROFILE_CONFIG.storageKey
            );

            if (raw) {

                savedProfile = JSON.parse(raw);

            }

        }

        catch (error) {

            console.warn(
                "HokmProfile: خطا در localStorage",
                error
            );

        }

    }


    if (!savedProfile) {

        savedProfile = createDefaultProfile();

    }


    profileState = normalizeProfile(savedProfile);

    saveProfileToStorage();


    return profileState;

}


/* ============================================================
   ذخیره پروفایل
============================================================ */

function saveProfileToStorage() {

    if (!profileState) {

        return false;

    }


    profileState.updatedAt =
        new Date().toISOString();


    let saved = false;


    try {

        if (

            window.HokmStorage &&

            typeof window.HokmStorage.set === "function"

        ) {

            window.HokmStorage.set(
                PROFILE_CONFIG.storageKey,
                profileState
            );

            saved = true;

        }

    }

    catch (error) {

        console.warn(
            "HokmProfile: خطا در storage.set",
            error
        );

    }


    try {

        localStorage.setItem(
            PROFILE_CONFIG.storageKey,
            JSON.stringify(profileState)
        );

        saved = true;

    }

    catch (error) {

        console.warn(
            "HokmProfile: خطا در localStorage.setItem",
            error
        );

    }


    dispatchProfileEvent(
        "hokm:profile-saved",
        getProfile()
    );


    return saved;

}


/* ============================================================
   دریافت نسخه امن پروفایل
============================================================ */

function getProfile() {

    if (!profileState) {

        loadProfileFromStorage();

    }


    return JSON.parse(
        JSON.stringify(profileState)
    );

}


/* ============================================================
   دریافت شناسه
============================================================ */

function getUserId() {

    return getProfile().id;

}


/* ============================================================
   دریافت نام کاربری
============================================================ */

function getUsername() {

    const profile = getProfile();

    return profile.displayName ||
        profile.username ||
        PROFILE_CONFIG.defaultUsername;

}


/* ============================================================
   دریافت آواتار
============================================================ */

function getAvatar() {

    return getProfile().avatar ||
        PROFILE_CONFIG.defaultAvatar;

}


/* ============================================================
   نمایش پروفایل در UI
============================================================ */

function renderProfile() {

    if (!profileState) {

        loadProfileFromStorage();

    }


    updateHeaderProfile();

    updateHomeProfile();

    updateProfilePage();

    updateProfileAchievements();

    dispatchProfileEvent(
        "hokm:profile-rendered",
        getProfile()
    );

}


/* ============================================================
   هدر
============================================================ */

function updateHeaderProfile() {

    const username =
        profileGetElement("header-username");

    const level =
        profileGetElement("header-level");

    const avatar =
        profileGetElement("header-avatar");


    if (username) {

        username.textContent =
            getUsername();

    }


    if (level) {

        level.textContent =
            `سطح ${profileState.level}`;

    }


    if (avatar) {

        avatar.textContent =
            getAvatar();

    }

}


/* ============================================================
   صفحه خانه
============================================================ */

function updateHomeProfile() {

    const username =
        profileGetElement("home-username");

    const level =
        profileGetElement("home-level");

    const coins =
        profileGetElement("home-coins");

    const currentXP =
        profileGetElement("current-xp");

    const nextLevelXP =
        profileGetElement("next-level-xp");

    const xpProgress =
        profileGetElement("xp-progress");


    if (username) {

        username.textContent =
            getUsername();

    }


    if (level) {

        level.textContent =
            profileState.level;

    }


    if (coins) {

        coins.textContent =
            formatNumber(profileState.coins);

    }


    const requiredXP =
        getXPForNextLevel(profileState.level);


    if (currentXP) {

        currentXP.textContent =
            formatNumber(profileState.xp);

    }


    if (nextLevelXP) {

        nextLevelXP.textContent =
            formatNumber(requiredXP);

    }


    if (xpProgress) {

        const percentage =
            getLevelProgressPercentage();


        xpProgress.style.width =
            `${percentage}%`;

    }


    updateHomeMission();

}


/* ============================================================
   مأموریت روزانه
============================================================ */

function updateHomeMission() {

    const count =
        profileGetElement("daily-mission-count");

    const progress =
        profileGetElement("daily-mission-progress");


    if (count) {

        const games =
            profileState.stats.games;

        count.textContent =
            `${games > 0 ? 1 : 0}/1`;

    }


    if (progress) {

        const percentage =
            profileState.stats.games > 0
                ? 100
                : 0;


        progress.style.width =
            `${percentage}%`;

    }

}


/* ============================================================
   صفحه پروفایل
============================================================ */

function updateProfilePage() {

    const avatar =
        profileGetElement("profile-avatar");

    const username =
        profileGetElement("profile-username");

    const userId =
        profileGetElement("profile-user-id");

    const level =
        profileGetElement("profile-level");


    const games =
        profileGetElement("stat-games");

    const wins =
        profileGetElement("stat-wins");

    const losses =
        profileGetElement("stat-losses");

    const winRate =
        profileGetElement("stat-win-rate");


    if (avatar) {

        avatar.textContent =
            getAvatar();

    }


    if (username) {

        username.textContent =
            getUsername();

    }


    if (userId) {

        userId.textContent =
            `ID: ${profileState.id}`;

    }


    if (level) {

        level.textContent =
            profileState.level;

    }


    if (games) {

        games.textContent =
            formatNumber(profileState.stats.games);

    }


    if (wins) {

        wins.textContent =
            formatNumber(profileState.stats.wins);

    }


    if (losses) {

        losses.textContent =
            formatNumber(profileState.stats.losses);

    }


    if (winRate) {

        winRate.textContent =
            `${calculateWinRate()}%`;

    }

}


/* ============================================================
   افتخارات
============================================================ */

function updateProfileAchievements() {

    const container =
        profileGetElement("achievement-list");


    if (!container) {

        return;

    }


    container.innerHTML = "";


    if (

        !profileState.achievements ||

        profileState.achievements.length === 0

    ) {

        container.innerHTML = `

            <div class="empty-state">

                <span class="empty-icon">
                    🏆
                </span>

                <p>
                    هنوز افتخاری کسب نکرده‌اید
                </p>

            </div>

        `;


        return;

    }


    profileState.achievements.forEach(function(achievement) {

        const item =
            createAchievementElement(
                achievement
            );


        container.appendChild(item);

    });

}


/* ============================================================
   ساخت کارت افتخار
============================================================ */

function createAchievementElement(achievement) {

    const element =
        document.createElement("div");


    element.className =
        "achievement-item";


    if (achievement.unlocked) {

        element.classList.add(
            "achievement-unlocked"
        );

    }
    else {

        element.classList.add(
            "achievement-locked"
        );

    }


    const progress =
        Math.min(

            Number(achievement.progress || 0),

            Number(achievement.target || 1)

        );


    const target =
        Number(achievement.target || 1);


    const percentage =
        Math.min(

            100,

            Math.round(
                (progress / target) * 100
            )

        );


    element.innerHTML = `

        <div class="achievement-icon">

            ${escapeHTML(achievement.icon)}

        </div>

        <div class="achievement-content">

            <strong>
                ${escapeHTML(achievement.title)}
            </strong>

            <small>
                ${escapeHTML(achievement.description)}
            </small>

            <div class="achievement-progress">

                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        style="width:${percentage}%"
                    ></div>

                </div>

                <span>
                    ${progress}/${target}
                </span>

            </div>

        </div>

        <div class="achievement-status">

            ${
                achievement.unlocked
                    ? "✅"
                    : "🔒"
            }

        </div>

    `;


    return element;

}


/* ============================================================
   محاسبه درصد برد
============================================================ */

function calculateWinRate() {

    if (!profileState) {

        return 0;

    }


    const games =
        Number(profileState.stats.games || 0);


    const wins =
        Number(profileState.stats.wins || 0);


    if (games <= 0) {

        return 0;

    }


    return Math.round(
        (wins / games) * 100
    );

}


/* ============================================================
   XP موردنیاز سطح بعد
============================================================ */

function getXPForNextLevel(level) {

    const safeLevel =
        Math.max(
            1,
            Number(level || 1)
        );


    return Math.floor(

        PROFILE_CONFIG.xpBase *

        Math.pow(

            PROFILE_CONFIG.xpMultiplier,

            safeLevel - 1

        )

    );

}


/* ============================================================
   درصد پیشرفت سطح
============================================================ */

function getLevelProgressPercentage() {

    const required =
        getXPForNextLevel(
            profileState.level
        );


    if (required <= 0) {

        return 0;

    }


    return Math.min(

        100,

        Math.round(

            (
                Number(profileState.xp) /
                required
            ) * 100

        )

    );

}


/* ============================================================
   اضافه کردن XP
============================================================ */

function addXP(amount, reason = "game") {

    const numericAmount =
        Number(amount);


    if (

        !Number.isFinite(numericAmount) ||

        numericAmount <= 0

    ) {

        return {

            success: false,

            gainedXP: 0,

            levelsGained: 0

        };

    }


    const oldLevel =
        profileState.level;


    profileState.xp +=
        numericAmount;


    profileState.totalXP +=
        numericAmount;


    let levelsGained = 0;


    while (

        profileState.xp >=
        getXPForNextLevel(
            profileState.level
        )

    ) {

        const required =
            getXPForNextLevel(
                profileState.level
            );


        profileState.xp -=
            required;


        profileState.level += 1;


        levelsGained += 1;

    }


    saveProfileToStorage();

    renderProfile();


    if (levelsGained > 0) {

        dispatchProfileEvent(
            "hokm:level-up",
            {

                oldLevel,

                newLevel:
                    profileState.level,

                levelsGained,

                reason

            }
        );

    }


    dispatchProfileEvent(
        "hokm:xp-added",
        {

            amount:
                numericAmount,

            reason,

            totalXP:
                profileState.totalXP,

            level:
                profileState.level

        }
    );


    return {

        success: true,

        gainedXP:
            numericAmount,

        levelsGained,

        level:
            profileState.level,

        xp:
            profileState.xp

    };

}


/* ============================================================
   تغییر آواتار
============================================================ */

function setAvatar(avatar) {

    if (!avatar) {

        return false;

    }


    if (
        !DEFAULT_AVATARS.includes(avatar)
    ) {

        console.warn(
            "آواتار انتخاب‌شده معتبر نیست."
        );


        return false;

    }


    profileState.avatar =
        avatar;


    saveProfileToStorage();

    renderProfile();


    dispatchProfileEvent(
        "hokm:avatar-changed",
        {

            avatar

        }
    );


    return true;

}


/* ============================================================
   ساخت انتخابگر آواتار
============================================================ */

function openAvatarSelector() {

    let existing =
        profileGetElement(
            "profile-avatar-selector"
        );


    if (existing) {

        existing.remove();

    }


    const overlay =
        document.createElement("div");


    overlay.id =
        "profile-avatar-selector";


    overlay.className =
        "modal-overlay";


    overlay.innerHTML = `

        <div class="modal avatar-selector-modal">

            <button
                type="button"
                class="modal-close"
                id="profile-avatar-selector-close"
            >
                ×
            </button>

            <div class="modal-icon">
                👤
            </div>

            <h2>
                انتخاب آواتار
            </h2>

            <p>
                آواتار موردنظر خود را انتخاب کنید
            </p>

            <div
                id="profile-avatar-grid"
                class="avatar-grid"
            ></div>

        </div>

    `;


    document.body.appendChild(overlay);


    const grid =
        profileGetElement(
            "profile-avatar-grid"
        );


    DEFAULT_AVATARS.forEach(function(avatar) {

        const button =
            document.createElement("button");


        button.type =
            "button";


        button.className =
            "avatar-choice";


        if (
            avatar === profileState.avatar
        ) {

            button.classList.add(
                "selected"
            );

        }


        button.textContent =
            avatar;


        button.setAttribute(
            "aria-label",
            `آواتار ${avatar}`
        );


        button.addEventListener(
            "click",
            function() {

                setAvatar(avatar);

                overlay.remove();

                showProfileMessage(
                    "آواتار شما تغییر کرد."
                );

            }
        );


        grid.appendChild(button);

    });


    const closeButton =
        profileGetElement(
            "profile-avatar-selector-close"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function() {

                overlay.remove();

            }
        );

    }


    overlay.addEventListener(
        "click",
        function(event) {

            if (
                event.target === overlay
            ) {

                overlay.remove();

            }

        }
    );

}


/* ============================================================
   ویرایش نام نمایشی
============================================================ */

function openEditProfile() {

    let existing =
        profileGetElement(
            "edit-profile-modal"
        );


    if (existing) {

        existing.remove();

    }


    const overlay =
        document.createElement("div");


    overlay.id =
        "edit-profile-modal";


    overlay.className =
        "modal-overlay";


    overlay.innerHTML = `

        <div class="modal">

            <button
                type="button"
                class="modal-close"
                id="edit-profile-close"
                aria-label="بستن"
            >
                ×
            </button>

            <div class="modal-icon">
                ✏️
            </div>

            <h2>
                ویرایش پروفایل
            </h2>

            <p>
                اطلاعات نمایشی خود را تغییر دهید
            </p>

            <div class="form-group">

                <label for="edit-profile-username">
                    نام نمایشی
                </label>

                <input
                    id="edit-profile-username"
                    type="text"
                    maxlength="${PROFILE_CONFIG.maxUsernameLength}"
                    value="${escapeHTML(
                        profileState.displayName
                    )}"
                >

                <span
                    id="edit-profile-username-error"
                    class="form-error"
                ></span>

            </div>

            <div class="form-group">

                <label for="edit-profile-bio">
                    درباره من
                </label>

                <textarea
                    id="edit-profile-bio"
                    maxlength="${PROFILE_CONFIG.maxBioLength}"
                    rows="4"
                    placeholder="درباره خودت بنویس..."
                >${escapeHTML(
                    profileState.bio || ""
                )}</textarea>

            </div>

            <button
                id="save-edit-profile-button"
                type="button"
                class="primary-button full-width"
            >
                ذخیره تغییرات
            </button>

        </div>

    `;


    document.body.appendChild(overlay);


    const closeButton =
        profileGetElement(
            "edit-profile-close"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function() {

                overlay.remove();

            }
        );

    }


    const saveButton =
        profileGetElement(
            "save-edit-profile-button"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            function() {

                const usernameInput =
                    profileGetElement(
                        "edit-profile-username"
                    );


                const bioInput =
                    profileGetElement(
                        "edit-profile-bio"
                    );


                const error =
                    profileGetElement(
                        "edit-profile-username-error"
                    );


                const username =
                    usernameInput.value.trim();


                if (
                    username.length <
                    PROFILE_CONFIG.minUsernameLength
                ) {

                    if (error) {

                        error.textContent =
                            "نام نمایشی باید حداقل ۳ کاراکتر باشد.";

                    }

                    return;

                }


                if (
                    username.length >
                    PROFILE_CONFIG.maxUsernameLength
                ) {

                    if (error) {

                        error.textContent =
                            "نام نمایشی بیش از حد طولانی است.";

                    }

                    return;

                }


                profileState.displayName =
                    username;


                profileState.username =
                    username;


                profileState.bio =
                    String(
                        bioInput.value || ""
                    ).trim();


                saveProfileToStorage();

                renderProfile();


                overlay.remove();


                showProfileMessage(
                    "پروفایل با موفقیت به‌روزرسانی شد."
                );


                dispatchProfileEvent(
                    "hokm:profile-updated",
                    getProfile()
                );

            }
        );

    }

}


/* ============================================================
   ثبت نتیجه بازی
============================================================ */

function recordGameResult(result) {

    if (!result) {

        return false;

    }


    const won =
        Boolean(result.won);


    const lost =
        Boolean(result.lost);


    const draw =
        Boolean(result.draw);


    const abandoned =
        Boolean(result.abandoned);


    profileState.stats.games += 1;


    if (won) {

        profileState.stats.wins += 1;

        profileState.stats.currentWinStreak += 1;


        if (

            profileState.stats.currentWinStreak >

            profileState.stats.bestWinStreak

        ) {

            profileState.stats.bestWinStreak =
                profileState.stats.currentWinStreak;

        }

    }


    if (lost) {

        profileState.stats.losses += 1;

        profileState.stats.currentWinStreak = 0;

    }


    if (draw) {

        profileState.stats.draws += 1;

    }


    if (abandoned) {

        profileState.stats.abandoned += 1;

        profileState.stats.currentWinStreak = 0;

    }


    if (Number.isFinite(
        Number(result.tricksWon)
    )) {

        profileState.stats.tricksWon +=
            Number(result.tricksWon);

    }


    if (Number.isFinite(
        Number(result.tricksLost)
    )) {

        profileState.stats.tricksLost +=
            Number(result.tricksLost);

    }


    if (Number.isFinite(
        Number(result.roundsWon)
    )) {

        profileState.stats.roundsWon +=
            Number(result.roundsWon);

    }


    if (Number.isFinite(
        Number(result.roundsLost)
    )) {

        profileState.stats.roundsLost +=
            Number(result.roundsLost);

    }


    if (result.perfect) {

        profileState.stats.perfectGames += 1;

    }


    if (won) {

        profileState.ranking.wins += 1;

    }


    if (lost) {

        profileState.ranking.losses += 1;

    }


    updateRankingAfterGame(won, lost);


    updateAchievements();


    saveProfileToStorage();

    renderProfile();


    dispatchProfileEvent(
        "hokm:game-result-recorded",
        {

            result,

            profile:
                getProfile()

        }
    );


    return true;

}


/* ============================================================
   بروزرسانی رتبه
============================================================ */

function updateRankingAfterGame(won, lost) {

    const currentRating =
        Number(
            profileState.ranking.rating || 1000
        );


    let newRating =
        currentRating;


    if (won) {

        newRating += 20;

    }


    if (lost) {

        newRating -= 15;

    }


    newRating =
        Math.max(
            0,
            newRating
        );


    profileState.ranking.rating =
        newRating;


    profileState.ranking.league =
        calculateLeague(newRating);

}


/* ============================================================
   تعیین لیگ
============================================================ */

function calculateLeague(rating) {

    const value =
        Number(rating || 0);


    if (value >= 2000) {

        return "Diamond";

    }


    if (value >= 1700) {

        return "Platinum";

    }


    if (value >= 1400) {

        return "Gold";

    }


    if (value >= 1100) {

        return "Silver";

    }


    return "Bronze";

}


/* ============================================================
   بروزرسانی افتخارات
============================================================ */

function updateAchievements() {

    if (!Array.isArray(
        profileState.achievements
    )) {

        profileState.achievements =
            cloneAchievements();

    }


    profileState.achievements.forEach(
        function(achievement) {

            if (achievement.unlocked) {

                return;

            }


            let progress = 0;


            switch (achievement.id) {

                case "first_game":

                    progress =
                        profileState.stats.games;

                    break;


                case "first_win":

                    progress =
                        profileState.stats.wins;

                    break;


                case "five_games":

                    progress =
                        profileState.stats.games;

                    break;


                case "ten_games":

                    progress =
                        profileState.stats.games;

                    break;


                case "twenty_wins":

                    progress =
                        profileState.stats.wins;

                    break;


                case "fifty_games":

                    progress =
                        profileState.stats.games;

                    break;


                case "hundred_games":

                    progress =
                        profileState.stats.games;

                    break;


                default:

                    progress = 0;

            }


            achievement.progress =
                Math.min(
                    progress,
                    achievement.target
                );


            if (
                achievement.progress >=
                achievement.target
            ) {

                unlockAchievement(
                    achievement
                );

            }

        }
    );

}


/* ============================================================
   باز کردن افتخار
============================================================ */

function unlockAchievement(achievement) {

    if (achievement.unlocked) {

        return;

    }


    achievement.unlocked =
        true;


    achievement.progress =
        achievement.target;


    dispatchProfileEvent(
        "hokm:achievement-unlocked",
        {

            achievement:
                JSON.parse(
                    JSON.stringify(
                        achievement
                    )
                )

        }
    );


    /*
        پاداش XP
    */

    if (
        achievement.rewardXP > 0
    ) {

        addXP(
            achievement.rewardXP,
            `achievement:${achievement.id}`
        );

    }


    /*
        پاداش سکه

        اگر wallet.js وجود داشته باشد،
        تلاش می‌کنیم پاداش را از آن عبور دهیم.
    */

    if (
        achievement.rewardCoins > 0
    ) {

        addProfileCoins(
            achievement.rewardCoins,
            `achievement:${achievement.id}`
        );

    }


    showProfileMessage(
        `افتخار جدید: ${achievement.title}`
    );

}


/* ============================================================
   اضافه کردن سکه
============================================================ */

function addProfileCoins(
    amount,
    reason = "profile"
) {

    const numericAmount =
        Number(amount);


    if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
    ) {

        return false;

    }


    /*
        اگر wallet.js در آینده متد استاندارد
        داشته باشد، ابتدا آن را استفاده می‌کنیم.
    */

    try {

        if (

            window.HokmWallet &&

            typeof window.HokmWallet.addCoins ===
                "function"

        ) {

            const result =
                window.HokmWallet.addCoins(
                    numericAmount,
                    reason
                );


            if (result !== false) {

                return true;

            }

        }

    }

    catch (error) {

        console.warn(
            "HokmProfile: wallet error",
            error
        );

    }


    /*
        fallback موقت
    */

    profileState.coins +=
        numericAmount;


    saveProfileToStorage();

    renderProfile();


    dispatchProfileEvent(
        "hokm:coins-added",
        {

            amount:
                numericAmount,

            reason,

            balance:
                profileState.coins

        }
    );


    return true;

}


/* ============================================================
   کم کردن سکه
============================================================ */

function removeProfileCoins(
    amount,
    reason = "profile"
) {

    const numericAmount =
        Number(amount);


    if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
    ) {

        return false;

    }


    if (
        profileState.coins <
        numericAmount
    ) {

        return false;

    }


    profileState.coins -=
        numericAmount;


    saveProfileToStorage();

    renderProfile();


    dispatchProfileEvent(
        "hokm:coins-removed",
        {

            amount:
                numericAmount,

            reason,

            balance:
                profileState.coins

        }
    );


    return true;

}


/* ============================================================
   تغییر نام کاربری
============================================================ */

function setUsername(username) {

    if (
        typeof username !==
        "string"
    ) {

        return {

            success: false,

            message:
                "نام کاربری نامعتبر است."

        };

    }


    const value =
        username.trim();


    if (
        value.length <
        PROFILE_CONFIG.minUsernameLength
    ) {

        return {

            success: false,

            message:
                "نام کاربری باید حداقل ۳ کاراکتر باشد."

        };

    }


    if (
        value.length >
        PROFILE_CONFIG.maxUsernameLength
    ) {

        return {

            success: false,

            message:
                "نام کاربری بیش از حد طولانی است."

        };

    }


    profileState.username =
        value;


    profileState.displayName =
        value;


    saveProfileToStorage();

    renderProfile();


    dispatchProfileEvent(
        "hokm:username-changed",
        {

            username:
                value

        }
    );


    return {

        success: true,

        message:
            "نام کاربری تغییر کرد."

    };

}


/* ============================================================
   تنظیم Bio
============================================================ */

function setBio(bio) {

    if (
        typeof bio !==
        "string"
    ) {

        return false;

    }


    const value =
        bio.trim();


    if (
        value.length >
        PROFILE_CONFIG.maxBioLength
    ) {

        return false;

    }


    profileState.bio =
        value;


    saveProfileToStorage();

    renderProfile();


    return true;

}


/* ============================================================
   آمار
============================================================ */

function getStats() {

    return {

        ...profileState.stats,

        winRate:
            calculateWinRate(),

        rankingRating:
            profileState.ranking.rating,

        league:
            profileState.ranking.league

    };

}


/* ============================================================
   رتبه‌بندی
============================================================ */

function getRanking() {

    return {

        ...profileState.ranking

    };

}


/* ============================================================
   XP
============================================================ */

function getXPData() {

    return {

        level:
            profileState.level,

        currentXP:
            profileState.xp,

        totalXP:
            profileState.totalXP,

        requiredXP:
            getXPForNextLevel(
                profileState.level
            ),

        progress:
            getLevelProgressPercentage()

    };

}


/* ============================================================
   ریست آمار
   برای توسعه و تست
============================================================ */

function resetProfileStats() {

    profileState.stats = {

        games: 0,

        wins: 0,

        losses: 0,

        draws: 0,

        abandoned: 0,

        tricksWon: 0,

        tricksLost: 0,

        roundsWon: 0,

        roundsLost: 0,

        perfectGames: 0,

        currentWinStreak: 0,

        bestWinStreak: 0

    };


    profileState.ranking = {

        rating: 1000,

        rank: 0,

        league: "Bronze",

        wins: 0,

        losses: 0

    };


    profileState.level =
        1;


    profileState.xp =
        0;


    profileState.totalXP =
        0;


    profileState.achievements =
        cloneAchievements();


    saveProfileToStorage();

    renderProfile();


    return true;

}


/* ============================================================
   ریست کامل پروفایل
============================================================ */

function resetEntireProfile() {

    profileState =
        createDefaultProfile();


    saveProfileToStorage();

    renderProfile();


    dispatchProfileEvent(
        "hokm:profile-reset",
        getProfile()
    );


    return true;

}


/* ============================================================
   نمایش پیام
============================================================ */

function showProfileMessage(message) {

    if (!message) {

        return;

    }


    /*
        اگر app.js تابع Toast داشته باشد
    */

    try {

        if (

            window.HokmUI &&

            typeof window.HokmUI.showToast ===
                "function"

        ) {

            window.HokmUI.showToast(
                message
            );


            return;

        }

    }

    catch (error) {

        console.warn(
            error
        );

    }


    /*
        fallback به toast موجود در index.html
    */

    const container =
        profileGetElement(
            "toast-container"
        );


    if (!container) {

        return;

    }


    const toast =
        document.createElement("div");


    toast.className =
        "toast";


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    setTimeout(
        function() {

            toast.classList.add(
                "toast-hide"
            );


            setTimeout(
                function() {

                    toast.remove();

                },
                300
            );

        },
        3000
    );

}


/* ============================================================
   رویداد سفارشی
============================================================ */

function dispatchProfileEvent(
    eventName,
    detail
) {

    try {

        window.dispatchEvent(

            new CustomEvent(
                eventName,
                {

                    detail

                }
            )

        );

    }

    catch (error) {

        console.warn(
            "Profile event error:",
            error
        );

    }

}


/* ============================================================
   Escape HTML
============================================================ */

function escapeHTML(value) {

    return String(value ?? "")
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
   فرمت عدد
============================================================ */

function formatNumber(value) {

    const number =
        Number(value || 0);


    if (!Number.isFinite(number)) {

        return "0";

    }


    try {

        return number.toLocaleString(
            "fa-IR"
        );

    }

    catch (error) {

        return String(number);

    }

}


/* ============================================================
   اتصال Event Listenerها
============================================================ */

function initializeProfileEvents() {

    /*
        تغییر آواتار
    */

    const changeAvatarButton =
        profileGetElement(
            "change-avatar-button"
        );


    if (changeAvatarButton) {

        changeAvatarButton.addEventListener(
            "click",
            function() {

                openAvatarSelector();

            }
        );

    }


    /*
        دکمه تنظیمات پروفایل
    */

    const profileSettingsButton =
        profileGetElement(
            "profile-settings-button"
        );


    if (profileSettingsButton) {

        profileSettingsButton.addEventListener(
            "click",
            function() {

                openEditProfile();

            }
        );

    }


    /*
        کلیک روی آواتار
    */

    const profileAvatar =
        profileGetElement(
            "profile-avatar"
        );


    if (profileAvatar) {

        profileAvatar.style.cursor =
            "pointer";


        profileAvatar.addEventListener(
            "click",
            function() {

                openAvatarSelector();

            }
        );

    }


    /*
        کلیک روی پروفایل هدر
    */

    const headerProfileButton =
        profileGetElement(
            "profile-header-button"
        );


    if (headerProfileButton) {

        headerProfileButton.addEventListener(
            "click",
            function() {

                navigateToProfile();

            }
        );

    }


    /*
        واکنش به تغییر سکه
    */

    window.addEventListener(
        "hokm:wallet-updated",
        function(event) {

            if (
                event.detail &&
                Number.isFinite(
                    Number(event.detail.balance)
                )
            ) {

                profileState.coins =
                    Number(
                        event.detail.balance
                    );


                saveProfileToStorage();

                renderProfile();

            }

        }
    );


    /*
        واکنش به نتیجه بازی
    */

    window.addEventListener(
        "hokm:game-finished",
        function(event) {

            if (
                event.detail
            ) {

                recordGameResult(
                    event.detail
                );

            }

        }
    );

}


/* ============================================================
   رفتن به صفحه پروفایل
============================================================ */

function navigateToProfile() {

    /*
        اگر app.js سیستم navigation داشته باشد
    */

    try {

        if (

            window.HokmApp &&

            typeof window.HokmApp.navigateTo ===
                "function"

        ) {

            window.HokmApp.navigateTo(
                "profile"
            );


            return;

        }

    }

    catch (error) {

        console.warn(
            error
        );

    }


    /*
        fallback
    */

    const pages =
        profileQueryAll(
            ".page"
        );


    pages.forEach(
        function(page) {

            page.classList.add(
                "hidden"
            );

            page.classList.remove(
                "active-page"
            );

        }
    );


    const profilePage =
        profileGetElement(
            "profile-page"
        );


    if (profilePage) {

        profilePage.classList.remove(
            "hidden"
        );

        profilePage.classList.add(
            "active-page"
        );

    }


    const navItems =
        profileQueryAll(
            ".nav-item"
        );


    navItems.forEach(
        function(item) {

            item.classList.remove(
                "active"
            );


            if (
                item.dataset.pageTarget ===
                "profile"
            ) {

                item.classList.add(
                    "active"
                );

            }

        }
    );

}


/* ============================================================
   هماهنگی با Auth
============================================================ */

function syncWithAuth() {

    try {

        if (

            window.HokmAuth &&

            typeof window.HokmAuth.getCurrentUser ===
                "function"

        ) {

            const user =
                window.HokmAuth.getCurrentUser();


            if (user) {

                if (
                    user.id &&
                    !profileState.id
                ) {

                    profileState.id =
                        user.id;

                }


                if (
                    user.username &&
                    (
                        !profileState.username ||
                        profileState.username ===
                        PROFILE_CONFIG.defaultUsername
                    )
                ) {

                    profileState.username =
                        user.username;


                    profileState.displayName =
                        user.username;

                }


                saveProfileToStorage();

            }

        }

    }

    catch (error) {

        console.warn(
            "HokmProfile: auth sync error",
            error
        );

    }

}


/* ============================================================
   Initialize
============================================================ */

function initializeProfile() {

    if (profileInitialized) {

        renderProfile();

        return getProfile();

    }


    loadProfileFromStorage();

    syncWithAuth();

    initializeProfileEvents();

    renderProfile();


    profileInitialized =
        true;


    dispatchProfileEvent(
        "hokm:profile-ready",
        getProfile()
    );


    return getProfile();

}


/* ============================================================
   API عمومی HokmProfile
============================================================ */

window.HokmProfile = {

    initialize:
        initializeProfile,

    init:
        initializeProfile,

    get:
        getProfile,

    getProfile:
        getProfile,

    getUserId:
        getUserId,

    getUsername:
        getUsername,

    getAvatar:
        getAvatar,

    getStats:
        getStats,

    getRanking:
        getRanking,

    getXPData:
        getXPData,

    render:
        renderProfile,

    save:
        saveProfileToStorage,

    setAvatar:
        setAvatar,

    setUsername:
        setUsername,

    setBio:
        setBio,

    addXP:
        addXP,

    addCoins:
        addProfileCoins,

    removeCoins:
        removeProfileCoins,

    recordGameResult:
        recordGameResult,

    calculateWinRate:
        calculateWinRate,

    getXPForNextLevel:
        getXPForNextLevel,

    getLevelProgress:
        getLevelProgressPercentage,

    getAchievements:
        function() {

            return JSON.parse(
                JSON.stringify(
                    profileState.achievements
                )
            );

        },

    openAvatarSelector:
        openAvatarSelector,

    openEditProfile:
        openEditProfile,

    resetStats:
        resetProfileStats,

    reset:
        resetEntireProfile

};


/* ============================================================
   شروع خودکار
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeProfile
    );

}
else {

    initializeProfile();

}


/* ============================================================
   پایان profile.js
============================================================ */
