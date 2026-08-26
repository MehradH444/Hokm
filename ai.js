/* ============================================================
   HOKM ONLINE
   AI ENGINE
   File: ai.js
   Stage: 20

   توضیح:
   این فایل موتور هوش مصنوعی بازی حکم است.

   امکانات:
   - تشخیص کارت و خال
   - تشخیص کارت قانونی
   - انتخاب حکم
   - تحلیل قدرت دست
   - تحلیل کارت‌های بازی‌شده
   - محاسبه برنده دست
   - همکاری با یار
   - حمله و دفاع
   - مدیریت خال حکم
   - تشخیص کارت‌های احتمالی حریف
   - انتخاب کارت برای سطوح مختلف AI
   - Easy
   - Normal
   - Hard
   - Expert
   - امکان Monte Carlo محدود برای تصمیم‌های حساس
   - حافظه بازی
   - API عمومی برای اتصال به game.js
   - بدون وابستگی به کتابخانه خارجی

   ============================================================ */

(function (window) {

    "use strict";

    /* =========================================================
       1. CONSTANTS
    ========================================================= */

    const VERSION = "1.0.0";

    const SUITS = Object.freeze([
        "spades",
        "hearts",
        "diamonds",
        "clubs"
    ]);

    const SUIT_SYMBOLS = Object.freeze({
        spades: "♠",
        hearts: "♥",
        diamonds: "♦",
        clubs: "♣"
    });

    const SUIT_NAMES = Object.freeze({
        spades: "پیک",
        hearts: "دل",
        diamonds: "خشت",
        clubs: "گشنیز"
    });

    const RANKS = Object.freeze([
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14
    ]);

    const RANK_NAMES = Object.freeze({
        2: "۲",
        3: "۳",
        4: "۴",
        5: "۵",
        6: "۶",
        7: "۷",
        8: "۸",
        9: "۹",
        10: "۱۰",
        11: "سرباز",
        12: "بی‌بی",
        13: "شاه",
        14: "آس"
    });

    const RANK_SHORT_NAMES = Object.freeze({
        2: "2",
        3: "3",
        4: "4",
        5: "5",
        6: "6",
        7: "7",
        8: "8",
        9: "9",
        10: "10",
        11: "J",
        12: "Q",
        13: "K",
        14: "A"
    });

    const DIFFICULTIES = Object.freeze({
        EASY: "easy",
        NORMAL: "normal",
        HARD: "hard",
        EXPERT: "expert"
    });

    const DIFFICULTY_CONFIG = Object.freeze({

        easy: {
            randomness: 0.42,
            strategicDepth: 0.25,
            simulationCount: 0,
            partnerAwareness: 0.25,
            cardCounting: 0.20,
            trumpManagement: 0.30
        },

        normal: {
            randomness: 0.18,
            strategicDepth: 0.55,
            simulationCount: 0,
            partnerAwareness: 0.55,
            cardCounting: 0.50,
            trumpManagement: 0.60
        },

        hard: {
            randomness: 0.07,
            strategicDepth: 0.80,
            simulationCount: 18,
            partnerAwareness: 0.78,
            cardCounting: 0.80,
            trumpManagement: 0.82
        },

        expert: {
            randomness: 0.025,
            strategicDepth: 1.0,
            simulationCount: 40,
            partnerAwareness: 0.95,
            cardCounting: 0.98,
            trumpManagement: 0.98
        }

    });

    /* =========================================================
       2. BASIC UTILITIES
    ========================================================= */

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function random() {
        return Math.random();
    }

    function randomBetween(min, max) {
        return min + random() * (max - min);
    }

    function randomInt(min, max) {
        return Math.floor(randomBetween(min, max + 1));
    }

    function weightedRandom(items, weightGetter) {

        if (!items || items.length === 0) {
            return null;
        }

        let total = 0;

        const weighted = items.map(function (item) {

            const weight = Math.max(
                0,
                Number(weightGetter(item)) || 0
            );

            total += weight;

            return {
                item: item,
                weight: weight
            };

        });

        if (total <= 0) {
            return items[randomInt(0, items.length - 1)];
        }

        let target = random() * total;

        for (let i = 0; i < weighted.length; i++) {

            target -= weighted[i].weight;

            if (target <= 0) {
                return weighted[i].item;
            }

        }

        return weighted[weighted.length - 1].item;
    }

    function deepClone(value) {

        if (value === undefined || value === null) {
            return value;
        }

        return JSON.parse(JSON.stringify(value));
    }

    function safeNumber(value, fallback) {

        const number = Number(value);

        if (Number.isFinite(number)) {
            return number;
        }

        return fallback;
    }

    function normalizeText(value) {

        if (value === undefined || value === null) {
            return "";
        }

        return String(value)
            .trim()
            .toLowerCase();
    }

    /* =========================================================
       3. SUIT NORMALIZATION
    ========================================================= */

    function normalizeSuit(suit) {

        if (suit === undefined || suit === null) {
            return null;
        }

        const value = normalizeText(suit);

        const aliases = {

            spades: "spades",
            spade: "spades",
            s: "spades",
            "♠": "spades",
            "پیک": "spades",

            hearts: "hearts",
            heart: "hearts",
            h: "hearts",
            "♥": "hearts",
            "دل": "hearts",

            diamonds: "diamonds",
            diamond: "diamonds",
            d: "diamonds",
            "♦": "diamonds",
            "خشت": "diamonds",

            clubs: "clubs",
            club: "clubs",
            c: "clubs",
            "♣": "clubs",
            "گشنیز": "clubs",
            "خاج": "clubs"

        };

        return aliases[value] || null;
    }

    function getSuitSymbol(suit) {

        const normalized = normalizeSuit(suit);

        return normalized
            ? SUIT_SYMBOLS[normalized]
            : "";
    }

    function getSuitName(suit) {

        const normalized = normalizeSuit(suit);

        return normalized
            ? SUIT_NAMES[normalized]
            : "";
    }

    /* =========================================================
       4. RANK NORMALIZATION
    ========================================================= */

    function normalizeRank(rank) {

        if (rank === undefined || rank === null) {
            return null;
        }

        if (typeof rank === "number") {

            if (RANKS.indexOf(rank) !== -1) {
                return rank;
            }

            return null;
        }

        const value = normalizeText(rank);

        const aliases = {

            "2": 2,
            "۲": 2,

            "3": 3,
            "۳": 3,

            "4": 4,
            "۴": 4,

            "5": 5,
            "۵": 5,

            "6": 6,
            "۶": 6,

            "7": 7,
            "۷": 7,

            "8": 8,
            "۸": 8,

            "9": 9,
            "۹": 9,

            "10": 10,
            "۱۰": 10,

            "j": 11,
            "jack": 11,
            "سرباز": 11,

            "q": 12,
            "queen": 12,
            "بیبی": 12,
            "بی‌بی": 12,

            "k": 13,
            "king": 13,
            "شاه": 13,

            "a": 14,
            "ace": 14,
            "آس": 14

        };

        if (aliases[value] !== undefined) {
            return aliases[value];
        }

        const parsed = Number(value);

        if (RANKS.indexOf(parsed) !== -1) {
            return parsed;
        }

        return null;
    }

    function getRankName(rank) {

        const normalized = normalizeRank(rank);

        return normalized
            ? RANK_NAMES[normalized]
            : "";
    }

    function getRankShortName(rank) {

        const normalized = normalizeRank(rank);

        return normalized
            ? RANK_SHORT_NAMES[normalized]
            : "";
    }

    /* =========================================================
       5. CARD NORMALIZATION
    ========================================================= */

    function normalizeCard(card) {

        if (!card) {
            return null;
        }

        let suit = null;
        let rank = null;

        if (typeof card === "string") {

            const parts = card.split("-");

            if (parts.length >= 2) {

                suit = normalizeSuit(parts[0]);
                rank = normalizeRank(parts[1]);

            } else {

                const spaceParts = card.split(/\s+/);

                if (spaceParts.length >= 2) {

                    suit = normalizeSuit(spaceParts[0]);
                    rank = normalizeRank(spaceParts[1]);

                }

            }

        } else if (typeof card === "object") {

            suit = normalizeSuit(
                card.suit ||
                card.color ||
                card.symbol ||
                card.type
            );

            rank = normalizeRank(
                card.rank !== undefined
                    ? card.rank
                    : card.value !== undefined
                        ? card.value
                        : card.number
            );

            if (!suit && card.id) {

                const idParts = String(card.id).split("-");

                if (idParts.length >= 2) {

                    suit = normalizeSuit(idParts[0]);

                    if (!rank) {
                        rank = normalizeRank(idParts[1]);
                    }

                }

            }

        }

        if (!suit || !rank) {
            return null;
        }

        const normalized = {

            suit: suit,
            rank: rank,

            id: suit + "-" + rank,

            symbol: getSuitSymbol(suit),

            suitName: getSuitName(suit),

            rankName: getRankName(rank),

            shortRank: getRankShortName(rank),

            value: rank

        };

        return normalized;
    }

    function cloneCard(card) {
        return normalizeCard(card);
    }

    function cardEquals(cardA, cardB) {

        const a = normalizeCard(cardA);
        const b = normalizeCard(cardB);

        if (!a || !b) {
            return false;
        }

        return (
            a.suit === b.suit &&
            a.rank === b.rank
        );
    }

    /* =========================================================
       6. DECK
    ========================================================= */

    function createDeck() {

        const deck = [];

        SUITS.forEach(function (suit) {

            RANKS.forEach(function (rank) {

                deck.push({
                    suit: suit,
                    rank: rank,
                    id: suit + "-" + rank,
                    symbol: getSuitSymbol(suit),
                    suitName: getSuitName(suit),
                    rankName: getRankName(rank),
                    shortRank: getRankShortName(rank),
                    value: rank
                });

            });

        });

        return deck;
    }

    /* =========================================================
       7. CARD SORTING
    ========================================================= */

    function suitOrderValue(suit) {

        const index = SUITS.indexOf(normalizeSuit(suit));

        return index === -1 ? 99 : index;
    }

    function sortCards(cards, trumpSuit) {

        const normalizedTrump = normalizeSuit(trumpSuit);

        return cards
            .map(normalizeCard)
            .filter(Boolean)
            .sort(function (a, b) {

                const aTrump =
                    normalizedTrump &&
                    a.suit === normalizedTrump
                        ? 1
                        : 0;

                const bTrump =
                    normalizedTrump &&
                    b.suit === normalizedTrump
                        ? 1
                        : 0;

                if (aTrump !== bTrump) {
                    return bTrump - aTrump;
                }

                const suitDifference =
                    suitOrderValue(a.suit) -
                    suitOrderValue(b.suit);

                if (suitDifference !== 0) {
                    return suitDifference;
                }

                return b.rank - a.rank;

            });

    }

    /* =========================================================
       8. HAND ANALYSIS
    ========================================================= */

    function groupBySuit(cards) {

        const groups = {

            spades: [],
            hearts: [],
            diamonds: [],
            clubs: []

        };

        (cards || []).forEach(function (rawCard) {

            const card = normalizeCard(rawCard);

            if (!card) {
                return;
            }

            groups[card.suit].push(card);

        });

        SUITS.forEach(function (suit) {

            groups[suit].sort(function (a, b) {
                return b.rank - a.rank;
            });

        });

        return groups;
    }

    function countSuit(cards, suit) {

        const normalizedSuit = normalizeSuit(suit);

        return (cards || [])
            .map(normalizeCard)
            .filter(function (card) {
                return card && card.suit === normalizedSuit;
            })
            .length;
    }

    function getSuitCards(cards, suit) {

        const normalizedSuit = normalizeSuit(suit);

        return (cards || [])
            .map(normalizeCard)
            .filter(function (card) {
                return (
                    card &&
                    card.suit === normalizedSuit
                );
            });
    }

    function getHighCardCount(cards, suit) {

        return getSuitCards(cards, suit)
            .filter(function (card) {
                return card.rank >= 11;
            })
            .length;
    }

    function getAceCount(cards, suit) {

        return getSuitCards(cards, suit)
            .filter(function (card) {
                return card.rank === 14;
            })
            .length;
    }

    function getKingCount(cards, suit) {

        return getSuitCards(cards, suit)
            .filter(function (card) {
                return card.rank === 13;
            })
            .length;
    }

    function getQueenCount(cards, suit) {

        return getSuitCards(cards, suit)
            .filter(function (card) {
                return card.rank === 12;
            })
            .length;
    }

    function getJackCount(cards, suit) {

        return getSuitCards(cards, suit)
            .filter(function (card) {
                return card.rank === 11;
            })
            .length;
    }

    function getSuitStrength(cards, suit) {

        const suitCards = getSuitCards(cards, suit);

        if (suitCards.length === 0) {
            return 0;
        }

        let score = 0;

        suitCards.forEach(function (card) {

            if (card.rank === 14) {
                score += 12;
            } else if (card.rank === 13) {
                score += 8;
            } else if (card.rank === 12) {
                score += 5;
            } else if (card.rank === 11) {
                score += 3;
            } else if (card.rank === 10) {
                score += 2;
            } else if (card.rank >= 7) {
                score += 1.2;
            } else {
                score += 0.5;
            }

        });

        score += suitCards.length * 2.1;

        if (getAceCount(cards, suit) > 0) {
            score += 3;
        }

        if (
            getKingCount(cards, suit) > 0 &&
            getAceCount(cards, suit) > 0
        ) {
            score += 3.5;
        }

        if (
            getQueenCount(cards, suit) > 0 &&
            getKingCount(cards, suit) > 0 &&
            getAceCount(cards, suit) > 0
        ) {
            score += 2.5;
        }

        if (suitCards.length >= 5) {
            score += 4;
        }

        if (suitCards.length >= 6) {
            score += 3;
        }

        return score;
    }

    function analyzeHand(cards) {

        const normalizedCards = (cards || [])
            .map(normalizeCard)
            .filter(Boolean);

        const groups = groupBySuit(normalizedCards);

        const result = {

            totalCards: normalizedCards.length,

            suits: {},

            strongestSuit: null,

            weakestSuit: null,

            voidSuits: [],

            singletonSuits: [],

            doubletonSuits: [],

            longSuits: [],

            totalHighCards: 0,

            aces: 0,

            kings: 0,

            queens: 0,

            jacks: 0

        };

        let strongestScore = -Infinity;
        let weakestScore = Infinity;

        SUITS.forEach(function (suit) {

            const suitCards = groups[suit];

            const strength =
                getSuitStrength(
                    normalizedCards,
                    suit
                );

            result.suits[suit] = {

                count: suitCards.length,

                cards: suitCards,

                strength: strength,

                aces: getAceCount(
                    normalizedCards,
                    suit
                ),

                kings: getKingCount(
                    normalizedCards,
                    suit
                ),

                queens: getQueenCount(
                    normalizedCards,
                    suit
                ),

                jacks: getJackCount(
                    normalizedCards,
                    suit
                ),

                highCards: getHighCardCount(
                    normalizedCards,
                    suit
                )

            };

            if (suitCards.length === 0) {
                result.voidSuits.push(suit);
            }

            if (suitCards.length === 1) {
                result.singletonSuits.push(suit);
            }

            if (suitCards.length === 2) {
                result.doubletonSuits.push(suit);
            }

            if (suitCards.length >= 5) {
                result.longSuits.push(suit);
            }

            if (strength > strongestScore) {

                strongestScore = strength;
                result.strongestSuit = suit;

            }

            if (strength < weakestScore) {

                weakestScore = strength;
                result.weakestSuit = suit;

            }

            result.totalHighCards +=
                getHighCardCount(
                    normalizedCards,
                    suit
                );

            result.aces +=
                getAceCount(
                    normalizedCards,
                    suit
                );

            result.kings +=
                getKingCount(
                    normalizedCards,
                    suit
                );

            result.queens +=
                getQueenCount(
                    normalizedCards,
                    suit
                );

            result.jacks +=
                getJackCount(
                    normalizedCards,
                    suit
                );

        });

        return result;
    }

    /* =========================================================
       9. TRUMP SELECTION
    ========================================================= */

    function calculateTrumpScore(cards, suit) {

        const suitCards = getSuitCards(cards, suit);

        if (suitCards.length === 0) {
            return -100;
        }

        let score = 0;

        score += suitCards.length * 10;

        suitCards.forEach(function (card) {

            switch (card.rank) {

                case 14:
                    score += 22;
                    break;

                case 13:
                    score += 15;
                    break;

                case 12:
                    score += 10;
                    break;

                case 11:
                    score += 7;
                    break;

                case 10:
                    score += 5;
                    break;

                case 9:
                    score += 3.5;
                    break;

                case 8:
                    score += 2.5;
                    break;

                case 7:
                    score += 2;
                    break;

                default:
                    score += 1;
                    break;

            }

        });

        if (suitCards.length >= 5) {
            score += 12;
        }

        if (suitCards.length >= 6) {
            score += 8;
        }

        if (suitCards.length >= 7) {
            score += 5;
        }

        const ace =
            suitCards.some(function (card) {
                return card.rank === 14;
            });

        const king =
            suitCards.some(function (card) {
                return card.rank === 13;
            });

        const queen =
            suitCards.some(function (card) {
                return card.rank === 12;
            });

        if (ace) {
            score += 8;
        }

        if (king && ace) {
            score += 8;
        }

        if (queen && king && ace) {
            score += 6;
        }

        return score;
    }

    function chooseTrump(cards, options) {

        const normalizedCards = (cards || [])
            .map(normalizeCard)
            .filter(Boolean);

        if (normalizedCards.length === 0) {
            return null;
        }

        options = options || {};

        const difficulty =
            options.difficulty ||
            DIFFICULTIES.NORMAL;

        const config =
            DIFFICULTY_CONFIG[difficulty] ||
            DIFFICULTY_CONFIG.normal;

        const scores = {};

        SUITS.forEach(function (suit) {

            scores[suit] =
                calculateTrumpScore(
                    normalizedCards,
                    suit
                );

        });

        let bestSuit = SUITS[0];

        SUITS.forEach(function (suit) {

            if (
                scores[suit] >
                scores[bestSuit]
            ) {
                bestSuit = suit;
            }

        });

        if (difficulty === DIFFICULTIES.EASY) {

            const available =
                SUITS.filter(function (suit) {
                    return countSuit(
                        normalizedCards,
                        suit
                    ) > 0;
                });

            if (available.length > 1 && random() < 0.35) {
                return available[
                    randomInt(
                        0,
                        available.length - 1
                    )
                ];
            }

        }

        if (
            difficulty === DIFFICULTIES.NORMAL &&
            random() < config.randomness
        ) {

            const candidates =
                SUITS
                    .filter(function (suit) {
                        return (
                            scores[suit] >=
                            scores[bestSuit] - 12
                        );
                    })
                    .sort(function (a, b) {
                        return scores[b] - scores[a];
                    });

            if (candidates.length > 0) {
                return candidates[
                    randomInt(
                        0,
                        Math.min(
                            2,
                            candidates.length - 1
                        )
                    )
                ];
            }

        }

        return bestSuit;
    }

    /* =========================================================
       10. LEGAL MOVE CALCULATION
    ========================================================= */

    function getLegalCards(
        hand,
        leadSuit
    ) {

        const cards = (hand || [])
            .map(normalizeCard)
            .filter(Boolean);

        if (!leadSuit) {
            return cards;
        }

        const normalizedLead =
            normalizeSuit(leadSuit);

        const sameSuit =
            cards.filter(function (card) {

                return card.suit === normalizedLead;

            });

        if (sameSuit.length > 0) {
            return sameSuit;
        }

        return cards;
    }

    function isLegalCard(
        card,
        hand,
        leadSuit
    ) {

        const normalizedCard =
            normalizeCard(card);

        if (!normalizedCard) {
            return false;
        }

        const cards =
            (hand || [])
                .map(normalizeCard)
                .filter(Boolean);

        const exists =
            cards.some(function (item) {
                return cardEquals(
                    item,
                    normalizedCard
                );
            });

        if (!exists) {
            return false;
        }

        const legal =
            getLegalCards(
                cards,
                leadSuit
            );

        return legal.some(function (item) {
            return cardEquals(
                item,
                normalizedCard
            );
        });
    }

    /* =========================================================
       11. CARD STRENGTH
    ========================================================= */

    function getCardStrength(
        card,
        trumpSuit,
        leadSuit
    ) {

        const normalizedCard =
            normalizeCard(card);

        if (!normalizedCard) {
            return -Infinity;
        }

        const trump =
            normalizeSuit(trumpSuit);

        const lead =
            normalizeSuit(leadSuit);

        if (
            trump &&
            normalizedCard.suit === trump
        ) {
            return 1000 + normalizedCard.rank;
        }

        if (
            lead &&
            normalizedCard.suit === lead
        ) {
            return 500 + normalizedCard.rank;
        }

        return normalizedCard.rank;
    }

    /* =========================================================
       12. WINNER OF TRICK
    ========================================================= */

    function getTrickWinner(
        playedCards,
        trumpSuit,
        leadSuit
    ) {

        if (
            !playedCards ||
            playedCards.length === 0
        ) {
            return null;
        }

        const normalizedTrump =
            normalizeSuit(trumpSuit);

        let normalizedLead =
            normalizeSuit(leadSuit);

        const entries = [];

        playedCards.forEach(function (entry, index) {

            if (!entry) {
                return;
            }

            const card =
                normalizeCard(
                    entry.card || entry
                );

            if (!card) {
                return;
            }

            const playerIndex =
                entry.playerIndex !== undefined
                    ? entry.playerIndex
                    : entry.player !== undefined
                        ? entry.player
                        : index;

            entries.push({
                card: card,
                playerIndex: playerIndex,
                originalIndex: index
            });

            if (!normalizedLead) {
                normalizedLead = card.suit;
            }

        });

        if (entries.length === 0) {
            return null;
        }

        let winner = entries[0];

        for (let i = 1; i < entries.length; i++) {

            const current = entries[i];

            if (
                isCardHigherThan(
                    current.card,
                    winner.card,
                    normalizedTrump,
                    normalizedLead
                )
            ) {
                winner = current;
            }

        }

        return {

            playerIndex: winner.playerIndex,

            card: cloneCard(winner.card),

            index: winner.originalIndex

        };
    }

    function isCardHigherThan(
        candidate,
        currentWinner,
        trumpSuit,
        leadSuit
    ) {

        const candidateCard =
            normalizeCard(candidate);

        const winnerCard =
            normalizeCard(currentWinner);

        if (!candidateCard || !winnerCard) {
            return false;
        }

        const trump =
            normalizeSuit(trumpSuit);

        const lead =
            normalizeSuit(leadSuit);

        const candidateTrump =
            trump &&
            candidateCard.suit === trump;

        const winnerTrump =
            trump &&
            winnerCard.suit === trump;

        if (candidateTrump && !winnerTrump) {
            return true;
        }

        if (!candidateTrump && winnerTrump) {
            return false;
        }

        const candidateLead =
            candidateCard.suit === lead;

        const winnerLead =
            winnerCard.suit === lead;

        if (candidateLead && !winnerLead) {
            return true;
        }

        if (!candidateLead && winnerLead) {
            return false;
        }

        if (
            candidateCard.suit ===
            winnerCard.suit
        ) {
            return (
                candidateCard.rank >
                winnerCard.rank
            );
        }

        return false;
    }

    /* =========================================================
       13. GAME STATE
    ========================================================= */

    function createEmptyState() {

        return {

            trumpSuit: null,

            hakemIndex: null,

            currentPlayerIndex: null,

            leadSuit: null,

            currentTrick: [],

            completedTricks: [],

            playedCards: [],

            players: {},

            teamScores: {
                0: 0,
                1: 0
            },

            roundNumber: 1,

            trickNumber: 1,

            cardsRemaining: 52,

            history: [],

            knownCards: {},

            inferredVoids: {},

            inferredStrength: {},

            started: false,

            finished: false

        };
    }

    function createPlayerState(index) {

        return {

            index: index,

            team: index % 2,

            hand: [],

            playedCards: [],

            tricksWon: 0,

            knownVoids: [],

            isAI: false,

            name: "Player " + (index + 1)

        };
    }

    function initializePlayers(state, players) {

        state.players = {};

        for (let i = 0; i < 4; i++) {

            const source =
                players &&
                players[i]
                    ? players[i]
                    : {};

            state.players[i] =
                Object.assign(
                    createPlayerState(i),
                    source
                );

            state.players[i].team =
                i % 2;

            state.players[i].hand =
                (source.hand || [])
                    .map(normalizeCard)
                    .filter(Boolean);

        }

        return state;
    }

    /* =========================================================
       14. AI CLASS
    ========================================================= */

    class HokmAIEngine {

        constructor(options) {

            options = options || {};

            this.version = VERSION;

            this.difficulty =
                options.difficulty ||
                DIFFICULTIES.NORMAL;

            if (
                !DIFFICULTY_CONFIG[
                    this.difficulty
                ]
            ) {
                this.difficulty =
                    DIFFICULTIES.NORMAL;
            }

            this.playerIndex =
                safeNumber(
                    options.playerIndex,
                    0
                );

            this.teamIndex =
                this.playerIndex % 2;

            this.state =
                createEmptyState();

            this.state.players =
                {};

            this.memory = {

                playedByPlayer: {
                    0: [],
                    1: [],
                    2: [],
                    3: []
                },

                knownVoids: {
                    0: [],
                    1: [],
                    2: [],
                    3: []
                },

                knownCards: [],

                tricks: [],

                leads: [],

                trumpsPlayed: [],

                importantCardsSeen: [],

                estimatedHands: {
                    0: [],
                    1: [],
                    2: [],
                    3: []
                }

            };

            this.randomSeed =
                Math.floor(
                    Math.random() *
                    2147483647
                );

        }

        /* =====================================================
           SETTERS
        ===================================================== */

        setDifficulty(level) {

            if (
                !DIFFICULTY_CONFIG[level]
            ) {
                return false;
            }

            this.difficulty = level;

            return true;
        }

        getDifficulty() {
            return this.difficulty;
        }

        setPlayerIndex(index) {

            const value =
                safeNumber(index, 0);

            this.playerIndex =
                clamp(
                    Math.floor(value),
                    0,
                    3
                );

            this.teamIndex =
                this.playerIndex % 2;

            return this.playerIndex;
        }

        /* =====================================================
           GAME INITIALIZATION
        ===================================================== */

        initialize(options) {

            options = options || {};

            this.setPlayerIndex(
                options.playerIndex !== undefined
                    ? options.playerIndex
                    : this.playerIndex
            );

            if (options.difficulty) {
                this.setDifficulty(
                    options.difficulty
                );
            }

            this.state =
                createEmptyState();

            this.state.trumpSuit =
                normalizeSuit(
                    options.trumpSuit
                );

            this.state.hakemIndex =
                options.hakemIndex !== undefined
                    ? safeNumber(
                        options.hakemIndex,
                        null
                    )
                    : null;

            this.state.currentPlayerIndex =
                options.currentPlayerIndex !== undefined
                    ? safeNumber(
                        options.currentPlayerIndex,
                        null
                    )
                    : null;

            this.state.roundNumber =
                safeNumber(
                    options.roundNumber,
                    1
                );

            this.state.trickNumber =
                safeNumber(
                    options.trickNumber,
                    1
                );

            initializePlayers(
                this.state,
                options.players
            );

            this.resetMemory();

            this.state.started = true;

            return this.getState();
        }

        resetMemory() {

            this.memory = {

                playedByPlayer: {
                    0: [],
                    1: [],
                    2: [],
                    3: []
                },

                knownVoids: {
                    0: [],
                    1: [],
                    2: [],
                    3: []
                },

                knownCards: [],

                tricks: [],

                leads: [],

                trumpsPlayed: [],

                importantCardsSeen: [],

                estimatedHands: {
                    0: [],
                    1: [],
                    2: [],
                    3: []
                }

            };

        }

        reset() {

            this.state =
                createEmptyState();

            this.resetMemory();

            return true;
        }

        /* =====================================================
           UPDATE STATE
        ===================================================== */

        updateState(partialState) {

            if (!partialState) {
                return this.getState();
            }

            if (
                partialState.trumpSuit !== undefined
            ) {
                this.state.trumpSuit =
                    normalizeSuit(
                        partialState.trumpSuit
                    );
            }

            if (
                partialState.hakemIndex !== undefined
            ) {
                this.state.hakemIndex =
                    safeNumber(
                        partialState.hakemIndex,
                        null
                    );
            }

            if (
                partialState.currentPlayerIndex !== undefined
            ) {
                this.state.currentPlayerIndex =
                    safeNumber(
                        partialState.currentPlayerIndex,
                        null
                    );
            }

            if (
                partialState.leadSuit !== undefined
            ) {
                this.state.leadSuit =
                    normalizeSuit(
                        partialState.leadSuit
                    );
            }

            if (
                partialState.currentTrick !== undefined
            ) {
                this.state.currentTrick =
                    deepClone(
                        partialState.currentTrick
                    );
            }

            if (
                partialState.players
            ) {

                initializePlayers(
                    this.state,
                    partialState.players
                );

            }

            return this.getState();
        }

        getState() {

            return deepClone(this.state);

        }

        /* =====================================================
           TRUMP DECISION
        ===================================================== */

        selectTrump(hand, options) {

            const cards =
                (hand || [])
                    .map(normalizeCard)
                    .filter(Boolean);

            if (cards.length === 0) {
                return null;
            }

            const selected =
                chooseTrump(
                    cards,
                    {
                        difficulty:
                            options &&
                            options.difficulty
                                ? options.difficulty
                                : this.difficulty
                    }
                );

            this.state.trumpSuit =
                selected;

            return selected;
        }

        chooseTrump(hand, options) {

            return this.selectTrump(
                hand,
                options
            );

        }

        /* =====================================================
           CURRENT TRICK HELPERS
        ===================================================== */

        getCurrentTrick() {

            return this.state.currentTrick || [];

        }

        getLeadSuit(
            currentTrick
        ) {

            const trick =
                currentTrick ||
                this.getCurrentTrick();

            if (
                !trick ||
                trick.length === 0
            ) {
                return null;
            }

            for (
                let i = 0;
                i < trick.length;
                i++
            ) {

                const entry = trick[i];

                const card =
                    normalizeCard(
                        entry &&
                        entry.card
                            ? entry.card
                            : entry
                    );

                if (card) {
                    return card.suit;
                }

            }

            return null;
        }

        /* =====================================================
           LEGAL CARDS
        ===================================================== */

        getLegalMoves(
            hand,
            currentTrick
        ) {

            const trick =
                currentTrick ||
                this.getCurrentTrick();

            const leadSuit =
                this.getLeadSuit(trick);

            return getLegalCards(
                hand,
                leadSuit
            );

        }

        isLegalMove(
            card,
            hand,
            currentTrick
        ) {

            const trick =
                currentTrick ||
                this.getCurrentTrick();

            const leadSuit =
                this.getLeadSuit(trick);

            return isLegalCard(
                card,
                hand,
                leadSuit
            );

        }

        /* =====================================================
           RECORD PLAY
        ===================================================== */

        recordCardPlayed(
            playerIndex,
            card
        ) {

            const normalized =
                normalizeCard(card);

            if (!normalized) {
                return false;
            }

            const player =
                clamp(
                    Math.floor(
                        safeNumber(
                            playerIndex,
                            0
                        )
                    ),
                    0,
                    3
                );

            this.memory
                .playedByPlayer[player]
                .push(
                    cloneCard(normalized)
                );

            this.memory.knownCards.push(
                cloneCard(normalized)
            );

            this.state.playedCards.push({

                playerIndex: player,

                card:
                    cloneCard(normalized)

            });

            if (
                this.state.trumpSuit &&
                normalized.suit ===
                this.state.trumpSuit
            ) {

                this.memory.trumpsPlayed.push({
                    playerIndex: player,
                    card:
                        cloneCard(normalized)
                });

            }

            if (
                normalized.rank >= 11
            ) {

                this.memory
                    .importantCardsSeen
                    .push({
                        playerIndex: player,
                        card:
                            cloneCard(normalized)
                    });

            }

            return true;
        }

        /* =====================================================
           RECORD TRICK
        ===================================================== */

        recordTrick(
            trick,
            winnerIndex
        ) {

            if (
                !trick ||
                !trick.length
            ) {
                return false;
            }

            const normalizedTrick =
                trick
                    .map(function (entry) {

                        const card =
                            normalizeCard(
                                entry &&
                                entry.card
                                    ? entry.card
                                    : entry
                            );

                        if (!card) {
                            return null;
                        }

                        return {

                            playerIndex:
                                entry &&
                                entry.playerIndex !== undefined
                                    ? entry.playerIndex
                                    : null,

                            card: card

                        };

                    })
                    .filter(Boolean);

            const winner =
                safeNumber(
                    winnerIndex,
                    null
                );

            this.memory.tricks.push({

                cards:
                    deepClone(
                        normalizedTrick
                    ),

                winner:
                    winner

            });

            this.state.completedTricks.push({

                cards:
                    deepClone(
                        normalizedTrick
                    ),

                winner:
                    winner

            });

            if (winner !== null) {

                if (
                    !this.state.players[winner]
                ) {
                    this.state.players[winner] =
                        createPlayerState(
                            winner
                        );
                }

                this.state.players[winner]
                    .tricksWon++;

            }

            this.updateVoidInformation(
                normalizedTrick
            );

            this.updateLeadHistory(
                normalizedTrick
            );

            this.state.currentTrick = [];

            this.state.trickNumber++;

            return true;
        }

        /* =====================================================
           VOID DETECTION
        ===================================================== */

        updateVoidInformation(trick) {

            if (
                !trick ||
                trick.length === 0
            ) {
                return;
            }

            let leadSuit = null;

            for (
                let i = 0;
                i < trick.length;
                i++
            ) {

                const card =
                    normalizeCard(
                        trick[i].card
                    );

                if (card) {
                    leadSuit = card.suit;
                    break;
                }

            }

            if (!leadSuit) {
                return;
            }

            trick.forEach(
                (entry) => {

                    if (
                        !entry ||
                        entry.playerIndex ===
                        undefined
                    ) {
                        return;
                    }

                    const card =
                        normalizeCard(
                            entry.card
                        );

                    if (!card) {
                        return;
                    }

                    if (
                        card.suit !==
                        leadSuit
                    ) {

                        const player =
                            Number(
                                entry.playerIndex
                            );

                        if (
                            !this.memory
                                .knownVoids[player]
                                .includes(
                                    leadSuit
                                )
                        ) {

                            this.memory
                                .knownVoids[player]
                                .push(
                                    leadSuit
                                );

                        }

                    }

                }
            );

        }

        updateLeadHistory(trick) {

            if (
                !trick ||
                trick.length === 0
            ) {
                return;
            }

            const first =
                normalizeCard(
                    trick[0].card
                );

            if (!first) {
                return;
            }

            this.memory.leads.push({

                suit: first.suit,

                playerIndex:
                    trick[0].playerIndex

            });

        }

        /* =====================================================
           CARD COUNTING
        ===================================================== */

        isCardSeen(card) {

            const normalized =
                normalizeCard(card);

            if (!normalized) {
                return false;
            }

            return this.memory.knownCards
                .some(function (seen) {

                    return cardEquals(
                        seen,
                        normalized
                    );

                });

        }

        getRemainingDeck() {

            const deck =
                createDeck();

            return deck.filter(
                (card) => {
                    return !this.isCardSeen(
                        card
                    );
                }
            );

        }

        getRemainingCardsOfSuit(
            suit
        ) {

            const normalizedSuit =
                normalizeSuit(suit);

            return this.getRemainingDeck()
                .filter(function (card) {
                    return (
                        card.suit ===
                        normalizedSuit
                    );
                });

        }

        getRemainingCardsAbove(
            card,
            trumpSuit,
            leadSuit
        ) {

            const normalized =
                normalizeCard(card);

            if (!normalized) {
                return [];
            }

            return this.getRemainingDeck()
                .filter(
                    (candidate) => {

                        return isCardHigherThan(
                            candidate,
                            normalized,
                            trumpSuit,
                            leadSuit
                        );

                    }
                );

        }

        /* =====================================================
           PARTNER INFORMATION
        ===================================================== */

        isPartner(playerIndex) {

            const index =
                safeNumber(
                    playerIndex,
                    -1
                );

            return (
                index >= 0 &&
                index <= 3 &&
                index !== this.playerIndex &&
                index % 2 ===
                    this.teamIndex
            );

        }

        isOpponent(playerIndex) {

            return (
                playerIndex >= 0 &&
                playerIndex <= 3 &&
                playerIndex !==
                    this.playerIndex &&
                !this.isPartner(
                    playerIndex
                )
            );

        }

        getPartnerIndex() {

            return (
                this.playerIndex + 2
            ) % 4;

        }

        /* =====================================================
           CURRENT WINNER
        ===================================================== */

        getCurrentWinner(
            currentTrick,
            trumpSuit
        ) {

            const trick =
                currentTrick ||
                this.getCurrentTrick();

            const trump =
                normalizeSuit(
                    trumpSuit ||
                    this.state.trumpSuit
                );

            const lead =
                this.getLeadSuit(
                    trick
                );

            return getTrickWinner(
                trick,
                trump,
                lead
            );

        }

        /* =====================================================
           WINNING CARD
        ===================================================== */

        findWinningCards(
            legalCards,
            currentTrick,
            trumpSuit
        ) {

            const cards =
                (legalCards || [])
                    .map(normalizeCard)
                    .filter(Boolean);

            if (
                cards.length === 0
            ) {
                return [];
            }

            const trick =
                currentTrick ||
                this.getCurrentTrick();

            if (
                !trick ||
                trick.length === 0
            ) {

                return cards;

            }

            const trump =
                normalizeSuit(
                    trumpSuit ||
                    this.state.trumpSuit
                );

            const lead =
                this.getLeadSuit(
                    trick
                );

            const winner =
                this.getCurrentWinner(
                    trick,
                    trump
                );

            if (!winner) {
                return cards;
            }

            return cards.filter(
                function (card) {

                    return isCardHigherThan(
                        card,
                        winner.card,
                        trump,
                        lead
                    );

                }
            );

        }

        /* =====================================================
           LOWEST CARD
        ===================================================== */

        chooseLowestCard(
            cards,
            trumpSuit
        ) {

            const normalized =
                (cards || [])
                    .map(normalizeCard)
                    .filter(Boolean);

            if (
                normalized.length === 0
            ) {
                return null;
            }

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            normalized.sort(
                function (a, b) {

                    const aTrump =
                        trump &&
                        a.suit === trump;

                    const bTrump =
                        trump &&
                        b.suit === trump;

                    if (
                        aTrump !==
                        bTrump
                    ) {
                        return (
                            Number(aTrump) -
                            Number(bTrump)
                        );
                    }

                    return (
                        a.rank -
                        b.rank
                    );

                }
            );

            return normalized[0];

        }

        /* =====================================================
           HIGHEST CARD
        ===================================================== */

        chooseHighestCard(
            cards,
            trumpSuit
        ) {

            const normalized =
                (cards || [])
                    .map(normalizeCard)
                    .filter(Boolean);

            if (
                normalized.length === 0
            ) {
                return null;
            }

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            normalized.sort(
                function (a, b) {

                    const aStrength =
                        getCardStrength(
                            a,
                            trump,
                            a.suit
                        );

                    const bStrength =
                        getCardStrength(
                            b,
                            trump,
                            b.suit
                        );

                    return (
                        bStrength -
                        aStrength
                    );

                }
            );

            return normalized[0];

        }

        /* =====================================================
           SAFE WIN
        ===================================================== */

        findCheapestWinningCard(
            cards,
            currentTrick,
            trumpSuit
        ) {

            const winners =
                this.findWinningCards(
                    cards,
                    currentTrick,
                    trumpSuit
                );

            if (
                winners.length === 0
            ) {
                return null;
            }

            const trick =
                currentTrick ||
                this.getCurrentTrick();

            const lead =
                this.getLeadSuit(
                    trick
                );

            const trump =
                normalizeSuit(
                    trumpSuit ||
                    this.state.trumpSuit
                );

            winners.sort(
                function (a, b) {

                    return (
                        getCardStrength(
                            a,
                            trump,
                            lead
                        ) -
                        getCardStrength(
                            b,
                            trump,
                            lead
                        )
                    );

                }
            );

            return winners[0];

        }

        /* =====================================================
           PARTNER WINNING
        ===================================================== */

        isPartnerCurrentlyWinning(
            currentTrick,
            trumpSuit
        ) {

            const winner =
                this.getCurrentWinner(
                    currentTrick,
                    trumpSuit
                );

            if (!winner) {
                return false;
            }

            return this.isPartner(
                Number(
                    winner.playerIndex
                )
            );

        }

        /* =====================================================
           CARD VALUE FOR DECISION
        ===================================================== */

        evaluateCardForLead(
            card,
            hand,
            trumpSuit
        ) {

            const normalized =
                normalizeCard(card);

            if (!normalized) {
                return -Infinity;
            }

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            const suitCards =
                getSuitCards(
                    hand,
                    normalized.suit
                );

            let score = 0;

            score +=
                normalized.rank * 1.2;

            score +=
                suitCards.length * 1.8;

            if (
                normalized.rank === 14
            ) {
                score += 18;
            }

            if (
                normalized.rank === 13
            ) {
                score += 9;
            }

            if (
                normalized.rank === 12
            ) {
                score += 5;
            }

            if (
                normalized.rank === 11
            ) {
                score += 3;
            }

            if (
                trump &&
                normalized.suit === trump
            ) {
                score += 12;
            }

            return score;

        }

        /* =====================================================
           DISCARD EVALUATION
        ===================================================== */

        evaluateDiscard(
            card,
            hand,
            trumpSuit,
            currentTrick
        ) {

            const normalized =
                normalizeCard(card);

            if (!normalized) {
                return -Infinity;
            }

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            let score = 0;

            if (
                trump &&
                normalized.suit === trump
            ) {
                score -= 35;
            }

            score -=
                normalized.rank * 1.5;

            const suitCount =
                countSuit(
                    hand,
                    normalized.suit
                );

            if (suitCount === 1) {
                score += 10;
            }

            if (suitCount === 2) {
                score += 5;
            }

            if (
                normalized.rank <= 7
            ) {
                score += 4;
            }

            if (
                normalized.rank === 14
            ) {
                score -= 18;
            }

            if (
                normalized.rank === 13
            ) {
                score -= 10;
            }

            if (
                normalized.rank === 12
            ) {
                score -= 6;
            }

            return score;

        }

        /* =====================================================
           TRICK DECISION
        ===================================================== */

        chooseCard(
            hand,
            currentTrick,
            options
        ) {

            options = options || {};

            const cards =
                (hand || [])
                    .map(normalizeCard)
                    .filter(Boolean);

            if (
                cards.length === 0
            ) {
                return null;
            }

            const trick =
                currentTrick ||
                this.getCurrentTrick() ||
                [];

            const trump =
                normalizeSuit(
                    options.trumpSuit ||
                    this.state.trumpSuit
                );

            const lead =
                this.getLeadSuit(
                    trick
                );

            const legalCards =
                getLegalCards(
                    cards,
                    lead
                );

            if (
                legalCards.length === 0
            ) {
                return null;
            }

            if (
                legalCards.length === 1
            ) {
                return legalCards[0];
            }

            const config =
                DIFFICULTY_CONFIG[
                    this.difficulty
                ];

            let selected = null;

            if (
                !lead ||
                trick.length === 0
            ) {

                selected =
                    this.chooseLeadCard(
                        legalCards,
                        cards,
                        trump
                    );

            } else {

                selected =
                    this.chooseFollowCard(
                        legalCards,
                        cards,
                        trick,
                        trump
                    );

            }

            if (!selected) {

                selected =
                    legalCards[0];

            }

            if (
                config.randomness > 0 &&
                random() <
                config.randomness
            ) {

                selected =
                    this.applyControlledRandomness(
                        selected,
                        legalCards,
                        trick,
                        trump
                    );

            }

            return cloneCard(selected);

        }

        /* =====================================================
           LEAD DECISION
        ===================================================== */

        chooseLeadCard(
            legalCards,
            hand,
            trumpSuit
        ) {

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            const candidates =
                legalCards.map(
                    (card) => {

                        let score =
                            this.evaluateCardForLead(
                                card,
                                hand,
                                trump
                            );

                        const suitCards =
                            getSuitCards(
                                hand,
                                card.suit
                            );

                        const count =
                            suitCards.length;

                        if (
                            card.suit !== trump
                        ) {

                            if (
                                card.rank === 14
                            ) {
                                score += 15;
                            }

                            if (
                                card.rank === 13 &&
                                this.hasPlayedAce(
                                    card.suit
                                )
                            ) {
                                score += 10;
                            }

                            if (count >= 4) {
                                score += 5;
                            }

                        } else {

                            score -= 3;

                            if (
                                card.rank >= 12
                            ) {
                                score += 4;
                            }

                        }

                        const knownVoid =
                            this.getKnownOpponentVoidCount(
                                card.suit
                            );

                        score +=
                            knownVoid * 2;

                        return {
                            card: card,
                            score: score
                        };

                    }
                );

            candidates.sort(
                function (a, b) {
                    return (
                        b.score -
                        a.score
                    );
                }
            );

            return candidates[0]
                ? candidates[0].card
                : legalCards[0];

        }

        /* =====================================================
           FOLLOW DECISION
        ===================================================== */

        chooseFollowCard(
            legalCards,
            hand,
            trick,
            trumpSuit
        ) {

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            const winner =
                this.getCurrentWinner(
                    trick,
                    trump
                );

            if (!winner) {
                return this.chooseLowestCard(
                    legalCards,
                    trump
                );
            }

            const partnerWinning =
                this.isPartner(
                    Number(
                        winner.playerIndex
                    )
                );

            const winningCard =
                this.findCheapestWinningCard(
                    legalCards,
                    trick,
                    trump
                );

            if (partnerWinning) {

                return this.chooseSafeDiscard(
                    legalCards,
                    hand,
                    trump,
                    trick
                );

            }

            if (winningCard) {

                if (
                    this.shouldWinTrick(
                        winningCard,
                        trick,
                        hand,
                        trump
                    )
                ) {
                    return winningCard;
                }

            }

            return this.chooseSafeDiscard(
                legalCards,
                hand,
                trump,
                trick
            );

        }

        /* =====================================================
           SHOULD WIN
        ===================================================== */

        shouldWinTrick(
            winningCard,
            trick,
            hand,
            trumpSuit
        ) {

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            const winner =
                this.getCurrentWinner(
                    trick,
                    trump
                );

            if (!winner) {
                return true;
            }

            if (
                this.isPartner(
                    Number(
                        winner.playerIndex
                    )
                )
            ) {
                return false;
            }

            const trickNumber =
                this.state.trickNumber || 1;

            if (
                trickNumber <= 2
            ) {
                return true;
            }

            const card =
                normalizeCard(
                    winningCard
                );

            if (!card) {
                return false;
            }

            if (
                trump &&
                card.suit === trump
            ) {

                const trumpCount =
                    countSuit(
                        hand,
                        trump
                    );

                if (
                    trumpCount <= 1 &&
                    trickNumber < 8
                ) {
                    return false;
                }

            }

            return true;

        }

        /* =====================================================
           SAFE DISCARD
        ===================================================== */

        chooseSafeDiscard(
            legalCards,
            hand,
            trumpSuit,
            trick
        ) {

            if (
                legalCards.length === 1
            ) {
                return legalCards[0];
            }

            const scored =
                legalCards.map(
                    (card) => {

                        let score =
                            this.evaluateDiscard(
                                card,
                                hand,
                                trumpSuit,
                                trick
                            );

                        const suitCount =
                            countSuit(
                                hand,
                                card.suit
                            );

                        if (
                            suitCount === 1
                        ) {
                            score += 12;
                        }

                        if (
                            suitCount === 2
                        ) {
                            score += 5;
                        }

                        if (
                            card.rank <= 7
                        ) {
                            score += 4;
                        }

                        return {
                            card: card,
                            score: score
                        };

                    }
                );

            scored.sort(
                function (a, b) {
                    return (
                        b.score -
                        a.score
                    );
                }
            );

            return scored[0].card;

        }

        /* =====================================================
           RANDOMNESS WITHIN STRATEGIC RANGE
        ===================================================== */

        applyControlledRandomness(
            selected,
            legalCards,
            trick,
            trumpSuit
        ) {

            if (
                !selected ||
                legalCards.length <= 1
            ) {
                return selected;
            }

            const alternatives =
                legalCards.filter(
                    function (card) {

                        if (
                            cardEquals(
                                card,
                                selected
                            )
                        ) {
                            return false;
                        }

                        return true;

                    }
                );

            if (
                alternatives.length === 0
            ) {
                return selected;
            }

            const randomCard =
                alternatives[
                    randomInt(
                        0,
                        alternatives.length - 1
                    )
                ];

            const selectedStrength =
                this.decisionStrength(
                    selected,
                    trick,
                    trumpSuit
                );

            const randomStrength =
                this.decisionStrength(
                    randomCard,
                    trick,
                    trumpSuit
                );

            if (
                randomStrength >=
                selectedStrength - 10
            ) {
                return randomCard;
            }

            return selected;

        }

        /* =====================================================
           DECISION STRENGTH
        ===================================================== */

        decisionStrength(
            card,
            trick,
            trumpSuit
        ) {

            const normalized =
                normalizeCard(card);

            if (!normalized) {
                return -Infinity;
            }

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            const lead =
                this.getLeadSuit(
                    trick
                );

            let score =
                getCardStrength(
                    normalized,
                    trump,
                    lead
                );

            const winner =
                this.getCurrentWinner(
                    trick,
                    trump
                );

            if (winner) {

                if (
                    isCardHigherThan(
                        normalized,
                        winner.card,
                        trump,
                        lead
                    )
                ) {
                    score += 20;
                } else {
                    score -= 5;
                }

            }

            return score;

        }

        /* =====================================================
           ACE TRACKING
        ===================================================== */

        hasPlayedAce(suit) {

            const normalizedSuit =
                normalizeSuit(suit);

            return this.memory.knownCards
                .some(function (card) {

                    return (
                        card.suit ===
                        normalizedSuit &&
                        card.rank === 14
                    );

                });

        }

        hasPlayedKing(suit) {

            const normalizedSuit =
                normalizeSuit(suit);

            return this.memory.knownCards
                .some(function (card) {

                    return (
                        card.suit ===
                        normalizedSuit &&
                        card.rank === 13
                    );

                });

        }

        /* =====================================================
           KNOWN VOID COUNT
        ===================================================== */

        getKnownOpponentVoidCount(suit) {

            const normalizedSuit =
                normalizeSuit(suit);

            let count = 0;

            for (let i = 0; i < 4; i++) {

                if (
                    !this.isOpponent(i)
                ) {
                    continue;
                }

                if (
                    this.memory
                        .knownVoids[i]
                        .includes(
                            normalizedSuit
                        )
                ) {
                    count++;
                }

            }

            return count;

        }

        /* =====================================================
           ESTIMATE REMAINING CARDS
        ===================================================== */

        estimateRemainingCards() {

            const remaining =
                this.getRemainingDeck();

            const result = {

                spades: [],

                hearts: [],

                diamonds: [],

                clubs: []

            };

            remaining.forEach(
                function (card) {

                    result[card.suit]
                        .push(
                            cloneCard(card)
                        );

                }
            );

            return result;

        }

        /* =====================================================
           ESTIMATE OPPONENT HAND
        ===================================================== */

        estimatePlayerCards(
            playerIndex
        ) {

            const player =
                safeNumber(
                    playerIndex,
                    -1
                );

            if (
                player < 0 ||
                player > 3
            ) {
                return [];
            }

            const remaining =
                this.getRemainingDeck();

            const knownVoid =
                this.memory
                    .knownVoids[player] || [];

            return remaining.filter(
                (card) => {

                    return (
                        !knownVoid.includes(
                            card.suit
                        )
                    );

                }
            );

        }

        /* =====================================================
           WIN PROBABILITY
        ===================================================== */

        estimateCardWinProbability(
            card,
            hand,
            trumpSuit,
            leadSuit
        ) {

            const normalized =
                normalizeCard(card);

            if (!normalized) {
                return 0;
            }

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            const lead =
                normalizeSuit(
                    leadSuit ||
                    normalized.suit
                );

            const remainingHigher =
                this.getRemainingCardsAbove(
                    normalized,
                    trump,
                    lead
                );

            const remainingSuit =
                this.getRemainingCardsOfSuit(
                    normalized.suit
                );

            if (
                remainingSuit.length === 0
            ) {
                return 1;
            }

            const danger =
                remainingHigher.length /
                Math.max(
                    1,
                    remainingSuit.length
                );

            return clamp(
                1 - danger,
                0,
                1
            );

        }

        /* =====================================================
           CARD COUNTING SCORE
        ===================================================== */

        calculateCardCountingValue(
            card,
            trumpSuit
        ) {

            const normalized =
                normalizeCard(card);

            if (!normalized) {
                return 0;
            }

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            let value = 0;

            if (
                normalized.rank === 14
            ) {
                value += 10;
            }

            if (
                normalized.rank === 13
            ) {
                value += 7;
            }

            if (
                normalized.rank === 12
            ) {
                value += 5;
            }

            if (
                normalized.rank === 11
            ) {
                value += 3;
            }

            if (
                trump &&
                normalized.suit === trump
            ) {
                value += 8;
            }

            if (
                this.isCardSeen(
                    normalized
                )
            ) {
                value -= 20;
            }

            return value;

        }

        /* =====================================================
           MONTE CARLO DECISION
        ===================================================== */

        simulateCardChoice(
            legalCards,
            hand,
            currentTrick,
            trumpSuit
        ) {

            const config =
                DIFFICULTY_CONFIG[
                    this.difficulty
                ];

            if (
                !config ||
                config.simulationCount <= 0 ||
                legalCards.length <= 1
            ) {
                return null;
            }

            const simulations =
                config.simulationCount;

            const results =
                new Map();

            legalCards.forEach(
                (card) => {

                    results.set(
                        card.id,
                        {
                            card: card,
                            score: 0,
                            wins: 0,
                            losses: 0,
                            neutral: 0
                        }
                    );

                }
            );

            for (
                let simulation = 0;
                simulation < simulations;
                simulation++
            ) {

                legalCards.forEach(
                    (candidate) => {

                        const result =
                            results.get(
                                candidate.id
                            );

                        const score =
                            this.simulateSingleChoice(
                                candidate,
                                hand,
                                currentTrick,
                                trumpSuit
                            );

                        result.score += score;

                        if (score > 0) {
                            result.wins++;
                        } else if (score < 0) {
                            result.losses++;
                        } else {
                            result.neutral++;
                        }

                    }
                );

            }

            const ranked =
                Array.from(
                    results.values()
                ).sort(
                    function (a, b) {
                        return (
                            b.score -
                            a.score
                        );
                    }
                );

            return ranked.length
                ? ranked[0].card
                : null;

        }

        simulateSingleChoice(
            candidate,
            hand,
            currentTrick,
            trumpSuit
        ) {

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            const trick =
                (currentTrick || [])
                    .map(function (entry) {

                        return {

                            playerIndex:
                                entry.playerIndex,

                            card:
                                cloneCard(
                                    entry.card
                                )

                        };

                    });

            const lead =
                this.getLeadSuit(
                    trick
                ) ||
                candidate.suit;

            const simulatedTrick =
                trick.concat([
                    {
                        playerIndex:
                            this.playerIndex,

                        card:
                            cloneCard(
                                candidate
                            )
                    }
                ]);

            const winner =
                getTrickWinner(
                    simulatedTrick,
                    trump,
                    lead
                );

            if (!winner) {
                return 0;
            }

            let score = 0;

            if (
                Number(
                    winner.playerIndex
                ) ===
                this.playerIndex
            ) {
                score += 10;
            }

            if (
                this.isPartner(
                    Number(
                        winner.playerIndex
                    )
                )
            ) {
                score += 7;
            }

            if (
                this.isOpponent(
                    Number(
                        winner.playerIndex
                    )
                )
            ) {
                score -= 7;
            }

            if (
                trump &&
                candidate.suit === trump
            ) {
                score -= 1.5;
            }

            if (
                candidate.rank === 14
            ) {
                score += 2;
            }

            if (
                candidate.rank <= 7
            ) {
                score += 1;
            }

            return score;

        }

        /* =====================================================
           ADVANCED EXPERT DECISION
        ===================================================== */

        chooseExpertCard(
            hand,
            legalCards,
            currentTrick,
            trumpSuit
        ) {

            const simulation =
                this.simulateCardChoice(
                    legalCards,
                    hand,
                    currentTrick,
                    trumpSuit
                );

            if (simulation) {
                return simulation;
            }

            return this.chooseFollowCard(
                legalCards,
                hand,
                currentTrick,
                trumpSuit
            );

        }

        /* =====================================================
           MAIN ADVANCED API
        ===================================================== */

        chooseBestCard(
            hand,
            currentTrick,
            options
        ) {

            options = options || {};

            const cards =
                (hand || [])
                    .map(normalizeCard)
                    .filter(Boolean);

            const trick =
                currentTrick ||
                this.getCurrentTrick();

            const trump =
                normalizeSuit(
                    options.trumpSuit ||
                    this.state.trumpSuit
                );

            if (
                cards.length === 0
            ) {
                return null;
            }

            const lead =
                this.getLeadSuit(
                    trick
                );

            const legal =
                getLegalCards(
                    cards,
                    lead
                );

            if (
                legal.length === 0
            ) {
                return null;
            }

            if (
                legal.length === 1
            ) {
                return legal[0];
            }

            let result;

            if (
                this.difficulty ===
                DIFFICULTIES.EXPERT
            ) {

                result =
                    this.chooseExpertCard(
                        cards,
                        legal,
                        trick,
                        trump
                    );

            } else {

                result =
                    this.chooseCard(
                        cards,
                        trick,
                        {
                            trumpSuit:
                                trump
                        }
                    );

            }

            if (!result) {
                result = legal[0];
            }

            return cloneCard(result);

        }

        /* =====================================================
           ASYNC API
        ===================================================== */

        chooseCardAsync(
            hand,
            currentTrick,
            options
        ) {

            const self = this;

            return new Promise(
                function (resolve) {

                    const delay =
                        self.difficulty ===
                        DIFFICULTIES.EXPERT
                            ? randomInt(
                                180,
                                500
                            )
                            : randomInt(
                                120,
                                320
                            );

                    setTimeout(
                        function () {

                            resolve(
                                self.chooseBestCard(
                                    hand,
                                    currentTrick,
                                    options
                                )
                            );

                        },
                        delay
                    );

                }
            );

        }

        chooseTrumpAsync(
            hand,
            options
        ) {

            const self = this;

            return new Promise(
                function (resolve) {

                    const delay =
                        randomInt(
                            150,
                            400
                        );

                    setTimeout(
                        function () {

                            resolve(
                                self.chooseTrump(
                                    hand,
                                    options
                                )
                            );

                        },
                        delay
                    );

                }
            );

        }

        /* =====================================================
           PLAY CARD AND UPDATE STATE
        ===================================================== */

        playCard(
            hand,
            currentTrick,
            options
        ) {

            const card =
                this.chooseBestCard(
                    hand,
                    currentTrick,
                    options
                );

            if (!card) {
                return null;
            }

            this.recordCardPlayed(
                this.playerIndex,
                card
            );

            return card;

        }

        /* =====================================================
           GAME ROUND ANALYSIS
        ===================================================== */

        getRoundAnalysis() {

            const result = {

                trumpSuit:
                    this.state.trumpSuit,

                roundNumber:
                    this.state.roundNumber,

                trickNumber:
                    this.state.trickNumber,

                teamScores:
                    deepClone(
                        this.state.teamScores
                    ),

                tricksWon: {
                    0: 0,
                    1: 0,
                    2: 0,
                    3: 0
                },

                trumpCardsPlayed:
                    this.memory
                        .trumpsPlayed
                        .length,

                totalCardsSeen:
                    this.memory
                        .knownCards
                        .length,

                knownVoids:
                    deepClone(
                        this.memory
                            .knownVoids
                    )

            };

            Object.keys(
                this.state.players
            ).forEach(
                (key) => {

                    const index =
                        Number(key);

                    result.tricksWon[index] =
                        safeNumber(
                            this.state
                                .players[index]
                                .tricksWon,
                            0
                        );

                }
            );

            return result;

        }

        /* =====================================================
           STRATEGIC SUIT SELECTION
        ===================================================== */

        chooseBestLeadSuit(
            hand,
            trumpSuit
        ) {

            const cards =
                (hand || [])
                    .map(normalizeCard)
                    .filter(Boolean);

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            if (
                cards.length === 0
            ) {
                return null;
            }

            const analysis =
                analyzeHand(
                    cards
                );

            let candidates =
                SUITS.filter(
                    function (suit) {

                        return (
                            countSuit(
                                cards,
                                suit
                            ) > 0
                        );

                    }
                );

            candidates =
                candidates.sort(
                    function (a, b) {

                        let scoreA =
                            analysis
                                .suits[a]
                                .strength;

                        let scoreB =
                            analysis
                                .suits[b]
                                .strength;

                        if (
                            a === trump
                        ) {
                            scoreA -= 8;
                        }

                        if (
                            b === trump
                        ) {
                            scoreB -= 8;
                        }

                        scoreA +=
                            this.getKnownOpponentVoidCount(
                                a
                            ) * 3;

                        scoreB +=
                            this.getKnownOpponentVoidCount(
                                b
                            ) * 3;

                        return (
                            scoreB -
                            scoreA
                        );

                    }.bind(this)
                );

            return candidates.length
                ? candidates[0]
                : null;

        }

        /* =====================================================
           STRATEGIC TRUMP MANAGEMENT
        ===================================================== */

        shouldPlayTrump(
            card,
            currentTrick,
            hand,
            trumpSuit
        ) {

            const normalized =
                normalizeCard(card);

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            if (
                !normalized ||
                !trump
            ) {
                return false;
            }

            if (
                normalized.suit !== trump
            ) {
                return false;
            }

            const winner =
                this.getCurrentWinner(
                    currentTrick,
                    trump
                );

            if (!winner) {
                return true;
            }

            if (
                this.isPartner(
                    Number(
                        winner.playerIndex
                    )
                )
            ) {
                return false;
            }

            const remainingTrump =
                this.getRemainingCardsOfSuit(
                    trump
                );

            if (
                remainingTrump.length <= 3
            ) {
                return true;
            }

            return (
                normalized.rank >= 11
            );

        }

        /* =====================================================
           SUIT CONTROL
        ===================================================== */

        hasSuitControl(
            hand,
            suit,
            trumpSuit
        ) {

            const cards =
                getSuitCards(
                    hand,
                    suit
                );

            if (
                cards.length === 0
            ) {
                return false;
            }

            const trump =
                normalizeSuit(
                    trumpSuit
                );

            if (
                trump &&
                suit === trump
            ) {

                return cards.some(
                    function (card) {
                        return (
                            card.rank >= 12
                        );
                    }
                );

            }

            return cards.some(
                function (card) {
                    return (
                        card.rank === 14
                    );
                }
            );

        }

        /* =====================================================
           END GAME STRATEGY
        ===================================================== */

        isEndGame() {

            const tricks =
                this.state.trickNumber || 1;

            return tricks >= 8;

        }

        chooseEndGameCard(
            legalCards,
            hand,
            currentTrick,
            trumpSuit
        ) {

            const winner =
                this.getCurrentWinner(
                    currentTrick,
                    trumpSuit
                );

            if (
                winner &&
                this.isPartner(
                    Number(
                        winner.playerIndex
                    )
                )
            ) {

                return this.chooseSafeDiscard(
                    legalCards,
                    hand,
                    trumpSuit,
                    currentTrick
                );

            }

            const winning =
                this.findCheapestWinningCard(
                    legalCards,
                    currentTrick,
                    trumpSuit
                );

            if (winning) {
                return winning;
            }

            return this.chooseLowestCard(
                legalCards,
                trumpSuit
            );

        }

        /* =====================================================
           FINAL CARD DECISION
        ===================================================== */

        decideCard(
            hand,
            currentTrick,
            options
        ) {

            const trick =
                currentTrick || [];

            const trump =
                normalizeSuit(
                    options &&
                    options.trumpSuit
                        ? options.trumpSuit
                        : this.state.trumpSuit
                );

            const legal =
                this.getLegalMoves(
                    hand,
                    trick
                );

            if (
                legal.length === 0
            ) {
                return null;
            }

            if (
                legal.length === 1
            ) {
                return legal[0];
            }

            if (
                this.isEndGame()
            ) {

                return this.chooseEndGameCard(
                    legal,
                    hand,
                    trick,
                    trump
                );

            }

            return this.chooseBestCard(
                hand,
                trick,
                {
                    trumpSuit:
                        trump
                }
            );

        }

        /* =====================================================
           INFORMATION API
        ===================================================== */

        getPlayerKnownVoids(
            playerIndex
        ) {

            const index =
                safeNumber(
                    playerIndex,
                    -1
                );

            if (
                index < 0 ||
                index > 3
            ) {
                return [];
            }

            return deepClone(
                this.memory
                    .knownVoids[index] || []
            );

        }

        getPlayedCardsByPlayer(
            playerIndex
        ) {

            const index =
                safeNumber(
                    playerIndex,
                    -1
                );

            if (
                index < 0 ||
                index > 3
            ) {
                return [];
            }

            return deepClone(
                this.memory
                    .playedByPlayer[index] || []
            );

        }

        getAllPlayedCards() {

            return deepClone(
                this.memory.knownCards
            );

        }

        getTrumpCardsPlayed() {

            return deepClone(
                this.memory.trumpsPlayed
            );

        }

        /* =====================================================
           DEBUG INFORMATION
        ===================================================== */

        debug() {

            return {

                version:
                    this.version,

                difficulty:
                    this.difficulty,

                playerIndex:
                    this.playerIndex,

                teamIndex:
                    this.teamIndex,

                state:
                    this.getState(),

                memory:
                    deepClone(
                        this.memory
                    )

            };

        }

    }

    /* =========================================================
       15. FACTORY
    ========================================================= */

    function createAI(options) {

        return new HokmAIEngine(
            options || {}
        );

    }

    /* =========================================================
       16. DEFAULT AI
    ========================================================= */

    const defaultAI =
        new HokmAIEngine({

            difficulty:
                DIFFICULTIES.NORMAL,

            playerIndex: 0

        });

    /* =========================================================
       17. PUBLIC API
    ========================================================= */

    const HokmAI = {

        VERSION: VERSION,

        SUITS: SUITS,

        SUIT_SYMBOLS:
            SUIT_SYMBOLS,

        SUIT_NAMES:
            SUIT_NAMES,

        RANKS: RANKS,

        RANK_NAMES:
            RANK_NAMES,

        DIFFICULTIES:
            DIFFICULTIES,

        DIFFICULTY_CONFIG:
            DIFFICULTY_CONFIG,

        create:
            createAI,

        engine:
            HokmAIEngine,

        default:
            defaultAI,

        /* -----------------------------------------------------
           CARD FUNCTIONS
        ----------------------------------------------------- */

        normalizeCard:
            normalizeCard,

        normalizeSuit:
            normalizeSuit,

        normalizeRank:
            normalizeRank,

        createDeck:
            createDeck,

        sortCards:
            sortCards,

        cardEquals:
            cardEquals,

        getSuitName:
            getSuitName,

        getSuitSymbol:
            getSuitSymbol,

        getRankName:
            getRankName,

        getRankShortName:
            getRankShortName,

        /* -----------------------------------------------------
           HAND ANALYSIS
        ----------------------------------------------------- */

        groupBySuit:
            groupBySuit,

        analyzeHand:
            analyzeHand,

        getSuitStrength:
            getSuitStrength,

        calculateTrumpScore:
            calculateTrumpScore,

        chooseTrump:
            function (
                hand,
                options
            ) {

                return defaultAI.chooseTrump(
                    hand,
                    options
                );

            },

        selectTrump:
            function (
                hand,
                options
            ) {

                return defaultAI.chooseTrump(
                    hand,
                    options
                );

            },

        /* -----------------------------------------------------
           RULE FUNCTIONS
        ----------------------------------------------------- */

        getLegalCards:
            getLegalCards,

        isLegalCard:
            isLegalCard,

        getTrickWinner:
            getTrickWinner,

        isCardHigherThan:
            isCardHigherThan,

        getCardStrength:
            getCardStrength,

        /* -----------------------------------------------------
           DEFAULT AI
        ----------------------------------------------------- */

        setDifficulty:
            function (difficulty) {

                return defaultAI.setDifficulty(
                    difficulty
                );

            },

        getDifficulty:
            function () {

                return defaultAI.getDifficulty();

            },

        setPlayerIndex:
            function (index) {

                return defaultAI.setPlayerIndex(
                    index
                );

            },

        initialize:
            function (options) {

                return defaultAI.initialize(
                    options
                );

            },

        reset:
            function () {

                return defaultAI.reset();

            },

        updateState:
            function (state) {

                return defaultAI.updateState(
                    state
                );

            },

        getState:
            function () {

                return defaultAI.getState();

            },

        /* -----------------------------------------------------
           PLAY
        ----------------------------------------------------- */

        chooseCard:
            function (
                hand,
                currentTrick,
                options
            ) {

                return defaultAI.chooseBestCard(
                    hand,
                    currentTrick,
                    options
                );

            },

        chooseBestCard:
            function (
                hand,
                currentTrick,
                options
            ) {

                return defaultAI.chooseBestCard(
                    hand,
                    currentTrick,
                    options
                );

            },

        decideCard:
            function (
                hand,
                currentTrick,
                options
            ) {

                return defaultAI.decideCard(
                    hand,
                    currentTrick,
                    options
                );

            },

        chooseCardAsync:
            function (
                hand,
                currentTrick,
                options
            ) {

                return defaultAI.chooseCardAsync(
                    hand,
                    currentTrick,
                    options
                );

            },

        chooseTrumpAsync:
            function (
                hand,
                options
            ) {

                return defaultAI.chooseTrumpAsync(
                    hand,
                    options
                );

            },

        playCard:
            function (
                hand,
                currentTrick,
                options
            ) {

                return defaultAI.playCard(
                    hand,
                    currentTrick,
                    options
                );

            },

        /* -----------------------------------------------------
           GAME MEMORY
        ----------------------------------------------------- */

        recordCardPlayed:
            function (
                playerIndex,
                card
            ) {

                return defaultAI.recordCardPlayed(
                    playerIndex,
                    card
                );

            },

        recordTrick:
            function (
                trick,
                winnerIndex
            ) {

                return defaultAI.recordTrick(
                    trick,
                    winnerIndex
                );

            },

        getAllPlayedCards:
            function () {

                return defaultAI.getAllPlayedCards();

            },

        getPlayedCardsByPlayer:
            function (playerIndex) {

                return defaultAI.getPlayedCardsByPlayer(
                    playerIndex
                );

            },

        getPlayerKnownVoids:
            function (playerIndex) {

                return defaultAI.getPlayerKnownVoids(
                    playerIndex
                );

            },

        getTrumpCardsPlayed:
            function () {

                return defaultAI.getTrumpCardsPlayed();

            },

        /* -----------------------------------------------------
           ANALYSIS
        ----------------------------------------------------- */

        estimateRemainingCards:
            function () {

                return defaultAI
                    .estimateRemainingCards();

            },

        estimatePlayerCards:
            function (playerIndex) {

                return defaultAI
                    .estimatePlayerCards(
                        playerIndex
                    );

            },

        estimateCardWinProbability:
            function (
                card,
                hand,
                trumpSuit,
                leadSuit
            ) {

                return defaultAI
                    .estimateCardWinProbability(
                        card,
                        hand,
                        trumpSuit,
                        leadSuit
                    );

            },

        getRoundAnalysis:
            function () {

                return defaultAI
                    .getRoundAnalysis();
