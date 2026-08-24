/* ============================================================
   HOKM ONLINE
   CHAT.JS
   مرحله ۱۳ پروژه

   سیستم کامل چت بازی حکم

   امکانات:
   - چت داخل بازی
   - ارسال پیام متنی
   - پیام‌های سریع
   - محدودیت طول پیام
   - جلوگیری از ارسال پیام خالی
   - ضد اسپم
   - محدودیت تعداد پیام
   - نمایش پیام‌های خودی و دیگران
   - زمان پیام
   - نمایش نام بازیکن
   - نمایش آواتار
   - حذف پیام‌های قدیمی
   - پاک کردن چت
   - بستن و باز کردن پنل چت
   - اعلان پیام جدید
   - ذخیره محلی پیام‌ها
   - آماده برای اتصال به multiplayer.js
   - پشتیبانی از eventهای آنلاین
   - fallback آفلاین
   - مدیریت reconnect
   - escaping برای جلوگیری از HTML injection
   - پشتیبانی کامل RTL
   - سازگار با موبایل
   ============================================================ */

(function () {
    "use strict";

    /* =========================================================
       CONFIG
    ========================================================= */

    const CHAT_CONFIG = Object.freeze({

        MAX_MESSAGE_LENGTH: 250,

        MIN_MESSAGE_LENGTH: 1,

        MAX_MESSAGES_PER_ROOM: 200,

        MAX_LOCAL_MESSAGES: 100,

        SPAM_INTERVAL: 1200,

        DUPLICATE_MESSAGE_INTERVAL: 3000,

        MESSAGE_STORAGE_PREFIX: "hokm_chat_",

        USER_STORAGE_KEY: "hokm_current_user",

        PROFILE_STORAGE_KEY: "hokm_profile",

        ROOM_STORAGE_KEY: "hokm_current_room",

        SETTINGS_STORAGE_KEY: "hokm_settings",

        MAX_FAST_MESSAGES: 20,

        MESSAGE_FADE_TIME: 180,

        NOTIFICATION_DURATION: 2500,

        MAX_RENDERED_MESSAGES: 100,

        RETRY_DELAY: 2000,

        MAX_RETRY_COUNT: 5

    });


    /* =========================================================
       CHAT STATE
    ========================================================= */

    const ChatState = {

        initialized: false,

        isOpen: false,

        isConnected: false,

        isSending: false,

        roomId: null,

        roomCode: null,

        messages: [],

        unreadCount: 0,

        lastMessageTime: 0,

        lastMessageText: "",

        lastDuplicateMessageTime: 0,

        retryCount: 0,

        retryTimer: null,

        currentUser: null,

        currentRoom: null,

        eventUnsubscribers: [],

        observers: [],

        destroyed: false

    };


    /* =========================================================
       DOM REFERENCES
    ========================================================= */

    const ChatDOM = {

        panel: null,

        header: null,

        closeButton: null,

        messages: null,

        form: null,

        input: null,

        sendButton: null,

        toastContainer: null,

        connectionStatus: null,

        ariaLive: null

    };


    /* =========================================================
       FAST MESSAGES
    ========================================================= */

    const FAST_MESSAGES = [

        {
            id: "good-luck",
            text: "موفق باشید 🍀",
            icon: "🍀"
        },

        {
            id: "well-played",
            text: "خوب بازی کردی 👏",
            icon: "👏"
        },

        {
            id: "nice",
            text: "چه بازی خوبی! 🔥",
            icon: "🔥"
        },

        {
            id: "wait",
            text: "لطفاً صبر کنید ⏳",
            icon: "⏳"
        },

        {
            id: "ready",
            text: "آماده‌ام ✅",
            icon: "✅"
        },

        {
            id: "thanks",
            text: "ممنون 🙏",
            icon: "🙏"
        },

        {
            id: "sorry",
            text: "ببخشید 😅",
            icon: "😅"
        },

        {
            id: "good-game",
            text: "بازی خوبی بود 🎮",
            icon: "🎮"
        }

    ];


    /* =========================================================
       UTILITY FUNCTIONS
    ========================================================= */

    function $(selector) {
        return document.querySelector(selector);
    }


    function $all(selector) {
        return Array.from(document.querySelectorAll(selector));
    }


    function generateId(prefix = "chat") {

        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).slice(2, 10)
        );

    }


    function now() {
        return Date.now();
    }


    function getTimeString(timestamp) {

        try {

            return new Intl.DateTimeFormat(
                "fa-IR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ).format(new Date(timestamp));

        } catch (error) {

            const date = new Date(timestamp);

            return (
                String(date.getHours()).padStart(2, "0") +
                ":" +
                String(date.getMinutes()).padStart(2, "0")
            );

        }

    }


    function escapeHTML(value) {

        const div = document.createElement("div");

        div.textContent = String(value ?? "");

        return div.innerHTML;

    }


    function normalizeMessage(value) {

        return String(value ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, CHAT_CONFIG.MAX_MESSAGE_LENGTH);

    }


    function normalizeName(value) {

        return String(value ?? "")
            .trim()
            .slice(0, 30) || "بازیکن";

    }


    function safeJSONParse(value, fallback = null) {

        try {

            return JSON.parse(value);

        } catch (error) {

            return fallback;

        }

    }


    /* =========================================================
       STORAGE
    ========================================================= */

    const ChatStorage = {

        getRoomKey(roomId) {

            const safeRoomId = String(roomId || "offline")
                .replace(/[^a-zA-Z0-9_-]/g, "_");

            return (
                CHAT_CONFIG.MESSAGE_STORAGE_PREFIX +
                safeRoomId
            );

        },


        load(roomId) {

            try {

                const key = this.getRoomKey(roomId);

                const raw = localStorage.getItem(key);

                if (!raw) {
                    return [];
                }

                const parsed = safeJSONParse(raw, []);

                if (!Array.isArray(parsed)) {
                    return [];
                }

                return parsed
                    .filter(message => message && typeof message === "object")
                    .slice(-CHAT_CONFIG.MAX_LOCAL_MESSAGES);

            } catch (error) {

                console.warn(
                    "[ChatStorage] Failed to load messages:",
                    error
                );

                return [];

            }

        },


        save(roomId, messages) {

            try {

                const key = this.getRoomKey(roomId);

                const safeMessages = Array.isArray(messages)
                    ? messages.slice(-CHAT_CONFIG.MAX_LOCAL_MESSAGES)
                    : [];

                localStorage.setItem(
                    key,
                    JSON.stringify(safeMessages)
                );

            } catch (error) {

                console.warn(
                    "[ChatStorage] Failed to save messages:",
                    error
                );

            }

        },


        clear(roomId) {

            try {

                const key = this.getRoomKey(roomId);

                localStorage.removeItem(key);

            } catch (error) {

                console.warn(
                    "[ChatStorage] Failed to clear:",
                    error
                );

            }

        }

    };


    /* =========================================================
       USER
    ========================================================= */

    function getCurrentUser() {

        if (ChatState.currentUser) {
            return ChatState.currentUser;
        }


        try {

            const storedUser =
                localStorage.getItem(
                    CHAT_CONFIG.USER_STORAGE_KEY
                );

            if (storedUser) {

                const parsed =
                    safeJSONParse(storedUser, null);

                if (parsed && typeof parsed === "object") {

                    ChatState.currentUser = {

                        id:
                            parsed.id ||
                            parsed.userId ||
                            parsed.uid ||
                            generateId("user"),

                        username:
                            normalizeName(
                                parsed.username ||
                                parsed.name ||
                                parsed.displayName
                            ),

                        avatar:
                            parsed.avatar ||
                            parsed.avatarUrl ||
                            "👤"

                    };

                    return ChatState.currentUser;

                }

            }

        } catch (error) {

            console.warn(
                "[Chat] Cannot read current user:",
                error
            );

        }


        try {

            const profile =
                safeJSONParse(
                    localStorage.getItem(
                        CHAT_CONFIG.PROFILE_STORAGE_KEY
                    ),
                    null
                );

            if (profile && typeof profile === "object") {

                ChatState.currentUser = {

                    id:
                        profile.id ||
                        profile.userId ||
                        generateId("user"),

                    username:
                        normalizeName(
                            profile.username ||
                            profile.name
                        ),

                    avatar:
                        profile.avatar ||
                        "👤"

                };

                return ChatState.currentUser;

            }

        } catch (error) {
            // intentionally ignored
        }


        ChatState.currentUser = {

            id: "guest_" + Date.now(),

            username: "مهمان",

            avatar: "👤"

        };


        return ChatState.currentUser;

    }


    /* =========================================================
       ROOM
    ========================================================= */

    function getCurrentRoom() {

        if (ChatState.currentRoom) {
            return ChatState.currentRoom;
        }


        try {

            const storedRoom =
                localStorage.getItem(
                    CHAT_CONFIG.ROOM_STORAGE_KEY
                );

            if (storedRoom) {

                const parsed =
                    safeJSONParse(storedRoom, null);

                if (parsed && typeof parsed === "object") {

                    ChatState.currentRoom = parsed;

                    return parsed;

                }

            }

        } catch (error) {
            // intentionally ignored
        }


        return null;

    }


    function resolveRoomId(room) {

        if (!room) {
            return "offline";
        }

        return (
            room.id ||
            room.roomId ||
            room.code ||
            room.roomCode ||
            "offline"
        );

    }


    /* =========================================================
       DOM INITIALIZATION
    ========================================================= */

    function cacheDOM() {

        ChatDOM.panel =
            document.getElementById("chat-panel");

        ChatDOM.header =
            ChatDOM.panel
                ? ChatDOM.panel.querySelector(".chat-header")
                : null;

        ChatDOM.closeButton =
            document.getElementById("close-chat-button");

        ChatDOM.messages =
            document.getElementById("chat-messages");

        ChatDOM.form =
            document.getElementById("chat-form");

        ChatDOM.input =
            document.getElementById("chat-input");

        ChatDOM.sendButton =
            ChatDOM.form
                ? ChatDOM.form.querySelector(
                    ".chat-send-button"
                )
                : null;

        ChatDOM.toastContainer =
            document.getElementById("toast-container");

        ChatDOM.connectionStatus =
            document.getElementById(
                "connection-status"
            );

        ChatDOM.ariaLive =
            document.getElementById(
                "aria-live-region"
            );

    }


    /* =========================================================
       CHAT PANEL
    ========================================================= */

    function openChat() {

        if (!ChatDOM.panel) {
            return;
        }

        ChatState.isOpen = true;

        ChatDOM.panel.classList.remove("hidden");

        ChatDOM.panel.classList.add("chat-open");

        ChatState.unreadCount = 0;

        updateUnreadBadge();

        updateConnectionUI();


        requestAnimationFrame(() => {

            scrollToBottom(false);

            if (ChatDOM.input) {
                ChatDOM.input.focus();
            }

        });


        dispatchChatEvent(
            "chat:opened",
            {
                roomId: ChatState.roomId
            }
        );

    }


    function closeChat() {

        if (!ChatDOM.panel) {
            return;
        }

        ChatState.isOpen = false;

        ChatDOM.panel.classList.add("hidden");

        ChatDOM.panel.classList.remove("chat-open");


        dispatchChatEvent(
            "chat:closed",
            {
                roomId: ChatState.roomId
            }
        );

    }


    function toggleChat() {

        if (ChatState.isOpen) {
            closeChat();
        } else {
            openChat();
        }

    }


    /* =========================================================
       UNREAD BADGE
    ========================================================= */

    function updateUnreadBadge() {

        const chatButton =
            document.getElementById(
                "game-chat-button"
            );

        if (!chatButton) {
            return;
        }


        let badge =
            chatButton.querySelector(
                ".chat-unread-badge"
            );


        if (!badge) {

            badge =
                document.createElement("span");

            badge.className =
                "chat-unread-badge";

            chatButton.appendChild(badge);

        }


        if (ChatState.unreadCount > 0) {

            badge.textContent =
                ChatState.unreadCount > 99
                    ? "99+"
                    : String(ChatState.unreadCount);

            badge.classList.remove("hidden");

        } else {

            badge.classList.add("hidden");

        }

    }


    /* =========================================================
       CONNECTION UI
    ========================================================= */

    function updateConnectionUI() {

        if (!ChatDOM.connectionStatus) {
            return;
        }


        const icon =
            document.getElementById(
                "connection-status-icon"
            );

        const text =
            document.getElementById(
                "connection-status-text"
            );


        if (ChatState.isConnected) {

            ChatDOM.connectionStatus.classList.remove(
                "offline"
            );

            if (icon) {
                icon.textContent = "●";
            }

            if (text) {
                text.textContent = "متصل";
            }

        } else {

            ChatDOM.connectionStatus.classList.add(
                "offline"
            );

            if (icon) {
                icon.textContent = "●";
            }

            if (text) {
                text.textContent = "آفلاین";
            }

        }

    }


    /* =========================================================
       MESSAGE VALIDATION
    ========================================================= */

    function validateMessage(message) {

        const normalized =
            normalizeMessage(message);


        if (!normalized) {

            return {
                valid: false,
                reason: "empty"
            };

        }


        if (
            normalized.length <
            CHAT_CONFIG.MIN_MESSAGE_LENGTH
        ) {

            return {
                valid: false,
                reason: "too-short"
            };

        }


        if (
            normalized.length >
            CHAT_CONFIG.MAX_MESSAGE_LENGTH
        ) {

            return {
                valid: false,
                reason: "too-long"
            };

        }


        const currentTime = now();


        if (
            currentTime -
            ChatState.lastMessageTime <
            CHAT_CONFIG.SPAM_INTERVAL
        ) {

            return {
                valid: false,
                reason: "spam"
            };

        }


        if (
            normalized ===
            ChatState.lastMessageText &&
            currentTime -
            ChatState.lastDuplicateMessageTime <
            CHAT_CONFIG.DUPLICATE_MESSAGE_INTERVAL
        ) {

            return {
                valid: false,
                reason: "duplicate"
            };

        }


        return {
            valid: true,
            message: normalized
        };

    }


    /* =========================================================
       CREATE MESSAGE
    ========================================================= */

    function createMessage(text, options = {}) {

        const user =
            getCurrentUser();


        const timestamp =
            Number(options.timestamp) ||
            now();


        return {

            id:
                options.id ||
                generateId("msg"),

            roomId:
                options.roomId ||
                ChatState.roomId ||
                "offline",

            senderId:
                options.senderId ||
                user.id,

            senderName:
                normalizeName(
                    options.senderName ||
                    user.username
                ),

            senderAvatar:
                options.senderAvatar ||
                user.avatar ||
                "👤",

            text:
                normalizeMessage(text),

            timestamp,

            type:
                options.type ||
                "text",

            status:
                options.status ||
                "sent",

            isOwn:
                options.isOwn !== undefined
                    ? Boolean(options.isOwn)
                    : true

        };

    }


    /* =========================================================
       ADD MESSAGE
    ========================================================= */

    function addMessage(message, options = {}) {

        if (!message || typeof message !== "object") {
            return null;
        }


        const normalizedText =
            normalizeMessage(message.text);


        if (!normalizedText) {
            return null;
        }


        const user =
            getCurrentUser();


        const normalizedMessage = {

            id:
                message.id ||
                generateId("msg"),

            roomId:
                message.roomId ||
                ChatState.roomId ||
                "offline",

            senderId:
                message.senderId ||
                message.userId ||
                "unknown",

            senderName:
                normalizeName(
                    message.senderName ||
                    message.username ||
                    "بازیکن"
                ),

            senderAvatar:
                message.senderAvatar ||
                message.avatar ||
                "👤",

            text:
                normalizedText,

            timestamp:
                Number(message.timestamp) ||
                now(),

            type:
                message.type ||
                "text",

            status:
                message.status ||
                "sent",

            isOwn:
                message.senderId === user.id ||
                message.userId === user.id ||
                Boolean(message.isOwn)

        };


        const exists =
            ChatState.messages.some(
                item => item.id === normalizedMessage.id
            );


        if (exists) {
            return normalizedMessage;
        }


        ChatState.messages.push(
            normalizedMessage
        );


        if (
            ChatState.messages.length >
            CHAT_CONFIG.MAX_MESSAGES_PER_ROOM
        ) {

            ChatState.messages =
                ChatState.messages.slice(
                    -CHAT_CONFIG.MAX_MESSAGES_PER_ROOM
                );

        }


        ChatStorage.save(
            ChatState.roomId,
            ChatState.messages
        );


        renderMessage(
            normalizedMessage,
            options
        );


        if (
            !normalizedMessage.isOwn &&
            !ChatState.isOpen &&
            !options.silent
        ) {

            ChatState.unreadCount++;

            updateUnreadBadge();

            showChatNotification(
                normalizedMessage
            );

        }


        if (
            !normalizedMessage.isOwn &&
            !options.silent
        ) {

            announceMessage(
                normalizedMessage
            );

        }


        dispatchChatEvent(
            "chat:message",
            {
                message: normalizedMessage
            }
        );


        return normalizedMessage;

    }


    /* =========================================================
       RENDER MESSAGE
    ========================================================= */

    function renderMessage(message, options = {}) {

        if (!ChatDOM.messages) {
            return;
        }


        const empty =
            ChatDOM.messages.querySelector(
                ".chat-empty"
            );


        if (empty) {
            empty.remove();
        }


        const element =
            createMessageElement(
                message
            );


        ChatDOM.messages.appendChild(
            element
        );


        const children =
            Array.from(
                ChatDOM.messages.children
            );


        while (
            children.length >
            CHAT_CONFIG.MAX_RENDERED_MESSAGES
        ) {

            const first =
                children.shift();

            if (first) {
                first.remove();
            }

        }


        scrollToBottom(
            options.smooth !== false
        );

    }


    function createMessageElement(message) {

        const wrapper =
            document.createElement("div");


        wrapper.className =
            "chat-message";


        wrapper.dataset.messageId =
            message.id;


        if (message.isOwn) {

            wrapper.classList.add(
                "own-message"
            );

        } else {

            wrapper.classList.add(
                "other-message"
            );

        }


        if (message.type === "system") {

            wrapper.classList.add(
                "system-message"
            );

        }


        const avatar =
            document.createElement("div");


        avatar.className =
            "chat-message-avatar";


        avatar.textContent =
            message.senderAvatar ||
            "👤";


        const content =
            document.createElement("div");


        content.className =
            "chat-message-content";


        const meta =
            document.createElement("div");


        meta.className =
            "chat-message-meta";


        const name =
            document.createElement("span");


        name.className =
            "chat-message-name";


        name.textContent =
            message.senderName;


        const time =
            document.createElement("span");


        time.className =
            "chat-message-time";


        time.textContent =
            getTimeString(
                message.timestamp
            );


        meta.appendChild(name);

        meta.appendChild(time);


        const text =
            document.createElement("div");


        text.className =
            "chat-message-text";


        text.textContent =
            message.text;


        content.appendChild(meta);

        content.appendChild(text);


        wrapper.appendChild(avatar);

        wrapper.appendChild(content);


        return wrapper;

    }


    /* =========================================================
       RENDER ALL
    ========================================================= */

    function renderAllMessages() {

        if (!ChatDOM.messages) {
            return;
        }


        ChatDOM.messages.innerHTML = "";


        if (!ChatState.messages.length) {

            const empty =
                document.createElement("div");

            empty.className =
                "chat-empty";

            empty.textContent =
                "هنوز پیامی ارسال نشده است.";

            ChatDOM.messages.appendChild(
                empty
            );

            return;

        }


        const messages =
            ChatState.messages.slice(
                -CHAT_CONFIG.MAX_RENDERED_MESSAGES
            );


        messages.forEach(message => {

            ChatDOM.messages.appendChild(
                createMessageElement(message)
            );

        });


        scrollToBottom(false);

    }


    /* =========================================================
       SCROLL
    ========================================================= */

    function scrollToBottom(smooth = true) {

        if (!ChatDOM.messages) {
            return;
        }


        requestAnimationFrame(() => {

            ChatDOM.messages.scrollTo({

                top:
                    ChatDOM.messages.scrollHeight,

                behavior:
                    smooth
                        ? "smooth"
                        : "auto"

            });

        });

    }


    /* =========================================================
       SEND MESSAGE
    ========================================================= */

    async function sendMessage(text) {

        if (ChatState.isSending) {
            return false;
        }


        const validation =
            validateMessage(text);


        if (!validation.valid) {

            handleValidationError(
                validation.reason
            );

            return false;

        }


        const normalized =
            validation.message;


        ChatState.isSending = true;


        setSendButtonState(true);


        const timestamp =
            now();


        ChatState.lastMessageTime =
            timestamp;


        ChatState.lastMessageText =
            normalized;


        ChatState.lastDuplicateMessageTime =
            timestamp;


        const message =
            createMessage(
                normalized,
                {
                    roomId:
                        ChatState.roomId,

                    timestamp,

                    status:
                        ChatState.isConnected
                            ? "sending"
                            : "sent"

                }
            );


        addMessage(
            message,
            {
                smooth: true
            }
        );


        if (ChatDOM.input) {
            ChatDOM.input.value = "";
        }


        let remoteSuccess = false;


        try {

            remoteSuccess =
                await sendToMultiplayer(
                    message
                );

        } catch (error) {

            console.warn(
                "[Chat] Remote send failed:",
                error
            );

            remoteSuccess = false;

        }


        if (remoteSuccess) {

            updateMessageStatus(
                message.id,
                "sent"
            );

        } else {

            updateMessageStatus(
                message.id,
                "local"
            );

        }


        ChatState.isSending = false;

        setSendButtonState(false);


        dispatchChatEvent(
            "chat:sent",
            {
                message,
                remote: remoteSuccess
            }
        );


        return true;

    }


    /* =========================================================
       MULTIPLAYER SEND
    ========================================================= */

    async function sendToMultiplayer(message) {

        const candidates = [

            "HokmMultiplayer",

            "Multiplayer",

            "multiplayer",

            "HokmOnline",

            "RoomManager"

        ];


        for (
            const name of candidates
        ) {

            const object =
                window[name];


            if (
                object &&
                typeof object.sendChatMessage ===
                "function"
            ) {

                try {

                    const result =
                        await object.sendChatMessage(
                            message
                        );

                    return result !== false;

                } catch (error) {

                    console.warn(
                        `[Chat] ${name}.sendChatMessage failed`,
                        error
                    );

                }

            }

        }


        /*
         * اگر multiplayer.js هنوز اتصال واقعی
         * ندارد، پیام محلی باقی می‌ماند.
         */

        return false;

    }


    /* =========================================================
       RECEIVE REMOTE MESSAGE
    ========================================================= */

    function receiveRemoteMessage(payload) {

        if (!payload) {
            return null;
        }


        let message =
            payload;


        if (
            payload.message &&
            typeof payload.message === "object"
        ) {

            message =
                payload.message;

        }


        const normalized =
            addMessage(
                {
                    ...message,

                    isOwn: false

                },
                {
                    silent: false,

                    smooth: true

                }
            );


        if (normalized) {

            ChatState.isConnected =
                true;

            ChatState.retryCount =
                0;

            updateConnectionUI();

        }


        return normalized;

    }


    /* =========================================================
       UPDATE MESSAGE STATUS
    ========================================================= */

    function updateMessageStatus(
        messageId,
        status
    ) {

        const message =
            ChatState.messages.find(
                item =>
                    item.id === messageId
            );


        if (!message) {
            return;
        }


        message.status =
            status;


        ChatStorage.save(
            ChatState.roomId,
            ChatState.messages
        );


        const element =
            ChatDOM.messages
                ? ChatDOM.messages.querySelector(
                    `[data-message-id="${CSS.escape(messageId)}"]`
                )
                : null;


        if (!element) {
            return;
        }


        element.dataset.status =
            status;

    }


    /* =========================================================
       SEND BUTTON
    ========================================================= */

    function setSendButtonState(disabled) {

        if (!ChatDOM.sendButton) {
            return;
        }


        ChatDOM.sendButton.disabled =
            disabled;


        if (disabled) {

            ChatDOM.sendButton.classList.add(
                "sending"
            );

        } else {

            ChatDOM.sendButton.classList.remove(
                "sending"
            );

        }

    }


    /* =========================================================
       VALIDATION ERRORS
    ========================================================= */

    function handleValidationError(reason) {

        switch (reason) {

            case "empty":

                showToast(
                    "پیام نمی‌تواند خالی باشد.",
                    "warning"
                );

                break;


            case "too-short":

                showToast(
                    "پیام خیلی کوتاه است.",
                    "warning"
                );

                break;


            case "too-long":

                showToast(
                    `پیام نباید بیشتر از ${CHAT_CONFIG.MAX_MESSAGE_LENGTH} کاراکتر باشد.`,
                    "warning"
                );

                break;


            case "spam":

                showToast(
                    "لطفاً کمی صبر کنید و سپس پیام بفرستید.",
                    "warning"
                );

                break;


            case "duplicate":

                showToast(
                    "این پیام را همین الان فرستادید.",
                    "warning"
                );

                break;


            default:

                showToast(
                    "امکان ارسال پیام وجود ندارد.",
                    "error"
                );

        }

    }


    /* =========================================================
       FAST CHAT
    ========================================================= */

    function createFastMessagesUI() {

        if (!ChatDOM.panel) {
            return;
        }


        const existing =
            ChatDOM.panel.querySelector(
                ".chat-fast-messages"
            );


        if (existing) {
            return;
        }


        const container =
            document.createElement("div");


        container.className =
            "chat-fast-messages";


        FAST_MESSAGES
            .slice(0, CHAT_CONFIG.MAX_FAST_MESSAGES)
            .forEach(item => {

                const button =
                    document.createElement("button");


                button.type =
                    "button";


                button.className =
                    "chat-fast-message";


                button.dataset.message =
                    item.text;


                button.textContent =
                    item.icon +
                    " " +
                    item.text;


                button.addEventListener(
                    "click",
                    () => {

                        sendMessage(
                            item.text
                        );

                    }
                );


                container.appendChild(
                    button
                );

            });


        if (ChatDOM.form) {

            ChatDOM.panel.insertBefore(
                container,
                ChatDOM.form
            );

        } else {

            ChatDOM.panel.appendChild(
                container
            );

        }

    }


    /* =========================================================
       NOTIFICATION
    ========================================================= */

    function showChatNotification(message) {

        if (!message) {
            return;
        }


        const title =
            `${message.senderName}`;


        const text =
            message.text;


        showToast(
            `${title}: ${text}`,
            "info",
            CHAT_CONFIG.NOTIFICATION_DURATION
        );

    }


    function showToast(
        message,
        type = "info",
        duration = 2500
    ) {

        if (!ChatDOM.toastContainer) {
            return;
        }


        const toast =
            document.createElement("div");


        toast.className =
            "toast";


        toast.classList.add(
            `toast-${type}`
        );


        toast.textContent =
            String(message);


        ChatDOM.toastContainer.appendChild(
            toast
        );


        requestAnimationFrame(() => {

            toast.classList.add(
                "show"
            );

        });


        setTimeout(() => {

            toast.classList.remove(
                "show"
            );


            setTimeout(() => {

                toast.remove();

            }, 250);

        }, duration);

    }


    /* =========================================================
       ACCESSIBILITY
    ========================================================= */

    function announceMessage(message) {

        if (!ChatDOM.ariaLive) {
            return;
        }


        ChatDOM.ariaLive.textContent =
            `پیام جدید از ${message.senderName}: ${message.text}`;

    }


    /* =========================================================
       CHAT EVENT DISPATCH
    ========================================================= */

    function dispatchChatEvent(
        eventName,
        detail = {}
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

        } catch (error) {

            console.warn(
                "[Chat] Event dispatch failed:",
                error
            );

        }

    }


    /* =========================================================
       MULTIPLAYER EVENT LISTENERS
    ========================================================= */

    function registerGlobalMultiplayerListeners() {

        const handlers = {

            "multiplayer:chat-message":
                event => {

                    receiveRemoteMessage(
                        event.detail
                    );

                },


            "chat:receive":
                event => {

                    receiveRemoteMessage(
                        event.detail
                    );

                },


            "room:chat-message":
                event => {

                    receiveRemoteMessage(
                        event.detail
                    );

                },


            "multiplayer:connected":
                () => {

                    setConnectionState(
                        true
                    );

                },


            "multiplayer:disconnected":
                () => {

                    setConnectionState(
                        false
                    );

                },


            "room:joined":
                event => {

                    const room =
                        event.detail?.room ||
                        event.detail;

                    if (room) {

                        setRoom(
                            room
                        );

                    }

                },


            "room:left":
                () => {

                    clearRoom();

                }

        };


        Object.entries(handlers)
            .forEach(
                ([eventName, handler]) => {

                    window.addEventListener(
                        eventName,
                        handler
                    );


                    ChatState.eventUnsubscribers.push(
                        () => {

                            window.removeEventListener(
                                eventName,
                                handler
                            );

                        }
                    );

                }
            );

    }


    /* =========================================================
       CONNECTION STATE
    ========================================================= */

    function setConnectionState(
        connected
    ) {

        ChatState.isConnected =
            Boolean(connected);


        if (connected) {

            ChatState.retryCount =
                0;

        }


        updateConnectionUI();


        dispatchChatEvent(
            connected
                ? "chat:connected"
                : "chat:disconnected",
            {
                roomId:
                    ChatState.roomId
            }
        );

    }


    /* =========================================================
       ROOM MANAGEMENT
    ========================================================= */

    function setRoom(room) {

        ChatState.currentRoom =
            room;


        ChatState.roomId =
            resolveRoomId(room);


        ChatState.roomCode =
            room?.code ||
            room?.roomCode ||
            null;


        ChatState.messages =
            ChatStorage.load(
                ChatState.roomId
            );


        renderAllMessages();


        dispatchChatEvent(
            "chat:room-changed",
            {
                room
            }
        );

    }


    function clearRoom() {

        ChatState.currentRoom =
            null;

        ChatState.roomId =
            null;

        ChatState.roomCode =
            null;

        ChatState.messages =
            [];

        ChatState.unreadCount =
            0;


        updateUnreadBadge();

        renderAllMessages();


        dispatchChatEvent(
            "chat:room-cleared"
        );

    }


    /* =========================================================
       CLEAR CHAT
    ========================================================= */

    function clearChat(options = {}) {

        const roomId =
            ChatState.roomId ||
            "offline";


        ChatState.messages =
            [];


        ChatStorage.clear(
            roomId
        );


        renderAllMessages();


        if (!options.silent) {

            showToast(
                "تاریخچه چت پاک شد.",
                "success"
            );

        }


        dispatchChatEvent(
            "chat:cleared",
            {
                roomId
            }
        );

    }


    /* =========================================================
       INPUT COUNTER
    ========================================================= */

    function createCharacterCounter() {

        if (!ChatDOM.form || !ChatDOM.input) {
            return;
        }


        let counter =
            ChatDOM.form.querySelector(
                ".chat-character-counter"
            );


        if (!counter) {

            counter =
                document.createElement("span");

            counter.className =
                "chat-character-counter";


            ChatDOM.form.appendChild(
                counter
            );

        }


        function updateCounter() {

            const length =
                ChatDOM.input.value.length;


            counter.textContent =
                `${length}/${CHAT_CONFIG.MAX_MESSAGE_LENGTH}`;


            if (
                length >=
                CHAT_CONFIG.MAX_MESSAGE_LENGTH * 0.9
            ) {

                counter.classList.add(
                    "near-limit"
                );

            } else {

                counter.classList.remove(
                    "near-limit"
                );

            }

        }


        ChatDOM.input.addEventListener(
            "input",
            updateCounter
        );


        updateCounter();

    }


    /* =========================================================
       FORM
    ========================================================= */

    function handleSubmit(event) {

        event.preventDefault();


        if (!ChatDOM.input) {
            return;
        }


        const text =
            ChatDOM.input.value;


        sendMessage(
            text
        );

    }


    /* =========================================================
       KEYBOARD
    ========================================================= */

    function handleInputKeyDown(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();


            if (ChatDOM.form) {

                ChatDOM.form.dispatchEvent(
                    new Event(
                        "submit",
                        {
                            bubbles: true,
                            cancelable: true
                        }
                    )
                );

            }

        }

    }


    /* =========================================================
       OPEN CHAT BUTTON
    ========================================================= */

    function bindChatButton() {

        const button =
            document.getElementById(
                "game-chat-button"
            );


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            toggleChat
        );

    }


    /* =========================================================
       CLOSE BUTTON
    ========================================================= */

    function bindCloseButton() {

        if (!ChatDOM.closeButton) {
            return;
        }


        ChatDOM.closeButton.addEventListener(
            "click",
            closeChat
        );

    }


    /* =========================================================
       OUTSIDE CLICK
    ========================================================= */

    function bindOutsideClick() {

        if (!ChatDOM.panel) {
            return;
        }


        document.addEventListener(
            "click",
            event => {

                if (!ChatState.isOpen) {
                    return;
                }


                const clickedInside =
                    ChatDOM.panel.contains(
                        event.target
                    );


                const chatButton =
                    document.getElementById(
                        "game-chat-button"
                    );


                const clickedButton =
                    chatButton &&
                    chatButton.contains(
                        event.target
                    );


                if (
                    !clickedInside &&
                    !clickedButton
                ) {

                    closeChat();

                }

            }
        );

    }


    /* =========================================================
       ESCAPE KEY
    ========================================================= */

    function bindEscapeKey() {

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape" &&
                    ChatState.isOpen
                ) {

                    closeChat();

                }

            }
        );

    }


    /* =========================================================
       INITIAL ROOM
    ========================================================= */

    function initializeRoom() {

        const room =
            getCurrentRoom();


        if (room) {

            setRoom(
                room
            );

        } else {

            ChatState.roomId =
                "offline";


            ChatState.messages =
                ChatStorage.load(
                    "offline"
                );


            renderAllMessages();

        }

    }


    /* =========================================================
       SYSTEM MESSAGE
    ========================================================= */

    function addSystemMessage(
        text,
        options = {}
    ) {

        const message =
            createMessage(
                text,
                {

                    id:
                        options.id ||
                        generateId("system"),

                    senderId:
                        "system",

                    senderName:
                        "سیستم",

                    senderAvatar:
                        options.avatar ||
                        "ℹ️",

                    type:
                        "system",

                    roomId:
                        ChatState.roomId ||
                        "offline",

                    isOwn:
                        false

                }
            );


        return addMessage(
            message,
            {
                silent:
                    options.silent !== false
            }
        );

    }


    /* =========================================================
       RETRY CONNECTION
    ========================================================= */

    function scheduleRetry() {

        if (
            ChatState.retryCount >=
            CHAT_CONFIG.MAX_RETRY_COUNT
        ) {

            return;

        }


        if (ChatState.retryTimer) {

            clearTimeout(
                ChatState.retryTimer
            );

        }


        ChatState.retryCount++;


        ChatState.retryTimer =
            setTimeout(
                () => {

                    tryConnectToMultiplayer();

                },
                CHAT_CONFIG.RETRY_DELAY *
                ChatState.retryCount
            );

    }


    /* =========================================================
       MULTIPLAYER CONNECTION
    ========================================================= */

    function tryConnectToMultiplayer() {

        const candidates = [

            "HokmMultiplayer",

            "Multiplayer",

            "multiplayer",

            "HokmOnline"

        ];


        for (
            const name of candidates
        ) {

            const object =
                window[name];


            if (!object) {
                continue;
            }


            if (
                typeof object.isConnected ===
                "function"
            ) {

                try {

                    setConnectionState(
                        Boolean(
                            object.isConnected()
                        )
                    );

                } catch (error) {
                    // ignore
                }

            }


            if (
                typeof object.subscribeToChat ===
                "function"
            ) {

                try {

                    const unsubscribe =
                        object.subscribeToChat(
                            receiveRemoteMessage
                        );


                    if (
                        typeof unsubscribe ===
                        "function"
                    ) {

                        ChatState.eventUnsubscribers.push(
                            unsubscribe
                        );

                    }


                    return true;

                } catch (error) {

                    console.warn(
                        "[Chat] subscribeToChat failed:",
                        error
                    );

                }

            }

        }


        return false;

    }


    /* =========================================================
       NETWORK STATUS
    ========================================================= */

    function bindNetworkEvents() {

        window.addEventListener(
            "online",
            () => {

                setConnectionState(
                    true
                );


                tryConnectToMultiplayer();

            }
        );


        window.addEventListener(
            "offline",
            () => {

                setConnectionState(
                    false
                );

            }
        );


        if (
            typeof navigator !==
            "undefined"
        ) {

            setConnectionState(
                navigator.onLine
            );

        }

    }


    /* =========================================================
       CHAT PANEL ACCESSIBILITY
    ========================================================= */

    function improveAccessibility() {

        if (!ChatDOM.panel) {
            return;
        }


        ChatDOM.panel.setAttribute(
            "role",
            "dialog"
        );


        ChatDOM.panel.setAttribute(
            "aria-label",
            "چت بازی"
        );


        if (ChatDOM.input) {

            ChatDOM.input.setAttribute(
                "aria-label",
                "پیام خود را بنویسید"
            );

        }


        if (ChatDOM.sendButton) {

            ChatDOM.sendButton.setAttribute(
                "aria-label",
                "ارسال پیام"
            );

        }

    }


    /* =========================================================
       LOAD INITIAL MESSAGES
    ========================================================= */

    function loadInitialMessages() {

        const room =
            getCurrentRoom();


        if (room) {

            setRoom(
                room
            );

            return;

        }


        ChatState.roomId =
            "offline";


        ChatState.messages =
            ChatStorage.load(
                "offline"
            );


        renderAllMessages();

    }


    /* =========================================================
       INITIALIZE EVENTS
    ========================================================= */

    function bindEvents() {

        bindChatButton();

        bindCloseButton();

        bindOutsideClick();

        bindEscapeKey();


        if (ChatDOM.form) {

            ChatDOM.form.addEventListener(
                "submit",
                handleSubmit
            );

        }


        if (ChatDOM.input) {

            ChatDOM.input.addEventListener(
                "keydown",
                handleInputKeyDown
            );

        }


        registerGlobalMultiplayerListeners();

        bindNetworkEvents();

    }


    /* =========================================================
       PUBLIC API
    ========================================================= */

    const ChatAPI = {

        init() {

            if (ChatState.initialized) {
                return this;
            }


            ChatState.destroyed =
                false;


            cacheDOM();

            getCurrentUser();

            initializeRoom();

            bindEvents();

            createFastMessagesUI();

            createCharacterCounter();

            improveAccessibility();

            loadInitialMessages();

            tryConnectToMultiplayer();


            ChatState.initialized =
                true;


            dispatchChatEvent(
                "chat:initialized",
                {
                    roomId:
                        ChatState.roomId
                }
            );


            return this;

        },


        open() {

            openChat();

            return this;

        },


        close() {

            closeChat();

            return this;

        },


        toggle() {

            toggleChat();

            return this;

        },


        send(text) {

            return sendMessage(
                text
            );

        },


        receive(message) {

            return receiveRemoteMessage(
                message
            );

        },


        addSystemMessage(text, options) {

            return addSystemMessage(
                text,
                options
            );

        },


        clear(options) {

            clearChat(
                options
            );

            return this;

        },


        setRoom(room) {

            setRoom(
                room
            );

            return this;

        },


        clearRoom() {

            clearRoom();

            return this;

        },


        getMessages() {

            return [
                ...ChatState.messages
            ];

        },


        getUnreadCount() {

            return ChatState.unreadCount;

        },


        markAsRead() {

            ChatState.unreadCount =
                0;


            updateUnreadBadge();


            return this;

        },


        isOpen() {

            return ChatState.isOpen;

        },


        isConnected() {

            return ChatState.isConnected;

        },


        getCurrentUser() {

            return getCurrentUser();

        },


        getCurrentRoom() {

            return ChatState.currentRoom;

        },


        addListener(
            eventName,
            callback
        ) {

            if (
                typeof callback !==
                "function"
            ) {

                return () => {};

            }


            window.addEventListener(
                eventName,
                callback
            );


            const unsubscribe =
                () => {

                    window.removeEventListener(
                        eventName,
                        callback
                    );

                };


            ChatState.observers.push(
                unsubscribe
            );


            return unsubscribe;

        },


        destroy() {

            ChatState.eventUnsubscribers
                .forEach(
                    unsubscribe => {

                        try {

                            unsubscribe();

                        } catch (error) {
                            // ignore
                        }

                    }
                );


            ChatState.eventUnsubscribers =
                [];


            ChatState.observers
                .forEach(
                    unsubscribe => {

                        try {

                            unsubscribe();

                        } catch (error) {
                            // ignore
                        }

                    }
                );


            ChatState.observers =
                [];


            if (ChatState.retryTimer) {

                clearTimeout(
                    ChatState.retryTimer
                );

                ChatState.retryTimer =
                    null;

            }


            ChatState.initialized =
                false;

            ChatState.destroyed =
                true;

        },


        getState() {

            return {

                initialized:
                    ChatState.initialized,

                isOpen:
                    ChatState.isOpen,

                isConnected:
                    ChatState.isConnected,

                roomId:
                    ChatState.roomId,

                roomCode:
                    ChatState.roomCode,

                messageCount:
                    ChatState.messages.length,

                unreadCount:
                    ChatState.unreadCount

            };

        }

    };


    /* =========================================================
       GLOBAL EXPORT
    ========================================================= */

    window.HokmChat =
        ChatAPI;


    window.ChatManager =
        ChatAPI;


    window.chat =
        ChatAPI;


    /* =========================================================
       AUTO INITIALIZATION
    ========================================================= */

    function initializeChatWhenReady() {

        if (
            document.readyState ===
            "loading"
        ) {

            document.addEventListener(
                "DOMContentLoaded",
                () => {

                    ChatAPI.init();

                },
                {
                    once: true
                }
            );

        } else {

            ChatAPI.init();

        }

    }


    initializeChatWhenReady();


    /* =========================================================
       COMPATIBILITY HELPERS
    ========================================================= */

    window.openChat =
        function () {

            return ChatAPI.open();

        };


    window.closeChat =
        function () {

            return ChatAPI.close();

        };


    window.toggleChat =
        function () {

            return ChatAPI.toggle();

        };


    window.sendChatMessage =
        function (message) {

            return ChatAPI.send(
                message
            );

        };


    window.receiveChatMessage =
        function (message) {

            return ChatAPI.receive(
                message
            );

        };


    /* =========================================================
       DEBUG API
    ========================================================= */

    window.HokmChatDebug = {

        getState() {

            return ChatAPI.getState();

        },


        getMessages() {

            return ChatAPI.getMessages();

        },


        clearChat() {

            return ChatAPI.clear();

        },


        addSystemMessage(text) {

            return ChatAPI.addSystemMessage(
                text
            );

        },


        simulateMessage(
            text,
            senderName = "بازیکن تست"
        ) {

            return ChatAPI.receive({

                id:
                    generateId("test"),

                senderId:
                    generateId("test-user"),

                senderName,

                senderAvatar:
                    "👤",

                text,

                timestamp:
                    Date.now(),

                type:
                    "text"

            });

        }

    };


})();
