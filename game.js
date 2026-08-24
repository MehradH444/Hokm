/* ============================================================
   HOKM ONLINE
   GAME ENGINE
   مرحله ۴
   فایل: game.js

   این فایل موتور اصلی بازی حکم است.

   امکانات:
   - Deck
   - Shuffle
   - Deal
   - Players
   - Teams
   - Trump
   - Turn Management
   - Legal Move Validation
   - Trick Resolution
   - Round Scoring
   - Match Scoring
   - AI Players
   - UI Synchronization
   - Event System
   - State Management

   این فایل برای توسعه مراحل بعدی طراحی شده است.
============================================================ */


/* ============================================================
   1. GLOBAL NAMESPACE
============================================================ */

window.HokmGame = window.HokmGame || {};


/* ============================================================
   2. GAME CONSTANTS
============================================================ */

const HOKM_CONSTANTS = {

    PLAYER_COUNT: 4,

    CARDS_PER_PLAYER: 13,

    TEAM_COUNT: 2,

    PLAYERS_PER_TEAM: 2,

    TRICKS_PER_ROUND: 13,

    TARGET_ROUND_SCORE: 7,

    TARGET_GAME_SCORE: 7,

    MAX_ROUNDS: 5,

    SUITS: [
        "spades",
        "hearts",
        "diamonds",
        "clubs"
    ],

    SUIT_SYMBOLS: {
        spades: "♠",
        hearts: "♥",
        diamonds: "♦",
        clubs: "♣"
    },

    SUIT_NAMES: {
        spades: "پیک",
        hearts: "دل",
        diamonds: "خشت",
        clubs: "گشنیز"
    },

    RANKS: [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
        "A"
    ],

    RANK_VALUES: {
        "2": 2,
        "3": 3,
        "4": 4,
        "5": 5,
        "6": 6,
        "7": 7,
        "8": 8,
        "9": 9,
        "10": 10,
        "J": 11,
        "Q": 12,
        "K": 13,
        "A": 14
    },

    PLAYER_POSITIONS: {
        0: "bottom",
        1: "right",
        2: "top",
        3: "left"
    },

    TEAM_BY_PLAYER: {
        0: 0,
        1: 1,
        2: 0,
        3: 1
    },

    DEFAULT_PLAYER_NAMES: [
        "شما",
        "بازیکن ۲",
        "بازیکن ۳",
        "بازیکن ۴"
    ]

};


/* ============================================================
   3. GAME EVENTS
============================================================ */

const GAME_EVENTS = {

    INITIALIZED: "game:initialized",

    STARTED: "game:started",

    DEAL_STARTED: "game:dealStarted",

    DEAL_COMPLETED: "game:dealCompleted",

    TRUMP_SELECTION_STARTED: "game:trumpSelectionStarted",

    TRUMP_SELECTED: "game:trumpSelected",

    TURN_CHANGED: "game:turnChanged",

    CARD_PLAYED: "game:cardPlayed",

    CARD_REJECTED: "game:cardRejected",

    TRICK_STARTED: "game:trickStarted",

    TRICK_COMPLETED: "game:trickCompleted",

    ROUND_STARTED: "game:roundStarted",

    ROUND_COMPLETED: "game:roundCompleted",

    GAME_COMPLETED: "game:gameCompleted",

    STATE_CHANGED: "game:stateChanged",

    RESET: "game:reset",

    ERROR: "game:error"

};


/* ============================================================
   4. EVENT EMITTER
============================================================ */

class GameEventEmitter {

    constructor() {

        this.listeners = {};

    }


    on(eventName, callback) {

        if (!this.listeners[eventName]) {

            this.listeners[eventName] = [];

        }

        this.listeners[eventName].push(callback);

        return () => {

            this.off(eventName, callback);

        };

    }


    off(eventName, callback) {

        if (!this.listeners[eventName]) {

            return;

        }

        this.listeners[eventName] =
            this.listeners[eventName].filter(
                listener => listener !== callback
            );

    }


    emit(eventName, payload = {}) {

        const listeners = this.listeners[eventName] || [];

        listeners.forEach(listener => {

            try {

                listener(payload);

            } catch (error) {

                console.error(
                    `Hokm event error: ${eventName}`,
                    error
                );

            }

        });

    }


    clear() {

        this.listeners = {};

    }

}


/* ============================================================
   5. CARD CLASS
============================================================ */

class HokmCard {

    constructor(suit, rank) {

        this.id = `${suit}-${rank}`;

        this.suit = suit;

        this.rank = rank;

        this.value =
            HOKM_CONSTANTS.RANK_VALUES[rank];

    }


    get symbol() {

        return HOKM_CONSTANTS.SUIT_SYMBOLS[this.suit];

    }


    get suitName() {

        return HOKM_CONSTANTS.SUIT_NAMES[this.suit];

    }


    get displayName() {

        return `${this.rank}${this.symbol}`;

    }


    get isRed() {

        return (
            this.suit === "hearts" ||
            this.suit === "diamonds"
        );

    }


    toJSON() {

        return {

            id: this.id,

            suit: this.suit,

            rank: this.rank,

            value: this.value,

            symbol: this.symbol,

            suitName: this.suitName

        };

    }


    clone() {

        return new HokmCard(
            this.suit,
            this.rank
        );

    }

}


/* ============================================================
   6. DECK
============================================================ */

class HokmDeck {

    constructor() {

        this.cards = [];

        this.create();

    }


    create() {

        this.cards = [];

        HOKM_CONSTANTS.SUITS.forEach(suit => {

            HOKM_CONSTANTS.RANKS.forEach(rank => {

                this.cards.push(
                    new HokmCard(suit, rank)
                );

            });

        });

        return this;

    }


    shuffle() {

        for (
            let i = this.cards.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [
                this.cards[i],
                this.cards[j]
            ] = [
                this.cards[j],
                this.cards[i]
            ];

        }

        return this;

    }


    draw(count = 1) {

        if (count <= 0) {

            return [];

        }

        return this.cards.splice(
            0,
            Math.min(count, this.cards.length)
        );

    }


    get remainingCards() {

        return this.cards.length;

    }


    reset() {

        this.create();

        return this;

    }

}


/* ============================================================
   7. PLAYER
============================================================ */

class HokmPlayer {

    constructor({

        id,

        name,

        seat,

        isHuman = false,

        team = 0

    }) {

        this.id = id;

        this.name = name;

        this.seat = seat;

        this.position =
            HOKM_CONSTANTS.PLAYER_POSITIONS[seat];

        this.team = team;

        this.isHuman = isHuman;

        this.isAI = !isHuman;

        this.hand = [];

        this.isReady = false;

        this.isConnected = true;

        this.tricksWon = 0;

        this.cardsPlayed = 0;

        this.score = 0;

    }


    receiveCards(cards) {

        this.hand = cards.slice();

    }


    clearHand() {

        this.hand = [];

    }


    hasSuit(suit) {

        return this.hand.some(
            card => card.suit === suit
        );

    }


    getCardsOfSuit(suit) {

        return this.hand.filter(
            card => card.suit === suit
        );

    }


    removeCard(cardId) {

        const index =
            this.hand.findIndex(
                card => card.id === cardId
            );

        if (index === -1) {

            return null;

        }

        return this.hand.splice(index, 1)[0];

    }


    addCard(card) {

        this.hand.push(card);

    }


    sortHand(trumpSuit = null) {

        const suitOrder = {

            spades: 0,

            hearts: 1,

            diamonds: 2,

            clubs: 3

        };

        this.hand.sort((a, b) => {

            if (
                trumpSuit &&
                a.suit === trumpSuit &&
                b.suit !== trumpSuit
            ) {

                return -1;

            }

            if (
                trumpSuit &&
                a.suit !== trumpSuit &&
                b.suit === trumpSuit
            ) {

                return 1;

            }

            if (
                suitOrder[a.suit] !==
                suitOrder[b.suit]
            ) {

                return (
                    suitOrder[a.suit] -
                    suitOrder[b.suit]
                );

            }

            return a.value - b.value;

        });

    }


    toJSON() {

        return {

            id: this.id,

            name: this.name,

            seat: this.seat,

            position: this.position,

            team: this.team,

            isHuman: this.isHuman,

            isAI: this.isAI,

            hand: this.hand.map(
                card => card.toJSON()
            ),

            tricksWon: this.tricksWon,

            cardsPlayed: this.cardsPlayed,

            score: this.score,

            isReady: this.isReady,

            isConnected: this.isConnected

        };

    }

}


/* ============================================================
   8. TEAM
============================================================ */

class HokmTeam {

    constructor(id, name) {

        this.id = id;

        this.name = name;

        this.players = [];

        this.tricksWon = 0;

        this.roundScore = 0;

        this.gameScore = 0;

        this.totalWins = 0;

    }


    addPlayer(player) {

        if (!this.players.includes(player)) {

            this.players.push(player);

        }

    }


    resetRound() {

        this.tricksWon = 0;

        this.roundScore = 0;

        this.players.forEach(player => {

            player.tricksWon = 0;

        });

    }


    resetGame() {

        this.resetRound();

        this.gameScore = 0;

        this.totalWins = 0;

    }


    toJSON() {

        return {

            id: this.id,

            name: this.name,

            players: this.players.map(
                player => player.id
            ),

            tricksWon: this.tricksWon,

            roundScore: this.roundScore,

            gameScore: this.gameScore,

            totalWins: this.totalWins

        };

    }

}


/* ============================================================
   9. TRICK
============================================================ */

class HokmTrick {

    constructor(number, leaderSeat) {

        this.number = number;

        this.leaderSeat = leaderSeat;

        this.leadSuit = null;

        this.cards = [];

        this.completed = false;

        this.winnerSeat = null;

        this.winnerTeam = null;

    }


    addCard(card, playerSeat) {

        if (this.completed) {

            return false;

        }

        if (this.cards.length === 0) {

            this.leadSuit = card.suit;

        }

        this.cards.push({

            card,

            playerSeat

        });

        return true;

    }


    isComplete() {

        return (
            this.cards.length ===
            HOKM_CONSTANTS.PLAYER_COUNT
        );

    }


    toJSON() {

        return {

            number: this.number,

            leaderSeat: this.leaderSeat,

            leadSuit: this.leadSuit,

            cards: this.cards.map(item => ({

                card: item.card.toJSON(),

                playerSeat: item.playerSeat

            })),

            completed: this.completed,

            winnerSeat: this.winnerSeat,

            winnerTeam: this.winnerTeam

        };

    }

}


/* ============================================================
   10. GAME STATE
============================================================ */

class HokmGameState {

    constructor() {

        this.status = "idle";

        this.mode = "classic";

        this.roundNumber = 0;

        this.trickNumber = 0;

        this.currentPlayerSeat = 0;

        this.dealerSeat = 0;

        this.hokmPlayerSeat = null;

        this.trumpSuit = null;

        this.leadSuit = null;

        this.currentTrick = null;

        this.completedTricks = [];

        this.roundWinnerTeam = null;

        this.gameWinnerTeam = null;

        this.teamScores = [0, 0];

        this.roundScores = [0, 0];

        this.targetScore =
            HOKM_CONSTANTS.TARGET_GAME_SCORE;

        this.startedAt = null;

        this.updatedAt = null;

        this.lastAction = null;

        this.error = null;

    }


    touch() {

        this.updatedAt =
            new Date().toISOString();

    }


    toJSON() {

        return {

            status: this.status,

            mode: this.mode,

            roundNumber: this.roundNumber,

            trickNumber: this.trickNumber,

            currentPlayerSeat:
                this.currentPlayerSeat,

            dealerSeat: this.dealerSeat,

            hokmPlayerSeat:
                this.hokmPlayerSeat,

            trumpSuit: this.trumpSuit,

            leadSuit: this.leadSuit,

            currentTrick:
                this.currentTrick
                    ? this.currentTrick.toJSON()
                    : null,

            completedTricks:
                this.completedTricks.map(
                    trick => trick.toJSON()
                ),

            roundWinnerTeam:
                this.roundWinnerTeam,

            gameWinnerTeam:
                this.gameWinnerTeam,

            teamScores:
                this.teamScores.slice(),

            roundScores:
                this.roundScores.slice(),

            targetScore:
                this.targetScore,

            startedAt:
                this.startedAt,

            updatedAt:
                this.updatedAt,

            lastAction:
                this.lastAction,

            error:
                this.error

        };

    }

}


/* ============================================================
   11. MAIN GAME ENGINE
============================================================ */

class HokmGameEngine {

    constructor(options = {}) {

        this.events =
            new GameEventEmitter();

        this.deck =
            new HokmDeck();

        this.state =
            new HokmGameState();

        this.players = [];

        this.teams = [

            new HokmTeam(
                0,
                "تیم شما"
            ),

            new HokmTeam(
                1,
                "حریف"
            )

        ];

        this.options = {

            mode:
                options.mode || "classic",

            humanSeat:
                Number.isInteger(
                    options.humanSeat
                )
                    ? options.humanSeat
                    : 0,

            autoAI:
                options.autoAI !== false,

            targetScore:
                options.targetScore ||
                HOKM_CONSTANTS.TARGET_GAME_SCORE

        };

        this.state.mode =
            this.options.mode;

        this.state.targetScore =
            this.options.targetScore;

        this.ui = {

            initialized: false

        };

        this.aiTimer = null;

        this.createPlayers();

        this.initializeUI();

        this.emit(
            GAME_EVENTS.INITIALIZED,
            this.getSnapshot()
        );

    }


    /* ========================================================
       PLAYER CREATION
    ======================================================== */

    createPlayers() {

        this.players = [];

        this.teams.forEach(team => {

            team.players = [];

        });

        for (
            let seat = 0;
            seat < HOKM_CONSTANTS.PLAYER_COUNT;
            seat++
        ) {

            const isHuman =
                seat === this.options.humanSeat;

            const player =
                new HokmPlayer({

                    id:
                        `player-${seat + 1}`,

                    name:
                        HOKM_CONSTANTS
                            .DEFAULT_PLAYER_NAMES[seat],

                    seat,

                    isHuman,

                    team:
                        HOKM_CONSTANTS
                            .TEAM_BY_PLAYER[seat]

                });

            this.players.push(player);

            this.teams[player.team]
                .addPlayer(player);

        }

    }


    /* ========================================================
       UI INITIALIZATION
    ======================================================== */

    initializeUI() {

        this.ui.playerHand =
            document.getElementById(
                "player-hand"
            );

        this.ui.trickArea =
            document.getElementById(
                "trick-area"
            );

        this.ui.trumpDisplay =
            document.getElementById(
                "trump-display"
            );

        this.ui.trumpSuit =
            document.getElementById(
                "trump-suit"
            );

        this.ui.teamScore =
            document.getElementById(
                "team-score"
            );

        this.ui.opponentScore =
            document.getElementById(
                "opponent-score"
            );

        this.ui.currentRound =
            document.getElementById(
                "current-round"
            );

        this.ui.gameMessage =
            document.getElementById(
                "game-message"
            );

        this.ui.gamePlayerName =
            document.getElementById(
                "game-player-name"
            );

        this.ui.gamePlayerStatus =
            document.getElementById(
                "game-player-status"
            );

        this.ui.playerTop =
            document.getElementById(
                "player-top"
            );

        this.ui.playerRight =
            document.getElementById(
                "player-right"
            );

        this.ui.playerLeft =
            document.getElementById(
                "player-left"
            );

        this.ui.playerBottom =
            document.getElementById(
                "player-bottom"
            );

        this.ui.playedCards = {

            top:
                document.getElementById(
                    "played-card-top"
                ),

            right:
                document.getElementById(
                    "played-card-right"
                ),

            bottom:
                document.getElementById(
                    "played-card-bottom"
                ),

            left:
                document.getElementById(
                    "played-card-left"
                )

        };

        this.ui.sortCardsButton =
            document.getElementById(
                "sort-cards-button"
            );


        if (this.ui.sortCardsButton) {

            this.ui.sortCardsButton
                .addEventListener(
                    "click",
                    () => {

                        const player =
                            this.getHumanPlayer();

                        if (player) {

                            player.sortHand(
                                this.state.trumpSuit
                            );

                            this.renderPlayerHand();

                        }

                    }
                );

        }


        this.ui.initialized = true;

    }


    /* ========================================================
       EVENT HELPERS
    ======================================================== */

    on(eventName, callback) {

        return this.events.on(
            eventName,
            callback
        );

    }


    emit(eventName, payload) {

        this.state.touch();

        this.events.emit(
            eventName,
            payload
        );

        this.events.emit(
            GAME_EVENTS.STATE_CHANGED,
            this.getSnapshot()
        );

    }


    /* ========================================================
       SNAPSHOT
    ======================================================== */

    getSnapshot() {

        return {

            state:
                this.state.toJSON(),

            players:
                this.players.map(
                    player => player.toJSON()
                ),

            teams:
                this.teams.map(
                    team => team.toJSON()
                ),

            deckRemaining:
                this.deck.remainingCards

        };

    }


    /* ========================================================
       START GAME
    ======================================================== */

    start(mode = this.options.mode) {

        if (
            this.state.status !== "idle" &&
            this.state.status !== "finished"
        ) {

            return {

                success: false,

                message:
                    "بازی در حال اجرا است."

            };

        }

        this.clearAITimer();

        this.state =
            new HokmGameState();

        this.state.mode = mode;

        this.state.targetScore =
            this.options.targetScore;

        this.state.status = "starting";

        this.state.startedAt =
            new Date().toISOString();

        this.state.dealerSeat =
            Math.floor(
                Math.random() *
                HOKM_CONSTANTS.PLAYER_COUNT
            );

        this.state.teamScores = [0, 0];

        this.teams.forEach(team => {

            team.resetGame();

        });

        this.players.forEach(player => {

            player.clearHand();

            player.tricksWon = 0;

            player.cardsPlayed = 0;

        });

        this.state.roundNumber = 0;

        this.state.trickNumber = 0;

        this.state.currentTrick = null;

        this.state.completedTricks = [];

        this.state.gameWinnerTeam = null;

        this.state.roundWinnerTeam = null;

        this.state.error = null;

        this.startNextRound();

        this.emit(
            GAME_EVENTS.STARTED,
            this.getSnapshot()
        );

        return {

            success: true,

            snapshot:
                this.getSnapshot()

        };

    }


    /* ========================================================
       START NEXT ROUND
    ======================================================== */

    startNextRound() {

        if (
            this.state.teamScores[0] >=
            this.state.targetScore
        ) {

            this.finishGame(0);

            return;

        }

        if (
            this.state.teamScores[1] >=
            this.state.targetScore
        ) {

            this.finishGame(1);

            return;

        }

        this.state.roundNumber++;

        this.state.status =
            "dealing";

        this.state.trickNumber = 0;

        this.state.trumpSuit = null;

        this.state.leadSuit = null;

        this.state.hokmPlayerSeat = null;

        this.state.roundWinnerTeam = null;

        this.state.roundScores = [0, 0];

        this.state.completedTricks = [];

        this.state.currentTrick = null;

        this.teams.forEach(team => {

            team.resetRound();

        });

        this.players.forEach(player => {

            player.clearHand();

        });

        this.emit(
            GAME_EVENTS.ROUND_STARTED,
            {

                round:
                    this.state.roundNumber

            }
        );

        this.dealRound();

    }


    /* ========================================================
       DEAL ROUND
    ======================================================== */

    dealRound() {

        this.state.status =
            "dealing";

        this.deck
            .reset()
            .shuffle();

        this.emit(
            GAME_EVENTS.DEAL_STARTED,
            {

                round:
                    this.state.roundNumber

            }
        );


        /*
            در حکم معمولاً ابتدا ۵ کارت
            به هر بازیکن داده می‌شود
            تا حاکم حکم را انتخاب کند.
        */

        const firstFive = {

            0: [],
            1: [],
            2: [],
            3: []

        };


        for (
            let i = 0;
            i < 5;
            i++
        ) {

            for (
                let offset = 0;
                offset < 4;
                offset++
            ) {

                const seat =
                    (
                        this.state.dealerSeat +
                        1 +
                        offset
                    ) %
                    HOKM_CONSTANTS.PLAYER_COUNT;

                const card =
                    this.deck.draw(1)[0];

                firstFive[seat].push(card);

            }

        }


        this.players.forEach(player => {

            player.receiveCards(
                firstFive[player.seat]
            );

            player.sortHand();

        });


        this.state.status =
            "selecting-trump";


        /*
            برای این نسخه، حاکم به صورت تصادفی
            تعیین می‌شود.
            در نسخه آنلاین، حاکم از سیستم
            تعیین‌کننده نوبت/اتاق دریافت خواهد شد.
        */

        this.state.hokmPlayerSeat =
            this.chooseHokmPlayer();


        this.emit(
            GAME_EVENTS.DEAL_COMPLETED,
            {

                cardsPerPlayer: 5,

                hokmPlayerSeat:
                    this.state.hokmPlayerSeat

            }
        );


        this.emit(
            GAME_EVENTS.TRUMP_SELECTION_STARTED,
            {

                playerSeat:
                    this.state.hokmPlayerSeat

            }
        );


        this.showTrumpSelection();

    }


    /* ========================================================
       CHOOSE HOKM PLAYER
    ======================================================== */

    chooseHokmPlayer() {

        /*
            در شروع بازی، حاکم می‌تواند با
            قرعه یا سیستم نوبتی تعیین شود.

            فعلاً برای شروع پروژه، اولین
            حاکم به صورت تصادفی انتخاب می‌شود.
        */

        if (
            this.state.roundNumber === 1
        ) {

            return Math.floor(
                Math.random() *
                HOKM_CONSTANTS.PLAYER_COUNT
            );

        }


        /*
            در راندهای بعدی حاکم به بازیکن
            بعدی منتقل می‌شود.
        */

        return (
            this.state.hokmPlayerSeat === null
                ? (
                    this.state.dealerSeat + 1
                ) % 4
                : (
                    this.state.hokmPlayerSeat + 1
                ) % 4
        );

    }


    /* ========================================================
       TRUMP SELECTION UI
    ======================================================== */

    showTrumpSelection() {

        const modal =
            document.getElementById(
                "trump-modal"
            );

        if (!modal) {

            /*
                اگر UI موجود نباشد،
                حاکم را به صورت خودکار
                توسط AI انتخاب می‌کنیم.
            */

            if (
                this.getCurrentHokmPlayer()
                    ?.isAI
            ) {

                this.aiChooseTrump();

            }

            return;

        }


        if (
            this.state.hokmPlayerSeat ===
            this.options.humanSeat
        ) {

            modal.classList.remove(
                "hidden"
            );

            this.bindTrumpButtons();

            this.showGameMessage(
                "شما حاکم هستید؛ حکم را انتخاب کنید."
            );

        } else {

            modal.classList.add(
                "hidden"
            );

            if (
                this.options.autoAI
            ) {

                this.scheduleAITrump();

            }

        }

    }


    /* ========================================================
       BIND TRUMP BUTTONS
    ======================================================== */

    bindTrumpButtons() {

        const buttons =
            document.querySelectorAll(
                ".suit-button[data-suit]"
            );

        buttons.forEach(button => {

            button.onclick = () => {

                const suit =
                    button.dataset.suit;

                this.selectTrump(suit);

            };

        });

    }


    /* ========================================================
       SELECT TRUMP
    ======================================================== */

    selectTrump(suit) {

        if (
            !HOKM_CONSTANTS.SUITS
                .includes(suit)
        ) {

            return {

                success: false,

                message:
                    "خال انتخاب‌شده معتبر نیست."

            };

        }


        if (
            this.state.status !==
            "selecting-trump"
        ) {

            return {

                success: false,

                message:
                    "در حال حاضر زمان انتخاب حکم نیست."

            };

        }


        if (
            this.state.hokmPlayerSeat !==
            this.options.humanSeat
        ) {

            return {

                success: false,

                message:
                    "فقط حاکم می‌تواند حکم را انتخاب کند."

            };

        }


        this.setTrump(suit);

        return {

            success: true,

            suit

        };

    }


    /* ========================================================
       SET TRUMP
    ======================================================== */

    setTrump(suit) {

        this.state.trumpSuit =
            suit;

        this.state.status =
            "playing";

        this.players.forEach(player => {

            player.sortHand(
                this.state.trumpSuit
            );

        });


        const modal =
            document.getElementById(
                "trump-modal"
            );

        if (modal) {

            modal.classList.add(
                "hidden"
            );

        }


        if (this.ui.trumpDisplay) {

            this.ui.trumpDisplay
                .classList.remove(
                    "hidden"
                );

        }


        if (this.ui.trumpSuit) {

            this.ui.trumpSuit.textContent =
                HOKM_CONSTANTS
                    .SUIT_SYMBOLS[suit];

        }


        this.emit(
            GAME_EVENTS.TRUMP_SELECTED,
            {

                suit,

                playerSeat:
                    this.state.hokmPlayerSeat

            }
        );


        this.startFirstTrick();

    }


    /* ========================================================
       AI TRUMP
    ======================================================== */

    scheduleAITrump() {

        this.clearAITimer();

        this.aiTimer =
            setTimeout(
                () => {

                    this.aiChooseTrump();

                },
                700
            );

    }


    aiChooseTrump() {

        const player =
            this.getCurrentHokmPlayer();

        if (!player) {

            return;

        }


        const suitScores = {};

        HOKM_CONSTANTS.SUITS.forEach(
            suit => {

                const cards =
                    player.getCardsOfSuit(
                        suit
                    );

                let score = 0;

                cards.forEach(card => {

                    score += card.value;

                    if (
                        card.rank === "A"
                    ) {

                        score += 8;

                    }

                    if (
                        card.rank === "K"
                    ) {

                        score += 5;

                    }

                    if (
                        card.rank === "Q"
                    ) {

                        score += 3;

                    }

                });


                /*
                    داشتن تعداد بیشتر کارت
                    در یک خال اهمیت زیادی دارد.
                */

                score +=
                    cards.length * 4;


                suitScores[suit] =
                    score;

            }
        );


        let bestSuit =
            HOKM_CONSTANTS.SUITS[0];

        HOKM_CONSTANTS.SUITS.forEach(
            suit => {

                if (
                    suitScores[suit] >
                    suitScores[bestSuit]
                ) {

                    bestSuit = suit;

                }

            }
        );


        this.setTrump(
            bestSuit
        );

    }


    /* ========================================================
       START FIRST TRICK
    ======================================================== */

    startFirstTrick() {

        this.state.trickNumber = 1;

        this.state.currentPlayerSeat =
            this.getFirstTrickLeader();

        this.createNewTrick();

        this.updateUI();

        this.checkAITurn();

    }


    /* ========================================================
       FIRST TRICK LEADER
    ======================================================== */

    getFirstTrickLeader() {

        /*
            در حکم، شروع بازی پس از انتخاب حکم
            طبق قوانین میز تعیین می‌شود.
            اینجا برای ساختار پایه، بازیکن بعد
            از حاکم شروع‌کننده است.
        */

        return (
            this.state.hokmPlayerSeat + 1
        ) % 4;

    }


    /* ========================================================
       CREATE NEW TRICK
    ======================================================== */

    createNewTrick() {

        this.state.currentTrick =
            new HokmTrick(
                this.state.trickNumber,
                this.state.currentPlayerSeat
            );

        this.state.leadSuit = null;

        this.clearPlayedCardsUI();

        this.emit(
            GAME_EVENTS.TRICK_STARTED,
            {

                trick:
                    this.state.trickNumber,

                leaderSeat:
                    this.state.currentPlayerSeat

            }
        );

    }


    /* ========================================================
       GET CURRENT PLAYER
    ======================================================== */

    getCurrentPlayer() {

        return this.players[
            this.state.currentPlayerSeat
        ];

    }


    /* ========================================================
       GET HUMAN PLAYER
    ======================================================== */

    getHumanPlayer() {

        return this.players[
            this.options.humanSeat
        ];

    }


    /* ========================================================
       GET HOKM PLAYER
    ======================================================== */

    getCurrentHokmPlayer() {

        return this.players[
            this.state.hokmPlayerSeat
        ];

    }


    /* ========================================================
       LEGAL MOVE CHECK
    ======================================================== */

    isLegalMove(
        playerSeat,
        cardId
    ) {

        const player =
            this.players[playerSeat];

        if (!player) {

            return {

                legal: false,

                reason:
                    "بازیکن پیدا نشد."

            };

        }


        if (
            this.state.status !==
            "playing"
        ) {

            return {

                legal: false,

                reason:
                    "بازی در وضعیت قابل بازی نیست."

            };

        }


        if (
            this.state.currentPlayerSeat !==
            playerSeat
        ) {

            return {

                legal: false,

                reason:
                    "نوبت این بازیکن نیست."

            };

        }


        const card =
            player.hand.find(
                c => c.id === cardId
            );


        if (!card) {

            return {

                legal: false,

                reason:
                    "کارت در دست بازیکن وجود ندارد."

            };

        }


        const trick =
            this.state.currentTrick;


        if (!trick) {

            return {

                legal: false,

                reason:
                    "دست فعلی وجود ندارد."

            };

        }


        /*
            اگر اولین کارت دست باشد،
            هر کارتی مجاز است.
        */

        if (
            trick.cards.length === 0
        ) {

            return {

                legal: true,

                card

            };

        }


        const leadSuit =
            trick.leadSuit;


        /*
            اگر بازیکن خال شروع را دارد،
            باید همان خال را بازی کند.
        */

        if (
            player.hasSuit(leadSuit)
        ) {

            if (
                card.suit !== leadSuit
            ) {

                return {

                    legal: false,

                    reason:
                        `باید خال ${HOKM_CONSTANTS.SUIT_NAMES[leadSuit]} را بازی کنید.`,

                    card

                };

            }

        }


        /*
            اگر بازیکن خال شروع را ندارد،
            می‌تواند هر کارتی بازی کند؛
            از جمله حکم یا خال دیگر.
        */

        return {

            legal: true,

            card

        };

    }


    /* ========================================================
       PLAY CARD
    ======================================================== */

    playCard(
        playerSeat,
        cardId
    ) {

        const validation =
            this.isLegalMove(
                playerSeat,
                cardId
            );


        if (!validation.legal) {

            this.emit(
                GAME_EVENTS.CARD_REJECTED,
                {

                    playerSeat,

                    cardId,

                    reason:
                        validation.reason

                }
            );


            this.showGameMessage(
                validation.reason
            );


            return {

                success: false,

                reason:
                    validation.reason

            };

        }


        const player =
            this.players[playerSeat];


        const card =
            player.removeCard(
                cardId
            );


        if (!card) {

            return {

                success: false,

                reason:
                    "کارت پیدا نشد."

            };

        }


        this.state.currentTrick
            .addCard(
                card,
                playerSeat
            );


        player.cardsPlayed++;


        this.state.leadSuit =
            this.state.currentTrick.leadSuit;


        this.state.lastAction = {

            type: "play-card",

            playerSeat,

            card:
                card.toJSON(),

            timestamp:
                new Date().toISOString()

        };


        this.renderPlayedCard(
            playerSeat,
            card
        );


        this.emit(
            GAME_EVENTS.CARD_PLAYED,
            {

                playerSeat,

                card:
                    card.toJSON(),

                trick:
                    this.state.trickNumber

            }
        );


        if (
            this.state.currentTrick
                .isComplete()
        ) {

            this.resolveTrick();

        } else {

            this.advanceTurn();

        }


        this.renderPlayerHand();

        this.updateUI();


        return {

            success: true,

            card

        };

    }


    /* ========================================================
       ADVANCE TURN
    ======================================================== */

    advanceTurn() {

        this.state.currentPlayerSeat =
            (
                this.state.currentPlayerSeat +
                1
            ) % 4;


        this.emit(
            GAME_EVENTS.TURN_CHANGED,
            {

                playerSeat:
                    this.state.currentPlayerSeat

            }
        );


        this.updateUI();

        this.checkAITurn();

    }


    /* ========================================================
       CHECK AI TURN
    ======================================================== */

    checkAITurn() {

        if (
            !this.options.autoAI
        ) {

            return;

        }


        const player =
            this.getCurrentPlayer();


        if (!player) {

            return;

        }


        if (
            !player.isAI
        ) {

            this.showGameMessage(
                "نوبت شماست."
            );

            return;

        }


        this.clearAITimer();


        this.aiTimer =
            setTimeout(
                () => {

                    this.aiPlayCard(
                        player.seat
                    );

                },
                650
            );

    }


    /* ========================================================
       AI PLAY CARD
    ======================================================== */

    aiPlayCard(
        playerSeat
    ) {

        const player =
            this.players[playerSeat];


        if (!player) {

            return;

        }


        if (
            this.state.currentPlayerSeat !==
            playerSeat
        ) {

            return;

        }


        if (
            player.hand.length === 0
        ) {

            return;

        }


        const legalCards =
            player.hand.filter(
                card =>
                    this.isLegalMove(
                        playerSeat,
                        card.id
                    ).legal
            );


        if (
            legalCards.length === 0
        ) {

            return;

        }


        const selectedCard =
            this.chooseAICard(
                player,
                legalCards
            );


        this.playCard(
            playerSeat,
            selectedCard.id
        );

    }


    /* ========================================================
       AI CARD STRATEGY
    ======================================================== */

    chooseAICard(
        player,
        legalCards
    ) {

        const trick =
            this.state.currentTrick;


        /*
            اگر اولین کارت را بازی می‌کنیم،
            خالی‌ترین/ضعیف‌ترین خال مناسب
            را انتخاب می‌کنیم.
        */

        if (
            !trick ||
            trick.cards.length === 0
        ) {

            return this.chooseAILeadCard(
                player,
                legalCards
            );

        }


        /*
            اگر کارت‌های فعلی روی میز هستند،
            تلاش می‌کنیم دست را ببریم.
        */

        const winningCards =
            legalCards.filter(
                card =>
                    this.cardCanBeatCurrentTrick(
                        card,
                        trick
                    )
            );


        if (
            winningCards.length > 0
        ) {

            return winningCards
                .sort(
                    (a, b) =>
                        a.value - b.value
                )[0];

        }


        /*
            اگر نمی‌توانیم ببریم،
            ضعیف‌ترین کارت قانونی را می‌اندازیم.
        */

        return legalCards
            .slice()
            .sort(
                (a, b) =>
                    this.getCardStrength(
                        a
                    ) -
                    this.getCardStrength(
                        b
                    )
            )[0];

    }


    /* ========================================================
       AI LEAD CARD
    ======================================================== */

    chooseAILeadCard(
        player,
        legalCards
    ) {

        const nonTrumpCards =
            legalCards.filter(
                card =>
                    card.suit !==
                    this.state.trumpSuit
            );


        const pool =
            nonTrumpCards.length > 0
                ? nonTrumpCards
                : legalCards;


        return pool
            .slice()
            .sort(
                (a, b) =>
                    this.getCardStrength(a) -
                    this.getCardStrength(b)
            )[0];

    }


    /* ========================================================
       CARD STRENGTH
    ======================================================== */

    getCardStrength(card) {

        let strength =
            card.value;


        if (
            card.suit ===
            this.state.trumpSuit
        ) {

            strength += 100;

        }


        return strength;

    }


    /* ========================================================
       CAN CARD BEAT TRICK
    ======================================================== */

    cardCanBeatCurrentTrick(
        card,
        trick
    ) {

        if (
            !trick ||
            trick.cards.length === 0
        ) {

            return true;

        }


        let currentWinner =
            trick.cards[0];


        for (
            let i = 1;
            i < trick.cards.length;
            i++
        ) {

            const candidate =
                trick.cards[i];


            if (
                this.compareCards(
                    candidate.card,
                    currentWinner.card,
                    trick.leadSuit
                ) > 0
            ) {

                currentWinner =
                    candidate;

            }

        }


        return (
            this.compareCards(
                card,
                currentWinner.card,
                trick.leadSuit
            ) > 0
        );

    }


    /* ========================================================
       COMPARE CARDS
    ======================================================== */

    compareCards(
        cardA,
        cardB,
        leadSuit
    ) {

        const trump =
            this.state.trumpSuit;


        const aTrump =
            cardA.suit === trump;

        const bTrump =
            cardB.suit === trump;


        if (
            aTrump &&
            !bTrump
        ) {

            return 1;

        }


        if (
            !aTrump &&
            bTrump
        ) {

            return -1;

        }


        /*
            اگر هر دو حکم هستند،
            مقدار خودشان مقایسه می‌شود.
        */

        if (
            aTrump &&
            bTrump
        ) {

            return (
                cardA.value -
                cardB.value
            );

        }


        const aLead =
            cardA.suit === leadSuit;

        const bLead =
            cardB.suit === leadSuit;


        if (
            aLead &&
            !bLead
        ) {

            return 1;

        }


        if (
            !aLead &&
            bLead
        ) {

            return -1;

        }


        /*
            اگر هر دو از خال اصلی باشند.
        */

        if (
            aLead &&
            bLead
        ) {

            return (
                cardA.value -
                cardB.value
            );

        }


        /*
            اگر هیچ‌کدام خال اصلی یا حکم نیستند،
            نسبت به یکدیگر برتری ندارند.
        */

        return 0;

    }


    /* ========================================================
       RESOLVE TRICK
    ======================================================== */

    resolveTrick() {

        const trick =
            this.state.currentTrick;


        if (!trick) {

            return;

        }


        if (
            !trick.isComplete()
        ) {

            return;

        }


        let winner =
            trick.cards[0];


        for (
            let i = 1;
            i < trick.cards.length;
            i++
        ) {

            const candidate =
                trick.cards[i];


            const comparison =
                this.compareCards(
                    candidate.card,
                    winner.card,
                    trick.leadSuit
                );


            if (
                comparison > 0
            ) {

                winner =
                    candidate;

            }

        }


        trick.winnerSeat =
            winner.playerSeat;


        trick.winnerTeam =
            this.players[
                winner.playerSeat
            ].team;


        trick.completed = true;


        const winningPlayer =
            this.players[
                trick.winnerSeat
            ];


        winningPlayer.tricksWon++;


        const winningTeam =
            this.teams[
                trick.winnerTeam
            ];


        winningTeam.tricksWon++;


        this.state.roundScores[
            trick.winnerTeam
        ] = winningTeam.tricksWon;


        this.state.completedTricks
            .push(trick);


        this.emit(
            GAME_EVENTS.TRICK_COMPLETED,
            {

                trick:
                    trick.toJSON(),

                winnerSeat:
                    trick.winnerSeat,

                winnerTeam:
                    trick.winnerTeam

            }
        );


        /*
            برنده دست، شروع‌کننده دست بعدی است.
        */

        this.state.currentPlayerSeat =
            trick.winnerSeat;


        /*
            اگر ۱۳ دست تمام شده،
            راند تمام می‌شود.
        */

        if (
            this.state.completedTricks.length >=
            HOKM_CONSTANTS.TRICKS_PER_ROUND
        ) {

            this.finishRound();

            return;

        }


        this.state.trickNumber++;


        this.createNewTrick();


        this.updateUI();


        this.showGameMessage(
            `${winningPlayer.name} برنده دست شد.`
        );


        this.emit(
            GAME_EVENTS.TURN_CHANGED,
            {

                playerSeat:
                    this.state.currentPlayerSeat

            }
        );


        this.checkAITurn();

    }


    /* ========================================================
       FINISH ROUND
    ======================================================== */

    finishRound() {

        this.state.status =
            "round-finished";


        const team0Tricks =
            this.teams[0].tricksWon;

        const team1Tricks =
            this.teams[1].tricksWon;


        let winnerTeam;


        if (
            team0Tricks >
            team1Tricks
        ) {

            winnerTeam = 0;

        } else {

            winnerTeam = 1;

        }


        this.state.roundWinnerTeam =
            winnerTeam;


        /*
            امتیاز پایه راند.
        */

        this.state.teamScores[
            winnerTeam
        ]++;


        this.teams[winnerTeam]
            .roundScore = 1;


        this.teams[winnerTeam]
            .gameScore =
                this.state.teamScores[
                    winnerTeam
                ];


        this.teams[
            winnerTeam
        ].totalWins++;


        this.emit(
            GAME_EVENTS.ROUND_COMPLETED,
            {

                round:
                    this.state.roundNumber,

                winnerTeam,

                teamTricks: [
                    team0Tricks,
                    team1Tricks
                ],

                scores:
                    this.state.teamScores
                        .slice()

            }
        );


        this.updateUI();


        /*
            بررسی پایان کل بازی.
        */

        if (
            this.state.teamScores[
                winnerTeam
            ] >=
            this.state.targetScore
        ) {

            this.finishGame(
                winnerTeam
            );

            return;

        }


        /*
            شروع راند بعدی با کمی تأخیر
            برای نمایش نتیجه راند.
        */

        setTimeout(
            () => {

                if (
                    this.state.status ===
                    "round-finished"
                ) {

                    this.startNextRound();

                }

            },
            1200
        );

    }


    /* ========================================================
       FINISH GAME
    ======================================================== */

    finishGame(
        winnerTeam
    ) {

        this.clearAITimer();


        this.state.status =
            "finished";


        this.state.gameWinnerTeam =
            winnerTeam;


        this.teams[
            winnerTeam
        ].totalWins++;


        this.emit(
            GAME_EVENTS.GAME_COMPLETED,
            {

                winnerTeam,

                scores:
                    this.state.teamScores
                        .slice(),

                rounds:
                    this.state.roundNumber

            }
        );


        this.showGameResult();


        this.updateUI();

    }


    /* ========================================================
       SHOW GAME RESULT
    ======================================================== */

    showGameResult() {

        const modal =
            document.getElementById(
                "game-result-modal"
            );


        if (!modal) {

            return;

        }


        const resultTitle =
            document.getElementById(
                "result-title"
            );

        const resultDescription =
            document.getElementById(
                "result-description"
            );

        const resultIcon =
            document.getElementById(
                "result-icon"
            );

        const resultTeamScore =
            document.getElementById(
                "result-team-score"
            );

        const resultOpponentScore =
            document.getElementById(
                "result-opponent-score"
            );


        const humanTeam =
            this.players[
                this.options.humanSeat
            ].team;


        const won =
            humanTeam ===
            this.state.gameWinnerTeam;


        if (resultTitle) {

            resultTitle.textContent =
                won
                    ? "پیروز شدید!"
                    : "شکست خوردید";

        }


        if (resultDescription) {

            resultDescription.textContent =
                won
                    ? "تیم شما برنده بازی شد."
                    : "این بار تیم حریف برنده شد.";

        }


        if (resultIcon) {

            resultIcon.textContent =
                won
                    ? "🏆"
                    : "🎴";

        }


        if (resultTeamScore) {

            resultTeamScore.textContent =
                this.state.teamScores[
                    humanTeam
                ];

        }


        if (resultOpponentScore) {

            resultOpponentScore.textContent =
                this.state.teamScores[
                    1 - humanTeam
                ];

        }


        modal.classList.remove(
            "hidden"
        );

    }


    /* ========================================================
       RESET GAME
    ======================================================== */

    reset() {

        this.clearAITimer();

        this.deck.reset();

        this.state =
            new HokmGameState();

        this.state.mode =
            this.options.mode;

        this.state.targetScore =
            this.options.targetScore;

        this.players.forEach(player => {

            player.clearHand();

            player.tricksWon = 0;

            player.cardsPlayed = 0;

            player.score = 0;

        });


        this.teams.forEach(team => {

            team.resetGame();

        });


        this.clearPlayedCardsUI();

        this.renderPlayerHand();

        this.updateUI();


        const resultModal =
            document.getElementById(
                "game-result-modal"
            );

        if (resultModal) {

            resultModal.classList.add(
                "hidden"
            );

        }


        const trumpModal =
            document.getElementById(
                "trump-modal"
            );

        if (trumpModal) {

            trumpModal.classList.add(
                "hidden"
            );

        }


        this.emit(
            GAME_EVENTS.RESET,
            this.getSnapshot()
        );

    }


    /* ========================================================
       SORT HUMAN HAND
    ======================================================== */

    sortHumanHand() {

        const player =
            this.getHumanPlayer();


        if (!player) {

            return;

        }


        player.sortHand(
            this.state.trumpSuit
        );


        this.renderPlayerHand();

    }


    /* ========================================================
       RENDER PLAYER HAND
    ======================================================== */

    renderPlayerHand() {

        const container =
            this.ui.playerHand;


        if (!container) {

            return;

        }


        container.innerHTML = "";


        const player =
            this.getHumanPlayer();


        if (!player) {

            return;

        }


        player.hand.forEach(
            (card, index) => {

                const cardElement =
                    this.createCardElement(
                        card,
                        index
                    );


                container.appendChild(
                    cardElement
                );

            }
        );

    }


    /* ========================================================
       CREATE CARD ELEMENT
    ======================================================== */

    createCardElement(
        card,
        index
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type = "button";

        button.className =
            "game-card player-card";


        button.dataset.cardId =
            card.id;


        button.dataset.suit =
            card.suit;


        button.dataset.rank =
            card.rank;


        const legal =
            this.isLegalMove(
                this.options.humanSeat,
                card.id
            ).legal;


        const isHumanTurn =
            this.state.currentPlayerSeat ===
            this.options.humanSeat;


        if (
            this.state.status ===
            "playing" &&
            isHumanTurn &&
            legal
        ) {

            button.classList.add(
                "card-playable"
            );

        } else {

            button.classList.add(
                "card-disabled"
            );

        }


        if (card.isRed) {

            button.classList.add(
                "red-card"
            );

        }


        const top =
            document.createElement(
                "span"
            );

        top.className =
            "card-rank";


        top.textContent =
            card.rank;


        const center =
            document.createElement(
                "span"
            );

        center.className =
            "card-suit";


        center.textContent =
            card.symbol;


        const bottom =
            document.createElement(
                "span"
            );

        bottom.className =
            "card-rank-bottom";


        bottom.textContent =
            card.rank;


        button.appendChild(top);

        button.appendChild(center);

        button.appendChild(bottom);


        button.addEventListener(
            "click",
            () => {

                if (
                    this.state.currentPlayerSeat !==
                    this.options.humanSeat
                ) {

                    this.showGameMessage(
                        "هنوز نوبت شما نیست."
                    );

                    return;

                }


                this.playCard(
                    this.options.humanSeat,
                    card.id
                );

            }
        );


        button.style.setProperty(
            "--card-index",
            index
        );


        return button;

    }


    /* ========================================================
       RENDER PLAYED CARD
    ======================================================== */

    renderPlayedCard(
        playerSeat,
        card
    ) {

        const position =
            HOKM_CONSTANTS
                .PLAYER_POSITIONS[
                    playerSeat
                ];


        const slot =
            this.ui.playedCards[
                position
            ];


        if (!slot) {

            return;

        }


        slot.innerHTML = "";


        const cardElement =
            document.createElement(
                "div"
            );


        cardElement.className =
            "game-card played-card";


        if (card.isRed) {

            cardElement.classList.add(
                "red-card"
            );

        }


        const rank =
            document.createElement(
                "span"
            );

        rank.className =
            "card-rank";

        rank.textContent =
            card.rank;


        const suit =
            document.createElement(
                "span"
            );

        suit.className =
            "card-suit";

        suit.textContent =
            card.symbol;


        cardElement.appendChild(
            rank
        );

        cardElement.appendChild(
            suit
        );


        slot.appendChild(
            cardElement
        );

    }


    /* ========================================================
       CLEAR PLAYED CARDS UI
    ======================================================== */

    clearPlayedCardsUI() {

        if (!this.ui.playedCards) {

            return;

        }


        Object.values(
            this.ui.playedCards
        ).forEach(slot => {

            if (slot) {

                slot.innerHTML = "";

            }

        });

    }


    /* ========================================================
       SHOW MESSAGE
    ======================================================== */

    showGameMessage(
        message
    ) {

        if (!this.ui.gameMessage) {

            return;

        }


        this.ui.gameMessage.textContent =
            message;


        this.ui.gameMessage
            .classList.remove(
                "hidden"
            );


        clearTimeout(
            this.messageTimer
        );


        this.messageTimer =
            setTimeout(
                () => {

                    if (
                        this.ui.gameMessage
                    ) {

                        this.ui.gameMessage
                            .classList.add(
                                "hidden"
                            );

                    }

                },
                2200
            );

    }


    /* ========================================================
       UPDATE UI
    ======================================================== */

    updateUI() {

        this.renderPlayerHand();

        this.updateScores();

        this.updateRound();

        this.updatePlayers();

        this.updateTrump();

        this.updateCurrentTurn();

    }


    /* ========================================================
       UPDATE SCORES
    ======================================================== */

    updateScores() {

        const humanTeam =
            this.players[
                this.options.humanSeat
            ].team;


        const opponentTeam =
            1 - humanTeam;


        if (this.ui.teamScore) {

            this.ui.teamScore.textContent =
                this.state.teamScores[
                    humanTeam
                ];

        }


        if (this.ui.opponentScore) {

            this.ui.opponentScore.textContent =
                this.state.teamScores[
                    opponentTeam
                ];

        }

    }


    /* ========================================================
       UPDATE ROUND
    ======================================================== */

    updateRound() {

        if (
            this.ui.currentRound
        ) {

            this.ui.currentRound.textContent =
                this.state.trickNumber ||
                1;

        }

    }


    /* ========================================================
       UPDATE TRUMP
    ======================================================== */

    updateTrump() {

        if (
            !this.ui.trumpDisplay
        ) {

            return;

        }


        if (
            this.state.trumpSuit
        ) {

            this.ui.trumpDisplay
                .classList.remove(
                    "hidden"
                );


            if (
                this.ui.trumpSuit
            ) {

                this.ui.trumpSuit.textContent =
                    HOKM_CONSTANTS
                        .SUIT_SYMBOLS[
                            this.state.trumpSuit
                        ];

            }

        } else {

            this.ui.trumpDisplay
                .classList.add(
                    "hidden"
                );

        }

    }


    /* ========================================================
       UPDATE PLAYERS
    ======================================================== */

    updatePlayers() {

        this.players.forEach(
            player => {

                const element =
                    document.getElementById(
                        `player-${
                            HOKM_CONSTANTS
                                .PLAYER_POSITIONS[
                                    player.seat
                                ]
                        }`
                    );


                if (!element) {

                    return;

                }


                const nameElement =
                    element.querySelector(
                        ".player-name"
                    );


                const statusElement =
                    element.querySelector(
                        ".player-status"
                    );


                if (nameElement) {

                    nameElement.textContent =
                        player.name;

                }


                if (statusElement) {

                    if (
                        this.state.currentPlayerSeat ===
                        player.seat
                    ) {

                        statusElement.textContent =
                            "نوبت";

                    } else {

                        statusElement.textContent =
                            "منتظر";

                    }

                }


                const indicator =
                    element.querySelector(
                        ".player-turn-indicator"
                    );


                if (indicator) {

                    if (
                        this.state.currentPlayerSeat ===
                        player.seat
                    ) {

                        indicator.classList.remove(
                            "hidden"
                        );

                    } else {

                        indicator.classList.add(
                            "hidden"
                        );

                    }

                }

            }
        );

    }


    /* ========================================================
       UPDATE CURRENT TURN
    ======================================================== */

    updateCurrentTurn() {

        const human =
            this.getHumanPlayer();


        if (!human) {

            return;

        }


        const isTurn =
            this.state.currentPlayerSeat ===
            human.seat;


        if (this.ui.gamePlayerStatus) {

            if (isTurn) {

                this.ui.gamePlayerStatus.textContent =
                    "نوبت شما";

            } else {

                this.ui.gamePlayerStatus.textContent =
                    "منتظر";

            }

        }


        if (
            this.ui.gamePlayerName
        ) {

            this.ui.gamePlayerName.textContent =
                human.name;

        }


        const indicator =
            document.getElementById(
                "game-turn-indicator"
            );


        if (indicator) {

            if (isTurn) {

                indicator.classList.remove(
                    "hidden"
                );

            } else {

                indicator.classList.add(
                    "hidden"
                );

            }

        }


        if (isTurn) {

            this.showGameMessage(
                "نوبت شماست."
            );

        }

    }


    /* ========================================================
       GET LEGAL CARDS FOR PLAYER
    ======================================================== */

    getLegalCards(
        playerSeat
    ) {

        const player =
            this.players[playerSeat];


        if (!player) {

            return [];

        }


        return player.hand.filter(
            card =>
                this.isLegalMove(
                    playerSeat,
                    card.id
                ).legal
        );

    }


    /* ========================================================
       GET GAME STATUS
    ======================================================== */

    getStatus() {

        return this.state.status;

    }


    /* ========================================================
       IS GAME RUNNING
    ======================================================== */

    isRunning() {

        return (
            this.state.status ===
            "playing"
        );

    }


    /* ========================================================
       IS HUMAN TURN
    ======================================================== */

    isHumanTurn() {

        return (
            this.state.currentPlayerSeat ===
            this.options.humanSeat
        );

    }


    /* ========================================================
       GET TEAM OF PLAYER
    ======================================================== */

    getPlayerTeam(
        playerSeat
    ) {

        const player =
            this.players[playerSeat];

        return player
            ? player.team
            : null;

    }


    /* ========================================================
       GET WINNING TEAM
    ======================================================== */

    getWinningTeam() {

        return this.state.gameWinnerTeam;

    }


    /* ========================================================
       GET ROUND WINNER
    ======================================================== */

    getRoundWinner() {

        return this.state.roundWinnerTeam;

    }


    /* ========================================================
       GET CURRENT TRICK
    ======================================================== */

    getCurrentTrick() {

        return this.state.currentTrick;

    }


    /* ========================================================
       GET TRUMP
    ======================================================== */

    getTrumpSuit() {

        return this.state.trumpSuit;

    }


    /* ========================================================
       GET CURRENT PLAYER SEAT
    ======================================================== */

    getCurrentPlayerSeat() {

        return this.state.currentPlayerSeat;

    }


    /* ========================================================
       GET PLAYER
    ======================================================== */

    getPlayer(
        seat
    ) {

        return this.players[seat] || null;

    }


    /* ========================================================
       SAVE STATE
    ======================================================== */

    serialize() {

        return JSON.stringify(
            this.getSnapshot()
        );

    }


    /* ========================================================
       LOAD STATE
    ======================================================== */

    loadState(serializedState) {

        try {

            const parsed =
                typeof serializedState ===
                "string"
                    ? JSON.parse(
                        serializedState
                    )
                    : serializedState;


            if (!parsed) {

                throw new Error(
                    "Invalid game state"
                );

            }


            if (parsed.state) {

                Object.assign(
                    this.state,
                    parsed.state
                );

            }


            if (
                Array.isArray(
                    parsed.players
                )
            ) {

                parsed.players.forEach(
                    savedPlayer => {

                        const player =
                            this.players[
                                savedPlayer.seat
                            ];


                        if (!player) {

                            return;

                        }


                        player.name =
                            savedPlayer.name;

                        player.tricksWon =
                            savedPlayer.tricksWon;

                        player.cardsPlayed =
                            savedPlayer.cardsPlayed;

                        player.score =
                            savedPlayer.score;

                        player.isReady =
                            savedPlayer.isReady;

                        player.isConnected =
                            savedPlayer.isConnected;


                        if (
                            Array.isArray(
                                savedPlayer.hand
                            )
                        ) {

                            player.hand =
                                savedPlayer.hand
                                    .map(
                                        card =>
                                            new HokmCard(
                                                card.suit,
                                                card.rank
                                            )
                                    );

                        }

                    }
                );

            }


            this.updateUI();


            return {

                success: true,

                snapshot:
                    this.getSnapshot()

            };

        } catch (error) {

            console.error(
                "Failed to load Hokm game state:",
                error
            );


            this.emit(
                GAME_EVENTS.ERROR,
                {

                    error

                }
            );


            return {

                success: false,

                error

            };

        }

    }


    /* ========================================================
       CLEAR AI TIMER
    ======================================================== */

    clearAITimer() {

        if (this.aiTimer) {

            clearTimeout(
                this.aiTimer
            );

            this.aiTimer = null;

        }

    }


    /* ========================================================
       DESTROY
    ======================================================== */

    destroy() {

        this.clearAITimer();

        this.events.clear();

        this.players = [];

        this.teams = [];

        this.deck = null;

        this.state = null;

    }

}


/* ============================================================
   12. GLOBAL GAME INSTANCE
============================================================ */

window.hokmGame =
    new HokmGameEngine({

        mode: "classic",

        humanSeat: 0,

        autoAI: true,

        targetScore: 7

    });


/* ============================================================
   13. PUBLIC API
============================================================ */

window.HokmGame = {

    constants:
        HOKM_CONSTANTS,

    events:
        GAME_EVENTS,

    engine:
        window.hokmGame,

    start(mode = "classic") {

        return window.hokmGame
            .start(mode);

    },

    reset() {

        return window.hokmGame
            .reset();

    },

    playCard(
        playerSeat,
        cardId
    ) {

        return window.hokmGame
            .playCard(
                playerSeat,
                cardId
            );

    },

    selectTrump(
        suit
    ) {

        return window.hokmGame
            .selectTrump(
                suit
            );

    },

    sortCards() {

        return window.hokmGame
            .sortHumanHand();

    },

    getState() {

        return window.hokmGame
            .getSnapshot();

    },

    getLegalCards(
        playerSeat = 0
    ) {

        return window.hokmGame
            .getLegalCards(
                playerSeat
            );

    },

    save() {

        return window.hokmGame
            .serialize();

    },

    load(
        state
    ) {

        return window.hokmGame
            .loadState(
                state
            );

    },

    on(
        eventName,
        callback
    ) {

        return window.hokmGame
            .on(
                eventName,
                callback
            );

    }

};


/* ============================================================
   14. CONNECT EXISTING UI BUTTONS
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
            دکمه شروع بازی سریع
        */

        const quickMatchButton =
            document.getElementById(
                "quick-match-button"
            );


        if (quickMatchButton) {

            quickMatchButton
                .addEventListener(
                    "click",
                    () => {

                        const modal =
                            document.getElementById(
                                "quick-match-modal"
                            );


                        if (modal) {

                            modal.classList.remove(
                                "hidden"
                            );

                        }

                    }
                );

        }


        /*
            انتخاب حالت بازی
        */

        const matchOptions =
            document.querySelectorAll(
                ".modal-option[data-match-type]"
            );


        matchOptions.forEach(
            option => {

                option.addEventListener(
                    "click",
                    () => {

                        const type =
                            option.dataset
                                .matchType;


                        const modal =
                            document.getElementById(
                                "quick-match-modal"
                            );


                        if (modal) {

                            modal.classList.add(
                                "hidden"
                            );

                        }


                        /*
                            اگر حالت تمرینی،
                            کلاسیک یا رقابتی باشد،
                            موتور بازی را اجرا می‌کنیم.
                        */

                        window.HokmGame.start(
                            type
                        );


                        /*
                            صفحه بازی
                        */

                        showGamePage();

                    }
                );

            }
        );


        /*
            بستن مودال بازی سریع
        */

        const closeQuickMatch =
            document.getElementById(
                "close-quick-match-modal"
            );


        if (closeQuickMatch) {

            closeQuickMatch
                .addEventListener(
                    "click",
                    () => {

                        const modal =
                            document.getElementById(
                                "quick-match-modal"
                            );


                        if (modal) {

                            modal.classList.add(
                                "hidden"
                            );

                        }

                    }
                );

        }


        /*
            دکمه بازی کلاسیک
        */

        const classicButton =
            document.getElementById(
                "classic-mode-button"
            );


        if (classicButton) {

            classicButton
                .addEventListener(
                    "click",
                    () => {

                        window.HokmGame
                            .start(
                                "classic"
                            );

                        showGamePage();

                    }
                );

        }


        /*
            دکمه بازی تمرینی
        */

        const practiceButton =
            document.getElementById(
                "practice-mode-button"
            );


        if (practiceButton) {

            practiceButton
                .addEventListener(
                    "click",
                    () => {

                        window.HokmGame
                            .start(
                                "practice"
                            );

                        showGamePage();

                    }
                );

        }


        /*
            دکمه بازی رقابتی
        */

        const rankedButton =
            document.getElementById(
                "ranked-mode-button"
            );


        if (rankedButton) {

            rankedButton
                .addEventListener(
                    "click",
                    () => {

                        window.HokmGame
                            .start(
                                "ranked"
                            );

                        showGamePage();

                    }
                );

        }


        /*
            دکمه ادامه نتیجه بازی
        */

        const resultContinue =
            document.getElementById(
                "result-continue-button"
            );


        if (resultContinue) {

            resultContinue
                .addEventListener(
                    "click",
                    () => {

                        const modal =
                            document.getElementById(
                                "game-result-modal"
                            );


                        if (modal) {

                            modal.classList.add(
                                "hidden"
                            );

                        }


                        window.HokmGame
                            .reset();

                    }
                );

        }

    }
);


/* ============================================================
   15. SHOW GAME PAGE
============================================================ */

function showGamePage() {

    const pages =
        document.querySelectorAll(
            ".page"
        );


    pages.forEach(page => {

        page.classList.add(
            "hidden"
        );

        page.classList.remove(
            "active-page"
        );

    });


    const gamePage =
        document.getElementById(
            "game-page"
        );


    if (gamePage) {

        gamePage.classList.remove(
            "hidden"
        );

        gamePage.classList.add(
            "active-page"
        );

    }


    const bottomNavigation =
        document.getElementById(
            "bottom-navigation"
        );


    if (bottomNavigation) {

        bottomNavigation.classList.add(
            "hidden"
        );

    }

}


/* ============================================================
   16. GLOBAL CARD HELPERS
============================================================ */

window.HokmCard =
    HokmCard;


window.HokmDeck =
    HokmDeck;


window.HokmPlayer =
    HokmPlayer;


window.HokmTeam =
    HokmTeam;


window.HokmTrick =
    HokmTrick;


window.HokmGameEngine =
    HokmGameEngine;


/* ============================================================
   17. DEBUG HELPERS
============================================================ */

window.HokmDebug = {

    state() {

        return window.HokmGame
            .getState();

    },


    players() {

        return window.HokmGame
            .getState()
            .players;

    },


    teams() {

        return window.HokmGame
            .getState()
            .teams;

    },


    legalCards() {

        return window.HokmGame
            .getLegalCards(0);

    },


    trump() {

        return window.HokmGame
            .engine
            .getTrumpSuit();

    },


    currentPlayer() {

        return window.HokmGame
            .engine
            .getCurrentPlayerSeat();

    },


    start() {

        return window.HokmGame
            .start();

    },


    reset() {

        return window.HokmGame
            .reset();

    }

};


/* ============================================================
   18. INITIAL LOG
============================================================ */

console.log(
    "Hokm Game Engine - Stage 4 loaded successfully."
);

console.log(
    "Hokm API:",
    window.HokmGame
);


/* ============================================================
   END OF FILE
============================================================ */
