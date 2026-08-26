/* ============================================================
   HOKM ONLINE
   network.js
   مرحله ۲۲

   وظیفه این فایل:
   ------------------------------------------------------------
   1. مدیریت اتصال اینترنت
   2. مدیریت WebSocket
   3. اتصال REST API
   4. اتصال مجدد خودکار
   5. Heartbeat / Ping
   6. صف پیام‌های ارسال‌نشده
   7. مدیریت وضعیت Online / Offline
   8. Event Bus شبکه
   9. مدیریت Request های HTTP
   10. مدیریت خطاهای شبکه
   11. Timeout
   12. لغو درخواست‌ها
   13. مدیریت Session
   14. ارسال و دریافت پیام‌های بازی
   15. آماده‌سازی برای Multiplayer واقعی
   16. آماده‌سازی برای Chat
   17. آماده‌سازی برای Room
   18. آماده‌سازی برای Reconnect به بازی
   19. جلوگیری از چند اتصال همزمان
   20. سازگاری با موبایل
   ============================================================ */

(function () {

    "use strict";

    /* =========================================================
       GLOBAL NAMESPACE
       ========================================================= */

    window.Hokm = window.Hokm || {};

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const DEFAULT_CONFIG = {

        /*
         * آدرس API
         *
         * در زمان توسعه می‌توانی آن را تغییر بدهی.
         *
         * مثال:
         * https://api.example.com
         */

        apiBaseUrl: "",


        /*
         * آدرس WebSocket
         *
         * مثال:
         * wss://api.example.com/ws
         */

        websocketUrl: "",


        /*
         * زمان Timeout درخواست‌های HTTP
         */

        requestTimeout: 15000,


        /*
         * زمان انتظار اتصال WebSocket
         */

        websocketTimeout: 10000,


        /*
         * فاصله Heartbeat
         */

        heartbeatInterval: 15000,


        /*
         * حداکثر زمان عدم دریافت پاسخ Heartbeat
         */

        heartbeatTimeout: 10000,


        /*
         * حداکثر تعداد تلاش برای اتصال مجدد
         *
         * 0 یعنی نامحدود
         */

        maxReconnectAttempts: 0,


        /*
         * تأخیر اولیه Reconnect
         */

        reconnectBaseDelay: 1000,


        /*
         * حداکثر تأخیر Reconnect
         */

        reconnectMaxDelay: 30000,


        /*
         * تعداد پیام‌هایی که می‌توانند در صف باقی بمانند
         */

        maxQueueSize: 100,


        /*
         * آیا در حالت توسعه Log نمایش داده شود؟
         */

        debug: true,


        /*
         * استفاده از credentials در Fetch
         */

        credentials: "include"
    };


    /* =========================================================
       USER CONFIGURATION
       ========================================================= */

    const CONFIG = Object.assign(
        {},
        DEFAULT_CONFIG,
        window.HOKM_NETWORK_CONFIG || {}
    );


    /* =========================================================
       NETWORK STATES
       ========================================================= */

    const NETWORK_STATE = Object.freeze({

        OFFLINE: "offline",

        CONNECTING: "connecting",

        CONNECTED: "connected",

        RECONNECTING: "reconnecting",

        DISCONNECTING: "disconnecting",

        DISCONNECTED: "disconnected",

        ERROR: "error"
    });


    /* =========================================================
       WEBSOCKET STATES
       ========================================================= */

    const SOCKET_STATE = Object.freeze({

        CLOSED: 0,

        CONNECTING: 1,

        OPEN: 2,

        CLOSING: 3
    });


    /* =========================================================
       EVENT NAMES
       ========================================================= */

    const EVENTS = Object.freeze({

        NETWORK_ONLINE: "network:online",

        NETWORK_OFFLINE: "network:offline",

        NETWORK_CONNECTING: "network:connecting",

        NETWORK_CONNECTED: "network:connected",

        NETWORK_DISCONNECTED: "network:disconnected",

        NETWORK_RECONNECTING: "network:reconnecting",

        NETWORK_ERROR: "network:error",

        SOCKET_OPEN: "socket:open",

        SOCKET_CLOSE: "socket:close",

        SOCKET_ERROR: "socket:error",

        SOCKET_MESSAGE: "socket:message",

        SOCKET_RECONNECT: "socket:reconnect",

        REQUEST_START: "request:start",

        REQUEST_SUCCESS: "request:success",

        REQUEST_ERROR: "request:error",

        REQUEST_TIMEOUT: "request:timeout",

        QUEUE_ADDED: "queue:added",

        QUEUE_SENT: "queue:sent",

        QUEUE_FAILED: "queue:failed",

        HEARTBEAT_START: "heartbeat:start",

        HEARTBEAT_STOP: "heartbeat:stop",

        HEARTBEAT_TIMEOUT: "heartbeat:timeout",

        SESSION_CHANGED: "session:changed",

        AUTH_REQUIRED: "auth:required",

        SERVER_ERROR: "server:error",

        MESSAGE_SENT: "message:sent",

        MESSAGE_RECEIVED: "message:received"
    });


    /* =========================================================
       UTILITY FUNCTIONS
       ========================================================= */

    function now() {

        return Date.now();

    }


    function generateId(prefix) {

        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).substring(2, 10)
        );

    }


    function isObject(value) {

        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );

    }


    function sleep(milliseconds) {

        return new Promise(function (resolve) {

            setTimeout(resolve, milliseconds);

        });

    }


    function safeJsonParse(value) {

        if (typeof value !== "string") {

            return value;

        }

        try {

            return JSON.parse(value);

        } catch (error) {

            return value;

        }

    }


    function safeJsonStringify(value) {

        try {

            return JSON.stringify(value);

        } catch (error) {

            return null;

        }

    }


    function normalizeUrl(baseUrl, path) {

        if (!path) {

            return baseUrl || "";

        }


        if (
            path.startsWith("http://") ||
            path.startsWith("https://") ||
            path.startsWith("ws://") ||
            path.startsWith("wss://")
        ) {

            return path;

        }


        if (!baseUrl) {

            return path;

        }


        return (
            baseUrl.replace(/\/+$/, "") +
            "/" +
            path.replace(/^\/+/, "")
        );

    }


    function calculateReconnectDelay(attempt) {

        const exponentialDelay =
            CONFIG.reconnectBaseDelay *
            Math.pow(2, Math.max(0, attempt - 1));


        const cappedDelay = Math.min(
            exponentialDelay,
            CONFIG.reconnectMaxDelay
        );


        /*
         * مقدار کمی Jitter برای جلوگیری از اینکه
         * تعداد زیادی Client همزمان Reconnect کنند.
         */

        const jitter =
            Math.floor(
                Math.random() *
                Math.min(1000, cappedDelay * 0.25)
            );


        return cappedDelay + jitter;

    }


    /* =========================================================
       EVENT BUS
       ========================================================= */

    class NetworkEventBus {

        constructor() {

            this.listeners = new Map();

        }


        on(eventName, callback) {

            if (
                typeof callback !== "function"
            ) {

                return function () {};

            }


            if (!this.listeners.has(eventName)) {

                this.listeners.set(
                    eventName,
                    new Set()
                );

            }


            const callbacks =
                this.listeners.get(eventName);


            callbacks.add(callback);


            return () => {

                this.off(
                    eventName,
                    callback
                );

            };

        }


        once(eventName, callback) {

            const unsubscribe =
                this.on(
                    eventName,
                    (...args) => {

                        unsubscribe();

                        callback(...args);

                    }
                );


            return unsubscribe;

        }


        off(eventName, callback) {

            const callbacks =
                this.listeners.get(eventName);


            if (!callbacks) {

                return;

            }


            callbacks.delete(callback);


            if (callbacks.size === 0) {

                this.listeners.delete(eventName);

            }

        }


        emit(eventName, data) {

            const callbacks =
                this.listeners.get(eventName);


            if (!callbacks) {

                return;

            }


            callbacks.forEach(function (callback) {

                try {

                    callback(data);

                } catch (error) {

                    console.error(
                        "[HOKM NETWORK] Event listener error:",
                        error
                    );

                }

            });

        }


        clear() {

            this.listeners.clear();

        }

    }


    /* =========================================================
       NETWORK MANAGER
       ========================================================= */

    class NetworkManager {

        constructor(config) {

            this.config = Object.assign(
                {},
                DEFAULT_CONFIG,
                config || {}
            );


            /* -------------------------------------------------
               Core
            ------------------------------------------------- */

            this.events =
                new NetworkEventBus();


            this.state =
                navigator.onLine
                    ? NETWORK_STATE.DISCONNECTED
                    : NETWORK_STATE.OFFLINE;


            this.socket = null;


            this.socketGeneration = 0;


            this.connectionPromise = null;


            this.connectionResolve = null;


            this.connectionReject = null;


            /* -------------------------------------------------
               Reconnect
            ------------------------------------------------- */

            this.reconnectTimer = null;

            this.reconnectAttempts = 0;

            this.shouldReconnect = true;


            /* -------------------------------------------------
               Heartbeat
            ------------------------------------------------- */

            this.heartbeatTimer = null;

            this.heartbeatTimeoutTimer = null;

            this.lastHeartbeatSentAt = 0;

            this.lastHeartbeatReceivedAt = 0;


            /* -------------------------------------------------
               Queue
            ------------------------------------------------- */

            this.messageQueue = [];


            /* -------------------------------------------------
               Pending Requests
            ------------------------------------------------- */

            this.pendingRequests = new Map();


            /* -------------------------------------------------
               Session
            ------------------------------------------------- */

            this.session = {

                token: null,

                refreshToken: null,

                userId: null,

                deviceId: null,

                roomId: null,

                matchId: null
            };


            /* -------------------------------------------------
               Metrics
            ------------------------------------------------- */

            this.metrics = {

                connectedAt: null,

                disconnectedAt: null,

                reconnectCount: 0,

                messagesSent: 0,

                messagesReceived: 0,

                requestsSent: 0,

                requestsFailed: 0,

                lastError: null
            };


            /* -------------------------------------------------
               Bind browser events
            ------------------------------------------------- */

            this.bindBrowserEvents();


            /*
             * Device ID
             */

            this.ensureDeviceId();

        }


        /* =====================================================
           LOGGING
        ===================================================== */

        log() {

            if (!this.config.debug) {

                return;

            }


            const args =
                Array.from(arguments);


            console.log(
                "[HOKM NETWORK]",
                ...args
            );

        }


        warn() {

            if (!this.config.debug) {

                return;

            }


            const args =
                Array.from(arguments);


            console.warn(
                "[HOKM NETWORK]",
                ...args
            );

        }


        error() {

            const args =
                Array.from(arguments);


            console.error(
                "[HOKM NETWORK]",
                ...args
            );

        }


        /* =====================================================
           BROWSER EVENTS
           ===================================================== */

        bindBrowserEvents() {

            window.addEventListener(
                "online",
                () => {

                    this.handleBrowserOnline();

                }
            );


            window.addEventListener(
                "offline",
                () => {

                    this.handleBrowserOffline();

                }
            );


            /*
             * وقتی صفحه دوباره Visible می‌شود،
             * وضعیت اتصال بررسی می‌شود.
             */

            document.addEventListener(
                "visibilitychange",
                () => {

                    if (
                        document.visibilityState ===
                        "visible"
                    ) {

                        this.handleVisibilityChange();

                    }

                }
            );


            /*
             * قبل از بسته شدن صفحه
             */

            window.addEventListener(
                "beforeunload",
                () => {

                    this.stopHeartbeat();

                }
            );

        }


        handleBrowserOnline() {

            this.setState(
                NETWORK_STATE.CONNECTING
            );


            this.events.emit(
                EVENTS.NETWORK_ONLINE,
                {
                    timestamp: now()
                }
            );


            if (
                !this.isSocketConnected()
            ) {

                this.scheduleReconnect(
                    0
                );

            }

        }


        handleBrowserOffline() {

            this.setState(
                NETWORK_STATE.OFFLINE
            );


            this.stopHeartbeat();


            this.events.emit(
                EVENTS.NETWORK_OFFLINE,
                {
                    timestamp: now()
                }
            );

        }


        handleVisibilityChange() {

            if (
                navigator.onLine &&
                !this.isSocketConnected() &&
                this.shouldReconnect
            ) {

                this.scheduleReconnect(
                    0
                );

            }

        }


        /* =====================================================
           DEVICE ID
        ===================================================== */

        ensureDeviceId() {

            const STORAGE_KEY =
                "hokm_device_id";


            try {

                let deviceId =
                    localStorage.getItem(
                        STORAGE_KEY
                    );


                if (!deviceId) {

                    deviceId =
                        generateId("device");


                    localStorage.setItem(
                        STORAGE_KEY,
                        deviceId
                    );

                }


                this.session.deviceId =
                    deviceId;


            } catch (error) {

                this.session.deviceId =
                    generateId("device");

            }

        }


        /* =====================================================
           STATE
        ===================================================== */

        setState(newState) {

            const oldState =
                this.state;


            this.state =
                newState;


            this.log(
                "State:",
                oldState,
                "→",
                newState
            );


            if (
                newState ===
                NETWORK_STATE.CONNECTING
            ) {

                this.events.emit(
                    EVENTS.NETWORK_CONNECTING,
                    {
                        oldState,
                        newState
                    }
                );

            }


            if (
                newState ===
                NETWORK_STATE.CONNECTED
            ) {

                this.events.emit(
                    EVENTS.NETWORK_CONNECTED,
                    {
                        oldState,
                        newState
                    }
                );

            }


            if (
                newState ===
                NETWORK_STATE.RECONNECTING
            ) {

                this.events.emit(
                    EVENTS.NETWORK_RECONNECTING,
                    {
                        oldState,
                        newState
                    }
                );

            }


            if (
                newState ===
                NETWORK_STATE.DISCONNECTED
            ) {

                this.events.emit(
                    EVENTS.NETWORK_DISCONNECTED,
                    {
                        oldState,
                        newState
                    }
                );

            }


            if (
                newState ===
                NETWORK_STATE.ERROR
            ) {

                this.events.emit(
                    EVENTS.NETWORK_ERROR,
                    {
                        oldState,
                        newState
                    }
                );

            }

        }


        getState() {

            return this.state;

        }


        isOnline() {

            return navigator.onLine;

        }


        isSocketConnected() {

            return (
                this.socket !== null &&
                this.socket.readyState ===
                SOCKET_STATE.OPEN
            );

        }


        /* =====================================================
           SESSION
        ===================================================== */

        setSession(data) {

            if (!isObject(data)) {

                return;

            }


            this.session =
                Object.assign(
                    {},
                    this.session,
                    data
                );


            this.events.emit(
                EVENTS.SESSION_CHANGED,
                this.getSession()
            );

        }


        getSession() {

            return Object.assign(
                {},
                this.session
            );

        }


        clearSession() {

            this.session.token = null;

            this.session.refreshToken = null;

            this.session.userId = null;

            this.session.roomId = null;

            this.session.matchId = null;


            this.events.emit(
                EVENTS.SESSION_CHANGED,
                this.getSession()
            );

        }


        setToken(token) {

            this.session.token =
                token || null;


            this.events.emit(
                EVENTS.SESSION_CHANGED,
                this.getSession()
            );

        }


        getToken() {

            return this.session.token;

        }


        /* =====================================================
           WEBSOCKET CONNECT
        ===================================================== */

        connect(options) {

            options =
                options || {};


            if (!navigator.onLine) {

                this.setState(
                    NETWORK_STATE.OFFLINE
                );


                return Promise.reject(
                    new Error(
                        "اتصال اینترنت در دسترس نیست."
                    )
                );

            }


            if (this.isSocketConnected()) {

                return Promise.resolve(
                    this.socket
                );

            }


            if (
                this.connectionPromise
            ) {

                return this.connectionPromise;

            }


            this.shouldReconnect = true;


            this.setState(
                this.reconnectAttempts > 0
                    ? NETWORK_STATE.RECONNECTING
                    : NETWORK_STATE.CONNECTING
            );


            this.connectionPromise =
                new Promise(
                    (resolve, reject) => {

                        this.connectionResolve =
                            resolve;

                        this.connectionReject =
                            reject;


                        this.openSocket(
                            options
                        );

                    }
                );


            return this.connectionPromise;

        }


        /* =====================================================
           OPEN SOCKET
        ===================================================== */

        openSocket(options) {

            options =
                options || {};


            if (
                !this.config.websocketUrl
            ) {

                const error =
                    new Error(
                        "آدرس WebSocket تنظیم نشده است."
                    );


                this.handleConnectionFailure(
                    error
                );


                return;

            }


            const generation =
                ++this.socketGeneration;


            let url =
                this.config.websocketUrl;


            /*
             * اگر Token داشته باشیم،
             * به صورت Query String اضافه نمی‌کنیم.
             *
             * Token اصلی باید ترجیحاً از
             * Header در Backend مدیریت شود.
             *
             * برای WebSocket Browser امکان Header
             * دلخواه وجود ندارد؛ بنابراین Backend
             * باید Cookie یا پروتکل احراز هویت
             * خود WebSocket را پشتیبانی کند.
             */


            try {

                const socket =
                    new WebSocket(url);


                this.socket =
                    socket;


                socket.addEventListener(
                    "open",
                    () => {

                        if (
                            generation !==
                            this.socketGeneration
                        ) {

                            return;

                        }


                        this.handleSocketOpen(
                            socket
                        );

                    }
                );


                socket.addEventListener(
                    "message",
                    (event) => {

                        if (
                            generation !==
                            this.socketGeneration
                        ) {

                            return;

                        }


                        this.handleSocketMessage(
                            event
                        );

                    }
                );


                socket.addEventListener(
                    "error",
                    (event) => {

                        if (
                            generation !==
                            this.socketGeneration
                        ) {

                            return;

                        }


                        this.handleSocketError(
                            event
                        );

                    }
                );


                socket.addEventListener(
                    "close",
                    (event) => {

                        if (
                            generation !==
                            this.socketGeneration
                        ) {

                            return;

                        }


                        this.handleSocketClose(
                            event
                        );

                    }
                );


                /*
                 * Timeout اتصال
                 */

                setTimeout(
                    () => {

                        if (
                            generation !==
                            this.socketGeneration
                        ) {

                            return;

                        }


                        if (
                            socket.readyState ===
                            SOCKET_STATE.CONNECTING
                        ) {

                            try {

                                socket.close();

                            } catch (error) {}

                        }

                    },
                    this.config.websocketTimeout
                );


            } catch (error) {

                this.handleConnectionFailure(
                    error
                );

            }

        }


        /* =====================================================
           SOCKET OPEN
        ===================================================== */

        handleSocketOpen(socket) {

            this.log(
                "WebSocket connected."
            );


            this.metrics.connectedAt =
                now();


            this.reconnectAttempts =
                0;


            this.setState(
                NETWORK_STATE.CONNECTED
            );


            this.events.emit(
                EVENTS.SOCKET_OPEN,
                {
                    socket,
                    timestamp: now()
                }
            );


            this.startHeartbeat();


            /*
             * بعد از اتصال دوباره،
             * اطلاعات Session را برای Server می‌فرستیم.
             */

            this.sendRaw({
                type: "session:resume",

                payload: {

                    token:
                        this.session.token,

                    userId:
                        this.session.userId,

                    deviceId:
                        this.session.deviceId,

                    roomId:
                        this.session.roomId,

                    matchId:
                        this.session.matchId
                }
            });


            /*
             * ارسال پیام‌های صف‌شده
             */

            this.flushMessageQueue();


            if (
                this.connectionResolve
            ) {

                this.connectionResolve(
                    socket
                );

            }


            this.clearConnectionPromise();

        }


        /* =====================================================
           CONNECTION FAILURE
        ===================================================== */

        handleConnectionFailure(error) {

            this.metrics.lastError =
                error;


            this.setState(
                NETWORK_STATE.ERROR
            );


            this.events.emit(
                EVENTS.NETWORK_ERROR,
                {
                    error
                }
            );


            if (
                this.connectionReject
            ) {

                this.connectionReject(
                    error
                );

            }


            this.clearConnectionPromise();


            if (
                this.shouldReconnect &&
                navigator.onLine
            ) {

                this.scheduleReconnect();

            }

        }


        clearConnectionPromise() {

            this.connectionPromise =
                null;

            this.connectionResolve =
                null;

            this.connectionReject =
                null;

        }


        /* =====================================================
           SOCKET MESSAGE
        ===================================================== */

        handleSocketMessage(event) {

            this.metrics.messagesReceived++;


            let message =
                safeJsonParse(
                    event.data
                );


            /*
             * Heartbeat
             */

            if (
                message &&
                typeof message === "object"
            ) {

                if (
                    message.type ===
                    "pong"
                ) {

                    this.handlePong(
                        message
                    );

                    return;

                }


                if (
                    message.type ===
                    "ping"
                ) {

                    this.sendRaw({
                        type: "pong",
                        timestamp: now()
                    });


                    return;

                }

            }


            this.events.emit(
                EVENTS.SOCKET_MESSAGE,
                message
            );


            this.events.emit(
                EVENTS.MESSAGE_RECEIVED,
                message
            );


            /*
             * خطاهای Server
             */

            if (
                message &&
                message.type ===
                "error"
            ) {

                this.events.emit(
                    EVENTS.SERVER_ERROR,
                    message
                );

            }


            /*
             * Authentication
             */

            if (
                message &&
                (
                    message.type ===
                    "auth_required" ||
                    message.type ===
                    "session_expired"
                )
            ) {

                this.events.emit(
                    EVENTS.AUTH_REQUIRED,
                    message
                );

            }

        }


        /* =====================================================
           SOCKET ERROR
        ===================================================== */

        handleSocketError(event) {

            this.log(
                "WebSocket error:",
                event
            );


            this.metrics.lastError =
                event;


            this.events.emit(
                EVENTS.SOCKET_ERROR,
                event
            );


            this.events.emit(
                EVENTS.NETWORK_ERROR,
                {
                    type: "websocket",
                    error: event
                }
            );

        }


        /* =====================================================
           SOCKET CLOSE
        ===================================================== */

        handleSocketClose(event) {

            this.log(
                "WebSocket closed:",
                event.code,
                event.reason
            );


            this.metrics.disconnectedAt =
                now();


            this.stopHeartbeat();


            this.events.emit(
                EVENTS.SOCKET_CLOSE,
                {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean
                }
            );


            if (
                this.state !==
                NETWORK_STATE.OFFLINE
            ) {

                this.setState(
                    NETWORK_STATE.DISCONNECTED
                );

            }


            if (
                this.shouldReconnect &&
                navigator.onLine
            ) {

                this.scheduleReconnect();

            }

        }


        /* =====================================================
           DISCONNECT
        ===================================================== */

        disconnect(options) {

            options =
                options || {};


            this.shouldReconnect =
                options.reconnect === true;


            this.cancelReconnect();


            this.stopHeartbeat();


            this.setState(
                NETWORK_STATE.DISCONNECTING
            );


            if (this.socket) {

                try {

                    this.socket.close(
                        1000,
                        options.reason ||
                        "Client disconnect"
                    );

                } catch (error) {

                    this.warn(
                        "Socket close error:",
                        error
                    );

                }

            }


            this.socket =
                null;


            this.setState(
                NETWORK_STATE.DISCONNECTED
            );

        }


        /* =====================================================
           RECONNECT
        ===================================================== */

        scheduleReconnect(delay) {

            if (
                !this.shouldReconnect
            ) {

                return;

            }


            if (
                !navigator.onLine
            ) {

                return;

            }


            if (
                this.isSocketConnected()
            ) {

                return;

            }


            if (
                this.reconnectTimer
            ) {

                return;

            }


            this.reconnectAttempts++;


            if (
                this.config.maxReconnectAttempts > 0 &&
                this.reconnectAttempts >
                this.config.maxReconnectAttempts
            ) {

                this.warn(
                    "Maximum reconnect attempts reached."
                );


                return;

            }


            const reconnectDelay =
                typeof delay === "number"
                    ? delay
                    : calculateReconnectDelay(
                        this.reconnectAttempts
                    );


            this.metrics.reconnectCount++;


            this.setState(
                NETWORK_STATE.RECONNECTING
            );


            this.events.emit(
                EVENTS.SOCKET_RECONNECT,
                {
                    attempt:
                        this.reconnectAttempts,

                    delay:
                        reconnectDelay
                }
            );


            this.reconnectTimer =
                setTimeout(
                    () => {

                        this.reconnectTimer =
                            null;


                        if (
                            !navigator.onLine ||
                            !this.shouldReconnect
                        ) {

                            return;

                        }


                        this.connect()
                            .catch(
                                () => {}
                            );

                    },
                    reconnectDelay
                );

        }


        cancelReconnect() {

            if (
                this.reconnectTimer
            ) {

                clearTimeout(
                    this.reconnectTimer
                );

                this.reconnectTimer =
                    null;

            }

        }


        /* =====================================================
           HEARTBEAT
        ===================================================== */

        startHeartbeat() {

            this.stopHeartbeat();


            this.events.emit(
                EVENTS.HEARTBEAT_START,
                {
                    timestamp: now()
                }
            );


            this.lastHeartbeatReceivedAt =
                now();


            this.heartbeatTimer =
                setInterval(
                    () => {

                        this.sendHeartbeat();

                    },
                    this.config.heartbeatInterval
                );


            /*
             * اولین Ping
             */

            this.sendHeartbeat();

        }


        stopHeartbeat() {

            if (
                this.heartbeatTimer
            ) {

                clearInterval(
                    this.heartbeatTimer
                );

                this.heartbeatTimer =
                    null;

            }


            if (
                this.heartbeatTimeoutTimer
            ) {

                clearTimeout(
                    this.heartbeatTimeoutTimer
                );

                this.heartbeatTimeoutTimer =
                    null;

            }


            this.events.emit(
                EVENTS.HEARTBEAT_STOP,
                {
                    timestamp: now()
                }
            );

        }


        sendHeartbeat() {

            if (
                !this.isSocketConnected()
            ) {

                return;

            }


            const timestamp =
                now();


            this.lastHeartbeatSentAt =
                timestamp;


            this.sendRaw({

                type: "ping",

                timestamp

            });


            if (
                this.heartbeatTimeoutTimer
            ) {

                clearTimeout(
                    this.heartbeatTimeoutTimer
                );

            }


            this.heartbeatTimeoutTimer =
                setTimeout(
                    () => {

                        const elapsed =
                            now() -
                            this.lastHeartbeatReceivedAt;


                        if (
                            elapsed >=
                            this.config.heartbeatTimeout
                        ) {

                            this.handleHeartbeatTimeout();

                        }

                    },
                    this.config.heartbeatTimeout
                );

        }


        handlePong(message) {

            this.lastHeartbeatReceivedAt =
                now();


            if (
                this.heartbeatTimeoutTimer
            ) {

                clearTimeout(
                    this.heartbeatTimeoutTimer
                );

                this.heartbeatTimeoutTimer =
                    null;

            }


            this.events.emit(
                "heartbeat:pong",
                {
                    message,
                    timestamp: now()
                }
            );

        }


        handleHeartbeatTimeout() {

            this.events.emit(
                EVENTS.HEARTBEAT_TIMEOUT,
                {
                    timestamp: now()
                }
            );


            this.warn(
                "Heartbeat timeout."
            );


            if (
                this.socket
            ) {

                try {

                    this.socket.close();

                } catch (error) {}

            }

        }


        /* =====================================================
           SEND RAW
        ===================================================== */

        sendRaw(data) {

            if (
                !this.isSocketConnected()
            ) {

                return false;

            }


            const serialized =
                typeof data === "string"
                    ? data
                    : safeJsonStringify(data);


            if (
                serialized === null
            ) {

                return false;

            }


            try {

                this.socket.send(
                    serialized
                );


                this.metrics.messagesSent++;


                this.events.emit(
                    EVENTS.MESSAGE_SENT,
                    data
                );


                return true;


            } catch (error) {

                this.warn(
                    "Socket send failed:",
                    error
                );


                return false;

            }

        }


        /* =====================================================
           SEND MESSAGE
        ===================================================== */

        send(type, payload, options) {

            options =
                options || {};


            const message = {

                id:
                    options.id ||
                    generateId("msg"),

                type,

                payload:
                    payload === undefined
                        ? null
                        : payload,

                timestamp:
                    now()
            };


            /*
             * اگر اتصال برقرار است
             */

            if (
                this.isSocketConnected()
            ) {

                const sent =
                    this.sendRaw(
                        message
                    );


                if (sent) {

                    return Promise.resolve(
                        message
                    );

                }

            }


            /*
             * اگر اجازه Queue داشته باشیم
             */

            if (
                options.queue !== false
            ) {

                const queued =
                    this.queueMessage(
                        message,
                        options
                    );


                if (queued) {

                    return Promise.resolve(
                        {
                            queued: true,
                            message
                        }
                    );

                }

            }


            return Promise.reject(
                new Error(
                    "اتصال به سرور برقرار نیست."
                )
            );

        }


        /* =====================================================
           QUEUE MESSAGE
        ===================================================== */

        queueMessage(message, options) {

            options =
                options || {};


            if (
                this.messageQueue.length >=
                this.config.maxQueueSize
            ) {

                /*
                 * پیام‌های قدیمی‌تر حذف می‌شوند
                 * تا حافظه بیش از حد مصرف نشود.
                 */

                this.messageQueue.shift();

            }


            this.messageQueue.push({

                id:
                    generateId("queue"),

                message,

                createdAt:
                    now(),

                expiresAt:
                    options.ttl
                        ? now() + options.ttl
                        : null
            });


            this.events.emit(
                EVENTS.QUEUE_ADDED,
                {
                    message
                }
            );


            return true;

        }


        /* =====================================================
           FLUSH MESSAGE QUEUE
        ===================================================== */

        flushMessageQueue() {

            if (
                !this.isSocketConnected()
            ) {

                return;

            }


            if (
                this.messageQueue.length === 0
            ) {

                return;

            }


            const queue =
                [...this.messageQueue];


            this.messageQueue =
                [];


            queue.forEach(
                item => {

                    /*
                     * بررسی Expiration
                     */

                    if (
                        item.expiresAt &&
                        now() >
                        item.expiresAt
                    ) {

                        this.events.emit(
                            EVENTS.QUEUE_FAILED,
                            {
                                item,
                                reason:
                                    "expired"
                            }
                        );


                        return;

                    }


                    const sent =
                        this.sendRaw(
                            item.message
                        );


                    if (sent) {

                        this.events.emit(
                            EVENTS.QUEUE_SENT,
                            {
                                item
                            }
                        );

                    } else {

                        /*
                         * اگر ارسال نشد،
                         * دوباره به صف برگردد.
                         */

                        this.messageQueue.push(
                            item
                        );

                    }

                }
            );

        }


        /* =====================================================
           CLEAR QUEUE
        ===================================================== */

        clearQueue() {

            this.messageQueue =
                [];

        }


        /* =====================================================
           QUEUE SIZE
        ===================================================== */

        getQueueSize() {

            return this.messageQueue.length;

        }


        /* =====================================================
           HTTP REQUEST
        ===================================================== */

        async request(path, options) {

            options =
                options || {};


            const requestId =
                generateId("request");


            const method =
                (
                    options.method ||
                    "GET"
                ).toUpperCase();


            const url =
                normalizeUrl(
                    this.config.apiBaseUrl,
                    path
                );


            const controller =
                new AbortController();


            const timeout =
                typeof options.timeout === "number"
                    ? options.timeout
                    : this.config.requestTimeout;


            const timeoutId =
                setTimeout(
                    () => {

                        controller.abort();

                    },
                    timeout
                );


            const headers =
                new Headers(
                    options.headers || {}
                );


            /*
             * JSON Header
             */

            if (
                options.body !== undefined &&
                options.body !== null &&
                !headers.has(
                    "Content-Type"
                )
            ) {

                headers.set(
                    "Content-Type",
                    "application/json"
                );

            }


            /*
             * Token
             */

            if (
                this.session.token &&
                !headers.has(
                    "Authorization"
                )
            ) {

                headers.set(
                    "Authorization",
                    "Bearer " +
                    this.session.token
                );

            }


            /*
             * Device ID
             */

            if (
                this.session.deviceId
            ) {

                headers.set(
                    "X-Device-ID",
                    this.session.deviceId
                );

            }


            let body =
                options.body;


            /*
             * اگر body آبجکت باشد،
             * JSON می‌شود.
             */

            if (
                body !== undefined &&
                body !== null &&
                isObject(body)
            ) {

                body =
                    JSON.stringify(
                        body
                    );

            }


            const fetchOptions = {

                method,

                headers,

                body,

                credentials:
                    options.credentials ||
                    this.config.credentials,

                signal:
                    options.signal ||
                    controller.signal,

                cache:
                    options.cache ||
                    "no-store"
            };


            this.pendingRequests.set(
                requestId,
                controller
            );


            this.metrics.requestsSent++;


            this.events.emit(
                EVENTS.REQUEST_START,
                {
                    requestId,
                    url,
                    method
                }
            );


            try {

                if (
                    !navigator.onLine
                ) {

                    throw new Error(
                        "اتصال اینترنت در دسترس نیست."
                    );

                }


                const response =
                    await fetch(
                        url,
                        fetchOptions
                    );


                clearTimeout(
                    timeoutId
                );


                /*
                 * دریافت متن
                 */

                const text =
                    await response.text();


                const data =
                    text
                        ? safeJsonParse(text)
                        : null;


                /*
                 * خطای HTTP
                 */

                if (
                    !response.ok
                ) {

                    const error =
                        new NetworkHttpError(
                            data &&
                            data.message
                                ? data.message
                                : "خطای سرور",
                            response.status,
                            data
                        );


                    this.metrics.requestsFailed++;


                    if (
                        response.status === 401
                    ) {

                        this.events.emit(
                            EVENTS.AUTH_REQUIRED,
                            {
                                status:
                                    response.status,

                                data
                            }
                        );

                    }


                    if (
                        response.status >= 500
                    ) {

                        this.events.emit(
                            EVENTS.SERVER_ERROR,
                            {
                                status:
                                    response.status,

                                data
                            }
                        );

                    }


                    this.events.emit(
                        EVENTS.REQUEST_ERROR,
                        {
                            requestId,
                            error
                        }
                    );


                    throw error;

                }


                this.events.emit(
                    EVENTS.REQUEST_SUCCESS,
                    {
                        requestId,
                        status:
                            response.status,

                        data
                    }
                );


                return {

                    ok: true,

                    status:
                        response.status,

                    headers:
                        response.headers,

                    data

                };


            } catch (error) {

                clearTimeout(
                    timeoutId
                );


                this.metrics.requestsFailed++;


                if (
                    error.name ===
                    "AbortError"
                ) {

                    this.events.emit(
                        EVENTS.REQUEST_TIMEOUT,
                        {
                            requestId,
                            url
                        }
                    );

                }


                this.events.emit(
                    EVENTS.REQUEST_ERROR,
                    {
                        requestId,
                        error
                    }
                );


                throw error;


            } finally {

                this.pendingRequests.delete(
                    requestId
                );

            }

        }


        /* =====================================================
           HTTP SHORTCUTS
        ===================================================== */

        get(path, options) {

            return this.request(
                path,
                Object.assign(
                    {},
                    options || {},
                    {
                        method: "GET"
                    }
                )
            );

        }


        post(path, body, options) {

            return this.request(
                path,
                Object.assign(
                    {},
                    options || {},
                    {
                        method: "POST",
                        body
                    }
                )
            );

        }


        put(path, body, options) {

            return this.request(
                path,
                Object.assign(
                    {},
                    options || {},
                    {
                        method: "PUT",
                        body
                    }
                )
            );

        }


        patch(path, body, options) {

            return this.request(
                path,
                Object.assign(
                    {},
                    options || {},
                    {
                        method: "PATCH",
                        body
                    }
                )
            );

        }


        delete(path, options) {

            return this.request(
                path,
                Object.assign(
                    {},
                    options || {},
                    {
                        method: "DELETE"
                    }
                )
            );

        }


        /* =====================================================
           CANCEL ALL REQUESTS
        ===================================================== */

        cancelAllRequests() {

            this.pendingRequests.forEach(
                controller => {

                    try {

                        controller.abort();

                    } catch (error) {}

                }
            );


            this.pendingRequests.clear();

        }


        /* =====================================================
           MATCH / GAME MESSAGES
        ===================================================== */

        sendGameAction(action, payload) {

            return this.send(
                "game:action",
                {
                    action,
                    payload
                },
                {
                    queue: false
                }
            );

        }


        sendCardPlay(cardId) {

            return this.sendGameAction(
                "play_card",
                {
                    cardId
                }
            );

        }


        sendTrumpSelection(suit) {

            return this.sendGameAction(
                "select_trump",
                {
                    suit
                }
            );

        }


        sendReady() {

            return this.send(
                "room:ready",
                {},
                {
                    queue: false
                }
            );

        }


        sendRoomAction(action, payload) {

            return this.send(
                "room:action",
                {
                    action,
                    payload
                },
                {
                    queue: false
                }
            );

        }


        sendChatMessage(message) {

            return this.send(
                "chat:message",
                {
                    message
                },
                {
                    queue: false
                }
            );

        }


        /* =====================================================
           ROOM
        ===================================================== */

        setRoom(roomId) {

            this.session.roomId =
                roomId || null;


            this.events.emit(
                EVENTS.SESSION_CHANGED,
                this.getSession()
            );

        }


        getRoomId() {

            return this.session.roomId;

        }


        clearRoom() {

            this.session.roomId =
                null;

        }


        /* =====================================================
           MATCH
        ===================================================== */

        setMatch(matchId) {

            this.session.matchId =
                matchId || null;


            this.events.emit(
                EVENTS.SESSION_CHANGED,
                this.getSession()
            );

        }


        getMatchId() {

            return this.session.matchId;

        }


        clearMatch() {

            this.session.matchId =
                null;

        }


        /* =====================================================
           EVENT API
        ===================================================== */

        on(eventName, callback) {

            return this.events.on(
                eventName,
                callback
            );

        }


        once(eventName, callback) {

            return this.events.once(
                eventName,
                callback
            );

        }


        off(eventName, callback) {

            this.events.off(
                eventName,
                callback
            );

        }


        /* =====================================================
           WAIT FOR CONNECTION
        ===================================================== */

        async waitUntilConnected(timeout) {

            timeout =
                typeof timeout === "number"
                    ? timeout
                    : 10000;


            if (
                this.isSocketConnected()
            ) {

                return true;

            }


            const start =
                now();


            return new Promise(
                (resolve, reject) => {

                    let finished =
                        false;


                    const cleanup =
                        () => {

                            if (
                                finished
                            ) {

                                return;

                            }


                            finished = true;


                            clearTimeout(
                                timeoutId
                            );


                            unsubscribeConnected();


                            unsubscribeError();


                            unsubscribeOffline();

                        };


                    const unsubscribeConnected =
                        this.once(
                            EVENTS.NETWORK_CONNECTED,
                            () => {

                                cleanup();

                                resolve(
                                    true
                                );

                            }
                        );


                    const unsubscribeError =
                        this.once(
                            EVENTS.NETWORK_ERROR,
                            data => {

                                if (
                                    now() -
                                    start >=
                                    timeout
                                ) {

                                    cleanup();

                                    reject(
                                        data &&
                                        data.error
                                            ? data.error
                                            : new Error(
                                                "اتصال برقرار نشد."
                                            )
                                    );

                                }

                            }
                        );


                    const unsubscribeOffline =
                        this.once(
                            EVENTS.NETWORK_OFFLINE,
                            () => {

                                cleanup();

                                reject(
                                    new Error(
                                        "اتصال اینترنت قطع است."
                                    )
                                );

                            }
                        );


                    const timeoutId =
                        setTimeout(
                            () => {

                                cleanup();

                                reject(
                                    new Error(
                                        "Timeout اتصال به سرور."
                                    )
                                );

                            },
                            timeout
                        );


                    this.connect()
                        .catch(
                            () => {}
                        );

                }
            );

        }


        /* =====================================================
           GET METRICS
        ===================================================== */

        getMetrics() {

            return Object.assign(
                {},
                this.metrics
            );

        }


        /* =====================================================
           GET NETWORK INFO
        ===================================================== */

        getNetworkInfo() {

            return {

                state:
                    this.state,

                online:
                    navigator.onLine,

                socketConnected:
                    this.isSocketConnected(),

                reconnectAttempts:
                    this.reconnectAttempts,

                queueSize:
                    this.messageQueue.length,

                pendingRequests:
                    this.pendingRequests.size,

                roomId:
                    this.session.roomId,

                matchId:
                    this.session.matchId

            };

        }


        /* =====================================================
           DESTROY
        ===================================================== */

        destroy() {

            this.shouldReconnect =
                false;


            this.cancelReconnect();


            this.stopHeartbeat();


            this.cancelAllRequests();


            if (
                this.socket
            ) {

                try {

                    this.socket.close();

                } catch (error) {}

            }


            this.socket =
                null;


            this.clearQueue();


            this.events.clear();


            this.clearConnectionPromise();

        }

    }


    /* =========================================================
       HTTP ERROR CLASS
       ========================================================= */

    class NetworkHttpError extends Error {

        constructor(
            message,
            status,
            data
        ) {

            super(message);

            this.name =
                "NetworkHttpError";

            this.status =
                status;

            this.data =
                data;

        }

    }


    /* =========================================================
       CREATE GLOBAL INSTANCE
       ========================================================= */

    const networkManager =
        new NetworkManager(
            CONFIG
        );


    /* =========================================================
       GLOBAL EXPORTS
       ========================================================= */

    window.Hokm.Network =
        networkManager;


    window.Hokm.NetworkManager =
        NetworkManager;


    window.Hokm.NetworkState =
        NETWORK_STATE;


    window.Hokm.NetworkEvents =
        EVENTS;


    /*
     * برای دسترسی ساده‌تر
     */

    window.networkManager =
        networkManager;


    /* =========================================================
       LEGACY / SIMPLE HELPERS
       ========================================================= */

    window.Hokm.connectNetwork =
        function () {

            return networkManager.connect();

        };


    window.H
