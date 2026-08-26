/* ================================================================
   HOKM ONLINE
   MAIN APPLICATION CONTROLLER
   ================================================================

   File:
   main.js

   Stage:
   25

   Purpose:
   - کنترل مرکزی کل برنامه
   - اتصال تمام ماژول‌های بازی
   - مدیریت Lifecycle برنامه
   - مدیریت صفحات
   - مدیریت Modal ها
   - مدیریت وضعیت کاربر
   - مدیریت وضعیت اتصال اینترنت
   - هماهنگ‌سازی UI
   - مدیریت رویدادهای عمومی
   - اتصال Game / Room / Multiplayer / Chat / Profile / Shop
   - مدیریت Navigation
   - مدیریت خطاهای عمومی
   - ذخیره وضعیت غیرحساس برنامه
   - ایجاد API مرکزی برای سایر فایل‌ها

   Important:
   این فایل از اطلاعات حساس مثل رمز عبور در localStorage استفاده نمی‌کند.

================================================================ */


/* ================================================================
   1. GLOBAL NAMESPACE
================================================================ */

(function () {

    "use strict";


    /*
     * جلوگیری از اجرای دوباره فایل
     */
    if (window.__HOKM_MAIN_INITIALIZED__) {
        console.warn("[HOKM] main.js already initialized.");
        return;
    }

    window.__HOKM_MAIN_INITIALIZED__ = true;


    /* ============================================================
       2. VERSION
    ============================================================ */

    const MAIN_VERSION = "1.0.0";


    /* ============================================================
       3. APPLICATION CONSTANTS
    ============================================================ */

    const APP_CONSTANTS = {

        name: "Hokm Online",

        version: MAIN_VERSION,

        storagePrefix: "hokm_",

        defaultPage: "home",

        defaultCoins: 1000,

        defaultLevel: 1,

        defaultXP: 0,

        defaultNextLevelXP: 100,

        roomCodeLength: 6,

        maxPlayers: 4,

        maxChatLength: 250,

        toastDuration: 3500,

        reconnectDelay: 3000,

        maxReconnectAttempts: 10,

        animationDuration: 250

    };


    /* ============================================================
       4. APPLICATION EVENTS
    ============================================================ */

    const EVENTS = {

        APP_READY: "hokm:app-ready",

        APP_STARTED: "hokm:app-started",

        APP_ERROR: "hokm:app-error",

        USER_LOGIN: "hokm:user-login",

        USER_LOGOUT: "hokm:user-logout",

        USER_UPDATED: "hokm:user-updated",

        COINS_UPDATED: "hokm:coins-updated",

        XP_UPDATED: "hokm:xp-updated",

        PAGE_CHANGED: "hokm:page-changed",

        MODAL_OPENED: "hokm:modal-opened",

        MODAL_CLOSED: "hokm:modal-closed",

        ROOM_CREATED: "hokm:room-created",

        ROOM_JOINED: "hokm:room-joined",

        ROOM_LEFT: "hokm:room-left",

        GAME_STARTED: "hokm:game-started",

        GAME_ENDED: "hokm:game-ended",

        GAME_UPDATED: "hokm:game-updated",

        TURN_CHANGED: "hokm:turn-changed",

        CARD_PLAYED: "hokm:card-played",

        TRICK_COMPLETED: "hokm:trick-completed",

        CHAT_MESSAGE: "hokm:chat-message",

        FRIEND_UPDATED: "hokm:friend-updated",

        NOTIFICATION_UPDATED: "hokm:notification-updated",

        SETTINGS_UPDATED: "hokm:settings-updated",

        CONNECTION_CHANGED: "hokm:connection-changed"

    };


    /* ============================================================
       5. CENTRAL EVENT BUS
    ============================================================ */

    const EventBus = {

        on(eventName, handler) {

            if (
                typeof eventName !== "string" ||
                typeof handler !== "function"
            ) {
                return function () {};
            }

            document.addEventListener(eventName, handler);

            return function unsubscribe() {
                document.removeEventListener(eventName, handler);
            };
        },


        once(eventName, handler) {

            if (
                typeof eventName !== "string" ||
                typeof handler !== "function"
            ) {
                return function () {};
            }

            const wrapper = function (event) {

                document.removeEventListener(
                    eventName,
                    wrapper
                );

                handler(event);

            };

            document.addEventListener(
                eventName,
                wrapper
            );

            return function unsubscribe() {
                document.removeEventListener(
                    eventName,
                    wrapper
                );
            };
        },


        emit(eventName, detail = {}) {

            const event = new CustomEvent(
                eventName,
                {
                    detail,
                    bubbles: false,
                    cancelable: false
                }
            );

            document.dispatchEvent(event);

            return event;
        }

    };


    /* ============================================================
       6. SAFE STORAGE
    ============================================================ */

    const Storage = {

        prefix: APP_CONSTANTS.storagePrefix,


        key(name) {

            return this.prefix + name;

        },


        set(name, value) {

            try {

                const serialized = JSON.stringify(value);

                localStorage.setItem(
                    this.key(name),
                    serialized
                );

                return true;

            } catch (error) {

                console.error(
                    "[HOKM] Storage set error:",
                    error
                );

                return false;
            }
        },


        get(name, fallback = null) {

            try {

                const raw = localStorage.getItem(
                    this.key(name)
                );

                if (raw === null) {
                    return fallback;
                }

                return JSON.parse(raw);

            } catch (error) {

                console.error(
                    "[HOKM] Storage get error:",
                    error
                );

                return fallback;
            }
        },


        remove(name) {

            try {

                localStorage.removeItem(
                    this.key(name)
                );

                return true;

            } catch (error) {

                console.error(
                    "[HOKM] Storage remove error:",
                    error
                );

                return false;
            }
        },


        clearAppData() {

            try {

                const keys = [];

                for (
                    let index = 0;
                    index < localStorage.length;
                    index++
                ) {

                    const key =
                        localStorage.key(index);

                    if (
                        key &&
                        key.startsWith(this.prefix)
                    ) {

                        keys.push(key);

                    }

                }


                keys.forEach(
                    key => localStorage.removeItem(key)
                );


                return true;

            } catch (error) {

                console.error(
                    "[HOKM] Storage clear error:",
                    error
                );

                return false;
            }
        }

    };


    /* ============================================================
       7. APPLICATION STATE
    ============================================================ */

    const AppState = {

        initialized: false,

        started: false,

        currentPage:
            Storage.get(
                "last_page",
                APP_CONSTANTS.defaultPage
            ),

        previousPage: null,

        isOnline:
            navigator.onLine,

        connectionState:
            navigator.onLine
                ? "online"
                : "offline",

        reconnectAttempts: 0,

        reconnectTimer: null,

        currentUser: null,

        room: null,

        game: null,

        modal: null,

        chatOpen: false,

        loading: true,

        modules: {},

        settings: {

            sound: true,

            music: true,

            vibration: true,

            darkMode: true

        }

    };


    /* ============================================================
       8. DOM HELPERS
    ============================================================ */

    const DOM = {

        get(id) {

            return document.getElementById(id);

        },


        query(selector, root = document) {

            return root.querySelector(selector);

        },


        queryAll(selector, root = document) {

            return Array.from(
                root.querySelectorAll(selector)
            );

        },


        show(element) {

            if (!element) {
                return;
            }

            element.classList.remove("hidden");

            element.removeAttribute("aria-hidden");

        },


        hide(element) {

            if (!element) {
                return;
            }

            element.classList.add("hidden");

            element.setAttribute(
                "aria-hidden",
                "true"
            );

        },


        toggle(element, visible) {

            if (visible) {
                this.show(element);
            } else {
                this.hide(element);
            }

        },


        text(elementOrId, value) {

            const element =
                typeof elementOrId === "string"
                    ? this.get(elementOrId)
                    : elementOrId;

            if (!element) {
                return;
            }

            element.textContent =
                value === undefined ||
                value === null
                    ? ""
                    : String(value);

        },


        value(elementOrId, value) {

            const element =
                typeof elementOrId === "string"
                    ? this.get(elementOrId)
                    : elementOrId;

            if (!element) {
                return undefined;
            }

            if (value === undefined) {
                return element.value;
            }

            element.value = value;

        },


        addClass(elementOrId, className) {

            const element =
                typeof elementOrId === "string"
                    ? this.get(elementOrId)
                    : elementOrId;

            if (element) {
                element.classList.add(className);
            }

        },


        removeClass(elementOrId, className) {

            const element =
                typeof elementOrId === "string"
                    ? this.get(elementOrId)
                    : elementOrId;

            if (element) {
                element.classList.remove(className);
            }

        }

    };


    /* ============================================================
       9. MODULE REGISTRY
    ============================================================ */

    const ModuleRegistry = {

        register(name, module) {

            if (
                !name ||
                !module
            ) {
                return false;
            }

            AppState.modules[name] = module;

            return true;

        },


        get(name) {

            return AppState.modules[name] || null;

        },


        has(name) {

            return Boolean(
                AppState.modules[name]
            );

        },


        call(
            moduleName,
            methodName,
            ...args
        ) {

            const module =
                this.get(moduleName);

            if (
                !module ||
                typeof module[methodName] !== "function"
            ) {
                return undefined;
            }

            try {

                return module[methodName](...args);

            } catch (error) {

                console.error(
                    `[HOKM] ${moduleName}.${methodName} error:`,
                    error
                );

                App.reportError(
                    error,
                    `${moduleName}.${methodName}`
                );

                return undefined;
            }
        }

    };


    /* ============================================================
       10. AUTOMATIC MODULE DISCOVERY
    ============================================================ */

    function discoverModules() {

        const possibleModules = {

            app: [
                "HokmApp",
                "App",
                "app"
            ],

            auth: [
                "HokmAuth",
                "Auth",
                "auth"
            ],

            game: [
                "HokmGame",
                "Game",
                "game"
            ],

            cards: [
                "HokmCards",
                "Cards",
                "cards"
            ],

            ui: [
                "HokmUI",
                "UI",
                "ui"
            ],

            room: [
                "HokmRoom",
                "Room",
                "room"
            ],

            multiplayer: [
                "HokmMultiplayer",
                "Multiplayer",
                "multiplayer"
            ],

            chat: [
                "HokmChat",
                "Chat",
                "chat"
            ],

            profile: [
                "HokmProfile",
                "Profile",
                "profile"
            ],

            settings: [
                "HokmSettings",
                "Settings",
                "settings"
            ],

            wallet: [
                "HokmWallet",
                "Wallet",
                "wallet"
            ],

            shop: [
                "HokmShop",
                "Shop",
                "shop"
            ],

            friends: [
                "HokmFriends",
                "Friends",
                "friends"
            ],

            leaderboard: [
                "HokmLeaderboard",
                "Leaderboard",
                "leaderboard"
            ],

            history: [
                "HokmHistory",
                "History",
                "history"
            ],

            missions: [
                "HokmMissions",
                "Missions",
                "missions"
            ],

            notifications: [
                "HokmNotifications",
                "Notifications",
                "notifications"
            ]

        };


        Object.keys(possibleModules)
            .forEach(moduleName => {

                const candidates =
                    possibleModules[moduleName];

                for (
                    let index = 0;
                    index < candidates.length;
                    index++
                ) {

                    const candidate =
                        window[candidates[index]];

                    if (candidate) {

                        ModuleRegistry.register(
                            moduleName,
                            candidate
                        );

                        break;

                    }

                }

            });

    }


    /* ============================================================
       11. OPTIONAL SCRIPT LOADER
    ============================================================ */

    const ScriptLoader = {

        loaded: {},


        isScriptLoaded(src) {

            const scripts =
                DOM.queryAll("script");

            return scripts.some(script => {

                const scriptSrc =
                    script.getAttribute("src");

                if (!scriptSrc) {
                    return false;
                }

                return (
                    scriptSrc === src ||
                    scriptSrc.endsWith("/" + src)
                );

            });

        },


        load(src) {

            return new Promise(
                (resolve, reject) => {

                    if (!src) {
                        reject(
                            new Error(
                                "Script source is empty."
                            )
                        );

                        return;
                    }


                    if (
                        this.loaded[src] ||
                        this.isScriptLoaded(src)
                    ) {

                        this.loaded[src] = true;

                        resolve(src);

                        return;
                    }


                    const script =
                        document.createElement(
                            "script"
                        );

                    script.src = src;

                    script.async = false;

                    script.defer = false;

                    script.dataset.hokmLoaded =
                        "true";


                    script.onload = () => {

                        this.loaded[src] = true;

                        resolve(src);

                    };


                    script.onerror = () => {

                        reject(
                            new Error(
                                `Unable to load ${src}`
                            )
                        );

                    };


                    document.head.appendChild(
                        script
                    );

                }
            );

        }

    };


    /* ============================================================
       12. MODULE FILE LIST
    ============================================================ */

    const MODULE_FILES = [

        "config.js",

        "cards.js",

        "game.js",

        "ui.js",

        "auth.js",

        "profile.js",

        "wallet.js",

        "shop.js",

        "room.js",

        "multiplayer.js",

        "chat.js",

        "settings.js",

        "friends.js",

        "leaderboard.js",

        "history.js",

        "missions.js",

        "notifications.js"

    ];


    /* ============================================================
       13. MODULE INITIALIZATION
    ============================================================ */

    async function loadMissingModules() {

        /*
         * اگر main.js توسط app.js یا index.html بعد از تمام فایل‌ها
         * اجرا شده باشد، فایل‌های موجود دوباره بارگذاری نمی‌شوند.
         */

        for (
            let index = 0;
            index < MODULE_FILES.length;
            index++
        ) {

            const file =
                MODULE_FILES[index];

            try {

                await ScriptLoader.load(file);

            } catch (error) {

                /*
                 * خطای یک فایل باعث توقف کل برنامه نمی‌شود.
                 * چون ممکن است فایل قبلاً با روش دیگری بارگذاری شده باشد.
                 */

                console.warn(
                    `[HOKM] Optional module not loaded: ${file}`,
                    error
                );

            }

        }


        discoverModules();

    }


    /* ============================================================
       14. LOADING SCREEN
    ============================================================ */

    const Loading = {

        message(message) {

            DOM.text(
                "loading-message",
                message
            );

        },


        start() {

            AppState.loading = true;

            const screen =
                DOM.get("loading-screen");

            if (screen) {
                DOM.show(screen);
            }

        },


        finish() {

            AppState.loading = false;

            const screen =
                DOM.get("loading-screen");

            if (!screen) {
                return;
            }

            screen.classList.add(
                "loading-complete"
            );


            setTimeout(() => {

                DOM.hide(screen);

            }, 250);

        }

    };


    /* ============================================================
       15. TOAST SYSTEM
    ============================================================ */

    const Toast = {

        show(
            message,
            type = "info",
            duration = APP_CONSTANTS.toastDuration
        ) {

            const container =
                DOM.get("toast-container");

            if (!container) {
                return;
            }


            const toast =
                document.createElement("div");

            toast.className =
                `toast toast-${type}`;


            const icon =
                document.createElement("span");

            icon.className =
                "toast-icon";


            if (type === "success") {
                icon.textContent = "✓";
            } else if (type === "error") {
                icon.textContent = "!";
            } else if (type === "warning") {
                icon.textContent = "⚠";
            } else {
                icon.textContent = "i";
            }


            const text =
                document.createElement("span");

            text.className =
                "toast-message";

            text.textContent =
                message;


            const close =
                document.createElement("button");

            close.type = "button";

            close.className =
                "toast-close";

            close.setAttribute(
                "aria-label",
                "بستن"
            );

            close.textContent = "×";


            close.addEventListener(
                "click",
                () => {

                    removeToast();

                }
            );


            toast.appendChild(icon);

            toast.appendChild(text);

            toast.appendChild(close);

            container.appendChild(toast);


            requestAnimationFrame(() => {

                toast.classList.add(
                    "toast-visible"
                );

            });


            const timer =
                setTimeout(
                    removeToast,
                    duration
                );


            function removeToast() {

                clearTimeout(timer);

                if (!toast.parentNode) {
                    return;
                }

                toast.classList.remove(
                    "toast-visible"
                );


                setTimeout(() => {

                    if (toast.parentNode) {

                        toast.parentNode.removeChild(
                            toast
                        );

                    }

                }, 200);

            }

        },


        success(message) {

            this.show(
                message,
                "success"
            );

        },


        error(message) {

            this.show(
                message,
                "error"
            );

        },


        warning(message) {

            this.show(
                message,
                "warning"
            );

        },


        info(message) {

            this.show(
                message,
                "info"
            );

        }

    };


    /* ============================================================
       16. ACCESSIBILITY
    ============================================================ */

    const Accessibility = {

        announce(message) {

            const region =
                DOM.get("aria-live-region");

            if (!region) {
                return;
            }

            region.textContent = "";

            setTimeout(() => {

                region.textContent =
                    message;

            }, 50);

        }

    };


    /* ============================================================
       17. CONNECTION MANAGER
    ============================================================ */

    const Connection = {

        initialize() {

            window.addEventListener(
                "online",
                () => {

                    this.setState(
                        "online"
                    );

                    this.attemptReconnect();

                }
            );


            window.addEventListener(
                "offline",
                () => {

                    this.setState(
                        "offline"
                    );

                }
            );


            this.updateUI();

        },


        setState(state) {

            const normalized =
                state === "online"
                    ? "online"
                    : "offline";


            const changed =
                AppState.connectionState !==
                normalized;


            AppState.connectionState =
                normalized;

            AppState.isOnline =
                normalized === "online";


            this.updateUI();


            if (changed) {

                EventBus.emit(
                    EVENTS.CONNECTION_CHANGED,
                    {
                        online:
                            AppState.isOnline,

                        state:
                            normalized
                    }
                );

            }

        },


        updateUI() {

            const status =
                DOM.get("connection-status");

            const offlineNotice =
                DOM.get("offline-notice");

            const statusText =
                DOM.get(
                    "connection-status-text"
                );


            if (AppState.isOnline) {

                DOM.hide(
                    offlineNotice
                );


                if (status) {

                    DOM.removeClass(
                        status,
                        "offline"
                    );

                    DOM.addClass(
                        status,
                        "online"
                    );

                    DOM.show(status);

                }


                DOM.text(
                    statusText,
                    "متصل"
                );

            } else {

                if (status) {

                    DOM.removeClass(
                        status,
                        "online"
                    );

                    DOM.addClass(
                        status,
                        "offline"
                    );

                    DOM.show(status);

                }


                DOM.text(
                    statusText,
                    "بدون اتصال"
                );


                DOM.show(
                    offlineNotice
                );

            }

        },


        attemptReconnect() {

            if (!AppState.isOnline) {
                return;
            }


            if (
                AppState.reconnectAttempts >=
                APP_CONSTANTS.maxReconnectAttempts
            ) {

                return;

            }


            AppState.reconnectAttempts++;


            clearTimeout(
                AppState.reconnectTimer
            );


            AppState.reconnectTimer =
                setTimeout(() => {

                    const multiplayer =
                        ModuleRegistry.get(
                            "multiplayer"
                        );


                    if (
                        multiplayer &&
                        typeof multiplayer.reconnect ===
                        "function"
                    ) {

                        Promise.resolve(
                            multiplayer.reconnect()
                        )
                        .then(() => {

                            AppState.reconnectAttempts =
                                0;

                        })
                        .catch(() => {

                            this.attemptReconnect();

                        });

                    } else {

                        AppState.reconnectAttempts =
                            0;

                    }

                },
                APP_CONSTANTS.reconnectDelay
            );

        }

    };


    /* ============================================================
       18. PAGE MANAGER
    ============================================================ */

    const PageManager = {

        pages: [

            "home",

            "room",

            "game",

            "shop",

            "friends",

            "leaderboard",

            "profile",

            "history",

            "missions",

            "notifications",

            "settings"

        ],


        normalize(page) {

            if (
                page === "quick-match"
            ) {

                return "quick-match";

            }


            if (
                this.pages.includes(page)
            ) {

                return page;

            }


            return APP_CONSTANTS.defaultPage;

        },


        show(page, options = {}) {

            const normalized =
                this.normalize(page);


            if (
                normalized ===
                "quick-match"
            ) {

                ModalManager.open(
                    "quick-match-modal"
                );

                return;

            }


            const targetPage =
                DOM.get(
                    `${normalized}-page`
                );


            if (!targetPage) {

                console.warn(
                    `[HOKM] Page not found: ${normalized}`
                );

                return;

            }


            this.pages.forEach(
                pageName => {

                    const pageElement =
                        DOM.get(
                            `${pageName}-page`
                        );


                    if (!pageElement) {
                        return;
                    }


                    const isActive =
                        pageName === normalized;


                    pageElement.classList.toggle(
                        "hidden",
                        !isActive
                    );


                    pageElement.classList.toggle(
                        "active-page",
                        isActive
                    );


                    if (isActive) {

                        pageElement.setAttribute(
                            "aria-hidden",
                            "false"
                        );

                    } else {

                        pageElement.setAttribute(
                            "aria-hidden",
                            "true"
                        );

                    }

                }
            );


            AppState.previousPage =
                AppState.currentPage;

            AppState.currentPage =
                normalized;


            Storage.set(
                "last_page",
                normalized
            );


            this.updateNavigation(
                normalized
            );


            this.onPageChanged(
                normalized,
                options
            );


            EventBus.emit(
                EVENTS.PAGE_CHANGED,
                {
                    page: normalized,

                    previousPage:
                        AppState.previousPage
                }
            );


            Accessibility.announce(
                `صفحه ${normalized}`
            );

        },


        updateNavigation(page) {

            const navItems =
                DOM.queryAll(
                    ".nav-item"
                );


            navItems.forEach(
                item => {

                    const target =
                        item.dataset.pageTarget;

                    item.classList.toggle(
                        "active",
                        target === page
                    );

                }
            );

        },


        onPageChanged(
            page,
            options
        ) {

            switch (page) {

                case "home":

                    App.refreshHome();

                    break;


                case "profile":

                    ModuleRegistry.call(
                        "profile",
                        "render"
                    );

                    break;


                case "shop":

                    ModuleRegistry.call(
                        "shop",
                        "render"
                    );

                    break;


                case "friends":

                    ModuleRegistry.call(
                        "friends",
                        "render"
                    );

                    break;


                case "leaderboard":

                    ModuleRegistry.call(
                        "leaderboard",
                        "render"
                    );

                    break;


                case "history":

                    ModuleRegistry.call(
                        "history",
                        "render"
                    );

                    break;


                case "missions":

                    ModuleRegistry.call(
                        "missions",
                        "render"
                    );

                    break;


                case "notifications":

                    ModuleRegistry.call(
                        "notifications",
                        "render"
                    );

                    break;


                case "settings":

                    ModuleRegistry.call(
                        "settings",
                        "render"
                    );

                    break;


                case "room":

                    ModuleRegistry.call(
                        "room",
                        "render"
                    );

                    break;


                case "game":

                    ModuleRegistry.call(
                        "game",
                        "render"
                    );

                    break;

            }

        },


        back() {

            const previous =
                AppState.previousPage;


            if (
                previous &&
                this.pages.includes(previous)
            ) {

                this.show(previous);

                return;

            }


            this.show(
                APP_CONSTANTS.defaultPage
            );

        }

    };


    /* ============================================================
       19. MODAL MANAGER
    ============================================================ */

    const ModalManager = {

        open(modalId) {

            const modal =
                DOM.get(modalId);

            if (!modal) {
                return false;
            }


            this.closeAll(
                modalId
            );


            DOM.show(modal);


            modal.classList.add(
                "modal-open"
            );


            AppState.modal =
                modalId;


            document.body.classList.add(
                "modal-is-open"
            );


            EventBus.emit(
                EVENTS.MODAL_OPENED,
                {
                    modalId
                }
            );


            const firstFocusable =
                modal.querySelector(
                    "button, input, select, textarea"
                );


            if (firstFocusable) {

                setTimeout(() => {

                    firstFocusable.focus();

                }, 50);

            }


            return true;

        },


        close(modalId) {

            const modal =
                DOM.get(modalId);

            if (!modal) {
                return false;
            }


            DOM.hide(modal);


            modal.classList.remove(
                "modal-open"
            );


            if (
                AppState.modal === modalId
            ) {

                AppState.modal = null;

            }


            document.body.classList.remove(
                "modal-is-open"
            );


            EventBus.emit(
                EVENTS.MODAL_CLOSED,
                {
                    modalId
                }
            );


            return true;

        },


        closeAll(exceptId = null) {

            const modals =
                DOM.queryAll(
                    ".modal-overlay"
                );


            modals.forEach(
                modal => {

                    if (
                        exceptId &&
                        modal.id === exceptId
                    ) {
                        return;
                    }


                    DOM.hide(modal);

                    modal.classList.remove(
                        "modal-open"
                    );

                }
            );


            if (!exceptId) {

                AppState.modal = null;

                document.body.classList.remove(
                    "modal-is-open"
                );

            }

        }

    };


    /* ============================================================
       20. USER MANAGER
    ============================================================ */

    const UserManager = {

        setUser(user) {

            if (!user) {

                this.clearUser();

                return;

            }


            const safeUser = {

                id:
                    user.id ||
                    user.user_id ||
                    null,

                username:
                    user.username ||
                    user.name ||
                    "بازیکن",

                email:
                    user.email ||
                    "",

                avatar:
                    user.avatar ||
                    "👤",

                level:
                    Number(user.level) ||
                    APP_CONSTANTS.defaultLevel,

                xp:
                    Number(user.xp) ||
                    APP_CONSTANTS.defaultXP,

                nextLevelXP:
                    Number(user.nextLevelXP) ||
                    APP_CONSTANTS.defaultNextLevelXP,

                coins:
                    Number(user.coins) >= 0
                        ? Number(user.coins)
                        : APP_CONSTANTS.defaultCoins,

                games:
                    Number(user.games) ||
                    0,

                wins:
                    Number(user.wins) ||
                    0,

                losses:
                    Number(user.losses) ||
                    0,

                winRate:
                    Number(user.winRate) ||
                    0

            };


            AppState.currentUser =
                safeUser;


            /*
             * اطلاعات عمومی کاربر قابل ذخیره است.
             * رمز عبور یا توکن حساس اینجا ذخیره نمی‌شود.
             */

            Storage.set(
                "user_profile",
                safeUser
            );


            this.updateUI();


            EventBus.emit(
                EVENTS.USER_LOGIN,
                {
                    user: safeUser
                }
            );

        },


        loadSavedUser() {

            const user =
                Storage.get(
                    "user_profile",
                    null
                );


            if (!user) {
                return null;
            }


            AppState.currentUser =
                user;


            this.updateUI();


            return user;

        },


        clearUser() {

            AppState.currentUser = null;

            Storage.remove(
                "user_profile"
            );


            this.updateUI();


            EventBus.emit(
                EVENTS.USER_LOGOUT,
                {}
            );

        },


        updateUI() {

            const user =
                AppState.currentUser;


            if (!user) {
                return;
            }


            DOM.text(
                "header-username",
                user.username
            );


            DOM.text(
                "home-username",
                user.username
            );


            DOM.text(
                "game-player-name",
                user.username
            );


            DOM.text(
                "profile-username",
                user.username
            );


            DOM.text(
                "header-level",
                `سطح ${user.level}`
            );


            DOM.text(
                "home-level",
                user.level
            );


            DOM.text(
                "profile-level",
                user.level
            );


            DOM.text(
                "home-coins",
                user.coins
            );


            DOM.text(
                "shop-coins",
                user.coins
            );


            DOM.text(
                "current-xp",
                user.xp
            );


            DOM.text(
                "next-level-xp",
                user.nextLevelXP
            );


            DOM.text(
                "stat-games",
                user.games
            );


            DOM.text(
                "stat-wins",
                user.wins
            );


            DOM.text(
                "stat-losses",
                user.losses
            );


            const winRate =
                user.games > 0
                    ? Math.round(
                        (user.wins / user.games) *
                        100
                    )
                    : 0;


            DOM.text(
                "stat-win-rate",
                `${winRate}%`
            );


            const xpPercentage =
                user.nextLevelXP > 0
                    ? Math.min(
                        100,
                        Math.max(
                            0,
                            (
                                user.xp /
                                user.nextLevelXP
                            ) * 100
                        )
                    )
                    : 0;


            const xpProgress =
                DOM.get(
                    "xp-progress"
                );


            if (xpProgress) {

                xpProgress.style.width =
                    `${xpPercentage}%`;

            }


            const avatars =
                [
                    DOM.get("header-avatar"),
                    DOM.get("profile-avatar"),
                    DOM.query(".summary-avatar")
                ];


            avatars.forEach(
                avatar => {

                    if (avatar) {
                        avatar.textContent =
                            user.avatar || "👤";
                    }

                }
            );


            if (user.id) {

                DOM.text(
                    "profile-user-id",
                    `ID: ${user.id}`
                );

            }

        },


        updateCoins(amount) {

            if (!AppState.currentUser) {
                return;
            }


            const newAmount =
                Number(amount);


            if (
                !Number.isFinite(newAmount) ||
                newAmount < 0
            ) {
                return;
            }


            AppState.currentUser.coins =
                Math.floor(newAmount);


            Storage.set(
                "user_profile",
                AppState.currentUser
            );


            DOM.text(
                "home-coins",
                AppState.currentUser.coins
            );


            DOM.text(
                "shop-coins",
                AppState.currentUser.coins
            );


            EventBus.emit(
                EVENTS.COINS_UPDATED,
                {
                    coins:
                        AppState.currentUser.coins
                }
            );

        },


        addCoins(amount) {

            if (!AppState.currentUser) {
                return false;
            }


            const value =
                Number(amount);


            if (
                !Number.isFinite(value) ||
                value <= 0
            ) {
                return false;
            }


            this.updateCoins(
                AppState.currentUser.coins +
                Math.floor(value)
            );


            return true;

        },


        removeCoins(amount) {

            if (!AppState.currentUser) {
                return false;
            }


            const value =
                Number(amount);


            if (
                !Number.isFinite(value) ||
                value <= 0
            ) {
                return false;
            }


            if (
                AppState.currentUser.coins <
                Math.floor(value)
            ) {

                return false;

            }


            this.updateCoins(
                AppState.currentUser.coins -
                Math.floor(value)
            );


            return true;

        }

    };


    /* ============================================================
       21. SETTINGS MANAGER
    ============================================================ */

    const SettingsManager = {

        load() {

            const saved =
                Storage.get(
                    "settings",
                    null
                );


            if (
                saved &&
                typeof saved === "object"
            ) {

                AppState.settings = {

                    ...AppState.settings,

                    ...saved

                };

            }


            this.apply();

        },


        save() {

            Storage.set(
                "settings",
                AppState.settings
            );


            EventBus.emit(
                EVENTS.SETTINGS_UPDATED,
                {
                    settings:
                        {
                            ...AppState.settings
                        }
                }
            );

        },


        apply() {

            const sound =
                DOM.get(
                    "sound-setting"
                );


            const music =
                DOM.get(
                    "music-setting"
                );


            const vibration =
                DOM.get(
                    "vibration-setting"
                );


            const darkMode =
                DOM.get(
                    "dark-mode-setting"
                );


            if (sound) {
                sound.checked =
                    AppState.settings.sound;
            }


            if (music) {
                music.checked =
                    AppState.settings.music;
            }


            if (vibration) {
                vibration.checked =
                    AppState.settings.vibration;
            }


            if (darkMode) {
                darkMode.checked =
                    AppState.settings.darkMode;
            }


            document.documentElement.classList.toggle(
                "dark-mode",
                Boolean(
                    AppState.settings.darkMode
                )
            );

        },


        update(name, value) {

            if (
                !Object.prototype.hasOwnProperty.call(
                    AppState.settings,
                    name
                )
            ) {
                return;
            }


            AppState.settings[name] =
                Boolean(value);


            this.apply();

            this.save();

        }

    };


    /* ============================================================
       22. HOME PAGE REFRESH
    ============================================================ */

    function refreshHome() {

        UserManager.updateUI();


        const missionModule =
            ModuleRegistry.get(
                "missions"
            );


        if (
            missionModule &&
            typeof missionModule.getDailySummary ===
            "function"
        ) {

            try {

                const summary =
                    missionModule.getDailySummary();


                if (summary) {

                    if (
                        summary.title
                    ) {

                        DOM.text(
                            "daily-mission-title",
                            summary.title
                        );

                    }


                    if (
                        summary.current !==
                        undefined &&
                        summary.total !==
                        undefined
                    ) {

                        DOM.text(
                            "daily-mission-count",
                            `${summary.current}/${summary.total}`
                        );

                    }


                    if (
                        summary.percentage !==
                        undefined
                    ) {

                        const progress =
                            DOM.get(
                                "daily-mission-progress"
                            );


                        if (progress) {

                            progress.style.width =
                                `${Math.min(
                                    100,
                                    Math.max(
                                        0,
                                        Number(
                                            summary.percentage
                                        )
                                    )
                                )}%`;

                        }

                    }

                }

            } catch (error) {

                console.warn(
                    "[HOKM] Mission summary error:",
                    error
                );

            }

        }

    }


    /* ============================================================
       23. NAVIGATION INITIALIZATION
    ============================================================ */

    function initializeNavigation() {

        const navItems =
            DOM.queryAll(
                ".nav-item"
            );


        navItems.forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        const target =
                            item.dataset.pageTarget;


                        if (
                            target ===
                            "quick-match"
                        ) {

                            ModalManager.open(
                                "quick-match-modal"
                            );

                            return;

                        }


                        PageManager.show(
                            target
                        );

                    }
                );

            }
        );


        /*
         * Header profile
         */

        const profileButton =
            DOM.get(
                "profile-header-button"
            );


        if (profileButton) {

            profileButton.addEventListener(
                "click",
                () => {

                    PageManager.show(
                        "profile"
                    );

                }
            );

        }


        /*
         * Header notifications
         */

        const notificationButton =
            DOM.get(
                "header-notifications-button"
            );


        if (notificationButton) {

            notificationButton.addEventListener(
                "click",
                () => {

                    PageManager.show(
                        "notifications"
                    );

                }
            );

        }


        /*
         * Header settings
         */

        const settingsButton =
            DOM.get(
                "header-settings-button"
            );


        if (settingsButton) {

            settingsButton.addEventListener(
                "click",
                () => {

                    PageManager.show(
                        "settings"
                    );

                }
            );

        }


        /*
         * Profile settings
         */

        const profileSettings =
            DOM.get(
                "profile-settings-button"
            );


        if (profileSettings) {

            profileSettings.addEventListener(
                "click",
                () => {

                    PageManager.show(
                        "settings"
                    );

                }
            );

        }


        /*
         * History
         */

        const historyButton =
            DOM.get(
                "view-history-button"
            );


        if (historyButton) {

            historyButton.addEventListener(
                "click",
                () => {

                    PageManager.show(
                        "history"
                    );

                }
            );

        }


        /*
         * Missions
         */

        const missionsButton =
            DOM.get(
                "missions-button"
            );


        if (missionsButton) {

            missionsButton.addEventListener(
                "click",
                () => {

                    PageManager.show(
                        "missions"
                    );

                }
            );

        }

    }


    /* ============================================================
       24. QUICK MATCH
    ============================================================ */

    function initializeQuickMatch() {

        const quickButton =
            DOM.get(
                "quick-match-button"
            );


        if (quickButton) {

            quickButton.addEventListener(
                "click",
                () => {

                    ModalManager.open(
                        "quick-match-modal"
                    );

                }
            );

        }


        const modeButtons =
            DOM.queryAll(
                "[data-match-type]"
            );


        modeButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const type =
                            button.dataset.matchType;


                        ModalManager.close(
                            "quick-match-modal"
                        );


                        startMatch(
                            type
                        );

                    }
                );

            }
        );


        const closeButton =
            DOM.get(
                "close-quick-match-modal"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                () => {

                    ModalManager.close(
                        "quick-match-modal"
                    );

                }
            );

        }

    }


    /* ============================================================
       25. START MATCH
    ============================================================ */

    function startMatch(type) {

        const normalizedType =
            type || "classic";


        /*
         * Practice
         */

        if (
            normalizedType ===
            "practice"
        ) {

            PageManager.show(
                "game"
            );


            const game =
                ModuleRegistry.get(
                    "game"
                );


            if (game) {

                if (
                    typeof game.startPractice ===
                    "function"
                ) {

                    game.startPractice();

                    return;

                }


                if (
                    typeof game.start ===
                    "function"
                ) {

                    game.start({
                        mode: "practice"
                    });

                    return;

                }

            }


            Toast.info(
                "بازی تمرینی آماده شروع است."
            );

            return;

        }


        /*
         * Ranked / Classic
         */

        const multiplayer =
            ModuleRegistry.get(
                "multiplayer"
            );


        const room =
            ModuleRegistry.get(
                "room"
            );


        if (
            multiplayer &&
            typeof multiplayer.findMatch ===
            "function"
        ) {

            Toast.info(
                "در حال پیدا کردن بازیکنان..."
            );


            Promise.resolve(
                multiplayer.findMatch(
                    normalizedType
                )
            )
            .then(
                result => {

                    if (
                        result &&
                        result.room
                    ) {

                        AppState.room =
                            result.room;

                        PageManager.show(
                            "room"
                        );

                    }

                }
            )
            .catch(
                error => {

                    console.error(
                        error
                    );

                    Toast.error(
                        "پیدا کردن بازی انجام نشد."
                    );

                }
            );


            return;

        }


        if (
            room &&
            typeof room.quickMatch ===
            "function"
        ) {

            Promise.resolve(
                room.quickMatch(
                    normalizedType
                )
            )
            .then(
                result => {

                    if (result) {

                        PageManager.show(
                            "room"
                        );

                    }

                }
            )
            .catch(
                error => {

                    console.error(
                        error
                    );

                    Toast.error(
                        "خطا در ساخت بازی."
                    );

                }
            );


            return;

        }


        /*
         * اگر هنوز Backend متصل نشده باشد،
         * صفحه بازی باز می‌شود تا موتور بازی محلی
         * بتواند اجرا شود.
         */

        PageManager.show(
            "game"
        );


        const game =
            ModuleRegistry.get(
                "game"
            );


        if (
            game &&
            typeof game.start ===
            "function"
        ) {

            game.start({
                mode:
                    normalizedType
            });

        }

    }


    /* ============================================================
       26. ROOM EVENTS
    ============================================================ */

    function initializeRoomEvents() {

        EventBus.on(
            EVENTS.ROOM_CREATED,
            event => {

                const room =
                    event.detail &&
                    event.detail.room;


                if (room) {

                    AppState.room =
                        room;

                }


                PageManager.show(
                    "room"
                );

            }
        );


        EventBus.on(
            EVENTS.ROOM_JOINED,
            event => {

                const room =
                    event.detail &&
                    event.detail.room;


                if (room) {

                    AppState.room =
                        room;

                }


                PageManager.show(
                    "room"
                );

            }
        );


        EventBus.on(
            EVENTS.ROOM_LEFT,
            () => {

                AppState.room =
                    null;


                PageManager.show(
                    "home"
                );

            }
        );

    }


    /* ============================================================
       27. GAME EVENTS
    ============================================================ */

    function initializeGameEvents() {

        EventBus.on(
            EVENTS.GAME_STARTED,
            event => {

                AppState.game =
                    event.detail &&
                    event.detail.game
                        ? event.detail.game
                        : AppState.game;


                PageManager.show(
                    "game"
                );


                Toast.success(
                    "بازی شروع شد."
                );

            }
        );


        EventBus.on(
            EVENTS.GAME_UPDATED,
            event => {

                if (
                    event.detail &&
                    event.detail.game
                ) {

                    AppState.game =
                        event.detail.game;

                }

            }
        );


        EventBus.on(
            EVENTS.CARD_PLAYED,
            event => {

                const detail =
                    event.detail || {};


                if (
                    detail.message
                ) {

                    Accessibility.announce(
                        detail.message
                    );

                }

            }
        );


        EventBus.on(
            EVENTS.TURN_CHANGED,
            event => {

                const detail =
                    event.detail || {};


                if (
                    detail.isLocalPlayerTurn
                ) {

                    Accessibility.announce(
                        "نوبت شماست"
                    );

                }

            }
        );


        EventBus.on(
            EVENTS.GAME_ENDED,
            event => {

                const result =
                    event.detail || {};


                AppState.game =
                    null;


                /*
                 * نتیجه در ماژول game مدیریت می‌شود.
                 * اینجا فقط state و navigation هماهنگ می‌شود.
                 */

                if (
                    result.returnHome
                ) {

                    PageManager.show(
                        "home"
                    );

                }

            }
        );

    }


    /* ============================================================
       28. CHAT INITIALIZATION
    ============================================================ */

    function initializeChat() {

        const chatButton =
            DOM.get(
                "game-chat-button"
            );


        const closeChatButton =
            DOM.get(
                "close-chat-button"
            );


        if (chatButton) {

            chatButton.addEventListener(
                "click",
                () => {

                    openChat();

                }
            );

        }


        if (closeChatButton) {

            closeChatButton.addEventListener(
                "click",
                () => {

                    closeChat();

                }
            );

        }


        const chatForm =
            DOM.get(
                "chat-form"
            );


        if (chatForm) {

            chatForm.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    sendChatMessage();

                }
            );

        }

    }


    function openChat() {

        const panel =
            DOM.get(
                "chat-panel"
            );


        if (!panel) {
            return;
        }


        DOM.show(panel);

        panel.classList.add(
            "chat-open"
        );


        AppState.chatOpen =
            true;


        const input =
            DOM.get(
                "chat-input"
            );


        if (input) {

            setTimeout(
                () => input.focus(),
                100
            );

        }

    }


    function closeChat() {

        const panel =
            DOM.get(
                "chat-panel"
            );


        if (!panel) {
            return;
        }


        panel.classList.remove(
            "chat-open"
        );


        DOM.hide(panel);


        AppState.chatOpen =
            false;

    }


    function sendChatMessage() {

        const input =
            DOM.get(
                "chat-input"
            );


        if (!input) {
            return;
        }


        const message =
            input.value.trim();


        if (!message) {
            return;
        }


        if (
            message.length >
            APP_CONSTANTS.maxChatLength
        ) {

            Toast.warning(
                `پیام نمی‌تواند بیشتر از ${APP_CONSTANTS.maxChatLength} کاراکتر باشد.`
            );

            return;

        }


        const chat =
            ModuleRegistry.get(
                "chat"
            );


        if (
            chat &&
            typeof chat.sendMessage ===
            "function"
        ) {

            Promise.resolve(
                chat.sendMessage(message)
            )
            .then(
                () => {

                    input.value = "";

                }
            )
            .catch(
                error => {

                    console.error(
                        error
                    );

                    Toast.error(
                        "ارسال پیام انجام نشد."
                    );

                }
            );


            return;

        }


        /*
         * fallback برای حالت محلی
         */

        appendLocalChatMessage(
            message
        );


        input.value = "";

    }


    function appendLocalChatMessage(message) {

        const messages =
            DOM.get(
                "chat-messages"
            );


        if (!messages) {
            return;
        }


        const empty =
            messages.querySelector(
                ".chat-empty"
            );


        if (empty) {
            empty.remove();
        }


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "chat-message own-message";


        const text =
            document.createElement(
                "span"
            );


        text.textContent =
            message;


        item.appendChild(
            text
        );


        messages.appendChild(
            item
        );


        messages.scrollTop =
            messages.scrollHeight;


        EventBus.emit(
            EVENTS.CHAT_MESSAGE,
            {
                message,
                local: true
            }
        );

    }


    /* ============================================================
       29. MODAL INITIALIZATION
    ============================================================ */

    function initializeModals() {

        /*
         * Generic close buttons
         */

        const closeButtons =
            DOM.queryAll(
                "[data-close-modal]"
            );


        closeButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const modalId =
                            button.dataset.closeModal;


                        ModalManager.close(
                            modalId
                        );

                    }
                );

            }
        );


        /*
         * Close by clicking overlay
         */

        const overlays =
            DOM.queryAll(
                ".modal-overlay"
            );


        overlays.forEach(
            overlay => {

                overlay.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            overlay
                        ) {

                            ModalManager.close(
                                overlay.id
                            );

                        }

                    }
                );

            }
        );


        /*
         * Confirmation modal
         */

        const cancel =
            DOM.get(
                "confirmation-cancel"
            );


        if (cancel) {

            cancel.addEventListener(
                "click",
                () => {

                    ModalManager.close(
                        "confirmation-modal"
                    );

                }
            );

        }


        /*
         * Result modal
         */

        const continueButton =
            DOM.get(
                "result-continue-button"
            );


        if (continueButton) {

            continueButton.addEventListener(
                "click",
                () => {

                    ModalManager.close(
                        "game-result-modal"
                    );


                    PageManager.show(
                        "home"
                    );

                }
            );

        }


        /*
         * Game menu
         */

        const gameMenu =
            DOM.get(
                "game-menu-button"
            );


        if (gameMenu) {

            gameMenu.addEventListener(
                "click",
                () => {

                    ModalManager.open(
                        "game-menu-modal"
                    );

                }
            );

        }


        /*
         * Game rules
         */

        const rules =
            DOM.get(
                "game-rules-button"
            );


        if (rules) {

            rules.addEventListener(
                "click",
                () => {

                    ModalManager.close(
                        "game-menu-modal"
                    );


                    const game =
                        ModuleRegistry.get(
                            "game"
                        );


                    if (
                        game &&
                        typeof game.showRules ===
                        "function"
                    ) {

                        game.showRules();

                    } else {

                        Toast.info(
                            "قوانین حکم در بخش بازی نمایش داده می‌شود."
                        );

                    }

                }
            );

        }


        /*
         * Leave game
         */

        const leaveGame =
            DOM.get(
                "game-leave-button"
            );


        if (leaveGame) {

            leaveGame.addEventListener(
                "click",
                () => {

                    ModalManager.close(
                        "game-menu-modal"
                    );


                    showConfirmation(
                        "خروج از بازی",
                        "آیا مطمئن هستید که می‌خواهید از بازی خارج شوید؟",
                        "🚪",
                        () => {

                            const game =
                                ModuleRegistry.get(
                                    "game"
                                );


                            if (
                                game &&
                                typeof game.leave ===
                                "function"
                            ) {

                                game.leave();

                            }


                            const multiplayer =
                                ModuleRegistry.get(
                                    "multiplayer"
                                );


                            if (
                                multiplayer &&
                                typeof multiplayer.leaveGame ===
                                "function"
                            ) {

                                multiplayer.leaveGame();

                            }


                            AppState.game =
                                null;


                            PageManager.show(
                                "home"
                            );

                        }
                    );

                }
            );

        }

    }


    /* ============================================================
       30. CONFIRMATION SYSTEM
    ============================================================ */

    let pendingConfirmation = null;


    function showConfirmation(
        title,
        message,
        icon = "⚠️",
        onConfirm = null
    ) {

        DOM.text(
            "confirmation-title",
            title
        );


        DOM.text(
            "confirmation-message",
            message
        );


        DOM.text(
            "confirmation-icon",
            icon
        );


        pendingConfirmation =
            typeof onConfirm ===
            "function"
                ? onConfirm
                : null;


        ModalManager.open(
            "confirmation-modal"
        );

    }


    function initializeConfirmation() {

        const confirm =
            DOM.get(
                "confirmation-confirm"
            );


        if (confirm) {

            confirm.addEventListener(
                "click",
                () => {

                    const action =
                        pendingConfirmation;


                    pendingConfirmation =
                        null;


                    ModalManager.close(
                        "confirmation-modal"
                    );


                    if (action) {

                        try {

                            action();

                        } catch (error) {

                            App.reportError(
                                error,
                                "confirmation"
                            );

                        }

                    }

                }
            );

        }

    }


    /* ============================================================
       31. SETTINGS EVENTS
    ============================================================ */

    function initializeSettings() {

        const mappings = {

            "sound-setting":
                "sound",

            "music-setting":
                "music",

            "vibration-setting":
                "vibration",

            "dark-mode-setting":
                "darkMode"

        };


        Object.keys(mappings)
            .forEach(
                elementId => {

                    const element =
                        DOM.get(
                            elementId
                        );


                    if (!element) {
                        return;
                    }


                    element.addEventListener(
                        "change",
                        () => {

                            SettingsManager.update(
                                mappings[elementId],
                                element.checked
                            );


                            const settings =
                                ModuleRegistry.get(
                                    "settings"
                                );


                            if (
                                settings &&
                                typeof settings.update ===
                                "function"
                            ) {

                                try {

                                    settings.update(
                                        mappings[elementId],
                                        element.checked
                                    );

                                } catch (error) {

                                    console.warn(
                                        "[HOKM] Settings module error:",
                                        error
                                    );

                                }

                            }

                        }
                    );

                }
            );

    }


    /* ============================================================
       32. LOGOUT
    ============================================================ */

    function initializeLogout() {

        const button =
            DOM.get(
                "logout-button"
            );


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            () => {

                showConfirmation(
                    "خروج از حساب",
                    "آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟",
                    "🚪",
                    () => {

                        performLogout();

                    }
                );

            }
        );

    }


    async function performLogout() {

        try {

            const auth =
                ModuleRegistry.get(
                    "auth"
                );


            if (
                auth &&
                typeof auth.logout ===
                "function"
            ) {

                await auth.logout();

            }

        } catch (error) {

            console.error(
                "[HOKM] Logout error:",
                error
            );

        }


        UserManager.clearUser();


        AppState.room =
            null;

        AppState.game =
            null;


        PageManager.show(
            "home"
        );


        const mainScreen =
            DOM.get(
                "main-screen"
            );


        const authScreen =
            DOM.get(
                "auth-screen"
            );


        if (mainScreen) {
            DOM.hide(mainScreen);
        }


        if (authScreen) {
            DOM.show(authScreen);
        }


        Toast.success(
            "با موفقیت از حساب خارج شدید."
        );

    }


    /* ============================================================
       33. AUTHENTICATION STATE
    ============================================================ */

    async function initializeAuthentication() {

        UserManager.loadSavedUser();


        const auth =
            ModuleRegistry.get(
                "auth"
            );


        if (
            auth &&
            typeof auth.initialize ===
            "function"
        ) {

            try {

                await auth.initialize();

            } catch (error) {

                console.warn(
                    "[HOKM] Auth initialization warning:",
                    error
                );

            }

        }


        if (
            auth &&
            typeof auth.getCurrentUser ===
            "function"
        ) {

            try {

                const user =
                    await auth.getCurrentUser();


                if (user) {

                    UserManager.setUser(
                        user
                    );

                }

            } catch (error) {

                console.warn(
                    "[HOKM] Unable to retrieve current user:",
                    error
                );

            }

        }

    }


    /* ============================================================
       34. AUTH EVENTS
    ============================================================ */

    function initializeAuthEvents() {

        EventBus.on(
            EVENTS.USER_LOGIN,
            event => {

                const user =
                    event.detail &&
                    event.detail.user;


                if (user) {

                    UserManager.setUser(
                        user
                    );

                }


                showMainApplication();

            }
        );


        EventBus.on(
            EVENTS.USER_LOGOUT,
            () => {

                showAuthApplication();

            }
        );

    }


    function showMainApplication() {

        const loading =
            DOM.get(
                "loading-screen"
            );


        const auth =
            DOM.get(
                "auth-screen"
            );


        const main =
            DOM.get(
                "main-screen"
            );


        DOM.hide(
            loading
        );


        DOM.hide(
            auth
        );


        DOM.show(
            main
        );


        PageManager.show(
            AppState.currentPage ||
            "home"
        );


        UserManager.updateUI();

    }


    function showAuthApplication() {

        const loading =
            DOM.get(
                "loading-screen"
            );


        const auth =
            DOM.get(
                "auth-screen"
            );


        const main =
            DOM.get(
                "main-screen"
            );


        DOM.hide(
            loading
        );


        DOM.show(
            auth
        );


        DOM.hide(
            main
        );

    }


    /* ============================================================
       35. APP INITIALIZATION
    ============================================================ */

    async function initializeModules() {

        const moduleNames =
            Object.keys(
                AppState.modules
            );


        for (
            let index = 0;
            index < moduleNames.length;
            index++
        ) {

            const name =
                moduleNames[index];


            const module =
                AppState.modules[name];


            if (!module) {
                continue;
            }


            const initializeMethods = [

                "initialize",

                "init",

                "boot"

            ];


            for (
                let methodIndex = 0;
                methodIndex <
                initializeMethods.length;
                methodIndex++
            ) {

                const method =
                    initializeMethods[
                        methodIndex
                    ];


                if (
                    typeof module[method] ===
                    "function"
                ) {

                    try {

                        await module[method]();

                    } catch (error) {

                        console.error(
                            `[HOKM] Module ${name} initialization failed:`,
                            error
                        );

                        App.reportError(
                            error,
                            `module:${name}`
                        );

                    }


                    break;

                }

            }

        }

    }


    /* ============================================================
       36. GLOBAL UI INITIALIZATION
    ============================================================ */

    function initializeUI() {

        initializeNavigation();

        initializeQuickMatch();

        initializeRoomEvents();

        initializeGameEvents();

        initializeChat();

        initializeModals();

        initializeConfirmation();

        initializeSettings();

        initializeLogout();

    }


    /* ============================================================
       37. KEYBOARD / DEVICE EVENTS
    ============================================================ */

    function initializeDeviceEvents() {

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    if (
                        AppState.modal
                    ) {

                        ModalManager.close(
                            AppState.modal
                        );

                        return;

                    }


                    if (
                        AppState.chatOpen
                    ) {

                        closeChat();

                    }

                }

            }
        );


        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState ===
                    "visible"
                ) {

                    /*
                     * هنگام برگشت کاربر به برنامه،
                     * اطلاعات عمومی UI دوباره هماهنگ می‌شود.
                     */

                    UserManager.updateUI();

                    Connection.updateUI();

                }

            }
        );


        window.addEventListener(
            "beforeunload",
            () => {

                Storage.set(
                    "last_page",
                    AppState.currentPage
                );

            }
        );

    }


    /* ============================================================
       38. GLOBAL EVENT FORWARDING
    ============================================================ */

    function initializeGlobalEventForwarding() {

        /*
         * اگر ماژول‌های قبلی رویدادهای خودشان را با نام‌های
         * استاندارد ایجاد کنند، main.js آنها را به سیستم مرکزی
         * منتقل می‌کند.
         */


        window.addEventListener(
            "hokm-game-started",
            event => {

                EventBus.emit(
                    EVENTS.GAME_STARTED,
                    event.detail || {}
                );

            }
        );


        window.addEventListener(
            "hokm-game-ended",
            event => {

                EventBus.emit(
                    EVENTS.GAME_ENDED,
                    event.detail || {}
                );

            }
        );


        window.addEventListener(
            "hokm-card-played",
            event => {

                EventBus.emit(
                    EVENTS.CARD_PLAYED,
                    event.detail || {}
                );

            }
        );


        window.addEventListener(
            "hokm-room-created",
            event => {

                EventBus.emit(
                    EVENTS.ROOM_CREATED,
                    event.detail || {}
                );

            }
        );


        window.addEventListener(
            "hokm-room-joined",
            event => {

                EventBus.emit(
                    EVENTS.ROOM_JOINED,
                    event.detail || {}
                );

            }
        );


        window.addEventListener(
            "hokm-room-left",
            event => {

                EventBus.emit(
                    EVENTS.ROOM_LEFT,
                    event.detail || {}
                );

            }
        );


        window.addEventListener(
            "hokm-chat-message",
            event => {

                EventBus.emit(
                    EVENTS.CHAT_MESSAGE,
                    event.detail || {}
                );

            }
        );

    }


    /* ============================================================
       39. ERROR HANDLING
    ============================================================ */

    function reportError(
        error,
        source = "unknown"
    ) {

        const normalizedError =
            error instanceof Error
                ? error
                : new Error(
                    String(error)
                );


        console.error(
            `[HOKM ERROR] ${source}:`,
            normalizedError
        );


        EventBus.emit(
            EVENTS.APP_ERROR,
            {
                error:
                    normalizedError,

                source
            }
        );


        Accessibility.announce(
            "یک خطا در برنامه رخ داد."
        );

    }


    /* ============================================================
       40. GLOBAL ERROR LISTENERS
    ============================================================ */

    function initializeErrorHandling() {

        window.addEventListener(
            "error",
            event => {

                reportError(
                    event.error ||
                    event.message,
                    "window"
                );

            }
        );


        window.addEventListener(
            "unhandledrejection",
            event => {

                reportError(
                    event.reason,
                    "promise"
                );

            }
        );

    }


    /* ============================================================
       41. APPLICATION START
    ============================================================ */

    async function start() {

        if (AppState.started) {
            return;
        }


        AppState.started = true;


        Loading.start();


        try {

            Loading.message(
                "در حال بارگذاری سیستم بازی..."
            );


            /*
             * ابتدا فایل‌های لازم را پیدا/بارگذاری می‌کنیم.
             */

            await loadMissingModules();


            Loading.message(
                "در حال آماده‌سازی تنظیمات..."
            );


            SettingsManager.load();


            Connection.initialize();


            initializeErrorHandling();

            initializeGlobalEventForwarding();

            initializeDeviceEvents();


            Loading.message(
                "در حال اتصال بخش‌های بازی..."
            );


            /*
             * بعد از کشف ماژول‌ها،
             * آنها را initialize می‌کنیم.
             */

            await initializeModules();


            /*
             * دوباره ماژول‌ها را کشف می‌کنیم،
             * چون ممکن است هنگام initialize
             * ماژول‌های جدیدی روی window ثبت شده باشند.
             */

            discoverModules();


            Loading.message(
                "در حال آماده‌سازی رابط کاربری..."
            );


            initializeUI();


            initializeAuthEvents();


            await initializeAuthentication();


            /*
             * اگر کاربر از قبل وارد باشد،
             * مستقیماً وارد برنامه می‌شود.
             */

            if (AppState.currentUser) {

                showMainApplication();

            } else {

                /*
                 * اگر سیستم Auth خودش کاربر را پیدا نکرده،
                 * صفحه ورود نمایش داده می‌شود.
                 */

                showAuthApplication();

            }


            AppState.initialized =
                true;


            Loading.finish();


            EventBus.emit(
                EVENTS.APP_READY,
                {
                    version:
                        MAIN_VERSION
                }
            );


            EventBus.emit(
                EVENTS.APP_STARTED,
                {
                    version:
                        MAIN_VERSION
                }
            );


            console.log(
                `[HOKM] Application started successfully. Version ${MAIN_VERSION}`
            );


        } catch (error) {

            reportError(
                error,
                "application-start"
            );


            Loading.message(
                "خطایی هنگام آماده‌سازی برنامه رخ داد."
            );


            /*
             * حتی در صورت خطای یکی از ماژول‌ها،
             * تلاش می‌کنیم UI اصلی قابل استفاده بماند.
             */

            try {

                initializeUI();

            } catch (uiError) {

                console.error(
                    "[HOKM] UI initialization failed:",
                    uiError
                );

            }


            Loading.finish();


            showAuthApplication();

        }

    }


    /* ============================================================
       42. PUBLIC APPLICATION API
    ============================================================ */

    const App = {

        version:
            MAIN_VERSION,


        constants:
            APP_CONSTANTS,


        events:
            EVENTS,


        state:
            AppState,


        eventsBus:
            EventBus,


        storage:
            Storage,


        modules:
            ModuleRegistry,


        dom:
            DOM,


        toast:
            Toast,


        loading:
            Loading,


        connection:
            Connection,


        pages:
            PageManager,


        modals:
            ModalManager,


        user:
            UserManager,


        settings:
            SettingsManager,


        start,


        reportError,


        navigate(page, options) {

            PageManager.show(
                page,
                options
            );

        },


        goBack() {

            PageManager.back();

        },


        openModal(modalId) {

            return ModalManager.open(
                modalId
            );

        },


        closeModal(modalId) {

            return ModalManager.close(
                modalId
            );

        },


        showConfirmation,


        startMatch,


        openChat,


        closeChat,


        sendChatMessage,


        refreshHome

    };


    /* ============================================================
       43. GLOBAL OBJECTS
    ============================================================ */

    window.HokmMain =
        App;


    window.HokmApp =
        App;


    window.HokmEvents =
        EVENTS;


    window.HokmEventBus =
        EventBus;


    window.HokmStorage =
        Storage;


    window.HokmState =
        AppState;


    /* ============================================================
       44. CUSTOM GLOBAL API
    ============================================================ */

    window.Hokm = {

        version:
            MAIN_VERSION,

        app:
            App,

        state:
            AppState,

        events:
            EVENTS,

        eventBus:
            EventBus,

        storage:
            Storage,

        toast:
            Toast,

        navigate:
            PageManager.show.bind(
                PageManager
            ),

        openModal:
            ModalManager.open.bind(
                ModalManager
            ),

        closeModal:
            ModalManager.close.bind(
                ModalManager
            ),

        startGame:
            startMatch

    };


    /* ============================================================
       45. DOM READY
    ============================================================ */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            () => {

                start();

            },
            {
                once: true
            }
        );

    } else {

        start();

    }


})();    
