/* ============================================================
   HOKM ONLINE
   NOTIFICATIONS SYSTEM
   File: notifications.js
   Stage: 15

   سیستم کامل اعلان‌های بازی حکم

   امکانات:
   - ساخت اعلان
   - اعلان‌های بازی
   - اعلان برد و باخت
   - اعلان پاداش
   - اعلان سکه
   - اعلان دعوت
   - اعلان درخواست دوستی
   - اعلان قبول درخواست دوستی
   - اعلان سیستم
   - اعلان‌های خوانده‌شده / خوانده‌نشده
   - شمارنده اعلان‌های خوانده‌نشده
   - حذف اعلان
   - حذف همه اعلان‌ها
   - خواندن همه اعلان‌ها
   - ذخیره در localStorage
   - بازیابی اعلان‌ها
   - مرتب‌سازی بر اساس زمان
   - جلوگیری از ایجاد داده خراب
   - محدود کردن تعداد اعلان‌های ذخیره‌شده
   - نمایش اعلان در صفحه
   - Toast برای اعلان جدید
   - پشتیبانی از RTL
   - Event Bus داخلی
   - API عمومی برای سایر فایل‌ها
   - سازگاری با app.js / ui.js / profile.js /
     wallet.js / friends.js / multiplayer.js / chat.js
   ============================================================ */

(function (window, document) {

    "use strict";


    /* =========================================================
       1. CONFIGURATION
    ========================================================== */

    const CONFIG = {

        STORAGE_KEY: "hokm_notifications",

        MAX_NOTIFICATIONS: 200,

        DEFAULT_LIMIT: 50,

        TOAST_DURATION: 4500,

        DATE_LOCALE: "fa-IR",

        AUTO_SAVE: true,

        SHOW_TOAST_FOR_NEW_NOTIFICATION: true,

        TYPES: {

            SYSTEM: "system",

            GAME: "game",

            GAME_START: "game_start",

            GAME_WIN: "game_win",

            GAME_LOSS: "game_loss",

            GAME_DRAW: "game_draw",

            FRIEND_REQUEST: "friend_request",

            FRIEND_ACCEPTED: "friend_accepted",

            FRIEND_REMOVED: "friend_removed",

            FRIEND_ONLINE: "friend_online",

            INVITATION: "invitation",

            REWARD: "reward",

            COIN: "coin",

            XP: "xp",

            SHOP: "shop",

            MISSION: "mission",

            ACHIEVEMENT: "achievement",

            LEVEL_UP: "level_up",

            CHAT: "chat",

            SECURITY: "security",

            UPDATE: "update"

        }

    };


    /* =========================================================
       2. INTERNAL STATE
    ========================================================== */

    const state = {

        initialized: false,

        notifications: [],

        unreadCount: 0,

        currentFilter: "all",

        currentPage: 1,

        pageSize: CONFIG.DEFAULT_LIMIT,

        listeners: [],

        toastQueue: [],

        toastVisible: false

    };


    /* =========================================================
       3. DOM HELPERS
    ========================================================== */

    function getElement(id) {

        if (!id) {
            return null;
        }

        return document.getElementById(id);
    }


    function query(selector, parent) {

        const root = parent || document;

        try {
            return root.querySelector(selector);
        } catch (error) {
            return null;
        }
    }


    function queryAll(selector, parent) {

        const root = parent || document;

        try {
            return Array.from(root.querySelectorAll(selector));
        } catch (error) {
            return [];
        }
    }


    /* =========================================================
       4. SAFE ID GENERATOR
    ========================================================== */

    function generateId() {

        const timestamp = Date.now();

        const randomPart = Math.random()
            .toString(36)
            .substring(2, 10);

        return "notif_" + timestamp + "_" + randomPart;
    }


    /* =========================================================
       5. DATE HELPERS
    ========================================================== */

    function now() {

        return Date.now();

    }


    function normalizeTimestamp(value) {

        if (value instanceof Date) {

            const timestamp = value.getTime();

            if (!Number.isNaN(timestamp)) {
                return timestamp;
            }

        }


        if (typeof value === "number") {

            if (Number.isFinite(value)) {
                return value;
            }

        }


        if (typeof value === "string") {

            const parsed = Date.parse(value);

            if (!Number.isNaN(parsed)) {
                return parsed;
            }

        }


        return now();

    }


    function formatDate(timestamp) {

        const date = new Date(
            normalizeTimestamp(timestamp)
        );


        if (Number.isNaN(date.getTime())) {

            return "همین الان";

        }


        try {

            return new Intl.DateTimeFormat(
                CONFIG.DATE_LOCALE,
                {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ).format(date);

        } catch (error) {

            return date.toLocaleString();

        }

    }


    function formatRelativeTime(timestamp) {

        const time = normalizeTimestamp(timestamp);

        const difference = now() - time;

        const second = 1000;
        const minute = second * 60;
        const hour = minute * 60;
        const day = hour * 24;
        const week = day * 7;

        if (difference < minute) {

            return "همین الان";

        }


        if (difference < hour) {

            const minutes = Math.floor(
                difference / minute
            );

            return `${minutes} دقیقه پیش`;

        }


        if (difference < day) {

            const hours = Math.floor(
                difference / hour
            );

            return `${hours} ساعت پیش`;

        }


        if (difference < week) {

            const days = Math.floor(
                difference / day
            );

            return `${days} روز پیش`;

        }


        return formatDate(time);

    }


    /* =========================================================
       6. STRING HELPERS
    ========================================================== */

    function safeString(value, fallback) {

        if (
            typeof value === "string" &&
            value.trim().length > 0
        ) {

            return value.trim();

        }

        return fallback || "";

    }


    function escapeHTML(value) {

        const text = safeString(value, "");

        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =========================================================
       7. TYPE INFORMATION
    ========================================================== */

    function getTypeInfo(type) {

        const map = {

            system: {
                icon: "🔔",
                title: "سیستم",
                className: "notification-system"
            },

            game: {
                icon: "🃏",
                title: "بازی",
                className: "notification-game"
            },

            game_start: {
                icon: "🎮",
                title: "شروع بازی",
                className: "notification-game-start"
            },

            game_win: {
                icon: "🏆",
                title: "پیروزی",
                className: "notification-game-win"
            },

            game_loss: {
                icon: "😔",
                title: "نتیجه بازی",
                className: "notification-game-loss"
            },

            game_draw: {
                icon: "⚖️",
                title: "مساوی",
                className: "notification-game-draw"
            },

            friend_request: {
                icon: "👥",
                title: "درخواست دوستی",
                className: "notification-friend-request"
            },

            friend_accepted: {
                icon: "🤝",
                title: "دوستی",
                className: "notification-friend-accepted"
            },

            friend_removed: {
                icon: "👋",
                title: "دوستی",
                className: "notification-friend-removed"
            },

            friend_online: {
                icon: "🟢",
                title: "دوست آنلاین شد",
                className: "notification-friend-online"
            },

            invitation: {
                icon: "📨",
                title: "دعوت",
                className: "notification-invitation"
            },

            reward: {
                icon: "🎁",
                title: "پاداش",
                className: "notification-reward"
            },

            coin: {
                icon: "🪙",
                title: "سکه",
                className: "notification-coin"
            },

            xp: {
                icon: "⭐",
                title: "امتیاز تجربه",
                className: "notification-xp"
            },

            shop: {
                icon: "🛒",
                title: "فروشگاه",
                className: "notification-shop"
            },

            mission: {
                icon: "🎯",
                title: "مأموریت",
                className: "notification-mission"
            },

            achievement: {
                icon: "🏅",
                title: "افتخار",
                className: "notification-achievement"
            },

            level_up: {
                icon: "⬆️",
                title: "ارتقای سطح",
                className: "notification-level-up"
            },

            chat: {
                icon: "💬",
                title: "پیام",
                className: "notification-chat"
            },

            security: {
                icon: "🔐",
                title: "امنیت",
                className: "notification-security"
            },

            update: {
                icon: "✨",
                title: "به‌روزرسانی",
                className: "notification-update"
            }

        };


        return map[type] || map.system;

    }


    /* =========================================================
       8. LOCAL STORAGE
    ========================================================== */

    function loadFromStorage() {

        try {

            const raw = localStorage.getItem(
                CONFIG.STORAGE_KEY
            );


            if (!raw) {

                state.notifications = [];

                return [];

            }


            const parsed = JSON.parse(raw);


            if (!Array.isArray(parsed)) {

                state.notifications = [];

                return [];

            }


            const valid = parsed
                .filter(isValidNotification)
                .map(normalizeNotification);


            state.notifications = valid;

            calculateUnreadCount();

            return valid;

        } catch (error) {

            console.error(
                "[Notifications] Failed to load storage:",
                error
            );

            state.notifications = [];

            state.unreadCount = 0;

            return [];

        }

    }


    function saveToStorage() {

        if (!CONFIG.AUTO_SAVE) {
            return false;
        }


        try {

            const data = JSON.stringify(
                state.notifications
            );


            localStorage.setItem(
                CONFIG.STORAGE_KEY,
                data
            );


            return true;

        } catch (error) {

            console.error(
                "[Notifications] Failed to save:",
                error
            );

            return false;

        }

    }


    /* =========================================================
       9. VALIDATION
    ========================================================== */

    function isValidNotification(notification) {

        if (
            !notification ||
            typeof notification !== "object"
        ) {

            return false;

        }


        if (
            typeof notification.id !== "string" ||
            notification.id.length === 0
        ) {

            return false;

        }


        if (
            typeof notification.title !== "string"
        ) {

            return false;

        }


        if (
            typeof notification.message !== "string"
        ) {

            return false;

        }


        return true;

    }


    function normalizeNotification(notification) {

        const type =
            safeString(
                notification.type,
                CONFIG.TYPES.SYSTEM
            );


        const typeInfo = getTypeInfo(type);


        return {

            id: safeString(
                notification.id,
                generateId()
            ),

            type: type,

            title: safeString(
                notification.title,
                typeInfo.title
            ),

            message: safeString(
                notification.message,
                ""
            ),

            icon: safeString(
                notification.icon,
                typeInfo.icon
            ),

            className: safeString(
                notification.className,
                typeInfo.className
            ),

            createdAt:
                normalizeTimestamp(
                    notification.createdAt
                ),

            read:
                Boolean(notification.read),

            important:
                Boolean(notification.important),

            action:
                notification.action &&
                typeof notification.action === "object"
                    ? notification.action
                    : null,

            data:
                notification.data &&
                typeof notification.data === "object"
                    ? notification.data
                    : {},

            sender:
                notification.sender &&
                typeof notification.sender === "object"
                    ? notification.sender
                    : null

        };

    }


    /* =========================================================
       10. UNREAD COUNT
    ========================================================== */

    function calculateUnreadCount() {

        state.unreadCount =
            state.notifications.filter(
                notification =>
                    notification.read === false
            ).length;


        updateUnreadBadge();

        return state.unreadCount;

    }


    function getUnreadCount() {

        return state.unreadCount;

    }


    /* =========================================================
       11. EVENT SYSTEM
    ========================================================== */

    function emit(eventName, payload) {

        state.listeners.forEach(
            listener => {

                try {

                    if (
                        listener &&
                        listener.event === eventName &&
                        typeof listener.callback === "function"
                    ) {

                        listener.callback(payload);

                    }

                } catch (error) {

                    console.error(
                        "[Notifications] Listener error:",
                        error
                    );

                }

            }
        );


        try {

            document.dispatchEvent(
                new CustomEvent(
                    "hokm:notification:" + eventName,
                    {
                        detail: payload
                    }
                )
            );

        } catch (error) {
            // Older browsers may not support CustomEvent.
        }

    }


    function on(eventName, callback) {

        if (
            typeof eventName !== "string" ||
            typeof callback !== "function"
        ) {

            return function () {};

        }


        const listener = {
            event: eventName,
            callback: callback
        };


        state.listeners.push(listener);


        return function unsubscribe() {

            const index =
                state.listeners.indexOf(listener);


            if (index !== -1) {

                state.listeners.splice(
                    index,
                    1
                );

            }

        };

    }


    /* =========================================================
       12. CREATE NOTIFICATION
    ========================================================== */

    function createNotification(options) {

        const settings =
            options &&
            typeof options === "object"
                ? options
                : {};


        const type =
            safeString(
                settings.type,
                CONFIG.TYPES.SYSTEM
            );


        const typeInfo =
            getTypeInfo(type);


        const notification = normalizeNotification({

            id:
                safeString(
                    settings.id,
                    generateId()
                ),

            type: type,

            title:
                safeString(
                    settings.title,
                    typeInfo.title
                ),

            message:
                safeString(
                    settings.message,
                    ""
                ),

            icon:
                safeString(
                    settings.icon,
                    typeInfo.icon
                ),

            className:
                safeString(
                    settings.className,
                    typeInfo.className
                ),

            createdAt:
                settings.createdAt || now(),

            read:
                Boolean(settings.read),

            important:
                Boolean(settings.important),

            action:
                settings.action || null,

            data:
                settings.data || {},

            sender:
                settings.sender || null

        });


        const duplicate =
            state.notifications.find(
                item =>
                    item.id === notification.id
            );


        if (duplicate) {

            return duplicate;

        }


        state.notifications.unshift(
            notification
        );


        if (
            state.notifications.length >
            CONFIG.MAX_NOTIFICATIONS
        ) {

            state.notifications =
                state.notifications.slice(
                    0,
                    CONFIG.MAX_NOTIFICATIONS
                );

        }


        calculateUnreadCount();

        saveToStorage();

        emit(
            "created",
            notification
        );


        if (
            CONFIG.SHOW_TOAST_FOR_NEW_NOTIFICATION &&
            !notification.read
        ) {

            showToast(notification);

        }


        render();

        return notification;

    }


    /* =========================================================
       13. QUICK NOTIFICATION METHODS
    ========================================================== */

    function notifySystem(title, message, options) {

        return createNotification({

            ...(options || {}),

            type: CONFIG.TYPES.SYSTEM,

            title: title,

            message: message

        });

    }


    function notifyGameStart(roomId, players) {

        return createNotification({

            type: CONFIG.TYPES.GAME_START,

            title: "بازی شروع شد",

            message:
                "بازی حکم شما آماده شروع است.",

            data: {

                roomId:
                    roomId || null,

                players:
                    Array.isArray(players)
                        ? players
                        : []

            },

            important: true

        });

    }


    function notifyGameWin(score, reward) {

        return createNotification({

            type: CONFIG.TYPES.GAME_WIN,

            title: "پیروز شدید! 🏆",

            message:
                "تبریک! تیم شما برنده بازی شد.",

            data: {

                score:
                    score || null,

                reward:
                    reward || null

            },

            important: true

        });

    }


    function notifyGameLoss(score) {

        return createNotification({

            type: CONFIG.TYPES.GAME_LOSS,

            title: "نتیجه بازی",

            message:
                "این بار بازی را واگذار کردید. بازی بعدی منتظر شماست.",

            data: {

                score:
                    score || null

            }

        });

    }


    function notifyGameDraw(score) {

        return createNotification({

            type: CONFIG.TYPES.GAME_DRAW,

            title: "بازی مساوی شد",

            message:
                "بازی بدون برنده به پایان رسید.",

            data: {

                score:
                    score || null

            }

        });

    }


    function notifyFriendRequest(user) {

        const username =
            user && user.username
                ? user.username
                : "یک بازیکن";


        return createNotification({

            type: CONFIG.TYPES.FRIEND_REQUEST,

            title: "درخواست دوستی",

            message:
                `${username} برای شما درخواست دوستی فرستاد.`,

            sender: user || null,

            data: {

                userId:
                    user && user.id
                        ? user.id
                        : null

            },

            action: {

                type: "friend_request",

                userId:
                    user && user.id
                        ? user.id
                        : null

            },

            important: true

        });

    }


    function notifyFriendAccepted(user) {

        const username =
            user && user.username
                ? user.username
                : "بازیکن";


        return createNotification({

            type: CONFIG.TYPES.FRIEND_ACCEPTED,

            title: "درخواست دوستی پذیرفته شد",

            message:
                `${username} درخواست دوستی شما را پذیرفت.`,

            sender: user || null

        });

    }


    function notifyInvitation(room) {

        const roomName =
            room && room.name
                ? room.name
                : "اتاق بازی";


        const inviter =
            room && room.inviter
                ? room.inviter
                : "یک بازیکن";


        return createNotification({

            type: CONFIG.TYPES.INVITATION,

            title: "دعوت به بازی",

            message:
                `${inviter} شما را به ${roomName} دعوت کرده است.`,

            data: {

                roomId:
                    room && room.id
                        ? room.id
                        : null,

                roomName:
                    roomName

            },

            action: {

                type: "join_room",

                roomId:
                    room && room.id
                        ? room.id
                        : null

            },

            important: true

        });

    }


    function notifyReward(title, message, reward) {

        return createNotification({

            type: CONFIG.TYPES.REWARD,

            title:
                title || "پاداش جدید",

            message:
                message || "یک پاداش دریافت کردید.",

            data: {

                reward:
                    reward || null

            }

        });

    }


    function notifyCoins(amount, reason) {

        const sign =
            Number(amount) >= 0
                ? "+"
                : "";


        return createNotification({

            type: CONFIG.TYPES.COIN,

            title: "تغییر موجودی سکه",

            message:
                `${sign}${amount} سکه ${reason || ""}`.trim(),

            data: {

                amount:
                    Number(amount) || 0,

                reason:
                    reason || ""

            }

        });

    }


    function notifyXP(amount, reason) {

        return createNotification({

            type: CONFIG.TYPES.XP,

            title: "امتیاز تجربه دریافت شد",

            message:
                `+${Number(amount) || 0} XP ${reason || ""}`.trim(),

            data: {

                amount:
                    Number(amount) || 0,

                reason:
                    reason || ""

            }

        });

    }


    function notifyMission(title, message, mission) {

        return createNotification({

            type: CONFIG.TYPES.MISSION,

            title:
                title || "مأموریت",

            message:
                message || "وضعیت مأموریت شما تغییر کرد.",

            data: {

                mission:
                    mission || null

            }

        });

    }


    function notifyAchievement(title, message, achievement) {

        return createNotification({

            type: CONFIG.TYPES.ACHIEVEMENT,

            title:
                title || "افتخار جدید 🏅",

            message:
                message || "یک افتخار جدید به دست آوردید.",

            data: {

                achievement:
                    achievement || null

            },

            important: true

        });

    }


    function notifyLevelUp(level) {

        return createNotification({

            type: CONFIG.TYPES.LEVEL_UP,

            title: "سطح شما افزایش یافت! 🎉",

            message:
                `تبریک! شما به سطح ${level} رسیدید.`,

            data: {

                level:
                    Number(level) || 1

            },

            important: true

        });

    }


    function notifyChat(sender, message) {

        const username =
            sender && sender.username
                ? sender.username
                : "بازیکن";


        return createNotification({

            type: CONFIG.TYPES.CHAT,

            title:
                `پیام از ${username}`,

            message:
                safeString(
                    message,
                    "پیام جدید"
                ),

            sender:
                sender || null

        });

    }


    function notifyUpdate(title, message) {

        return createNotification({

            type: CONFIG.TYPES.UPDATE,

            title:
                title || "به‌روزرسانی جدید",

            message:
                message || "امکانات جدیدی به بازی اضافه شده است.",

            important: true

        });

    }


    /* =========================================================
       14. FIND NOTIFICATION
    ========================================================== */

    function getNotification(id) {

        if (!id) {
            return null;
        }


        return (
            state.notifications.find(
                notification =>
                    notification.id === id
            ) || null
        );

    }


    /* =========================================================
       15. MARK AS READ
    ========================================================== */

    function markAsRead(id) {

        const notification =
            getNotification(id);


        if (!notification) {
            return false;
        }


        if (!notification.read) {

            notification.read = true;

            calculateUnreadCount();

            saveToStorage();

            emit(
                "read",
                notification
            );

            render();

        }


        return true;

    }


    /* =========================================================
       16. MARK AS UNREAD
    ========================================================== */

    function markAsUnread(id) {

        const notification =
            getNotification(id);


        if (!notification) {
            return false;
        }


        if (notification.read) {

            notification.read = false;

            calculateUnreadCount();

            saveToStorage();

            emit(
                "unread",
                notification
            );

            render();

        }


        return true;

    }


    /* =========================================================
       17. MARK ALL AS READ
    ========================================================== */

    function markAllAsRead() {

        let changed = false;


        state.notifications.forEach(
            notification => {

                if (!notification.read) {

                    notification.read = true;

                    changed = true;

                }

            }
        );


        if (changed) {

            calculateUnreadCount();

            saveToStorage();

            emit(
                "all_read",
                {
                    count:
                        state.notifications.length
                }
            );

            render();

        }


        return changed;

    }


    /* =========================================================
       18. DELETE NOTIFICATION
    ========================================================== */

    function deleteNotification(id) {

        const index =
            state.notifications.findIndex(
                notification =>
                    notification.id === id
            );


        if (index === -1) {
            return false;
        }


        const removed =
            state.notifications.splice(
                index,
                1
            )[0];


        calculateUnreadCount();

        saveToStorage();

        emit(
            "deleted",
            removed
        );

        render();

        return true;

    }


    /* =========================================================
       19. DELETE ALL
    ========================================================== */

    function deleteAll() {

        const count =
            state.notifications.length;


        state.notifications = [];

        state.unreadCount = 0;


        saveToStorage();

        updateUnreadBadge();

        emit(
            "all_deleted",
            {
                count: count
            }
        );


        render();

        return count;

    }


    /* =========================================================
       20. GET NOTIFICATIONS
    ========================================================== */

    function getAll(options) {

        const settings =
            options &&
            typeof options === "object"
                ? options
                : {};


        let list =
            state.notifications.slice();


        if (settings.unreadOnly) {

            list =
                list.filter(
                    notification =>
                        !notification.read
                );

        }


        if (settings.type) {

            list =
                list.filter(
                    notification =>
                        notification.type ===
                        settings.type
                );

        }


        if (settings.filter) {

            list =
                applyFilter(
                    list,
                    settings.filter
                );

        }


        list.sort(
            (a, b) =>
                b.createdAt -
                a.createdAt
        );


        if (
            Number.isFinite(
                settings.limit
            ) &&
            settings.limit > 0
        ) {

            list =
                list.slice(
                    0,
                    settings.limit
                );

        }


        return list;

    }


    /* =========================================================
       21. FILTERS
    ========================================================== */

    function applyFilter(list, filter) {

        switch (filter) {

            case "unread":

                return list.filter(
                    notification =>
                        !notification.read
                );


            case "game":

                return list.filter(
                    notification =>
                        notification.type ===
                            CONFIG.TYPES.GAME ||
                        notification.type ===
                            CONFIG.TYPES.GAME_START ||
                        notification.type ===
                            CONFIG.TYPES.GAME_WIN ||
                        notification.type ===
                            CONFIG.TYPES.GAME_LOSS ||
                        notification.type ===
                            CONFIG.TYPES.GAME_DRAW
                );


            case "friends":

                return list.filter(
                    notification =>
                        notification.type ===
                            CONFIG.TYPES.FRIEND_REQUEST ||
                        notification.type ===
                            CONFIG.TYPES.FRIEND_ACCEPTED ||
                        notification.type ===
                            CONFIG.TYPES.FRIEND_REMOVED ||
                        notification.type ===
                            CONFIG.TYPES.FRIEND_ONLINE ||
                        notification.type ===
                            CONFIG.TYPES.INVITATION
                );


            case "rewards":

                return list.filter(
                    notification =>
                        notification.type ===
                            CONFIG.TYPES.REWARD ||
                        notification.type ===
                            CONFIG.TYPES.COIN ||
                        notification.type ===
                            CONFIG.TYPES.XP ||
                        notification.type ===
                            CONFIG.TYPES.ACHIEVEMENT ||
                        notification.type ===
                            CONFIG.TYPES.LEVEL_UP
                );


            default:

                return list;

        }

    }


    /* =========================================================
       22. BADGE UPDATE
    ========================================================== */

    function updateUnreadBadge() {

        const badge =
            getElement(
                "notification-badge"
            );


        const count =
            state.unreadCount;


        if (!badge) {
            return;
        }


        if (count <= 0) {

            badge.classList.add(
                "hidden"
            );

            badge.textContent = "0";

            return;

        }


        badge.classList.remove(
            "hidden"
        );


        badge.textContent =
            count > 99
                ? "99+"
                : String(count);

    }


    /* =========================================================
       23. EMPTY STATE
    ========================================================== */

    function createEmptyState() {

        const container =
            document.createElement("div");


        container.className =
            "empty-state notifications-empty-state";


        container.innerHTML = `

            <span class="empty-icon">
                🔔
            </span>

            <p>
                اعلان جدیدی ندارید
            </p>

            <small>
                وقتی اتفاق مهمی در بازی رخ دهد، اینجا نمایش داده می‌شود.
            </small>

        `;


        return container;

    }


    /* =========================================================
       24. NOTIFICATION HTML
    ========================================================== */

    function createNotificationElement(
        notification
    ) {

        const element =
            document.createElement("article");


        const readClass =
            notification.read
                ? "read"
                : "unread";


        const importantClass =
            notification.important
                ? "important"
                : "";


        element.className =
            `notification-item ${readClass} ${importantClass} ${escapeHTML(notification.className)}`;


        element.dataset.notificationId =
            notification.id;


        const senderAvatar =
            notification.sender &&
            notification.sender.avatar
                ? notification.sender.avatar
                : null;


        const avatar =
            senderAvatar ||
            notification.icon;


        const actionButton =
            notification.action
                ? `
                    <button
                        type="button"
                        class="notification-action-button"
                        data-notification-action="true"
                        data-notification-id="${escapeHTML(notification.id)}"
                    >
                        مشاهده
                    </button>
                `
                : "";


        element.innerHTML = `

            <div class="notification-icon">
                ${escapeHTML(avatar)}
            </div>

            <div class="notification-content">

                <div class="notification-top-row">

                    <strong class="notification-title">
                        ${escapeHTML(notification.title)}
                    </strong>

                    <button
                        type="button"
                        class="notification-more-button"
                        data-notification-delete="true"
                        data-notification-id="${escapeHTML(notification.id)}"
                        aria-label="حذف اعلان"
                    >
                        ×
                    </button>

                </div>

                <p class="notification-message">
                    ${escapeHTML(notification.message)}
                </p>

                <div class="notification-bottom-row">

                    <time
                        class="notification-time"
                        datetime="${new Date(notification.createdAt).toISOString()}"
                    >
                        ${escapeHTML(formatRelativeTime(notification.createdAt))}
                    </time>

                    <div class="notification-actions">

                        ${actionButton}

                        ${
                            notification.read
                                ? `
                                    <button
                                        type="button"
                                        class="notification-mark-unread"
                                        data-notification-unread="true"
                                        data-notification-id="${escapeHTML(notification.id)}"
                                    >
                                        خوانده‌نشده
                                    </button>
                                `
                                : `
                                    <button
                                        type="button"
                                        class="notification-mark-read"
                                        data-notification-read="true"
                                        data-notification-id="${escapeHTML(notification.id)}"
                                    >
                                        خوانده شد
                                    </button>
                                `
                        }

                    </div>

                </div>

            </div>

        `;


        return element;

    }


    /* =========================================================
       25. RENDER NOTIFICATION LIST
    ========================================================== */

    function render() {

        const container =
            getElement(
                "notifications-list"
            );


        updateUnreadBadge();


        if (!container) {
            return;
        }


        let notifications =
            getAll({
                filter:
                    state.currentFilter
            });


        const total =
            notifications.length;


        const start =
            (state.currentPage - 1) *
            state.pageSize;


        const end =
            start +
            state.pageSize;


        notifications =
            notifications.slice(
                start,
                end
            );


        container.innerHTML = "";


        if (notifications.length === 0) {

            container.appendChild(
                createEmptyState()
            );

            return;

        }


        const fragment =
            document.createDocumentFragment();


        notifications.forEach(
            notification => {

                fragment.appendChild(
                    createNotificationElement(
                        notification
                    )
                );

            }
        );


        container.appendChild(
            fragment
        );


        renderPagination(
            total
        );

    }


    /* =========================================================
       26. PAGINATION
    ========================================================== */

    function renderPagination(total) {

        const oldPagination =
            document.querySelector(
                ".notifications-pagination"
            );


        if (oldPagination) {

            oldPagination.remove();

        }


        const totalPages =
            Math.ceil(
                total /
                state.pageSize
            );


        if (totalPages <= 1) {
            return;
        }


        const container =
            getElement(
                "notifications-list"
            );


        if (!container) {
            return;
        }


        const pagination =
            document.createElement("div");


        pagination.className =
            "notifications-pagination";


        const previousDisabled =
            state.currentPage <= 1
                ? "disabled"
                : "";


        const nextDisabled =
            state.currentPage >= totalPages
                ? "disabled"
                : "";


        pagination.innerHTML = `

            <button
                type="button"
                class="pagination-button"
                data-notification-page="prev"
                ${previousDisabled}
            >
                قبلی
            </button>

            <span class="pagination-info">
                صفحه ${state.currentPage}
                از
                ${totalPages}
            </span>

            <button
                type="button"
                class="pagination-button"
                data-notification-page="next"
                ${nextDisabled}
            >
                بعدی
            </button>

        `;


        container.parentElement.appendChild(
            pagination
        );

    }


    /* =========================================================
       27. CHANGE FILTER
    ========================================================== */

    function setFilter(filter) {

        const validFilters = [
            "all",
            "unread",
            "game",
            "friends",
            "rewards"
        ];


        if (
            !validFilters.includes(
                filter
            )
        ) {

            filter = "all";

        }


        state.currentFilter =
            filter;


        state.currentPage =
            1;


        render();


        emit(
            "filter_changed",
            filter
        );

    }


    /* =========================================================
       28. PAGE CONTROL
    ========================================================== */

    function goToPage(page) {

        const all =
            getAll({
                filter:
                    state.currentFilter
            });


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    all.length /
                    state.pageSize
                )
            );


        let nextPage =
            Number(page);


        if (!Number.isFinite(nextPage)) {

            nextPage =
                1;

        }


        nextPage =
            Math.max(
                1,
                Math.min(
                    nextPage,
                    totalPages
                )
            );


        state.currentPage =
            nextPage;


        render();

    }


    /* =========================================================
       29. ACTION HANDLER
    ========================================================== */

    function handleNotificationAction(
        notification
    ) {

        if (!notification) {
            return;
        }


        markAsRead(
            notification.id
        );


        const action =
            notification.action;


        if (!action) {
            return;
        }


        emit(
            "action",
            {
                notification:
                    notification,

                action:
                    action
            }
        );


        switch (action.type) {

            case "join_room":

                handleJoinRoom(
                    action.roomId
                );

                break;


            case "friend_request":

                handleFriendRequest(
                    action.userId
                );

                break;


            case "open_profile":

                handleOpenProfile(
                    action.userId
                );

                break;


            default:

                break;

        }

    }


    /* =========================================================
       30. JOIN ROOM ACTION
    ========================================================== */

    function handleJoinRoom(roomId) {

        if (!roomId) {
            return;
        }


        try {

            if (
                window.HokmRoom &&
                typeof window.HokmRoom.joinRoom ===
                    "function"
            ) {

                window.HokmRoom.joinRoom(
                    roomId
                );

                return;

            }

        } catch (error) {

            console.error(
                "[Notifications] Room action error:",
                error
            );

        }


        emit(
            "join_room_requested",
            {
                roomId:
                    roomId
            }
        );

    }


    /* =========================================================
       31. FRIEND REQUEST ACTION
    ========================================================== */

    function handleFriendRequest(userId) {

        if (!userId) {
            return;
        }


        emit(
            "friend_request_action",
            {
                userId:
                    userId
            }
        );


        try {

            if (
                window.HokmFriends &&
                typeof window.HokmFriends.openRequest ===
                    "function"
            ) {

                window.HokmFriends.openRequest(
                    userId
                );

            }

        } catch (error) {

            console.error(
                "[Notifications] Friend action error:",
                error
            );

        }

    }


    /* =========================================================
       32. OPEN PROFILE ACTION
    ========================================================== */

    function handleOpenProfile(userId) {

        if (!userId) {
            return;
        }


        emit(
            "profile_requested",
            {
                userId:
                    userId
            }
        );


        try {

            if (
                window.HokmProfile &&
                typeof window.HokmProfile.openUserProfile ===
                    "function"
            ) {

                window.HokmProfile.openUserProfile(
                    userId
                );

            }

        } catch (error) {

            console.error(
                "[Notifications] Profile action error:",
                error
            );

        }

    }


    /* =========================================================
       33. EVENT DELEGATION
    ========================================================== */

    function bindListEvents() {

        const container =
            getElement(
                "notifications-list"
            );


        if (!container) {
            return;
        }


        container.addEventListener(
            "click",
            function (event) {

                const target =
                    event.target;


                if (!target) {
                    return;
                }


                const readButton =
                    target.closest(
                        "[data-notification-read]"
                    );


                if (readButton) {

                    event.preventDefault();

                    markAsRead(
                        readButton.dataset.notificationId
                    );

                    return;

                }


                const unreadButton =
                    target.closest(
                        "[data-notification-unread]"
                    );


                if (unreadButton) {

                    event.preventDefault();

                    markAsUnread(
                        unreadButton.dataset.notificationId
                    );

                    return;

                }


                const deleteButton =
                    target.closest(
                        "[data-notification-delete]"
                    );


                if (deleteButton) {

                    event.preventDefault();

                    deleteNotification(
                        deleteButton.dataset.notificationId
                    );

                    return;

                }


                const actionButton =
                    target.closest(
                        "[data-notification-action]"
                    );


                if (actionButton) {

                    event.preventDefault();


                    const notification =
                        getNotification(
                            actionButton.dataset.notificationId
                        );


                    handleNotificationAction(
                        notification
                    );

                    return;

                }


                const pageButton =
                    target.closest(
                        "[data-notification-page]"
                    );


                if (pageButton) {

                    event.preventDefault();


                    const direction =
                        pageButton.dataset.notificationPage;


                    if (direction === "prev") {

                        goToPage(
                            state.currentPage - 1
                        );

                    }


                    if (direction === "next") {

                        goToPage(
                            state.currentPage + 1
                        );

                    }

                }

            }
        );

    }


    /* =========================================================
       34. NOTIFICATION PAGE BUTTONS
    ========================================================== */

    function bindPageControls() {

        const markAllButton =
            getElement(
                "mark-notifications-read-button"
            );


        if (markAllButton) {

            markAllButton.addEventListener(
                "click",
                function () {

                    markAllAsRead();

                    showSimpleToast(
                        "همه اعلان‌ها خوانده شدند.",
                        "success"
                    );

                }
            );

        }


        const notificationButton =
            getElement(
                "header-notifications-button"
            );


        if (notificationButton) {

            notificationButton.addEventListener(
                "click",
                function () {

                    openNotificationPage();

                }
            );

        }

    }


    /* =========================================================
       35. OPEN NOTIFICATION PAGE
    ========================================================== */

    function openNotificationPage() {

        try {

            if (
                window.HokmUI &&
                typeof window.HokmUI.showPage ===
                    "function"
            ) {

                window.HokmUI.showPage(
                    "notifications"
                );

                return;

            }

        } catch (error) {

            console.error(
                "[Notifications] UI navigation error:",
                error
            );

        }


        try {

            const pages =
                queryAll(
                    ".page"
                );


            pages.forEach(
                page => {

                    page.classList.add(
                        "hidden"
                    );

                    page.classList.remove(
                        "active-page"
                    );

                }
            );


            const page =
                getElement(
                    "notifications-page"
                );


            if (page) {

                page.classList.remove(
                    "hidden"
                );

                page.classList.add(
                    "active-page"
                );

            }

        } catch (error) {

            console.error(
                "[Notifications] Failed to open page:",
                error
            );

        }


        render();

    }


    /* =========================================================
       36. TOAST SYSTEM
    ========================================================== */

    function showToast(notification) {

        if (!notification) {
            return;
        }


        state.toastQueue.push(
            notification
        );


        processToastQueue();

    }


    function processToastQueue() {

        if (state.toastVisible) {
            return;
        }


        if (
            state.toastQueue.length === 0
        ) {

            return;

        }


        const notification =
            state.toastQueue.shift();


        state.toastVisible = true;


        const container =
            getElement(
                "toast-container"
            );


        if (!container) {

            state.toastVisible = false;

            return;

        }


        const toast =
            document.createElement("div");


        toast.className =
            "toast notification-toast";


        toast.innerHTML = `

            <div class="toast-icon">
                ${escapeHTML(notification.icon)}
            </div>

            <div class="toast-content">

                <strong>
                    ${escapeHTML(notification.title)}
                </strong>

                <p>
                    ${escapeHTML(notification.message)}
                </p>

            </div>

            <button
                type="button"
                class="toast-close"
                aria-label="بستن"
            >
                ×
            </button>

        `;


        container.appendChild(
            toast
        );


        const closeToast =
            function () {

                if (!toast.parentNode) {

                    finishToast();

                    return;

                }


                toast.classList.add(
                    "toast-closing"
                );


                setTimeout(
                    function () {

                        if (
                            toast.parentNode
                        ) {

                            toast.remove();

                        }


                        finishToast();

                    },
                    250
                );

            };


        const closeButton =
            toast.querySelector(
                ".toast-close"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeToast
            );

        }


        setTimeout(
            closeToast,
            CONFIG.TOAST_DURATION
        );

    }


    function finishToast() {

        state.toastVisible =
            false;


        processToastQueue();

    }


    function showSimpleToast(
        message,
        type
    ) {

        const container =
            getElement(
                "toast-container"
            );


        if (!container) {
            return;
        }


        const toast =
            document.createElement("div");


        toast.className =
            `toast simple-toast ${type || ""}`;


        toast.innerHTML = `

            <div class="toast-content">
                ${escapeHTML(message)}
            </div>

        `;


        container.appendChild(
            toast
        );


        setTimeout(
            function () {

                if (
                    toast.parentNode
                ) {

                    toast.remove();

                }

            },
            3000
        );

    }


    /* =========================================================
       37. GENERATE DEFAULT NOTIFICATIONS
    ========================================================== */

    function createWelcomeNotification() {

        const alreadyExists =
            state.notifications.some(
                notification =>
                    notification.data &&
                    notification.data.systemKey ===
                        "welcome"
            );


        if (alreadyExists) {
            return null;
        }


        return createNotification({

            type: CONFIG.TYPES.SYSTEM,

            title: "به حکم خوش آمدید! 🃏",

            message:
                "حساب شما آماده است. اولین بازی خود را شروع کنید و ماجراجویی را آغاز کنید.",

            data: {

                systemKey:
                    "welcome"

            },

            important: true

        });

    }


    /* =========================================================
       38. SEED DEMO NOTIFICATIONS
    ========================================================== */

    function seedDemoNotifications() {

        if (
            state.notifications.length > 0
        ) {

            return false;

        }


        createWelcomeNotification();

        return true;

    }


    /* =========================================================
       39. EXPORT / IMPORT
    ========================================================== */

    function exportNotifications() {

        return JSON.stringify(
            state.notifications,
            null,
            2
        );

    }


    function importNotifications(
        data,
        replace
    ) {

        let parsed;


        try {

            if (
                typeof data === "string"
            ) {

                parsed =
                    JSON.parse(data);

            } else {

                parsed = data;

            }

        } catch (error) {

            return {
                success: false,
                imported: 0,
                error: "داده اعلان‌ها معتبر نیست."
            };

        }


        if (!Array.isArray(parsed)) {

            return {
                success: false,
                imported: 0,
                error: "ساختار داده‌ها نامعتبر است."
            };

        }


        const valid =
            parsed
                .filter(
                    isValidNotification
                )
                .map(
                    normalizeNotification
                );


        if (replace) {

            state.notifications =
                valid.slice(
                    0,
                    CONFIG.MAX_NOTIFICATIONS
                );

        } else {

            const existingIds =
                new Set(
                    state.notifications.map(
                        item => item.id
                    )
                );


            valid.forEach(
                item => {

                    if (
                        !existingIds.has(
                            item.id
                        )
                    ) {

                        state.notifications.push(
                            item
                        );

                    }

                }
            );


            state.notifications =
                state.notifications
                    .sort(
                        (a, b) =>
                            b.createdAt -
                            a.createdAt
                    )
                    .slice(
                        0,
                        CONFIG.MAX_NOTIFICATIONS
                    );

        }


        calculateUnreadCount();

        saveToStorage();

        render();


        emit(
            "imported",
            {
                count:
                    valid.length
            }
        );


        return {

            success: true,

            imported:
                valid.length,

            total:
                state.notifications.length

        };

    }


    /* =========================================================
       40. CLEAR OLD NOTIFICATIONS
    ========================================================== */

    function clearOlderThan(days) {

        const numberOfDays =
            Number(days);


        if (
            !Number.isFinite(
                numberOfDays
            ) ||
            numberOfDays <= 0
        ) {

            return 0;

        }


        const limit =
            now() -
            numberOfDays *
                24 *
                60 *
                60 *
                1000;


        const before =
            state.notifications.length;


        state.notifications =
            state.notifications.filter(
                notification =>
                    notification.createdAt >=
                    limit
            );


        const removed =
            before -
            state.notifications.length;


        if (removed > 0) {

            calculateUnreadCount();

            saveToStorage();

            render();

        }


        return removed;

    }


    /* =========================================================
       41. COUNT BY TYPE
    ========================================================== */

    function countByType(type) {

        if (!type) {
            return 0;
        }


        return state.notifications.filter(
            notification =>
                notification.type === type
        ).length;

    }


    /* =========================================================
       42. GET STATISTICS
    ========================================================== */

    function getStatistics() {

        const total =
            state.notifications.length;


        const unread =
            state.unreadCount;


        const read =
            total - unread;


        const important =
            state.notifications.filter(
                notification =>
                    notification.important
            ).length;


        return {

            total: total,

            unread: unread,

            read: read,

            important: important,

            types: {

                system:
                    countByType(
                        CONFIG.TYPES.SYSTEM
                    ),

                game:
                    countByType(
                        CONFIG.TYPES.GAME
                    ),

                friends:
                    countByType(
                        CONFIG.TYPES.FRIEND_REQUEST
                    ) +
                    countByType(
                        CONFIG.TYPES.FRIEND_ACCEPTED
                    ),

                rewards:
                    countByType(
                        CONFIG.TYPES.REWARD
                    ) +
                    countByType(
                        CONFIG.TYPES.COIN
                    )

            }

        };

    }


    /* =========================================================
       43. REFRESH
    ========================================================== */

    function refresh() {

        loadFromStorage();

        render();

        return state.notifications;

    }


    /* =========================================================
       44. INITIALIZATION
    ========================================================== */

    function init() {

        if (state.initialized) {

            return api;

        }


        loadFromStorage();

        bindListEvents();

        bindPageControls();

        updateUnreadBadge();

        render();


        state.initialized =
            true;


        emit(
            "initialized",
            {
                count:
                    state.notifications.length
            }
        );


        return api;

    }


    /* =========================================================
       45. STORAGE CHANGE DETECTION
    ========================================================== */

    window.addEventListener(
        "storage",
        function (event) {

            if (
                event.key !==
                CONFIG.STORAGE_KEY
            ) {

                return;

            }


            loadFromStorage();

            render();


            emit(
                "external_update",
                state.notifications
            );

        }
    );


    /* =========================================================
       46. PUBLIC API
    ========================================================== */

    const api = {

        /* configuration */

        CONFIG: CONFIG,


        /* initialization */

        init: init,

        refresh: refresh,


        /* notifications */

        create: createNotification,

        createNotification:
            createNotification,


        /* predefined notifications */

        notifySystem:
            notifySystem,

        notifyGameStart:
            notifyGameStart,

        notifyGameWin:
            notifyGameWin,

        notifyGameLoss:
            notifyGameLoss,

        notifyGameDraw:
            notifyGameDraw,

        notifyFriendRequest:
            notifyFriendRequest,

        notifyFriendAccepted:
            notifyFriendAccepted,

        notifyInvitation:
            notifyInvitation,

        notifyReward:
            notifyReward,

        notifyCoins:
            notifyCoins,

        notifyXP:
            notifyXP,

        notifyMission:
            notifyMission,

        notifyAchievement:
            notifyAchievement,

        notifyLevelUp:
            notifyLevelUp,

        notifyChat:
            notifyChat,

        notifyUpdate:
            notifyUpdate,


        /* retrieval */

        get:
            getNotification,

        getAll:
            getAll,

        getUnread:
            function () {

                return getAll({
                    unreadOnly: true
                });

            },


        /* read state */

        markAsRead:
            markAsRead,

        markAsUnread:
            markAsUnread,

        markAllAsRead:
            markAllAsRead,


        /* deletion */

        delete:
            deleteNotification,

        deleteAll:
            deleteAll,


        /* filtering */

        setFilter:
            setFilter,

        getFilter:
            function () {

                return state.currentFilter;

            },


        /* pagination */

        goToPage:
            goToPage,


        /* counts */

        getUnreadCount:
            getUnreadCount,

        countByType:
            countByType,


        /* statistics */

        getStatistics:
            getStatistics,


        /* UI */

        render:
            render,

        open:
            openNotificationPage,

        showToast:
            showToast,

        showSimpleToast:
            showSimpleToast,


        /* events */

        on:
            on,

        emit:
            emit,


        /* storage */

        save:
            saveToStorage,

        load:
            loadFromStorage,


        /* import/export */

        export:
            exportNotifications,

        import:
            importNotifications,


        /* maintenance */

        clearOlderThan:
            clearOlderThan,

        seedDemoNotifications:
            seedDemoNotifications,


        /* state */

        getState:
            function () {

                return {

                    initialized:
                        state.initialized,

                    unreadCount:
                        state.unreadCount,

                    total:
                        state.notifications.length,

                    currentFilter:
                        state.currentFilter,

                    currentPage:
                        state.currentPage

                };

            }

    };


    /* =========================================================
       47. GLOBAL EXPORT
    ========================================================== */

    window.HokmNotifications =
        api;


    /*
       نام کوتاه‌تر برای دسترسی آسان‌تر
    */

    window.Notifications =
        api;


    /* =========================================================
       48. AUTO INITIALIZATION
    ========================================================== */

    function autoInitialize() {

        try {

            init();

        } catch (error) {

            console.error(
                "[Notifications] Initialization failed:",
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
            autoInitialize,
            {
                once: true
            }
        );

    } else {

        autoInitialize();

    }


    /* =========================================================
       49. GLOBAL HELPER EVENTS
    ========================================================== */

    document.addEventListener(
        "hokm:game:won",
        function (event) {

            const data =
                event.detail || {};


            notifyGameWin(
                data.score,
                data.reward
            );

        }
    );


    document.addEventListener(
        "hokm:game:lost",
        function (event) {

            const data =
                event.detail || {};


            notifyGameLoss(
                data.score
            );

        }
    );


    document.addEventListener(
        "hokm:game:draw",
        function (event) {

            const data =
                event.detail || {};


            notifyGameDraw(
                data.score
            );

        }
    );


    document.addEventListener(
        "hokm:friend:request",
        function (event) {

            notifyFriendRequest(
                event.detail || {}
            );

        }
    );


    document.addEventListener(
        "hokm:friend:accepted",
        function (event) {

            notifyFriendAccepted(
                event.detail || {}
            );

        }
    );


    document.addEventListener(
        "hokm:room:invitation",
        function (event) {

            notifyInvitation(
                event.detail || {}
            );

        }
    );


    document.addEventListener(
        "hokm:reward",
        function (event) {

            const data =
                event.detail || {};


            notifyReward(
                data.title,
                data.message,
                data.reward
            );

        }
    );


    document.addEventListener(
        "hokm:wallet:coins",
        function (event) {

            const data =
                event.detail || {};


            notifyCoins(
                data.amount,
                data.reason
            );

        }
    );


    document.addEventListener(
        "hokm:wallet:xp",
        function (event) {

            const data =
                event.detail || {};


            notifyXP(
                data.amount,
                data.reason
            );

        }
    );


    document.addEventListener(
        "hokm:mission:completed",
        function (event) {

            const data =
                event.detail || {};


            notifyMission(
                data.title ||
                    "مأموریت تکمیل شد",

                data.message ||
                    "مأموریت شما با موفقیت تکمیل شد.",

                data.mission
            );

        }
    );


    document.addEventListener(
        "hokm:achievement:unlocked",
        function (event) {

            const data =
                event.detail || {};


            notifyAchievement(
                data.title,
                data.message,
                data.achievement
            );

        }
    );


    document.addEventListener(
        "hokm:profile:levelup",
        function (event) {

            const data =
                event.detail || {};


            notifyLevelUp(
                data.level
            );

        }
    );


    document.addEventListener(
        "hokm:chat:new",
        function (event) {

            const data =
                event.detail || {};


            notifyChat(
                data.sender,
                data.message
            );

        }
    );


    /* =========================================================
       50. PERIODIC UI REFRESH
    ========================================================== */

    setInterval(
        function () {

            const page =
                getElement(
                    "notifications-page"
                );


            if (
                page &&
                !page.classList.contains(
                    "hidden"
                )
            ) {

                render();

            }

        },
        60000
    );


    /* =========================================================
       END OF NOTIFICATIONS.JS
       STAGE 15 COMPLETE
    ========================================================== */

})(window, document);
