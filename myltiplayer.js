/*
===============================================================
 HOKM ONLINE
 FILE: multiplayer.js
 STAGE: 12

 سیستم کامل مدیریت Multiplayer بازی حکم

 مسئولیت‌های این فایل:

 1. مدیریت اتصال Multiplayer
 2. مدیریت وضعیت اتصال
 3. مدیریت Room
 4. مدیریت بازیکنان
 5. مدیریت Seat
 6. ارسال پیام
 7. دریافت پیام
 8. Broadcast رویدادها
 9. مدیریت Game State
10. Synchronization
11. Heartbeat
12. Reconnect
13. Connection Timeout
14. Message Queue
15. Event System
16. مدیریت خطا
17. جلوگیری از پیام‌های تکراری
18. شماره‌گذاری پیام‌ها
19. مدیریت Host
20. مدیریت Ready
21. مدیریت Turn
22. مدیریت Card Play
23. مدیریت Trump
24. مدیریت Trick
25. مدیریت Score
26. مدیریت پایان بازی
27. حالت Offline / Local Simulation
28. Adapter برای Backend آینده
29. Debugging
30. امنیت اولیه سمت Client

 نکته:

 این فایل بدون Backend نیز می‌تواند در حالت Local/Test
 کار کند.

 برای Multiplayer واقعی، Adapter باید به WebSocket،
 Supabase Realtime، Firebase، Socket.IO یا Backend اختصاصی
 متصل شود.

 هیچ کد قبلی نباید توسط این فایل حذف شود.
===============================================================
*/

(function () {

    "use strict";


    /* =========================================================
       GLOBAL NAMESPACE
    ========================================================== */

    window.Hokm = window.Hokm || {};

    window.Hokm.Multiplayer =
        window.Hokm.Multiplayer || {};


    /* =========================================================
       CONSTANTS
    ========================================================== */

    const VERSION = "1.0.0";

    const DEFAULT_CONFIG = {

        reconnect: true,

        maxReconnectAttempts: 10,

        reconnectDelay: 1500,

        reconnectDelayMax: 15000,

        heartbeatInterval: 10000,

        connectionTimeout: 30000,

        messageTimeout: 10000,

        maxMessageQueue: 500,

        maxReceivedMessages: 1000,

        maxPlayers: 4,

        roomCodeLength: 6,

        debug: false,

        offlineMode: true,

        autoSync: true,

        protocolVersion: "1.0",

        clientVersion: VERSION

    };


    /* =========================================================
       PLAYER STATUS
    ========================================================== */

    const PLAYER_STATUS = {

        OFFLINE: "offline",

        CONNECTING: "connecting",

        CONNECTED: "connected",

        READY: "ready",

        PLAYING: "playing",

        DISCONNECTED: "disconnected"

    };


    /* =========================================================
       CONNECTION STATUS
    ========================================================== */

    const CONNECTION_STATUS = {

        IDLE: "idle",

        CONNECTING: "connecting",

        CONNECTED: "connected",

        RECONNECTING: "reconnecting",

        DISCONNECTED: "disconnected",

        ERROR: "error"

    };


    /* =========================================================
       MESSAGE TYPES
    ========================================================== */

    const MESSAGE_TYPES = {

        HELLO: "hello",

        WELCOME: "welcome",

        PING: "ping",

        PONG: "pong",

        ERROR: "error",

        ROOM_JOIN: "room_join",

        ROOM_JOINED: "room_joined",

        ROOM_LEAVE: "room_leave",

        ROOM_LEFT: "room_left",

        ROOM_UPDATE: "room_update",

        PLAYER_JOIN: "player_join",

        PLAYER_LEAVE: "player_leave",

        PLAYER_READY: "player_ready",

        PLAYER_UNREADY: "player_unready",

        PLAYER_UPDATE: "player_update",

        HOST_CHANGED: "host_changed",

        GAME_START: "game_start",

        GAME_STATE: "game_state",

        GAME_STATE_REQUEST: "game_state_request",

        GAME_STATE_RESPONSE: "game_state_response",

        GAME_ACTION: "game_action",

        CARD_PLAY: "card_play",

        TRUMP_SELECT: "trump_select",

        TRICK_UPDATE: "trick_update",

        TRICK_COMPLETE: "trick_complete",

        SCORE_UPDATE: "score_update",

        ROUND_START: "round_start",

        ROUND_END: "round_end",

        GAME_END: "game_end",

        CHAT_MESSAGE: "chat_message",

        EMOTE: "emote",

        SYNC_REQUEST: "sync_request",

        SYNC_RESPONSE: "sync_response",

        KICK_PLAYER: "kick_player",

        DISCONNECT: "disconnect"

    };


    /* =========================================================
       GAME ACTION TYPES
    ========================================================== */

    const ACTION_TYPES = {

        READY: "ready",

        UNREADY: "unready",

        SELECT_TRUMP: "select_trump",

        PLAY_CARD: "play_card",

        PASS: "pass",

        REQUEST_SYNC: "request_sync",

        SEND_CHAT: "send_chat",

        EMOTE: "emote",

        LEAVE_GAME: "leave_game",

        SURRENDER: "surrender"

    };


    /* =========================================================
       UTILITY FUNCTIONS
    ========================================================== */

    function generateId(prefix) {

        const randomPart =
            Math.random()
                .toString(36)
                .substring(2, 10);

        const timePart =
            Date.now()
                .toString(36);

        return `${prefix || "id"}_${timePart}_${randomPart}`;

    }


    function generateMessageId() {

        return generateId("msg");

    }


    function generateClientId() {

        let id = null;

        try {

            id = localStorage.getItem(
                "hokm_multiplayer_client_id"
            );

        } catch (error) {

            id = null;

        }

        if (!id) {

            id = generateId("client");

            try {

                localStorage.setItem(
                    "hokm_multiplayer_client_id",
                    id
                );

            } catch (error) {

                // LocalStorage ممکن است در بعضی محیط‌ها غیرفعال باشد.

            }

        }

        return id;

    }


    function now() {

        return Date.now();

    }


    function deepClone(value) {

        if (value === undefined) {
            return undefined;
        }

        try {

            return JSON.parse(
                JSON.stringify(value)
            );

        } catch (error) {

            return value;

        }

    }


    function isObject(value) {

        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );

    }


    function clamp(value, min, max) {

        return Math.min(
            Math.max(value, min),
            max
        );

    }


    function normalizeRoomCode(code) {

        if (!code) {
            return "";
        }

        return String(code)
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

    }


    function safeParseJSON(value) {

        if (typeof value !== "string") {
            return value;
        }

        try {

            return JSON.parse(value);

        } catch (error) {

            return null;

        }

    }


    /* =========================================================
       EVENT EMITTER
    ========================================================== */

    class EventEmitter {

        constructor() {

            this.listeners = {};

        }


        on(eventName, callback) {

            if (
                typeof callback !== "function"
            ) {
                return () => {};
            }

            if (!this.listeners[eventName]) {

                this.listeners[eventName] = [];

            }

            this.listeners[eventName].push(
                callback
            );

            return () => {

                this.off(
                    eventName,
                    callback
                );

            };

        }


        once(eventName, callback) {

            const wrapper = (...args) => {

                this.off(
                    eventName,
                    wrapper
                );

                callback(...args);

            };

            return this.on(
                eventName,
                wrapper
            );

        }


        off(eventName, callback) {

            if (
                !this.listeners[eventName]
            ) {
                return;
            }

            this.listeners[eventName] =
                this.listeners[eventName]
                    .filter(
                        listener =>
                            listener !== callback
                    );

        }


        emit(eventName, ...args) {

            const listeners =
                this.listeners[eventName];

            if (!listeners) {
                return;
            }

            listeners
                .slice()
                .forEach(listener => {

                    try {

                        listener(...args);

                    } catch (error) {

                        console.error(
                            "[Hokm Multiplayer] Event error:",
                            error
                        );

                    }

                });

        }


        removeAllListeners() {

            this.listeners = {};

        }

    }


    /* =========================================================
       LOCAL TRANSPORT
       
       برای تست و حالت Offline
    ========================================================== */

    class LocalTransport extends EventEmitter {

        constructor() {

            super();

            this.connected = false;

            this.clientId = null;

            this.roomCode = null;

        }


        async connect(clientId) {

            this.clientId = clientId;

            this.connected = true;

            setTimeout(() => {

                this.emit(
                    "open"
                );

            }, 50);

            return true;

        }


        async disconnect() {

            if (!this.connected) {
                return;
            }

            this.connected = false;

            this.emit(
                "close"
            );

        }


        send(message) {

            if (!this.connected) {

                throw new Error(
                    "Local transport is disconnected."
                );

            }

            /*
             در حالت Local پیام به صورت مستقیم
             به دریافت‌کننده برگردانده می‌شود.
            */

            setTimeout(() => {

                this.emit(
                    "message",
                    deepClone(message)
                );

            }, 10);

        }


        isConnected() {

            return this.connected;

        }

    }


    /* =========================================================
       WEBSOCKET TRANSPORT
       
       Adapter عمومی برای Backend واقعی
    ========================================================== */

    class WebSocketTransport extends EventEmitter {

        constructor(url) {

            super();

            this.url = url;

            this.socket = null;

            this.connected = false;

        }


        async connect() {

            if (
                typeof WebSocket === "undefined"
            ) {

                throw new Error(
                    "WebSocket is not supported."
                );

            }

            return new Promise(
                (resolve, reject) => {

                    let settled = false;

                    try {

                        this.socket =
                            new WebSocket(
                                this.url
                            );

                    } catch (error) {

                        reject(error);

                        return;

                    }


                    this.socket.onopen =
                        () => {

                            this.connected = true;

                            this.emit(
                                "open"
                            );

                            if (!settled) {

                                settled = true;

                                resolve(true);

                            }

                        };


                    this.socket.onmessage =
                        event => {

                            const data =
                                safeParseJSON(
                                    event.data
                                );

                            this.emit(
                                "message",
                                data
                            );

                        };


                    this.socket.onerror =
                        error => {

                            this.emit(
                                "error",
                                error
                            );

                            if (!settled) {

                                settled = true;

                                reject(error);

                            }

                        };


                    this.socket.onclose =
                        event => {

                            this.connected = false;

                            this.emit(
                                "close",
                                event
                            );

                        };

                }
            );

        }


        send(message) {

            if (
                !this.socket ||
                this.socket.readyState !==
                    WebSocket.OPEN
            ) {

                throw new Error(
                    "WebSocket is not connected."
                );

            }

            this.socket.send(
                JSON.stringify(message)
            );

        }


        async disconnect() {

            if (!this.socket) {
                return;
            }

            try {

                this.socket.close();

            } catch (error) {

                console.error(
                    "[Hokm Multiplayer] WebSocket close error:",
                    error
                );

            }

            this.socket = null;

            this.connected = false;

        }


        isConnected() {

            return (
                this.connected &&
                this.socket &&
                this.socket.readyState ===
                    WebSocket.OPEN
            );

        }

    }


    /* =========================================================
       MULTIPLAYER MANAGER
    ========================================================== */

    class MultiplayerManager extends EventEmitter {

        constructor(options = {}) {

            super();


            /* -------------------------------------------------
               CONFIG
            -------------------------------------------------- */

            this.config = {

                ...DEFAULT_CONFIG,

                ...options

            };


            /* -------------------------------------------------
               CLIENT
            -------------------------------------------------- */

            this.clientId =
                generateClientId();


            this.sessionId =
                generateId("session");


            /* -------------------------------------------------
               CONNECTION
            -------------------------------------------------- */

            this.connectionStatus =
                CONNECTION_STATUS.IDLE;

            this.connected =
                false;

            this.connecting =
                false;

            this.connectionStartedAt =
                null;

            this.lastPongAt =
                null;

            this.lastMessageAt =
                null;


            /* -------------------------------------------------
               RECONNECT
            -------------------------------------------------- */

            this.reconnectAttempts = 0;

            this.reconnectTimer = null;

            this.heartbeatTimer = null;

            this.connectionTimeoutTimer =
                null;


            /* -------------------------------------------------
               TRANSPORT
            -------------------------------------------------- */

            this.transport =
                null;

            this.transportType =
                "local";


            /* -------------------------------------------------
               SERVER
            -------------------------------------------------- */

            this.serverUrl =
                null;


            /* -------------------------------------------------
               ROOM
            -------------------------------------------------- */

            this.room = {

                id: null,

                code: null,

                name: "",

                hostId: null,

                status: "waiting",

                maxPlayers:
                    this.config.maxPlayers,

                players: []

            };


            /* -------------------------------------------------
               CURRENT PLAYER
            -------------------------------------------------- */

            this.player = {

                id: this.clientId,

                username: "بازیکن",

                avatar: "👤",

                seat: null,

                team: null,

                status:
                    PLAYER_STATUS.OFFLINE,

                ready: false,

                connected: false

            };


            /* -------------------------------------------------
               GAME STATE
            -------------------------------------------------- */

            this.gameState = {

                gameId: null,

                roomId: null,

                phase: "waiting",

                round: 0,

                turn: null,

                trump: null,

                trick: [],

                scores: {

                    teamA: 0,

                    teamB: 0

                },

                players: [],

                version: 0,

                updatedAt: null

            };


            /* -------------------------------------------------
               MESSAGE MANAGEMENT
            -------------------------------------------------- */

            this.messageQueue = [];

            this.receivedMessages = new Map();

            this.pendingMessages = new Map();

            this.messageSequence = 0;


            /* -------------------------------------------------
               SYNC
            -------------------------------------------------- */

            this.syncInProgress = false;

            this.lastSyncAt = 0;


            /* -------------------------------------------------
               STATE
            -------------------------------------------------- */

            this.destroyed = false;


            /* -------------------------------------------------
               LOCAL STORAGE KEY
            -------------------------------------------------- */

            this.storageKey =
                "hokm_multiplayer_state";


            /* -------------------------------------------------
               INTERNAL BINDINGS
            -------------------------------------------------- */

            this.boundOnlineHandler =
                () => {

                    this.handleBrowserOnline();

                };


            this.boundOfflineHandler =
                () => {

                    this.handleBrowserOffline();

                };


            this.bindBrowserEvents();


            /* -------------------------------------------------
               LOG
            -------------------------------------------------- */

            this.log(
                "Multiplayer manager initialized.",
                this.clientId
            );

        }


        /* =====================================================
           CONFIGURATION
        ====================================================== */

        configure(options = {}) {

            this.config = {

                ...this.config,

                ...options

            };

            return this;

        }


        setServerUrl(url) {

            this.serverUrl =
                url || null;

            return this;

        }


        /* =====================================================
           LOGGING
        ====================================================== */

        log(...args) {

            if (!this.config.debug) {
                return;
            }

            console.log(
                "[Hokm Multiplayer]",
                ...args
            );

        }


        warn(...args) {

            console.warn(
                "[Hokm Multiplayer]",
                ...args
            );

        }


        error(...args) {

            console.error(
                "[Hokm Multiplayer]",
                ...args
            );

        }


        /* =====================================================
           BROWSER EVENTS
        ====================================================== */

        bindBrowserEvents() {

            window.addEventListener(
                "online",
                this.boundOnlineHandler
            );

            window.addEventListener(
                "offline",
                this.boundOfflineHandler
            );

        }


        unbindBrowserEvents() {

            window.removeEventListener(
                "online",
                this.boundOnlineHandler
            );

            window.removeEventListener(
                "offline",
                this.boundOfflineHandler
            );

        }


        handleBrowserOnline() {

            this.emit(
                "browser-online"
            );


            if (
                this.room.code &&
                !this.connected &&
                this.config.reconnect
            ) {

                this.reconnect();

            }

        }


        handleBrowserOffline() {

            this.emit(
                "browser-offline"
            );

        }


        /* =====================================================
           TRANSPORT
        ====================================================== */

        createTransport() {

            if (
                this.serverUrl &&
                typeof WebSocket !== "undefined"
            ) {

                this.transportType =
                    "websocket";

                return new WebSocketTransport(
                    this.serverUrl
                );

            }


            this.transportType =
                "local";

            return new LocalTransport();

        }


        setupTransportEvents() {

            if (!this.transport) {
                return;
            }


            this.transport.on(
                "open",
                () => {

                    this.handleTransportOpen();

                }
            );


            this.transport.on(
                "message",
                message => {

                    this.handleTransportMessage(
                        message
                    );

                }
            );


            this.transport.on(
                "close",
                event => {

                    this.handleTransportClose(
                        event
                    );

                }
            );


            this.transport.on(
                "error",
                error => {

                    this.handleTransportError(
                        error
                    );

                }
            );

        }


        /* =====================================================
           CONNECT
        ====================================================== */

        async connect(options = {}) {

            if (this.destroyed) {

                throw new Error(
                    "Multiplayer manager has been destroyed."
                );

            }


            if (this.connected) {

                return {

                    success: true,

                    alreadyConnected: true

                };

            }


            if (this.connecting) {

                return {

                    success: false,

                    connecting: true

                };

            }


            this.connecting = true;

            this.connectionStartedAt =
                now();

            this.setConnectionStatus(
                CONNECTION_STATUS.CONNECTING
            );


            try {

                if (options.serverUrl) {

                    this.setServerUrl(
                        options.serverUrl
                    );

                }


                this.transport =
                    this.createTransport();


                this.setupTransportEvents();


                this.startConnectionTimeout();


                await this.transport.connect(
                    this.clientId
                );


                return {

                    success: true

                };

            } catch (error) {

                this.connecting = false;

                this.setConnectionStatus(
                    CONNECTION_STATUS.ERROR
                );

                this.error(
                    "Connection failed:",
                    error
                );

                this.emit(
                    "connection-error",
                    error
                );


                if (
                    this.config.reconnect &&
                    this.room.code
                ) {

                    this.scheduleReconnect();

                }


                return {

                    success: false,

                    error

                };

            }

        }


        /* =====================================================
           TRANSPORT OPEN
        ====================================================== */

        handleTransportOpen() {

            this.connecting = false;

            this.connected = true;

            this.reconnectAttempts = 0;

            this.lastPongAt =
                now();

            this.lastMessageAt =
                now();

            this.clearConnectionTimeout();


            this.setConnectionStatus(
                CONNECTION_STATUS.CONNECTED
            );


            this.player.connected =
                true;

            this.player.status =
                PLAYER_STATUS.CONNECTED;


            this.startHeartbeat();


            this.sendHello();


            this.flushMessageQueue();


            this.emit(
                "connected",
                {

                    clientId:
                        this.clientId,

                    transport:
                        this.transportType

                }
            );


            this.log(
                "Transport connected."
            );

        }


        /* =====================================================
           TRANSPORT CLOSE
        ====================================================== */

        handleTransportClose(event) {

            const wasConnected =
                this.connected;


            this.connected = false;

            this.connecting = false;


            this.player.connected =
                false;

            this.player.status =
                PLAYER_STATUS.DISCONNECTED;


            this.stopHeartbeat();

            this.clearConnectionTimeout();


            this.setConnectionStatus(
                CONNECTION_STATUS.DISCONNECTED
            );


            this.emit(
                "disconnected",
                {

                    event,

                    wasConnected

                }
            );


            if (
                this.config.reconnect &&
                this.room.code &&
                !this.destroyed
            ) {

                this.scheduleReconnect();

            }

        }


        /* =====================================================
           TRANSPORT ERROR
        ====================================================== */

        handleTransportError(error) {

            this.error(
                "Transport error:",
                error
            );


            this.emit(
                "transport-error",
                error
            );

        }


        /* =====================================================
           CONNECTION STATUS
        ====================================================== */

        setConnectionStatus(status) {

            const previous =
                this.connectionStatus;

            this.connectionStatus =
                status;


            this.emit(
                "connection-status",
                {

                    status,

                    previous

                }
            );

        }


        getConnectionStatus() {

            return this.connectionStatus;

        }


        isConnected() {

            return (
                this.connected &&
                this.transport &&
                this.transport.isConnected()
            );

        }


        /* =====================================================
           HELLO
        ====================================================== */

        sendHello() {

            this.send(
                MESSAGE_TYPES.HELLO,
                {

                    clientId:
                        this.clientId,

                    sessionId:
                        this.sessionId,

                    protocolVersion:
                        this.config.protocolVersion,

                    clientVersion:
                        this.config.clientVersion,

                    player:
                        deepClone(
                            this.player
                        )

                },
                {

                    queueIfOffline: false

                }
            );

        }


        /* =====================================================
           DISCONNECT
        ====================================================== */

        async disconnect(options = {}) {

            this.clearReconnectTimer();

            this.stopHeartbeat();

            this.clearConnectionTimeout();


            if (
                this.transport &&
                this.transport.isConnected()
            ) {

                try {

                    await this.transport.disconnect();

                } catch (error) {

                    this.error(
                        "Disconnect error:",
                        error
                    );

                }

            }


            this.connected = false;

            this.connecting = false;


            if (!options.preserveRoom) {

                this.room = {

                    id: null,

                    code: null,

                    name: "",

                    hostId: null,

                    status: "waiting",

                    maxPlayers:
                        this.config.maxPlayers,

                    players: []

                };

            }


            this.player.connected =
                false;

            this.player.status =
                PLAYER_STATUS.OFFLINE;


            this.setConnectionStatus(
                CONNECTION_STATUS.DISCONNECTED
            );


            this.emit(
                "disconnected",
                {

                    manual: true

                }
            );

        }


        /* =====================================================
           RECONNECT
        ====================================================== */

        reconnect() {

            if (
                this.destroyed ||
                !this.config.reconnect
            ) {

                return;

            }


            if (
                this.connected ||
                this.connecting
            ) {

                return;

            }


            if (!this.room.code) {

                return;

            }


            this.scheduleReconnect();

        }


        scheduleReconnect() {

            this.clearReconnectTimer();


            if (
                this.reconnectAttempts >=
                this.config.maxReconnectAttempts
            ) {

                this.emit(
                    "reconnect-failed"
                );

                return;

            }


            this.reconnectAttempts += 1;


            const attempt =
                this.reconnectAttempts;


            const delay =
                Math.min(
                    this.config.reconnectDelay *
                        Math.pow(
                            2,
                            attempt - 1
                        ),
                    this.config.reconnectDelayMax
                );


            this.setConnectionStatus(
                CONNECTION_STATUS.RECONNECTING
            );


            this.emit(
                "reconnecting",
                {

                    attempt,

                    delay

                }
            );


            this.reconnectTimer =
                setTimeout(
                    async () => {

                        this.reconnectTimer =
                            null;

                        await this.connect();

                    },
                    delay
                );

        }


        clearReconnectTimer() {

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
           CONNECTION TIMEOUT
        ====================================================== */

        startConnectionTimeout() {

            this.clearConnectionTimeout();


            this.connectionTimeoutTimer =
                setTimeout(
                    () => {

                        if (
                            !this.connected
                        ) {

                            this.error(
                                "Connection timeout."
                            );


                            if (
                                this.transport
                            ) {

                                this.transport
                                    .disconnect();

                            }

                        }

                    },
                    this.config.connectionTimeout
                );

        }


        clearConnectionTimeout() {

            if (
                this.connectionTimeoutTimer
            ) {

                clearTimeout(
                    this.connectionTimeoutTimer
                );

                this.connectionTimeoutTimer =
                    null;

            }

        }


        /* =====================================================
           HEARTBEAT
        ====================================================== */

        startHeartbeat() {

            this.stopHeartbeat();


            this.heartbeatTimer =
                setInterval(
                    () => {

                        this.sendPing();

                        this.checkConnectionHealth();

                    },
                    this.config.heartbeatInterval
                );

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

        }


        sendPing() {

            if (!this.connected) {
                return;
            }


            this.send(
                MESSAGE_TYPES.PING,
                {

                    timestamp:
                        now()

                },
                {

                    queueIfOffline: false

                }
            );

        }


        checkConnectionHealth() {

            if (!this.connected) {
                return;
            }


            const elapsed =
                now() -
                this.lastPongAt;


            if (
                elapsed >
                this.config.connectionTimeout
            ) {

                this.warn(
                    "Connection heartbeat timeout."
                );


                try {

                    if (
                        this.transport
                    ) {

                        this.transport.disconnect();

                    }

                } catch (error) {

                    this.error(
                        error
                    );

                }

            }

        }


        /* =====================================================
           MESSAGE CREATION
        ====================================================== */

        createMessage(
            type,
            payload = {},
            options = {}
        ) {

            this.messageSequence += 1;


            return {

                id:
                    generateMessageId(),

                sequence:
                    this.messageSequence,

                type,

                timestamp:
                    now(),

                clientId:
                    this.clientId,

                sessionId:
                    this.sessionId,

                roomId:
                    this.room.id,

                roomCode:
                    this.room.code,

                protocolVersion:
                    this.config.protocolVersion,

                payload:
                    deepClone(payload),

                requiresAck:
                    Boolean(
                        options.requiresAck
                    )

            };

        }


        /* =====================================================
           SEND MESSAGE
        ====================================================== */

        send(
            type,
            payload = {},
            options = {}
        ) {

            const message =
                this.createMessage(
                    type,
                    payload,
                    options
                );


            if (
                !this.isConnected()
            ) {

                if (
                    options.queueIfOffline !== false
                ) {

                    this.queueMessage(
                        message
                    );

                }

                return {

                    success: false,

                    queued: true,

                    message

                };

            }


            try {

                this.transport.send(
                    message
                );


                if (
                    message.requiresAck
                ) {

                    this.pendingMessages.set(
                        message.id,
                        {

                            message,

                            createdAt:
                                now()

                        }
                    );

                }


                this.emit(
                    "message-sent",
                    message
                );


                return {

                    success: true,

                    message

                };

            } catch (error) {

                this.error(
                    "Message send failed:",
                    error
                );


                this.queueMessage(
                    message
                );


                return {

                    success: false,

                    error,

                    queued: true,

                    message

                };

            }

        }


        /* =====================================================
           QUEUE
        ====================================================== */

        queueMessage(message) {

            if (
                this.messageQueue.length >=
                this.config.maxMessageQueue
            ) {

                this.messageQueue.shift();

            }


            this.messageQueue.push(
                message
            );


            this.emit(
                "message-queued",
                message
            );

        }


        flushMessageQueue() {

            if (
                !this.isConnected()
            ) {

                return;

            }


            const queue =
                this.messageQueue.slice();


            this.messageQueue = [];


            queue.forEach(
                message => {

                    try {

                        this.transport.send(
                            message
                        );

                        this.emit(
                            "message-sent",
                            message
                        );

                    } catch (error) {

                        this.messageQueue.unshift(
                            message
                        );

                    }

                }
            );

        }


        /* =====================================================
           RECEIVE MESSAGE
        ====================================================== */

        handleTransportMessage(
            rawMessage
        ) {

            const message =
                safeParseJSON(
                    rawMessage
                );


            if (
                !message ||
                !isObject(message)
            ) {

                this.warn(
                    "Invalid multiplayer message."
                );

                return;

            }


            this.lastMessageAt =
                now();


            if (
                message.id &&
                this.receivedMessages.has(
                    message.id
                )
            ) {

                return;

            }


            if (message.id) {

                this.receivedMessages.set(
                    message.id,
                    now()
                );

                this.cleanupReceivedMessages();

            }


            this.processMessage(
                message
            );

        }


        /* =====================================================
           MESSAGE PROCESSOR
        ====================================================== */

        processMessage(message) {

            this.emit(
                "message-received",
                message
            );


            switch (
                message.type
            ) {

                case MESSAGE_TYPES.HELLO:

                    this.handleHello(
                        message
                    );

                    break;


                case MESSAGE_TYPES.WELCOME:

                    this.handleWelcome(
                        message
                    );

                    break;


                case MESSAGE_TYPES.PING:

                    this.handlePing(
                        message
                    );

                    break;


                case MESSAGE_TYPES.PONG:

                    this.handlePong(
                        message
                    );

                    break;


                case MESSAGE_TYPES.ROOM_JOINED:

                    this.handleRoomJoined(
                        message
                    );

                    break;


                case MESSAGE_TYPES.ROOM_UPDATE:

                    this.handleRoomUpdate(
                        message
                    );

                    break;


                case MESSAGE_TYPES.PLAYER_JOIN:

                    this.handlePlayerJoin(
                        message
                    );

                    break;


                case MESSAGE_TYPES.PLAYER_LEAVE:

                    this.handlePlayerLeave(
                        message
                    );

                    break;


                case MESSAGE_TYPES.PLAYER_READY:

                    this.handlePlayerReady(
                        message
                    );

                    break;


                case MESSAGE_TYPES.PLAYER_UNREADY:

                    this.handlePlayerUnready(
                        message
                    );

                    break;


                case MESSAGE_TYPES.HOST_CHANGED:

                    this.handleHostChanged(
                        message
                    );

                    break;


                case MESSAGE_TYPES.GAME_START:

                    this.handleGameStart(
                        message
                    );

                    break;


                case MESSAGE_TYPES.GAME_STATE:

                    this.handleGameState(
                        message
                    );

                    break;


                case MESSAGE_TYPES.GAME_STATE_RESPONSE:

                    this.handleGameState(
                        message
                    );

                    break;


                case MESSAGE_TYPES.GAME_ACTION:

                    this.handleGameAction(
                        message
                    );

                    break;


                case MESSAGE_TYPES.CARD_PLAY:

                    this.handleCardPlay(
                        message
                    );

                    break;


                case MESSAGE_TYPES.TRUMP_SELECT:

                    this.handleTrumpSelect(
                        message
                    );

                    break;


                case MESSAGE_TYPES.TRICK_UPDATE:

                    this.handleTrickUpdate(
                        message
                    );

                    break;


                case MESSAGE_TYPES.SCORE_UPDATE:

                    this.handleScoreUpdate(
                        message
                    );

                    break;


                case MESSAGE_TYPES.ROUND_START:

                    this.handleRoundStart(
                        message
                    );

                    break;


                case MESSAGE_TYPES.ROUND_END:

                    this.handleRoundEnd(
                        message
                    );

                    break;


                case MESSAGE_TYPES.GAME_END:

                    this.handleGameEnd(
                        message
                    );

                    break;


                case MESSAGE_TYPES.SYNC_REQUEST:

                    this.handleSyncRequest(
                        message
                    );

                    break;


                case MESSAGE_TYPES.SYNC_RESPONSE:

                    this.handleSyncResponse(
                        message
                    );

                    break;


                case MESSAGE_TYPES.CHAT_MESSAGE:

                    this.emit(
                        "chat-message",
                        message.payload
                    );

                    break;


                case MESSAGE_TYPES.EMOTE:

                    this.emit(
                        "emote",
                        message.payload
                    );

                    break;


                case MESSAGE_TYPES.ERROR:

                    this.emit(
                        "server-error",
                        message.payload
                    );

                    break;


                default:

                    this.emit(
                        "unknown-message",
                        message
                    );

                    break;

            }

        }


        /* =====================================================
           CLEANUP RECEIVED MESSAGES
        ====================================================== */

        cleanupReceivedMessages() {

            if (
                this.receivedMessages.size <=
                this.config.maxReceivedMessages
            ) {

                return;

            }


            const entries =
                Array.from(
                    this.receivedMessages.entries()
                );


            entries.sort(
                (a, b) =>
                    a[1] - b[1]
            );


            const removeCount =
                entries.length -
                this.config.maxReceivedMessages;


            for (
                let i = 0;
                i < removeCount;
                i++
            ) {

                this.receivedMessages.delete(
                    entries[i][0]
                );

            }

        }


        /* =====================================================
           HELLO HANDLER
        ====================================================== */

        handleHello(message) {

            this.send(
                MESSAGE_TYPES.WELCOME,
                {

                    clientId:
                        this.clientId,

                    serverTime:
                        now(),

                    protocolVersion:
                        this.config.protocolVersion

                },
                {

                    queueIfOffline: false

                }
            );


            this.emit(
                "hello",
                message.payload
            );

        }


        /* =====================================================
           WELCOME HANDLER
        ====================================================== */

        handleWelcome(message) {

            this.emit(
                "welcome",
                message.payload
            );

        }


        /* =====================================================
           PING
        ====================================================== */

        handlePing(message) {

            this.send(
                MESSAGE_TYPES.PONG,
                {

                    timestamp:
                        now(),

                    receivedTimestamp:
                        message.payload &&
                        message.payload.timestamp

                },
                {

                    queueIfOffline: false

                }
            );

        }


        /* =====================================================
           PONG
        ====================================================== */

        handlePong(message) {

            this.lastPongAt =
                now();


            this.emit(
                "pong",
                message.payload
            );

        }


        /* =====================================================
           ROOM JOIN
        ====================================================== */

        async joinRoom(
            roomCode,
            options = {}
        ) {

            const normalizedCode =
                normalizeRoomCode(
                    roomCode
                );


            if (!normalizedCode) {

                throw new Error(
                    "کد اتاق معتبر نیست."
                );

            }


            this.room.code =
                normalizedCode;


            if (options.roomId) {

                this.room.id =
                    options.roomId;

            }


            if (options.roomName) {

                this.room.name =
                    options.roomName;

            }


            if (options.player) {

                this.updateLocalPlayer(
                    options.player
                );

            }


            if (!this.isConnected()) {

                if (
                    this.config.offlineMode
                ) {

                    this.createLocalRoom(
                        normalizedCode,
                        options
                    );

                    return {

                        success: true,

                        offline: true,

                        room:
                            deepClone(
                                this.room
                            )

                    };

                }


                await this.connect();

            }


            this.send(
                MESSAGE_TYPES.ROOM_JOIN,
                {

                    roomCode:
                        normalizedCode,

                    roomId:
                        this.room.id,

                    player:
                        deepClone(
                            this.player
                        )

                }
            );


            this.emit(
                "room-join-requested",
                {

                    roomCode:
                        normalizedCode

                }
            );


            return {

                success: true,

                roomCode:
                    normalizedCode

            };

        }


        /* =====================================================
           CREATE LOCAL ROOM
        ====================================================== */

        createLocalRoom(
            roomCode,
            options = {}
        ) {

            this.room = {

                id:
                    options.roomId ||
                    generateId("room"),

                code:
                    roomCode,

                name:
                    options.roomName ||
                    "اتاق حکم",

                hostId:
                    this.player.id,

                status:
                    "waiting",

                maxPlayers:
                    this.config.maxPlayers,

                players: []

            };


            this.addOrUpdatePlayer(
                {

                    ...this.player,

                    status:
                        PLAYER_STATUS.CONNECTED,

                    connected:
                        true,

                    ready:
                        false,

                    seat: 0,

                    team: "A"

                }
            );


            this.player.seat = 0;

            this.player.team = "A";

            this.player.status =
                PLAYER_STATUS.CONNECTED;

            this.player.connected =
                true;


            this.emit(
                "room-joined",
                deepClone(
                    this.room
                )
            );


            this.emit(
                "room-updated",
                deepClone(
                    this.room
                )
            );


            this.saveState();

        }


        /* =====================================================
           ROOM JOINED
        ====================================================== */

        handleRoomJoined(message) {

            const payload =
                message.payload || {};


            if (payload.room) {

                this.room =
                    this.normalizeRoom(
                        payload.room
                    );

            }


            if (payload.player) {

                this.updateLocalPlayer(
                    payload.player
                );

            }


            if (payload.gameState) {

                this.applyGameState(
                    payload.gameState
                );

            }


            this.emit(
                "room-joined",
                deepClone(
                    this.room
                )
            );


            this.saveState();

        }


        /* =====================================================
           ROOM UPDATE
        ====================================================== */

        handleRoomUpdate(message) {

            const payload =
                message.payload || {};


            if (payload.room) {

                this.room =
                    this.normalizeRoom(
                        payload.room
                    );

            }


            if (payload.players) {

                this.room.players =
                    this.normalizePlayers(
                        payload.players
                    );

            }


            this.emit(
                "room-updated",
                deepClone(
                    this.room
                )
            );


            this.saveState();

        }


        /* =====================================================
           NORMALIZE ROOM
        ====================================================== */

        normalizeRoom(room) {

            const normalized = {

                id:
                    room.id ||
                    generateId("room"),

                code:
                    normalizeRoomCode(
                        room.code
                    ),

                name:
                    room.name ||
                    "اتاق حکم",

                hostId:
                    room.hostId ||
                    null,

                status:
                    room.status ||
                    "waiting",

                maxPlayers:
                    clamp(
                        Number(
                            room.maxPlayers ||
                            this.config.maxPlayers
                        ),
                        1,
                        this.config.maxPlayers
                    ),

                players:
                    this.normalizePlayers(
                        room.players || []
                    )

            };


            return normalized;

        }


        /* =====================================================
           PLAYER MANAGEMENT
        ====================================================== */

        normalizePlayers(players) {

            if (!Array.isArray(players)) {
                return [];
            }


            return players
                .slice(
                    0,
                    this.config.maxPlayers
                )
                .map(
                    player =>
                        ({

                            id:
                                player.id ||
                                generateId("player"),

                            username:
                                player.username ||
                                "بازیکن",

                            avatar:
                                player.avatar ||
                                "👤",

                            seat:
                                Number.isInteger(
                                    player.seat
                                )
                                    ? player.seat
                                    : null,

                            team:
                                player.team ||
                                null,

                            status:
                                player.status ||
                                PLAYER_STATUS.CONNECTED,

                            ready:
                                Boolean(
                                    player.ready
                                ),

                            connected:
                                player.connected !==
                                false

                        })
                );

        }


        updateLocalPlayer(player) {

            if (!player) {
                return;
            }


            this.player = {

                ...this.player,

                ...player,

                id:
                    this.clientId

            };

        }


        addOrUpdatePlayer(player) {

            if (!player || !player.id) {
                return;
            }


            const index =
                this.room.players.findIndex(
                    existing =>
                        existing.id ===
                        player.id
                );


            const normalized = {

                id:
                    player.id,

                username:
                    player.username ||
                    "بازیکن",

                avatar:
                    player.avatar ||
                    "👤",

                seat:
                    Number.isInteger(
                        player.seat
                    )
                        ? player.seat
                        : null,

                team:
                    player.team ||
                    null,

                status:
                    player.status ||
                    PLAYER_STATUS.CONNECTED,

                ready:
                    Boolean(
                        player.ready
                    ),

                connected:
                    player.connected !==
                    false

            };


            if (index === -1) {

                if (
                    this.room.players.length <
                    this.config.maxPlayers
                ) {

                    this.room.players.push(
                        normalized
                    );

                }

            } else {

                this.room.players[index] =
                    {

                        ...this.room.players[index],

                        ...normalized

                    };

            }


            this.emit(
                "players-updated",
                deepClone(
                    this.room.players
                )
            );

        }


        removePlayer(playerId) {

            this.room.players =
                this.room.players.filter(
                    player =>
                        player.id !==
                        playerId
                );


            this.emit(
                "players-updated",
                deepClone(
                    this.room.players
                )
            );

        }


        getPlayers() {

            return deepClone(
                this.room.players
            );

        }


        getPlayer(playerId) {

            return this.room.players.find(
                player =>
                    player.id ===
                    playerId
            ) || null;

        }


        getCurrentPlayer() {

            return this.getPlayer(
                this.clientId
            );

        }


        /* =====================================================
           PLAYER JOIN
        ====================================================== */

        handlePlayerJoin(message) {

            const player =
                message.payload &&
                message.payload.player;


            if (!player) {
                return;
            }


            this.addOrUpdatePlayer(
                player
            );


            this.emit(
                "player-joined",
                deepClone(
                    player
                )
            );


            this.saveState();

        }


        /* =====================================================
           PLAYER LEAVE
        ====================================================== */

        handlePlayerLeave(message) {

            const payload =
                message.payload || {};


            const playerId =
                payload.playerId;


            if (!playerId) {
                return;
            }


            const player =
                this.getPlayer(
                    playerId
                );


            this.removePlayer(
                playerId
            );


            this.emit(
                "player-left",
                {

                    playerId,

                    player:
                        deepClone(
                            player
                        )

                }
            );


            this.saveState();

        }


        /* =====================================================
           READY
        ====================================================== */

        setReady(isReady = true) {

            const ready =
                Boolean(isReady);


            this.player.ready =
                ready;

            this.player.status =
                ready
                    ? PLAYER_STATUS.READY
                    : PLAYER_STATUS.CONNECTED;


            this.addOrUpdatePlayer(
                this.player
            );


            this.send(
                ready
                    ? MESSAGE_TYPES.PLAYER_READY
                    : MESSAGE_TYPES.PLAYER_UNREADY,
                {

                    playerId:
                        this.clientId,

                    ready

                }
            );


            this.emit(
                "ready-changed",
                {

                    playerId:
                        this.clientId,

                    ready

                }
            );


            this.saveState();


            return ready;

        }


        handlePlayerReady(message) {

            const payload =
                message.payload || {};


            const player =
                this.getPlayer(
                    payload.playerId
                );


            if (player) {

                player.ready =
                    true;

                player.status =
                    PLAYER_STATUS.READY;

            }


            this.emit(
                "player-ready",
                {

                    playerId:
                        payload.playerId,

                    ready: true

                }
            );


            this.saveState();

        }


        handlePlayerUnready(message) {

            const payload =
                message.payload || {};


            const player =
                this.getPlayer(
                    payload.playerId
                );


            if (player) {

                player.ready =
                    false;

                player.status =
                    PLAYER_STATUS.CONNECTED;

            }


            this.emit(
                "player-ready",
                {

                    playerId:
                        payload.playerId,

                    ready: false

                }
            );


            this.saveState();

        }


        areAllPlayersReady() {

            const players =
                this.room.players;


            if (
                players.length !==
                this.config.maxPlayers
            ) {

                return false;

            }


            return players.every(
                player =>
                    player.ready &&
                    player.connected !== false
            );

        }


        /* =====================================================
           HOST
        ====================================================== */

        isHost() {

            return (
                this.room.hostId ===
                this.clientId
            );

        }


        setHost(playerId) {

            if (!playerId) {
                return false;
            }


            this.room.hostId =
                playerId;


            this.send(
                MESSAGE_TYPES.HOST_CHANGED,
                {

                    hostId:
                        playerId

                }
            );


            this.emit(
                "host-changed",
                {

                    hostId:
                        playerId

                }
            );


            this.saveState();


            return true;

        }


        handleHostChanged(message) {

            const hostId =
                message.payload &&
                message.payload.hostId;


            if (!hostId) {
                return;
            }


            this.room.hostId =
                hostId;


            this.emit(
                "host-changed",
                {

                    hostId

                }
            );


            this.saveState();

        }


        /* =====================================================
           GAME START
        ====================================================== */

        startGame(gameState = {}) {

            const state = {

                gameId:
                    gameState.gameId ||
                    generateId("game"),

                roomId:
                    this.room.id,

                phase:
                    gameState.phase ||
                    "playing",

                round:
                    gameState.round ||
                    1,

                turn:
                    gameState.turn ||
                    null,

                trump:
                    gameState.trump ||
                    null,

                trick:
                    Array.isArray(
                        gameState.trick
                    )
                        ? gameState.trick
                        : [],

                scores:
                    gameState.scores ||
                    {

                        teamA: 0,

                        teamB: 0

                    },

                players:
                    gameState.players ||
                    deepClone(
                        this.room.players
                    ),

                version:
                    1,

                updatedAt:
                    now()

            };


            this.applyGameState(
                state
            );


            this.send(
                MESSAGE_TYPES.GAME_START,
                {

                    gameState:
                        deepClone(
                            state
                        )

                }
            );


            this.emit(
                "game-started",
                deepClone(
                    state
                )
            );


            this.saveState();


            return state;

        }


        handleGameStart(message) {

            const state =
                message.payload &&
                message.payload.gameState;


            if (state) {

                this.applyGameState(
                    state
                );

            }


            this.emit(
                "game-started",
                deepClone(
                    this.gameState
                )
            );


            this.saveState();

        }


        /* =====================================================
           GAME STATE
        ====================================================== */

        applyGameState(state) {

            if (!state) {
                return false;
            }


            const incomingVersion =
                Number(
                    state.version || 0
                );


            const currentVersion =
                Number(
                    this.gameState.version || 0
                );


            /*
             جلوگیری از جایگزین شدن State قدیمی
             با State جدیدتر
            */

            if (
                incomingVersion <
                currentVersion
            ) {

                return false;

            }


            this.gameState = {

                ...this.gameState,

                ...deepClone(
                    state
                ),

                version:
                    incomingVersion,

                updatedAt:
                    now()

            };


            if (
                Array.isArray(
                    state.players
                )
            ) {

                this.room.players =
                    this.normalizePlayers(
                        state.players
                    );

            }


            this.emit(
                "game-state-updated",
                deepClone(
                    this.gameState
                )
            );


            this.saveState();


            return true;

        }


        handleGameState(message) {

            const state =
                message.payload &&
                (
                    message.payload.gameState ||
                    message.payload
                );


            this.applyGameState(
                state
            );

        }


        updateGameState(
            partialState,
            options = {}
        ) {

            if (
                !isObject(
                    partialState
                )
            ) {

                return false;

            }


            this.gameState = {

                ...this.gameState,

                ...deepClone(
                    partialState
                ),

                version:
                    Number(
                        this.gameState.version || 0
                    ) + 1,

                updatedAt:
                    now()

            };


            if (
                options.broadcast !== false
            ) {

                this.send(
                    MESSAGE_TYPES.GAME_STATE,
                    {

                        gameState:
                            deepClone(
                                this.gameState
                            )

                    }
                );

            }


            this.emit(
                "game-state-updated",
                deepClone(
                    this.gameState
                )
            );


            this.saveState();


            return true;

        }


        /* =====================================================
           GAME STATE REQUEST
        ====================================================== */

        requestGameState() {

            this.send(
                MESSAGE_TYPES.GAME_STATE_REQUEST,
                {

                    requesterId:
                        this.clientId

                }
            );


            this.emit(
                "game-state-requested"
            );

        }


        handleSyncRequest(message) {

            if (!this.isHost()) {
                return;
            }


            this.send(
                MESSAGE_TYPES.SYNC_RESPONSE,
                {

                    gameState:
                        deepClone(
                            this.gameState
                        ),

                    room:
                        deepClone(
                            this.room
                        )

                }
            );

        }


        handleSyncResponse(message) {

            const payload =
                message.payload || {};


            if (payload.room) {

                this.room =
                    this.normalizeRoom(
                        payload.room
                    );

            }


            if (payload.gameState) {

                this.applyGameState(
                    payload.gameState
                );

            }


            this.syncInProgress =
                false;

            this.lastSyncAt =
                now();


            this.emit(
                "sync-complete",
                {

                    room:
                        deepClone(
                            this.room
                        ),

                    gameState:
                        deepClone(
                            this.gameState
                        )

                }
            );


            this.saveState();

        }


        /* =====================================================
           GAME ACTION
        ====================================================== */

        sendGameAction(
            action,
            payload = {}
        ) {

            if (!action) {
                return false;
            }


            const actionMessage = {

                action,

                playerId:
                    this.clientId,

                timestamp:
                    now(),

                payload:
                    deepClone(
                        payload
                    )

            };


            this.send(
                MESSAGE_TYPES.GAME_ACTION,
                actionMessage
            );


            this.emit(
                "game-action-sent",
                actionMessage
            );


            return true;

        }


        handleGameAction(message) {

            const action =
                message.payload || {};


            this.emit(
                "game-action",
                deepClone(
                    action
                )
            );

        }


        /* =====================================================
           PLAY CARD
        ====================================================== */

        playCard(card) {

            if (!card) {
                return false;
            }


            const payload = {

                playerId:
                    this.clientId,

                card:
                    deepClone(
                        card
                    ),

                timestamp:
                    now()

            };


            this.send(
                MESSAGE_TYPES.CARD_PLAY,
                payload
            );


            this.emit(
                "card-play-sent",
                deepClone(
                    payload
                )
            );


            return true;

        }


        handleCardPlay(message) {

            const payload =
                message.payload || {};


            this.emit(
                "card-played",
                deepClone(
                    payload
                )
            );


            /*
             State را اینجا مستقیماً تغییر نمی‌دهیم.
             
             موتور game.js باید قانونی بودن کارت،
             نوبت و نتیجه را بررسی کند.
            */

        }


        /* =====================================================
           TRUMP
        ====================================================== */

        selectTrump(suit) {

            if (!suit) {
                return false;
            }


            const payload = {

                playerId:
                    this.clientId,

                suit,

                timestamp:
                    now()

            };


            this.send(
                MESSAGE_TYPES.TRUMP_SELECT,
                payload
            );


            this.emit(
                "trump-selected-local",
                deepClone(
                    payload
                )
            );


            return true;

        }


        handleTrumpSelect(message) {

            const payload =
                message.payload || {};


            this.gameState.trump =
                payload.suit || null;


            this.gameState.version +=
                1;


            this.gameState.updatedAt =
                now();


            this.emit(
                "trump-selected",
                deepClone(
                    payload
                )
            );


            this.emit(
                "game-state-updated",
                deepClone(
                    this.gameState
                )
            );


            this.saveState();

        }


        /* =====================================================
           TRICK
        ====================================================== */

        updateTrick(trick) {

            if (!Array.isArray(trick)) {

                return false;

            }


            this.updateGameState(
                {

                    trick:
                        deepClone(
                            trick
                        )

                }
            );


            this.send(
                MESSAGE_TYPES.TRICK_UPDATE,
                {

                    trick:
                        deepClone(
                            trick
                        )

                }
            );


            return true;

        }


        handleTrickUpdate(message) {

            const payload =
                message.payload || {};


            if (
                Array.isArray(
                    payload.trick
                )
            ) {

                this.gameState.trick =
                    deepClone(
                        payload.trick
                    );

                this.gameState.version +=
                    1;

                this.gameState.updatedAt =
                    now();

            }


            this.emit(
                "trick-updated",
                deepClone(
                    payload
                )
            );


            this.emit(
                "game-state-updated",
                deepClone(
                    this.gameState
                )
            );


            this.saveState();

        }


        /* =====================================================
           TRICK COMPLETE
        ====================================================== */

        completeTrick(result) {

            const payload = {

                result:
                    deepClone(
                        result
                    ),

                timestamp:
                    now()

            };


            this.send(
                MESSAGE_TYPES.TRICK_COMPLETE,
                payload
            );


            this.emit(
                "trick-completed",
                payload
            );


            return true;

        }


        /* =====================================================
           SCORE
        ====================================================== */

        updateScore(
            scores
        ) {

            if (
                !isObject(scores)
            ) {

                return false;

            }


            this.gameState.scores = {

                ...this.gameState.scores,

                ...deepClone(
                    scores
                )

            };


            this.gameState.version +=
                1;

            this.gameState.updatedAt =
                now();


            this.send(
                MESSAGE_TYPES.SCORE_UPDATE,
                {

                    scores:
                        deepClone(
                            this.gameState.scores
                        )

                }
            );


            this.emit(
                "score-updated",
                deepClone(
                    this.gameState.scores
                )
            );


            this.saveState();


            return true;

        }


        handleScoreUpdate(message) {

            const scores =
                message.payload &&
                message.payload.scores;


            if (!scores) {
                return;
            }


            this.gameState.scores = {

                ...this.gameState.scores,

                ...scores

            };


            this.gameState.version +=
                1;


            this.gameState.updatedAt =
                now();


            this.emit(
                "score-updated",
                deepClone(
                    this.gameState.scores
                )
            );


            this.emit(
                "game-state-updated",
                deepClone(
                    this.gameState
                )
            );


            this.saveState();

        }


        /* =====================================================
           ROUND
        ====================================================== */

        startRound(roundNumber) {

            const round =
                Number(
                    roundNumber ||
                    this.gameState.round + 1
                );


            this.gameState.round =
                round;

            this.gameState.phase =
                "round";

            this.gameState.trick =
                [];

            this.gameState.version +=
                1;

            this.gameState.updatedAt =
                now();


            this.send(
                MESSAGE_TYPES.ROUND_START,
                {

                    round,

                    gameState:
                        deepClone(
                            this.gameState
                        )

                }
            );


            this.emit(
                "round-started",
                {

                    round,

                    gameState:
                        deepClone(
                            this.gameState
                        )

                }
            );


            this.saveState();


            return round;

        }


        handleRoundStart(message) {

            const payload =
                message.payload || {};


            if (
                payload.gameState
            ) {

                this.applyGameState(
                    payload.gameState
                );

            } else if (
                payload.round
            ) {

                this.gameState.round =
                    payload.round;

                this.gameState.trick =
                    [];

            }


            this.emit(
                "round-started",
                {

                    round:
                        this.gameState.round,

                    gameState:
                        deepClone(
                            this.gameState
                        )

                }
            );


            this.saveState();

        }


        endRound(result) {

            const payload = {

                round:
                    this.gameState.round,

                result:
                    deepClone(
                        result
                    ),

                gameState:
                    deepClone(
                        this.gameState
                    )

            };


            this.send(
                MESSAGE_TYPES.ROUND_END,
                payload
            );


            this.emit(
                "round-ended",
                payload
            );


            return true;

        }


        handleRoundEnd(message) {

            const payload =
                message.payload || {};


            this.emit(
                "round-ended",
                deepClone(
                    payload
                )
            );


            this.saveState();

        }


        /* =====================================================
           GAME END
        ====================================================== */

        endGame(result) {

            this.gameState.phase =
                "finished";


            this.gameState.version +=
                1;


            const payload = {

                result:
                    deepClone(
                        result
                    ),

                gameState:
                    deepClone(
                        this.gameState
                    )

            };


            this.send(
                MESSAGE_TYPES.GAME_END,
                payload
            );


            this.emit(
                "game-ended",
                payload
            );


            this.saveState();


            return true;

        }


        handleGameEnd(message) {

            const payload =
                message.payload || {};


            if (
                payload.gameState
            ) {

                this.applyGameState(
                    payload.gameState
                );

            } else {

                this.gameState.phase =
                    "finished";

            }


            this.emit(
                "game-ended",
                deepClone(
                    payload
                )
            );


            this.saveState();

        }


        /* =====================================================
           TURN
        ====================================================== */

        setTurn(playerId) {

            if (!playerId) {
                return false;
            }


            this.gameState.turn =
                playerId;


            this.gameState.version +=
                1;

            this.gameState.updatedAt =
                now();


            this.emit(
                "turn-changed",
                {

                    playerId

                }
            );


            this.saveState();


            return true;

        }


        getTurn() {

            return this.gameState.turn;

        }


        isMyTurn() {

            return (
                this.gameState.turn ===
                this.clientId
            );

        }


        /* =====================================================
           CHAT
        ====================================================== */

        sendChatMessage(message) {

            if (!message) {
                return false;
            }


            const cleanMessage =
                String(message)
                    .trim()
                    .substring(
                        0,
                        250
                    );


            if (!cleanMessage) {
                return false;
            }


            const payload = {

                id:
                    generateId("chat"),

                playerId:
                    this.clientId,

                username:
                    this.player.username,

                message:
                    cleanMessage,

                timestamp:
                    now()

            };


            this.send(
                MESSAGE_TYPES.CHAT_MESSAGE,
                payload
            );


            this.emit(
                "chat-message",
                deepClone(
                    payload
                )
            );


            return true;

        }


        /* =====================================================
           EMOTE
        ====================================================== */

        sendEmote(emote) {

            if (!emote) {
                return false;
            }


            const payload = {

                playerId:
                    this.clientId,

                emote:
                    String(emote)
                        .substring(
                            0,
                            30
                        ),

                timestamp:
                    now()

            };


            this.send(
                MESSAGE_TYPES.EMOTE,
                payload
            );


            this.emit(
                "emote",
                deepClone(
                    payload
                )
            );


            return true;

        }


        /* =====================================================
           LEAVE ROOM
        ====================================================== */

        async leaveRoom() {

            if (this.room.code) {

                this.send(
                    MESSAGE_TYPES.ROOM_LEAVE,
                    {

                        playerId:
                            this.clientId,

                        roomCode:
                            this.room.code

                    }
                );

            }


            this.emit(
                "leaving-room"
            );


            const oldRoom =
                deepClone(
                    this.room
                );


            this.room = {

                id: null,

                code: null,

                name: "",

                hostId: null,

                status: "waiting",

                maxPlayers:
                    this.config.maxPlayers,

                players: []

            };


            this.gameState = {

                gameId: null,

                roomId: null,

                phase: "waiting",

                round: 0,

                turn: null,

                trump: null,

                trick: [],

                scores: {

                    teamA: 0,

                    teamB: 0

                },

                players: [],

                version: 
