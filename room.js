/* ================================================================
   HOKM ONLINE
   ROOM.JS
   مرحله ۱۱ پروژه

   مسئولیت این فایل:
   ---------------------------------------------------------------
   1. ساخت اتاق
   2. تولید کد اتاق
   3. ورود به اتاق
   4. خروج از اتاق
   5. مدیریت بازیکنان اتاق
   6. مدیریت صندلی‌های 4 نفره
   7. وضعیت آماده بودن بازیکنان
   8. دعوت دوستان
   9. کپی کد اتاق
   10. نمایش وضعیت اتاق
   11. مدیریت Host
   12. مدیریت اتاق خصوصی
   13. آماده‌سازی برای Multiplayer واقعی
   14. همگام‌سازی وضعیت اتاق
   15. جلوگیری از ورود بازیکن تکراری
   16. مدیریت اتاق‌های محلی برای توسعه
   17. Event system
   18. اتصال به multiplayer.js در مراحل بعد
================================================================ */


/* ================================================================
   ROOM CONFIGURATION
================================================================ */

const ROOM_CONFIG = {

    MAX_PLAYERS: 4,

    MIN_PLAYERS_TO_START: 4,

    ROOM_CODE_LENGTH: 6,

    ROOM_CODE_CHARACTERS:
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",

    DEFAULT_ROOM_NAME:
        "اتاق حکم",

    ROOM_EXPIRATION_TIME:
        1000 * 60 * 60,

    PLAYER_TIMEOUT:
        1000 * 60 * 5,

    MAX_ROOM_NAME_LENGTH:
        40,

    MAX_ROOMS_IN_LOCAL_STORAGE:
        100,

    STORAGE_KEY:
        "hokm_rooms",

    CURRENT_ROOM_KEY:
        "hokm_current_room",

    CURRENT_PLAYER_KEY:
        "hokm_current_player",

    ROOM_VERSION:
        "1.0.0"

};


/* ================================================================
   ROOM STATUS
================================================================ */

const ROOM_STATUS = {

    WAITING:
        "waiting",

    READY:
        "ready",

    STARTING:
        "starting",

    PLAYING:
        "playing",

    FINISHED:
        "finished",

    CLOSED:
        "closed"

};


/* ================================================================
   PLAYER STATUS
================================================================ */

const ROOM_PLAYER_STATUS = {

    WAITING:
        "waiting",

    READY:
        "ready",

    DISCONNECTED:
        "disconnected",

    HOST:
        "host",

    PLAYING:
        "playing"

};


/* ================================================================
   ROOM EVENTS
================================================================ */

const ROOM_EVENTS = {

    ROOM_CREATED:
        "roomCreated",

    ROOM_JOINED:
        "roomJoined",

    ROOM_LEFT:
        "roomLeft",

    ROOM_UPDATED:
        "roomUpdated",

    PLAYER_JOINED:
        "playerJoined",

    PLAYER_LEFT:
        "playerLeft",

    PLAYER_READY:
        "playerReady",

    PLAYER_UNREADY:
        "playerUnready",

    ROOM_READY:
        "roomReady",

    ROOM_FULL:
        "roomFull",

    ROOM_STARTED:
        "roomStarted",

    ROOM_CLOSED:
        "roomClosed",

    HOST_CHANGED:
        "hostChanged",

    ERROR:
        "roomError"

};


/* ================================================================
   INTERNAL STATE
================================================================ */

const RoomState = {

    currentRoom:
        null,

    currentPlayer:
        null,

    isHost:
        false,

    isReady:
        false,

    connected:
        false,

    reconnecting:
        false,

    lastUpdate:
        null,

    listeners:
        {},

    initialized:
        false

};


/* ================================================================
   UTILITY
================================================================ */

function roomSafeString(value, fallback = "") {

    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    return String(value).trim();

}


/* ================================================================
   GENERATE ROOM ID
================================================================ */

function generateRoomId() {

    const timestamp =
        Date.now().toString(36);

    const random =
        Math.random()
            .toString(36)
            .substring(2, 8);

    return (
        "room_" +
        timestamp +
        "_" +
        random
    );

}


/* ================================================================
   GENERATE ROOM CODE
================================================================ */

function generateRoomCode() {

    let code = "";

    for (
        let i = 0;
        i < ROOM_CONFIG.ROOM_CODE_LENGTH;
        i++
    ) {

        const index =
            Math.floor(
                Math.random() *
                ROOM_CONFIG.ROOM_CODE_CHARACTERS.length
            );

        code +=
            ROOM_CONFIG.ROOM_CODE_CHARACTERS[index];

    }

    return code;

}


/* ================================================================
   GET ALL LOCAL ROOMS
================================================================ */

function getStoredRooms() {

    try {

        const data =
            localStorage.getItem(
                ROOM_CONFIG.STORAGE_KEY
            );

        if (!data) {
            return [];
        }

        const rooms =
            JSON.parse(data);

        if (!Array.isArray(rooms)) {
            return [];
        }

        return rooms;

    } catch (error) {

        console.error(
            "Room storage read error:",
            error
        );

        return [];

    }

}


/* ================================================================
   SAVE ALL LOCAL ROOMS
================================================================ */

function saveStoredRooms(rooms) {

    try {

        localStorage.setItem(
            ROOM_CONFIG.STORAGE_KEY,
            JSON.stringify(rooms)
        );

        return true;

    } catch (error) {

        console.error(
            "Room storage save error:",
            error
        );

        return false;

    }

}


/* ================================================================
   FIND ROOM BY CODE
================================================================ */

function findRoomByCode(code) {

    const normalizedCode =
        roomSafeString(code)
            .toUpperCase();

    const rooms =
        getStoredRooms();

    return rooms.find(
        room =>
            room.code === normalizedCode &&
            room.status !== ROOM_STATUS.CLOSED
    ) || null;

}


/* ================================================================
   FIND ROOM BY ID
================================================================ */

function findRoomById(roomId) {

    const rooms =
        getStoredRooms();

    return rooms.find(
        room =>
            room.id === roomId
    ) || null;

}


/* ================================================================
   CHECK ROOM CODE AVAILABILITY
================================================================ */

function roomCodeExists(code) {

    return Boolean(
        findRoomByCode(code)
    );

}


/* ================================================================
   GENERATE UNIQUE ROOM CODE
================================================================ */

function generateUniqueRoomCode() {

    let attempts = 0;

    while (
        attempts < 1000
    ) {

        const code =
            generateRoomCode();

        if (
            !roomCodeExists(code)
        ) {
            return code;
        }

        attempts++;

    }

    throw new Error(
        "Unable to generate unique room code"
    );

}


/* ================================================================
   GET CURRENT USER
================================================================ */

function getRoomCurrentUser() {

    try {

        if (
            typeof window.currentUser !==
            "undefined" &&
            window.currentUser
        ) {

            return window.currentUser;

        }

    } catch (error) {
        console.warn(error);
    }


    try {

        const stored =
            localStorage.getItem(
                "hokm_current_user"
            );

        if (stored) {

            return JSON.parse(stored);

        }

    } catch (error) {

        console.warn(
            "Current user read error:",
            error
        );

    }


    return {

        id:
            "guest_" +
            Math.random()
                .toString(36)
                .substring(2, 10),

        username:
            "بازیکن",

        avatar:
            "👤",

        level:
            1

    };

}


/* ================================================================
   CREATE PLAYER OBJECT
================================================================ */

function createRoomPlayer(
    user,
    seat,
    isHost = false
) {

    return {

        id:
            user.id ||
            (
                "player_" +
                Math.random()
                    .toString(36)
                    .substring(2, 10)
            ),

        username:
            roomSafeString(
                user.username,
                "بازیکن"
            ),

        avatar:
            user.avatar ||
            "👤",

        level:
            Number(user.level) || 1,

        seat:
            seat,

        isHost:
            Boolean(isHost),

        isReady:
            Boolean(isHost),

        status:
            isHost
                ? ROOM_PLAYER_STATUS.HOST
                : ROOM_PLAYER_STATUS.WAITING,

        joinedAt:
            Date.now(),

        lastSeen:
            Date.now()

    };

}


/* ================================================================
   CREATE ROOM
================================================================ */

function createRoom(options = {}) {

    const currentUser =
        getRoomCurrentUser();

    if (
        RoomState.currentRoom
    ) {

        roomShowError(
            "ابتدا از اتاق فعلی خارج شوید."
        );

        return null;

    }


    const roomName =
        roomSafeString(
            options.name,
            ROOM_CONFIG.DEFAULT_ROOM_NAME
        ).substring(
            0,
            ROOM_CONFIG.MAX_ROOM_NAME_LENGTH
        );


    const isPrivate =
        options.isPrivate !== undefined
            ? Boolean(options.isPrivate)
            : true;


    const roomId =
        generateRoomId();

    const roomCode =
        generateUniqueRoomCode();


    const hostPlayer =
        createRoomPlayer(
            currentUser,
            0,
            true
        );


    const room = {

        id:
            roomId,

        code:
            roomCode,

        name:
            roomName,

        isPrivate:
            isPrivate,

        status:
            ROOM_STATUS.WAITING,

        hostId:
            hostPlayer.id,

        maxPlayers:
            ROOM_CONFIG.MAX_PLAYERS,

        minPlayers:
            ROOM_CONFIG.MIN_PLAYERS_TO_START,

        players:
            [
                hostPlayer,
                null,
                null,
                null
            ],

        playerCount:
            1,

        createdAt:
            Date.now(),

        updatedAt:
            Date.now(),

        expiresAt:
            Date.now() +
            ROOM_CONFIG.ROOM_EXPIRATION_TIME,

        gameStarted:
            false,

        gameId:
            null,

        version:
            ROOM_CONFIG.ROOM_VERSION

    };


    const rooms =
        getStoredRooms();


    rooms.push(room);


    while (
        rooms.length >
        ROOM_CONFIG.MAX_ROOMS_IN_LOCAL_STORAGE
    ) {

        rooms.shift();

    }


    saveStoredRooms(
        rooms
    );


    RoomState.currentRoom =
        room;

    RoomState.currentPlayer =
        hostPlayer;

    RoomState.isHost =
        true;

    RoomState.isReady =
        true;

    RoomState.connected =
        true;

    RoomState.lastUpdate =
        Date.now();


    saveCurrentRoomState();

    renderRoom();

    emitRoomEvent(
        ROOM_EVENTS.ROOM_CREATED,
        room
    );


    roomShowSuccess(
        "اتاق با موفقیت ساخته شد."
    );


    return room;

}


/* ================================================================
   JOIN ROOM
================================================================ */

function joinRoom(
    roomCode,
    options = {}
) {

    const code =
        roomSafeString(
            roomCode
        ).toUpperCase();


    if (!code) {

        roomShowError(
            "کد اتاق را وارد کنید."
        );

        return null;

    }


    if (
        RoomState.currentRoom
    ) {

        roomShowError(
            "شما در حال حاضر داخل یک اتاق هستید."
        );

        return null;

    }


    const room =
        findRoomByCode(
            code
        );


    if (!room) {

        roomShowError(
            "اتاق موردنظر پیدا نشد."
        );

        return null;

    }


    if (
        room.status ===
        ROOM_STATUS.PLAYING
    ) {

        roomShowError(
            "این بازی شروع شده است."
        );

        return null;

    }


    if (
        room.status ===
        ROOM_STATUS.CLOSED
    ) {

        roomShowError(
            "این اتاق بسته شده است."
        );

        return null;

    }


    const currentUser =
        getRoomCurrentUser();


    const existingPlayer =
        room.players.find(
            player =>
                player &&
                player.id === currentUser.id
        );


    if (existingPlayer) {

        RoomState.currentRoom =
            room;

        RoomState.currentPlayer =
            existingPlayer;

        RoomState.isHost =
            existingPlayer.id === room.hostId;

        RoomState.isReady =
            existingPlayer.isReady;

        RoomState.connected =
            true;

        saveCurrentRoomState();

        renderRoom();

        return room;

    }


    const freeSeat =
        room.players.findIndex(
            player =>
                player === null
        );


    if (freeSeat === -1) {

        roomShowError(
            "این اتاق پر است."
        );

        emitRoomEvent(
            ROOM_EVENTS.ROOM_FULL,
            room
        );

        return null;

    }


    const newPlayer =
        createRoomPlayer(
            currentUser,
            freeSeat,
            false
        );


    room.players[freeSeat] =
        newPlayer;


    room.playerCount =
        room.players.filter(
            Boolean
        ).length;


    room.updatedAt =
        Date.now();


    if (
        room.playerCount >=
        room.minPlayers
    ) {

        room.status =
            ROOM_STATUS.READY;

    }


    updateStoredRoom(
        room
    );


    RoomState.currentRoom =
        room;

    RoomState.currentPlayer =
        newPlayer;

    RoomState.isHost =
        false;

    RoomState.isReady =
        false;

    RoomState.connected =
        true;

    RoomState.lastUpdate =
        Date.now();


    saveCurrentRoomState();

    renderRoom();


    emitRoomEvent(
        ROOM_EVENTS.PLAYER_JOINED,
        {
            room,
            player:
                newPlayer
        }
    );


    emitRoomEvent(
        ROOM_EVENTS.ROOM_JOINED,
        room
    );


    roomShowSuccess(
        "با موفقیت وارد اتاق شدید."
    );


    return room;

}


/* ================================================================
   LEAVE ROOM
================================================================ */

function leaveRoom(
    options = {}
) {

    const room =
        RoomState.currentRoom;

    const player =
        RoomState.currentPlayer;


    if (
        !room ||
        !player
    ) {

        clearCurrentRoomState();

        return true;

    }


    const playerIndex =
        room.players.findIndex(
            p =>
                p &&
                p.id === player.id
        );


    if (
        playerIndex === -1
    ) {

        clearCurrentRoomState();

        return true;

    }


    const wasHost =
        player.id === room.hostId;


    room.players[playerIndex] =
        null;


    room.playerCount =
        room.players.filter(
            Boolean
        ).length;


    room.updatedAt =
        Date.now();


    if (
        room.playerCount === 0
    ) {

        room.status =
            ROOM_STATUS.CLOSED;

        removeStoredRoom(
            room.id
        );

        emitRoomEvent(
            ROOM_EVENTS.ROOM_CLOSED,
            room
        );

    } else {

        if (wasHost) {

            transferHost(
                room
            );

        }


        if (
            room.playerCount <
            room.minPlayers
        ) {

            room.status =
                ROOM_STATUS.WAITING;

        }


        updateStoredRoom(
            room
        );

    }


    emitRoomEvent(
        ROOM_EVENTS.PLAYER_LEFT,
        {
            room,
            player
        }
    );


    clearCurrentRoomState();


    if (
        !options.silent
    ) {

        roomShowSuccess(
            "از اتاق خارج شدید."
        );

    }


    return true;

}


/* ================================================================
   TRANSFER HOST
================================================================ */

function transferHost(
    room
) {

    const players =
        room.players.filter(
            Boolean
        );


    if (
        players.length === 0
    ) {

        room.hostId =
            null;

        return null;

    }


    const newHost =
        players[0];


    room.hostId =
        newHost.id;


    room.players =
        room.players.map(
            player => {

                if (!player) {
                    return null;
                }

                const isNewHost =
                    player.id ===
                    newHost.id;

                return {

                    ...player,

                    isHost:
                        isNewHost,

                    status:
                        isNewHost
                            ? ROOM_PLAYER_STATUS.HOST
                            : (
                                player.isReady
                                    ? ROOM_PLAYER_STATUS.READY
                                    : ROOM_PLAYER_STATUS.WAITING
                            )

                };

            }
        );


    if (
        RoomState.currentRoom &&
        RoomState.currentRoom.id === room.id
    ) {

        RoomState.isHost =
            RoomState.currentPlayer &&
            RoomState.currentPlayer.id ===
            newHost.id;

    }


    emitRoomEvent(
        ROOM_EVENTS.HOST_CHANGED,
        {
            room,
            newHost
        }
    );


    return newHost;

}


/* ================================================================
   SET READY
================================================================ */

function setPlayerReady(
    ready = true
) {

    const room =
        RoomState.currentRoom;

    const player =
        RoomState.currentPlayer;


    if (
        !room ||
        !player
    ) {

        roomShowError(
            "شما داخل اتاق نیستید."
        );

        return false;

    }


    const roomPlayer =
        room.players.find(
            p =>
                p &&
                p.id === player.id
        );


    if (!roomPlayer) {

        roomShowError(
            "بازیکن اتاق پیدا نشد."
        );

        return false;

    }


    roomPlayer.isReady =
        Boolean(ready);


    roomPlayer.lastSeen =
        Date.now();


    if (
        roomPlayer.isHost &&
        ready
    ) {

        roomPlayer.status =
            ROOM_PLAYER_STATUS.HOST;

    } else {

        roomPlayer.status =
            ready
                ? ROOM_PLAYER_STATUS.READY
                : ROOM_PLAYER_STATUS.WAITING;

    }


    RoomState.isReady =
        Boolean(ready);


    room.updatedAt =
        Date.now();


    updateStoredRoom(
        room
    );


    if (ready) {

        emitRoomEvent(
            ROOM_EVENTS.PLAYER_READY,
            {
                room,
                player:
                    roomPlayer
            }
        );

    } else {

        emitRoomEvent(
            ROOM_EVENTS.PLAYER_UNREADY,
            {
                room,
                player:
                    roomPlayer
            }
        );

    }


    renderRoom();


    if (
        areAllPlayersReady()
    ) {

        room.status =
            ROOM_STATUS.READY;


        updateStoredRoom(
            room
        );


        emitRoomEvent(
            ROOM_EVENTS.ROOM_READY,
            room
        );

    }


    return true;

}


/* ================================================================
   TOGGLE READY
================================================================ */

function togglePlayerReady() {

    return setPlayerReady(
        !RoomState.isReady
    );

}


/* ================================================================
   CHECK ALL PLAYERS READY
================================================================ */

function areAllPlayersReady() {

    const room =
        RoomState.currentRoom;


    if (!room) {
        return false;
    }


    const players =
        room.players.filter(
            Boolean
        );


    if (
        players.length <
        room.minPlayers
    ) {

        return false;

    }


    return players.every(
        player =>
            player.isReady
    );

}


/* ================================================================
   CHECK ROOM CAN START
================================================================ */

function canStartRoom() {

    const room =
        RoomState.currentRoom;


    if (!room) {
        return false;
    }


    if (
        !RoomState.isHost
    ) {
        return false;
    }


    if (
        room.playerCount <
        room.minPlayers
    ) {
        return false;
    }


    if (
        !areAllPlayersReady()
    ) {
        return false;
    }


    return true;

}


/* ================================================================
   START ROOM
================================================================ */

function startRoom() {

    const room =
        RoomState.currentRoom;


    if (!room) {

        roomShowError(
            "اتاق پیدا نشد."
        );

        return false;

    }


    if (!RoomState.isHost) {

        roomShowError(
            "فقط سازنده اتاق می‌تواند بازی را شروع کند."
        );

        return false;

    }


    if (
        room.playerCount <
        room.minPlayers
    ) {

        roomShowError(
            "برای شروع بازی باید ۴ بازیکن حضور داشته باشند."
        );

        return false;

    }


    if (
        !areAllPlayersReady()
    ) {

        roomShowError(
            "همه بازیکنان باید آماده باشند."
        );

        return false;

    }


    room.status =
        ROOM_STATUS.STARTING;


    room.gameStarted =
        true;


    room.gameId =
        generateGameId();


    room.updatedAt =
        Date.now();


    updateStoredRoom(
        room
    );


    emitRoomEvent(
        ROOM_EVENTS.ROOM_STARTED,
        room
    );


    renderRoom();


    /*
       در مرحله Multiplayer واقعی،
       اینجا درخواست شروع بازی به سرور
       ارسال خواهد شد.
    */


    if (
        typeof window.startHokmGame ===
        "function"
    ) {

        try {

            window.startHokmGame(
                room
            );

        } catch (error) {

            console.error(
                "Game start error:",
                error
            );

        }

    }


    return true;

}


/* ================================================================
   GENERATE GAME ID
================================================================ */

function generateGameId() {

    return (
        "game_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );

}


/* ================================================================
   UPDATE STORED ROOM
================================================================ */

function updateStoredRoom(
    room
) {

    const rooms =
        getStoredRooms();


    const index =
        rooms.findIndex(
            item =>
                item.id === room.id
        );


    if (
        index === -1
    ) {

        rooms.push(room);

    } else {

        rooms[index] =
            room;

    }


    saveStoredRooms(
        rooms
    );


    RoomState.lastUpdate =
        Date.now();

}


/* ================================================================
   REMOVE STORED ROOM
================================================================ */

function removeStoredRoom(
    roomId
) {

    const rooms =
        getStoredRooms();


    const filteredRooms =
        rooms.filter(
            room =>
                room.id !== roomId
        );


    saveStoredRooms(
        filteredRooms
    );

}


/* ================================================================
   SAVE CURRENT ROOM STATE
================================================================ */

function saveCurrentRoomState() {

    try {

        if (
            RoomState.currentRoom
        ) {

            localStorage.setItem(
                ROOM_CONFIG.CURRENT_ROOM_KEY,
                JSON.stringify(
                    RoomState.currentRoom
                )
            );

        }


        if (
            RoomState.currentPlayer
        ) {

            localStorage.setItem(
                ROOM_CONFIG.CURRENT_PLAYER_KEY,
                JSON.stringify(
                    RoomState.currentPlayer
                )
            );

        }

    } catch (error) {

        console.error(
            "Current room state save error:",
            error
        );

    }

}


/* ================================================================
   CLEAR CURRENT ROOM STATE
================================================================ */

function clearCurrentRoomState() {

    RoomState.currentRoom =
        null;

    RoomState.currentPlayer =
        null;

    RoomState.isHost =
        false;

    RoomState.isReady =
        false;

    RoomState.connected =
        false;

    RoomState.reconnecting =
        false;


    try {

        localStorage.removeItem(
            ROOM_CONFIG.CURRENT_ROOM_KEY
        );

        localStorage.removeItem(
            ROOM_CONFIG.CURRENT_PLAYER_KEY
        );

    } catch (error) {

        console.warn(
            "Room state clear error:",
            error
        );

    }


    renderRoom();

}


/* ================================================================
   RESTORE CURRENT ROOM
================================================================ */

function restoreCurrentRoom() {

    try {

        const roomData =
            localStorage.getItem(
                ROOM_CONFIG.CURRENT_ROOM_KEY
            );


        const playerData =
            localStorage.getItem(
                ROOM_CONFIG.CURRENT_PLAYER_KEY
            );


        if (
            !roomData ||
            !playerData
        ) {

            return null;

        }


        const room =
            JSON.parse(
                roomData
            );


        const player =
            JSON.parse(
                playerData
            );


        const latestRoom =
            findRoomById(
                room.id
            );


        if (
            !latestRoom
        ) {

            clearCurrentRoomState();

            return null;

        }


        const latestPlayer =
            latestRoom.players.find(
                p =>
                    p &&
                    p.id === player.id
            );


        if (
            !latestPlayer
        ) {

            clearCurrentRoomState();

            return null;

        }


        RoomState.currentRoom =
            latestRoom;

        RoomState.currentPlayer =
            latestPlayer;

        RoomState.isHost =
            latestRoom.hostId ===
            latestPlayer.id;

        RoomState.isReady =
            latestPlayer.isReady;

        RoomState.connected =
            true;

        RoomState.lastUpdate =
            Date.now();


        renderRoom();


        return latestRoom;

    } catch (error) {

        console.error(
            "Room restore error:",
            error
        );

        clearCurrentRoomState();

        return null;

    }

}


/* ================================================================
   GET CURRENT ROOM
================================================================ */

function getCurrentRoom() {

    return RoomState.currentRoom;

}


/* ================================================================
   GET CURRENT PLAYER
================================================================ */

function getCurrentRoomPlayer() {

    return RoomState.currentPlayer;

}


/* ================================================================
   GET ROOM PLAYERS
================================================================ */

function getRoomPlayers() {

    if (
        !RoomState.currentRoom
    ) {

        return [];

    }


    return RoomState.currentRoom.players
        .filter(Boolean);

}


/* ================================================================
   GET PLAYER COUNT
================================================================ */

function getRoomPlayerCount() {

    return getRoomPlayers().length;

}


/* ================================================================
   GET EMPTY SEATS
================================================================ */

function getEmptySeats() {

    if (
        !RoomState.currentRoom
    ) {

        return [];

    }


    return RoomState.currentRoom.players
        .map(
            (player, index) =>
                player
                    ? null
                    : index
        )
        .filter(
            seat =>
                seat !== null
        );

}


/* ================================================================
   GET ROOM CODE
================================================================ */

function getCurrentRoomCode() {

    if (
        !RoomState.currentRoom
    ) {

        return "";

    }


    return RoomState.currentRoom.code;

}


/* ================================================================
   COPY ROOM CODE
================================================================ */

async function copyRoomCode() {

    const code =
        getCurrentRoomCode();


    if (!code) {

        roomShowError(
            "کد اتاق موجود نیست."
        );

        return false;

    }


    try {

        if (
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {

            await navigator.clipboard.writeText(
                code
            );

        } else {

            const textarea =
                document.createElement(
                    "textarea"
                );


            textarea.value =
                code;


            textarea.style.position =
                "fixed";

            textarea.style.opacity =
                "0";


            document.body.appendChild(
                textarea
            );


            textarea.select();

            document.execCommand(
                "copy"
            );


            document.body.removeChild(
                textarea
            );

        }


        roomShowSuccess(
            "کد اتاق کپی شد."
        );


        return true;

    } catch (error) {

        console.error(
            "Copy room code error:",
            error
        );


        roomShowError(
            "کپی کردن کد اتاق انجام نشد."
        );


        return false;

    }

}


/* ================================================================
   CREATE INVITE TEXT
================================================================ */

function createRoomInviteText() {

    const room =
        RoomState.currentRoom;


    if (!room) {

        return "";

    }


    return (
        "🎴 دعوت به بازی حکم\n\n" +
        "اتاق: " +
        room.name +
        "\n" +
        "کد اتاق: " +
        room.code +
        "\n\n" +
        "با این کد وارد اتاق شو."
    );

}


/* ================================================================
   INVITE FRIENDS
================================================================ */

async function inviteFriends() {

    const text =
        createRoomInviteText();


    if (!text) {

        roomShowError(
            "ابتدا یک اتاق بسازید یا وارد اتاق شوید."
        );

        return false;

    }


    try {

        if (
            navigator.share
        ) {

            await navigator.share({

                title:
                    "دعوت به بازی حکم",

                text:
                    text

            });

            return true;

        }


        if (
            navigator.clipboard
        ) {

            await navigator.clipboard.writeText(
                text
            );


            roomShowSuccess(
                "متن دعوت کپی شد."
            );


            return true;

        }


        roomShowError(
            "امکان اشتراک‌گذاری در این دستگاه وجود ندارد."
        );


        return false;

    } catch (error) {

        if (
            error &&
            error.name ===
            "AbortError"
        ) {

            return false;

        }


        console.error(
            "Invite error:",
            error
        );


        return false;

    }

}


/* ================================================================
   RENDER ROOM
================================================================ */

function renderRoom() {

    const room =
        RoomState.currentRoom;


    if (!room) {

        renderEmptyRoom();

        return;

    }


    updateRoomCodeUI(
        room.code
    );


    updateRoomStatusUI(
        room
    );


    updateRoomPlayersUI(
        room
    );


    updateRoomActionsUI(
        room
    );

}


/* ================================================================
   RENDER EMPTY ROOM
================================================================ */

function renderEmptyRoom() {

    updateRoomCodeUI(
        "------"
    );


    const statusText =
        document.getElementById(
            "room-status-text"
        );


    if (statusText) {

        statusText.textContent =
            "در انتظار بازیکنان";

    }


    const playersContainer =
        document.getElementById(
            "room-players"
        );


    if (!playersContainer) {
        return;
    }


    const slots =
        playersContainer.querySelectorAll(
            ".room-player-slot"
        );


    slots.forEach(
        (slot, index) => {

            if (index === 0) {

                slot.classList.remove(
                    "empty-slot"
                );

                slot.innerHTML = `
                    <div class="room-player-avatar">
                        👤
                    </div>

                    <strong>
                        شما
                    </strong>

                    <span class="player-ready">
                        آماده
                    </span>
                `;

            } else {

                slot.classList.add(
                    "empty-slot"
                );

                slot.innerHTML = `
                    <div class="room-player-avatar">
                        +
                    </div>

                    <span>
                        انتظار بازیکن
                    </span>
                `;

            }

        }
    );

}


/* ================================================================
   UPDATE ROOM CODE UI
================================================================ */

function updateRoomCodeUI(
    code
) {

    const element =
        document.getElementById(
            "room-code"
        );


    if (element) {

        element.textContent =
            code || "------";

    }

}


/* ================================================================
   UPDATE ROOM STATUS UI
================================================================ */

function updateRoomStatusUI(
    room
) {

    const text =
        document.getElementById(
            "room-status-text"
        );


    if (!text) {
        return;
    }


    let message =
        "در انتظار بازیکنان";


    switch (
        room.status
    ) {

        case ROOM_STATUS.WAITING:

            message =
                `${room.playerCount} نفر از ${room.maxPlayers} نفر`;

            break;


        case ROOM_STATUS.READY:

            message =
                "همه بازیکنان آماده‌اند";

            break;


        case ROOM_STATUS.STARTING:

            message =
                "بازی در حال شروع است...";

            break;


        case ROOM_STATUS.PLAYING:

            message =
                "بازی در حال انجام است";

            break;


        case ROOM_STATUS.FINISHED:

            message =
                "بازی به پایان رسیده است";

            break;


        case ROOM_STATUS.CLOSED:

            message =
                "اتاق بسته شده است";

            break;

    }


    text.textContent =
        message;

}


/* ================================================================
   UPDATE ROOM PLAYERS UI
================================================================ */

function updateRoomPlayersUI(
    room
) {

    const container =
        document.getElementById(
            "room-players"
        );


    if (!container) {
        return;
    }


    const slots =
        container.querySelectorAll(
            ".room-player-slot"
        );


    slots.forEach(
        (slot, index) => {

            const player =
                room.players[index];


            if (!player) {

                renderEmptyPlayerSlot(
                    slot,
                    index
                );

                return;

            }


            renderPlayerSlot(
                slot,
                player
            );

        }
    );

}


/* ================================================================
   RENDER EMPTY PLAYER SLOT
================================================================ */

function renderEmptyPlayerSlot(
    slot,
    index
) {

    slot.classList.add(
        "empty-slot"
    );


    slot.innerHTML = `

        <div class="room-player-avatar">
            +
        </div>

        <span>
            انتظار بازیکن
        </span>

    `;

}


/* ================================================================
   RENDER PLAYER SLOT
================================================================ */

function renderPlayerSlot(
    slot,
    player
) {

    slot.classList.remove(
        "empty-slot"
    );


    const currentPlayer =
        RoomState.currentPlayer;


    const isCurrentPlayer =
        currentPlayer &&
        currentPlayer.id ===
        player.id;


    const statusText =
        player.isReady
            ? (
                player.isHost
                    ? "سازنده • آماده"
                    : "آماده"
            )
            : (
                player.isHost
                    ? "سازنده"
                    : "آماده نیست"
            );


    slot.innerHTML = `

        <div class="room-player-avatar">
            ${escapeRoomHTML(player.avatar)}
        </div>

        <strong>
            ${escapeRoomHTML(player.username)}
            ${isCurrentPlayer ? " (شما)" : ""}
        </strong>

        <span class="player-ready ${
            player.isReady
                ? ""
                : "not-ready"
        }">
            ${statusText}
        </span>

    `;


    slot.dataset.playerId =
        player.id;

}


/* ================================================================
   UPDATE ROOM ACTIONS
================================================================ */

function updateRoomActionsUI(
    room
) {

    const readyButton =
        document.getElementById(
            "ready-button"
        );


    if (readyButton) {

        if (
            RoomState.isReady
        ) {

            readyButton.textContent =
                "آماده هستم ✓";

            readyButton.classList.add(
                "ready-active"
            );

        } else {

            readyButton.textContent =
                "آماده‌ام";

            readyButton.classList.remove(
                "ready-active"
            );

        }

    }


    const startButton =
        document.getElementById(
            "start-room-button"
        );


    if (startButton) {

        startButton.classList.toggle(
            "hidden",
            !RoomState.isHost
        );


        startButton.disabled =
            !canStartRoom();

    }

}


/* ================================================================
   ESCAPE HTML
================================================================ */

function escapeRoomHTML(
    value
) {

    return String(
        value ?? ""
    )
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


/* ================================================================
   ROOM EVENT LISTENER
================================================================ */

function onRoomEvent(
    eventName,
    callback
) {

    if (
        typeof callback !==
        "function"
    ) {

        return () => {};

    }


    if (
        !RoomState.listeners[eventName]
    ) {

        RoomState.listeners[eventName] =
            [];

    }


    RoomState.listeners[eventName]
        .push(callback);


    return function unsubscribe() {

        const listeners =
            RoomState.listeners[eventName];


        if (!listeners) {
            return;
        }


        const index =
            listeners.indexOf(
                callback
            );


        if (
            index !== -1
        ) {

            listeners.splice(
                index,
                1
            );

        }

    };

}


/* ================================================================
   EMIT ROOM EVENT
================================================================ */

function emitRoomEvent(
    eventName,
    data
) {

    const listeners =
        RoomState.listeners[eventName];


    if (!listeners) {
        return;
    }


    listeners.forEach(
        callback => {

            try {

                callback(
                    data
                );

            } catch (error) {

                console.error(
                    "Room event error:",
                    error
                );

            }

        }
    );

}


/* ================================================================
   ROOM SUCCESS MESSAGE
================================================================ */

function roomShowSuccess(
    message
) {

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            "success"
        );

        return;

    }


    console.log(
        "ROOM SUCCESS:",
        message
    );

}


/* ================================================================
   ROOM ERROR MESSAGE
================================================================ */

function roomShowError(
    message
) {

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            "error"
        );

        return;

    }


    console.error(
        "ROOM ERROR:",
        message
    );

}


/* ================================================================
   OPEN ROOM PAGE
================================================================ */

function openRoomPage() {

    if (
        typeof window.navigateToPage ===
        "function"
    ) {

        window.navigateToPage(
            "room"
        );

        return;

    }


    const pages =
        document.querySelectorAll(
            ".page"
        );


    pages.forEach(
        page =>
            page.classList.add(
                "hidden"
            )
    );


    const roomPage =
        document.getElementById(
            "room-page"
        );


    if (roomPage) {

        roomPage.classList.remove(
            "hidden"
        );

    }

}


/* ================================================================
   OPEN CREATE ROOM MODAL
================================================================ */

function openCreateRoomModal() {

    const modal =
        document.getElementById(
            "create-room-modal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "hidden"
    );


    const input =
        document.getElementById(
            "room-name-input"
        );


    if (input) {

        setTimeout(
            () =>
                input.focus(),
            50
        );

    }

}


/* ================================================================
   CLOSE MODAL
================================================================ */

function closeRoomModal(
    modalId
) {

    const modal =
        document.getElementById(
            modalId
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


/* ================================================================
   CREATE ROOM FROM MODAL
================================================================ */

function createRoomFromModal() {

    const nameInput =
        document.getElementById(
            "room-name-input"
        );


    const privateInput =
        document.getElementById(
            "room-private-setting"
        );


    const name =
        nameInput
            ? nameInput.value
            : ROOM_CONFIG.DEFAULT_ROOM_NAME;


    const isPrivate =
        privateInput
            ? privateInput.checked
            : true;


    const room =
        createRoom({

            name:
                name,

            isPrivate:
                isPrivate

        });


    if (!room) {
        return null;
    }


    closeRoomModal(
        "create-room-modal"
    );


    openRoomPage();


    return room;

}


/* ================================================================
   JOIN ROOM FROM INPUT
================================================================ */

function joinRoomFromInput() {

    const input =
        document.getElementById(
            "room-code-input"
        );


    if (!input) {

        roomShowError(
            "فیلد کد اتاق پیدا نشد."
        );

        return null;

    }


    const code =
        input.value;


    return joinRoom(
        code
    );

}


/* ================================================================
   ROOM INITIALIZATION
================================================================ */

function initializeRoomSystem() {

    if (
        RoomState.initialized
    ) {

        return;

    }


    RoomState.initialized =
        true;


    bindRoomEvents();

    restoreCurrentRoom();

    cleanupExpiredRooms();


    console.log(
        "Room system initialized."
    );

}


/* ================================================================
   BIND ROOM EVENTS
================================================================ */

function bindRoomEvents() {

    const createRoomButton =
        document.getElementById(
            "private-room-button"
        );


    if (createRoomButton) {

        createRoomButton.addEventListener(
            "click",
            openCreateRoomModal
        );

    }


    const createConfirmButton =
        document.getElementById(
            "create-room-confirm-button"
        );


    if (createConfirmButton) {

        createConfirmButton.addEventListener(
            "click",
            createRoomFromModal
        );

    }


    const copyButton =
        document.getElementById(
            "copy-room-code-button"
        );


    if (copyButton) {

        copyButton.addEventListener(
            "click",
            copyRoomCode
        );

    }


    const inviteButton =
        document.getElementById(
            "invite-friends-button"
        );


    if (inviteButton) {

        inviteButton.addEventListener(
            "click",
            inviteFriends
        );

    }


    const readyButton =
        document.getElementById(
            "ready-button"
        );


    if (readyButton) {

        readyButton.addEventListener(
            "click",
            togglePlayerReady
        );

    }


    const leaveButton =
        document.getElementById(
            "leave-room-button"
        );


    if (leaveButton) {

        leaveButton.addEventListener(
            "click",
            handleLeaveRoom
        );

    }


    const backButton =
        document.getElementById(
            "room-back-button"
        );


    if (backButton) {

        backButton.addEventListener(
            "click",
            handleRoomBack
        );

    }


    document.querySelectorAll(
        "[data-close-modal]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    closeRoomModal(
                        button.dataset.closeModal
                    );

                }
            );

        }
    );


    window.addEventListener(
        "beforeunload",
        handleBeforeUnload
    );


    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

}


/* ================================================================
   HANDLE LEAVE ROOM
================================================================ */

function handleLeaveRoom() {

    if (
        !RoomState.currentRoom
    ) {

        return;

    }


    const confirmed =
        window.confirm(
            "آیا مطمئن هستید که می‌خواهید از اتاق خارج شوید؟"
        );


    if (!confirmed) {
        return;
    }


    leaveRoom();

}


/* ================================================================
   HANDLE ROOM BACK
================================================================ */

function handleRoomBack() {

    if (
        RoomState.currentRoom
    ) {

        const confirmed =
            window.confirm(
                "اگر خارج شوید، از اتاق خارج خواهید شد. ادامه می‌دهید؟"
            );


        if (!confirmed) {
            return;
        }


        leaveRoom({
            silent:
                true
        });

    }


    if (
        typeof window.navigateToPage ===
        "function"
    ) {

        window.navigateToPage(
            "home"
        );

    }

}


/* ================================================================
   HANDLE BEFORE UNLOAD
================================================================ */

function handleBeforeUnload() {

    /*
       در نسخه آنلاین واقعی نباید فقط با unload
       بازیکن را حذف کنیم؛ چون ممکن است مرورگر
       به‌صورت موقت بسته یا connection قطع شود.

       در مرحله Multiplayer از heartbeat و
       reconnect استفاده خواهیم کرد.
    */

    if (
        RoomState.currentRoom &&
        RoomState.currentPlayer
    ) {

        markCurrentPlayerDisconnected();

    }

}


/* ================================================================
   HANDLE VISIBILITY CHANGE
================================================================ */

function handleVisibilityChange() {

    if (
        document.visibilityState ===
        "visible"
    ) {

        markCurrentPlayerConnected();

    } else {

        markCurrentPlayerDisconnected();

    }

}


/* ================================================================
   MARK CURRENT PLAYER DISCONNECTED
================================================================ */

function markCurrentPlayerDisconnected() {

    const room =
        RoomState.currentRoom;

    const player =
        RoomState.currentPlayer;


    if (
        !room ||
        !player
    ) {
        return;
    }


    const roomPlayer =
        room.players.find(
            p =>
                p &&
                p.id === player.id
        );


    if (!roomPlayer) {
        return;
    }


    roomPlayer.lastSeen =
        Date.now();


    if (
        !roomPlayer.isHost
    ) {

        roomPlayer.status =
            ROOM_PLAYER_STATUS.DISCONNECTED;

    }


    updateStoredRoom(
        room
    );

}


/* ================================================================
   MARK CURRENT PLAYER CONNECTED
================================================================ */

function markCurrentPlayerConnected() {

    const room =
        RoomState.currentRoom;

    const player =
        RoomState.currentPlayer;


    if (
        !room ||
        !player
    ) {
        return;
    }


    const roomPlayer =
        room.players.find(
            p =>
                p &&
                p.id === player.id
        );


    if (!roomPlayer) {
        return;
    }


    roomPlayer.lastSeen =
        Date.now();


    if (
        roomPlayer.isHost
    ) {

        roomPlayer.status =
            ROOM_PLAYER_STATUS.HOST;

    } else if (
        roomPlayer.isReady
    ) {

        roomPlayer.status =
            ROOM_PLAYER_STATUS.READY;

    } else {

        roomPlayer.status =
            ROOM_PLAYER_STATUS.WAITING;

    }


    RoomState.connected =
        true;


    updateStoredRoom(
        room
    );


    renderRoom();

}


/* ================================================================
   CLEANUP EXPIRED ROOMS
================================================================ */

function cleanupExpiredRooms() {

    const rooms =
        getStoredRooms();

    const now =
        Date.now();


    const activeRooms =
        rooms.filter(
            room => {

                if (
                    !room.expiresAt
                ) {

                    return true;

                }


                if (
                    room.status ===
                    ROOM_STATUS.PLAYING
                ) {

                    return true;

                }


                return (
                    room.expiresAt >
                    now
                );

            }
        );


    if (
        activeRooms.length !==
        rooms.length
    ) {

        saveStoredRooms(
            activeRooms
        );

    }

}


/* ================================================================
   ROOM HEARTBEAT
================================================================ */

function roomHeartbeat() {

    if (
        !RoomState.currentRoom ||
        !RoomState.currentPlayer
    ) {

        return;

    }


    const room =
        RoomState.currentRoom;

    const player =
        room.players.find(
            p =>
                p &&
                p.id ===
                RoomState.currentPlayer.id
        );


    if (!player) {
        return;
    }


    player.lastSeen =
        Date.now();


    room.updatedAt =
        Date.now();


    updateStoredRoom(
        room
    );

}


/* ================================================================
   ROOM SYNC
================================================================ */

function syncCurrentRoom() {

    if (
        !RoomState.currentRoom
    ) {

        return null;

    }


    const latestRoom =
        findRoomById(
            RoomState.currentRoom.id
        );


    if (!latestRoom) {

        clearCurrentRoomState();

        return null;

    }


    RoomState.currentRoom =
        latestRoom;


    if (
        RoomState.currentPlayer
    ) {

        const latestPlayer =
            latestRoom.players.find(
                player =>
                    player &&
                    player.id ===
                    RoomState.currentPlayer.id
            );


        if (
            latestPlayer
        ) {

            RoomState.currentPlayer =
                latestPlayer;

            RoomState.isHost =
                latestPlayer.id ===
                latestRoom.hostId;

            RoomState.isReady =
                latestPlayer.isReady;

        }

    }


    RoomState.lastUpdate =
        Date.now();


    saveCurrentRoomState();

    renderRoom();


    emitRoomEvent(
        ROOM_EVENTS.ROOM_UPDATED,
        latestRoom
    );


    return latestRoom;

}


/* ================================================================
   GET ROOM SUMMARY
================================================================ */

function getRoomSummary() {

    const room =
        RoomState.currentRoom;


    if (!room) {
        return null;
    }


    return {

        id:
            room.id,

        code:
            room.code,

        name:
            room.name,

        status:
            room.status,

        playerCount:
            room.playerCount,

        maxPlayers:
            room.maxPlayers,

        hostId:
            room.hostId,

        isPrivate:
            room.isPrivate,

        gameStarted:
            room.gameStarted

    };

}


/* ================================================================
   CHECK IF USER IS HOST
================================================================ */

function isRoomHost() {

    return Boolean(
        RoomState.isHost
    );

}


/* ================================================================
   CHECK IF USER IS IN ROOM
================================================================ */

function isInRoom() {

    return Boolean(
        RoomState.currentRoom &&
        RoomState.currentPlayer
    );

}


/* ================================================================
   GET ROOM STATUS
================================================================ */

function getRoomStatus() {

    return RoomState.currentRoom
        ? RoomState.currentRoom.status
        : null;

}


/* ================================================================
   PUBLIC API
================================================================ */

window.RoomSystem = {

    createRoom,

    joinRoom,

    leaveRoom,

    startRoom,

    setPlayerReady,

    togglePlayerReady,

    inviteFriends,

    copyRoomCode,

    getCurrentRoom,

    getCurrentRoomPlayer,

    getRoomPlayers,

    getRoomPlayerCount,

    getEmptySeats,

    getCurrentRoomCode,

    getRoomSummary,

    getRoomStatus,

    isRoomHost,

    isInRoom,

    areAllPlayersReady,

    canStartRoom,

    restoreCurrentRoom,

    syncCurrentRoom,

    onRoomEvent,

    initialize:
        initializeRoomSystem

};


/* ================================================================
   GLOBAL COMPATIBILITY FUNCTIONS
================================================================ */

window.createRoom =
    createRoom;

window.joinRoom =
    joinRoom;

window.leaveRoom =
    leaveRoom;

window.startRoom =
    startRoom;

window.togglePlayerReady =
    togglePlayerReady;

window.copyRoomCode =
    copyRoomCode;

window.inviteFriends =
    inviteFriends;

window.getCurrentRoom =
    getCurrentRoom;

window.getRoomPlayers =
    getRoomPlayers;


/* ================================================================
   AUTOMATIC INITIALIZATION
================================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            initializeRoomSystem();

        }
    );

} else {

    initializeRoomSystem();

}


/* ================================================================
   ROOM HEARTBEAT TIMER
================================================================ */

setInterval(
    () => {

        roomHeartbeat();

    },
    30000
);


/* ================================================================
   ROOM SYNC TIMER
================================================================ */

setInterval(
    () => {

        if (
            RoomState.currentRoom
        ) {

            syncCurrentRoom();

        }

    },
    5000
);


/* ================================================================
   END OF ROOM.JS
   مرحله ۱۱ تکمیل شد.
================================================================ */
