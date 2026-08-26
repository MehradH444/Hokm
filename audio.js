/* =========================================================
   HOKM ONLINE
   AUDIO ENGINE
   مرحله ۲۱
   فایل: audio.js

   مسئولیت‌های این فایل:
   ---------------------------------------------------------
   1. مدیریت صدای بازی
   2. مدیریت موسیقی پس‌زمینه
   3. مدیریت افکت‌های صوتی
   4. کنترل Volume
   5. Mute / Unmute
   6. ذخیره تنظیمات صدا
   7. پخش صدای کارت
   8. پخش صدای انتخاب حکم
   9. پخش صدای نوبت
   10. پخش صدای برد و باخت
   11. پخش صدای کلیک UI
   12. مدیریت AudioContext
   13. پشتیبانی از موبایل
   14. جلوگیری از پخش همزمان غیرضروری
   15. سیستم صف صدا
   16. مدیریت خطاهای صوتی
   17. API عمومی برای سایر فایل‌ها

   توجه:
   این فایل به صورت مستقل طراحی شده است.
   هیچ قابلیت اصلی بازی در این فایل قرار ندارد.
========================================================= */


/* =========================================================
   NAMESPACE
========================================================= */

window.HokmAudio = window.HokmAudio || {};


/* =========================================================
   CONSTANTS
========================================================= */

const AUDIO_STORAGE_KEY = "hokm_audio_settings";

const AUDIO_DEFAULTS = {
    soundEnabled: true,
    musicEnabled: true,

    masterVolume: 1,
    soundVolume: 0.85,
    musicVolume: 0.35,

    muted: false,

    initialized: false
};


/* =========================================================
   AUDIO STATE
========================================================= */

const audioState = {

    initialized: false,

    context: null,

    masterGain: null,

    soundGain: null,

    musicGain: null,

    musicSource: null,

    musicBuffer: null,

    musicPlaying: false,

    musicLoop: true,

    muted: false,

    soundEnabled: true,

    musicEnabled: true,

    masterVolume: 1,

    soundVolume: 0.85,

    musicVolume: 0.35,

    currentMusicId: null,

    lastSoundTimes: {},

    soundCooldowns: {},

    pendingSounds: [],

    processingQueue: false,

    userInteracted: false,

    destroyed: false

};


/* =========================================================
   DEFAULT SOUND COOLDOWNS
========================================================= */

audioState.soundCooldowns = {

    click: 60,

    hover: 40,

    card: 100,

    cardPlace: 120,

    cardSelect: 100,

    turn: 400,

    notification: 300,

    success: 250,

    error: 250,

    coin: 200,

    win: 1000,

    lose: 1000,

    trump: 500,

    countdown: 500,

    message: 250

};


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function audioClamp(value, min, max) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return min;
    }

    return Math.min(
        max,
        Math.max(min, number)
    );
}


/* =========================================================
   LOAD SETTINGS
========================================================= */

function loadAudioSettings() {

    try {

        const raw = localStorage.getItem(
            AUDIO_STORAGE_KEY
        );

        if (!raw) {
            return {
                ...AUDIO_DEFAULTS
            };
        }

        const parsed = JSON.parse(raw);

        return {
            ...AUDIO_DEFAULTS,
            ...parsed
        };

    } catch (error) {

        console.warn(
            "[HokmAudio] Failed to load settings:",
            error
        );

        return {
            ...AUDIO_DEFAULTS
        };
    }
}


/* =========================================================
   SAVE SETTINGS
========================================================= */

function saveAudioSettings() {

    try {

        const settings = {

            soundEnabled:
                audioState.soundEnabled,

            musicEnabled:
                audioState.musicEnabled,

            masterVolume:
                audioState.masterVolume,

            soundVolume:
                audioState.soundVolume,

            musicVolume:
                audioState.musicVolume,

            muted:
                audioState.muted
        };

        localStorage.setItem(
            AUDIO_STORAGE_KEY,
            JSON.stringify(settings)
        );

    } catch (error) {

        console.warn(
            "[HokmAudio] Failed to save settings:",
            error
        );
    }
}


/* =========================================================
   APPLY SETTINGS
========================================================= */

function applyAudioSettings(settings) {

    const data = {
        ...AUDIO_DEFAULTS,
        ...(settings || {})
    };

    audioState.soundEnabled =
        Boolean(data.soundEnabled);

    audioState.musicEnabled =
        Boolean(data.musicEnabled);

    audioState.masterVolume =
        audioClamp(
            data.masterVolume,
            0,
            1
        );

    audioState.soundVolume =
        audioClamp(
            data.soundVolume,
            0,
            1
        );

    audioState.musicVolume =
        audioClamp(
            data.musicVolume,
            0,
            1
        );

    audioState.muted =
        Boolean(data.muted);

    updateGainNodes();

    saveAudioSettings();
}


/* =========================================================
   CREATE AUDIO CONTEXT
========================================================= */

function createAudioContext() {

    if (audioState.context) {
        return audioState.context;
    }

    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextClass) {

        console.warn(
            "[HokmAudio] Web Audio API is not supported."
        );

        return null;
    }

    try {

        audioState.context =
            new AudioContextClass();

        return audioState.context;

    } catch (error) {

        console.error(
            "[HokmAudio] Could not create AudioContext:",
            error
        );

        return null;
    }
}


/* =========================================================
   CREATE GAIN NODES
========================================================= */

function createGainNodes() {

    const context =
        audioState.context;

    if (!context) {
        return false;
    }

    if (
        audioState.masterGain &&
        audioState.soundGain &&
        audioState.musicGain
    ) {
        return true;
    }

    try {

        audioState.masterGain =
            context.createGain();

        audioState.soundGain =
            context.createGain();

        audioState.musicGain =
            context.createGain();


        audioState.soundGain.connect(
            audioState.masterGain
        );

        audioState.musicGain.connect(
            audioState.masterGain
        );

        audioState.masterGain.connect(
            context.destination
        );


        updateGainNodes();

        return true;

    } catch (error) {

        console.error(
            "[HokmAudio] Failed to create gain nodes:",
            error
        );

        return false;
    }
}


/* =========================================================
   UPDATE GAIN NODES
========================================================= */

function updateGainNodes() {

    if (!audioState.context) {
        return;
    }

    const master =
        audioState.masterGain;

    const sound =
        audioState.soundGain;

    const music =
        audioState.musicGain;


    if (master) {

        master.gain.value =
            audioState.muted
                ? 0
                : audioState.masterVolume;
    }


    if (sound) {

        sound.gain.value =
            audioState.soundEnabled &&
            !audioState.muted
                ? audioState.soundVolume
                : 0;
    }


    if (music) {

        music.gain.value =
            audioState.musicEnabled &&
            !audioState.muted
                ? audioState.musicVolume
                : 0;
    }
}


/* =========================================================
   RESUME AUDIO CONTEXT
========================================================= */

async function resumeAudioContext() {

    const context =
        createAudioContext();

    if (!context) {
        return false;
    }

    try {

        if (context.state === "suspended") {

            await context.resume();
        }

        audioState.userInteracted = true;

        return true;

    } catch (error) {

        console.warn(
            "[HokmAudio] Could not resume AudioContext:",
            error
        );

        return false;
    }
}


/* =========================================================
   INITIALIZE AUDIO SYSTEM
========================================================= */

async function initializeAudio() {

    if (audioState.destroyed) {
        return false;
    }

    const settings =
        loadAudioSettings();

    applyAudioSettings(settings);

    const context =
        createAudioContext();

    if (!context) {

        audioState.initialized = true;

        return false;
    }

    const gains =
        createGainNodes();

    audioState.initialized =
        Boolean(gains);

    return audioState.initialized;
}


/* =========================================================
   USER INTERACTION UNLOCK
========================================================= */

async function unlockAudio() {

    audioState.userInteracted = true;

    return await resumeAudioContext();
}


/* =========================================================
   CHECK COOLDOWN
========================================================= */

function canPlaySound(soundId) {

    const now =
        Date.now();

    const lastTime =
        audioState.lastSoundTimes[soundId] || 0;

    const cooldown =
        audioState.soundCooldowns[soundId] || 0;

    if (
        now - lastTime <
        cooldown
    ) {
        return false;
    }

    audioState.lastSoundTimes[soundId] =
        now;

    return true;
}


/* =========================================================
   CREATE OSCILLATOR
========================================================= */

function createOscillator(

    frequency,
    type = "sine"

) {

    if (!audioState.context) {
        return null;
    }

    const oscillator =
        audioState.context.createOscillator();

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
        frequency,
        audioState.context.currentTime
    );

    return oscillator;
}


/* =========================================================
   CREATE ENVELOPE
========================================================= */

function applyEnvelope(

    gainNode,
    startTime,
    attack,
    decay,
    peak,
    endTime

) {

    if (!gainNode) {
        return;
    }

    const gain =
        gainNode.gain;

    gain.cancelScheduledValues(
        startTime
    );

    gain.setValueAtTime(
        0,
        startTime
    );

    gain.linearRampToValueAtTime(
        peak,
        startTime + attack
    );

    gain.exponentialRampToValueAtTime(
        Math.max(0.001, peak * 0.65),
        startTime + attack + decay
    );

    gain.exponentialRampToValueAtTime(
        0.001,
        endTime
    );
}


/* =========================================================
   PLAY TONE
========================================================= */

function playTone(options = {}) {

    if (!audioState.initialized) {
        return false;
    }

    if (
        !audioState.soundEnabled ||
        audioState.muted
    ) {
        return false;
    }

    if (!audioState.context) {
        return false;
    }

    const context =
        audioState.context;

    const frequency =
        Number(options.frequency || 440);

    const duration =
        Number(options.duration || 0.12);

    const type =
        options.type || "sine";

    const volume =
        audioClamp(
            options.volume ?? 0.5,
            0,
            1
        );

    const startDelay =
        Number(options.delay || 0);

    try {

        const oscillator =
            createOscillator(
                frequency,
                type
            );

        if (!oscillator) {
            return false;
        }

        const gain =
            context.createGain();

        const startTime =
            context.currentTime +
            startDelay;

        const endTime =
            startTime +
            duration;


        oscillator.connect(gain);

        gain.connect(
            audioState.soundGain
        );


        gain.gain.setValueAtTime(
            0,
            startTime
        );

        gain.gain.linearRampToValueAtTime(
            volume,
            startTime + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            endTime
        );


        oscillator.start(
            startTime
        );

        oscillator.stop(
            endTime + 0.02
        );


        oscillator.onended = () => {

            try {
                oscillator.disconnect();
                gain.disconnect();
            } catch (error) {
                // Ignore cleanup errors.
            }
        };


        return true;

    } catch (error) {

        console.warn(
            "[HokmAudio] Failed to play tone:",
            error
        );

        return false;
    }
}


/* =========================================================
   PLAY MULTI-TONE
========================================================= */

function playSequence(sequence = []) {

    if (!Array.isArray(sequence)) {
        return false;
    }

    sequence.forEach(
        (tone, index) => {

            playTone({
                ...tone,
                delay:
                    Number(tone.delay || 0) +
                    index * 0.01
            });

        }
    );

    return true;
}


/* =========================================================
   CLICK SOUND
========================================================= */

function playClick() {

    if (!canPlaySound("click")) {
        return false;
    }

    return playTone({

        frequency: 520,

        type: "sine",

        duration: 0.055,

        volume: 0.22
    });
}


/* =========================================================
   HOVER SOUND
========================================================= */

function playHover() {

    if (!canPlaySound("hover")) {
        return false;
    }

    return playTone({

        frequency: 720,

        type: "sine",

        duration: 0.035,

        volume: 0.10
    });
}


/* =========================================================
   CARD PICKUP SOUND
========================================================= */

function playCardPickup() {

    if (!canPlaySound("card")) {
        return false;
    }

    return playSequence([

        {
            frequency: 300,
            type: "triangle",
            duration: 0.055,
            volume: 0.18
        },

        {
            frequency: 430,
            type: "triangle",
            duration: 0.065,
            volume: 0.14,
            delay: 0.045
        }

    ]);
}


/* =========================================================
   CARD PLACE SOUND
========================================================= */

function playCardPlace() {

    if (!canPlaySound("cardPlace")) {
        return false;
    }

    return playSequence([

        {
            frequency: 180,
            type: "triangle",
            duration: 0.06,
            volume: 0.18
        },

        {
            frequency: 120,
            type: "sine",
            duration: 0.08,
            volume: 0.10,
            delay: 0.035
        }

    ]);
}


/* =========================================================
   CARD SELECT SOUND
========================================================= */

function playCardSelect() {

    if (!canPlaySound("cardSelect")) {
        return false;
    }

    return playTone({

        frequency: 620,

        type: "triangle",

        duration: 0.06,

        volume: 0.15
    });
}


/* =========================================================
   TURN SOUND
========================================================= */

function playTurn() {

    if (!canPlaySound("turn")) {
        return false;
    }

    return playSequence([

        {
            frequency: 440,
            type: "sine",
            duration: 0.10,
            volume: 0.20
        },

        {
            frequency: 660,
            type: "sine",
            duration: 0.13,
            volume: 0.18,
            delay: 0.09
        }

    ]);
}


/* =========================================================
   TRUMP SOUND
========================================================= */

function playTrump() {

    if (!canPlaySound("trump")) {
        return false;
    }

    return playSequence([

        {
            frequency: 330,
            type: "triangle",
            duration: 0.12,
            volume: 0.20
        },

        {
            frequency: 440,
            type: "triangle",
            duration: 0.12,
            volume: 0.22,
            delay: 0.10
        },

        {
            frequency: 660,
            type: "triangle",
            duration: 0.20,
            volume: 0.24,
            delay: 0.20
        }

    ]);
}


/* =========================================================
   SUCCESS SOUND
========================================================= */

function playSuccess() {

    if (!canPlaySound("success")) {
        return false;
    }

    return playSequence([

        {
            frequency: 523,
            type: "sine",
            duration: 0.10,
            volume: 0.18
        },

        {
            frequency: 659,
            type: "sine",
            duration: 0.10,
            volume: 0.20,
            delay: 0.08
        },

        {
            frequency: 784,
            type: "sine",
            duration: 0.16,
            volume: 0.22,
            delay: 0.16
        }

    ]);
}


/* =========================================================
   ERROR SOUND
========================================================= */

function playError() {

    if (!canPlaySound("error")) {
        return false;
    }

    return playSequence([

        {
            frequency: 220,
            type: "sawtooth",
            duration: 0.08,
            volume: 0.10
        },

        {
            frequency: 165,
            type: "sawtooth",
            duration: 0.12,
            volume: 0.08,
            delay: 0.07
        }

    ]);
}


/* =========================================================
   NOTIFICATION SOUND
========================================================= */

function playNotification() {

    if (!canPlaySound("notification")) {
        return false;
    }

    return playSequence([

        {
            frequency: 660,
            type: "sine",
            duration: 0.08,
            volume: 0.16
        },

        {
            frequency: 880,
            type: "sine",
            duration: 0.12,
            volume: 0.14,
            delay: 0.08
        }

    ]);
}


/* =========================================================
   COIN SOUND
========================================================= */

function playCoin() {

    if (!canPlaySound("coin")) {
        return false;
    }

    return playSequence([

        {
            frequency: 880,
            type: "sine",
            duration: 0.07,
            volume: 0.18
        },

        {
            frequency: 1174,
            type: "sine",
            duration: 0.10,
            volume: 0.16,
            delay: 0.07
        }

    ]);
}


/* =========================================================
   COUNTDOWN SOUND
========================================================= */

function playCountdown() {

    if (!canPlaySound("countdown")) {
        return false;
    }

    return playTone({

        frequency: 440,

        type: "sine",

        duration: 0.10,

        volume: 0.16
    });
}


/* =========================================================
   MESSAGE SOUND
========================================================= */

function playMessage() {

    if (!canPlaySound("message")) {
        return false;
    }

    return playTone({

        frequency: 580,

        type: "sine",

        duration: 0.08,

        volume: 0.13
    });
}


/* =========================================================
   WIN SOUND
========================================================= */

function playWin() {

    if (!canPlaySound("win")) {
        return false;
    }

    return playSequence([

        {
            frequency: 392,
            type: "sine",
            duration: 0.12,
            volume: 0.20
        },

        {
            frequency: 523,
            type: "sine",
            duration: 0.12,
            volume: 0.22,
            delay: 0.10
        },

        {
            frequency: 659,
            type: "sine",
            duration: 0.14,
            volume: 0.24,
            delay: 0.20
        },

        {
            frequency: 784,
            type: "sine",
            duration: 0.25,
            volume: 0.26,
            delay: 0.32
        }

    ]);
}


/* =========================================================
   LOSE SOUND
========================================================= */

function playLose() {

    if (!canPlaySound("lose")) {
        return false;
    }

    return playSequence([

        {
            frequency: 440,
            type: "sine",
            duration: 0.13,
            volume: 0.18
        },

        {
            frequency: 349,
            type: "sine",
            duration: 0.13,
            volume: 0.16,
            delay: 0.11
        },

        {
            frequency: 261,
            type: "sine",
            duration: 0.25,
            volume: 0.14,
            delay: 0.22
        }

    ]);
}


/* =========================================================
   BUTTON SOUND
========================================================= */

function playButton() {

    return playClick();
}


/* =========================================================
   MENU OPEN SOUND
========================================================= */

function playMenuOpen() {

    if (!canPlaySound("click")) {
        return false;
    }

    return playSequence([

        {
            frequency: 380,
            type: "sine",
            duration: 0.05,
            volume: 0.12
        },

        {
            frequency: 520,
            type: "sine",
            duration: 0.07,
            volume: 0.12,
            delay: 0.04
        }

    ]);
}


/* =========================================================
   MENU CLOSE SOUND
========================================================= */

function playMenuClose() {

    if (!canPlaySound("click")) {
        return false;
    }

    return playSequence([

        {
            frequency: 520,
            type: "sine",
            duration: 0.05,
            volume: 0.10
        },

        {
            frequency: 380,
            type: "sine",
            duration: 0.06,
            volume: 0.08,
            delay: 0.04
        }

    ]);
}


/* =========================================================
   TOGGLE SOUND
========================================================= */

function playToggle() {

    if (!canPlaySound("click")) {
        return false;
    }

    return playTone({

        frequency: 700,

        type: "square",

        duration: 0.035,

        volume: 0.08
    });
}


/* =========================================================
   CHAT SEND SOUND
========================================================= */

function playChatSend() {

    return playMessage();
}


/* =========================================================
   SET MASTER VOLUME
========================================================= */

function setMasterVolume(value) {

    audioState.masterVolume =
        audioClamp(
            value,
            0,
            1
        );

    updateGainNodes();

    saveAudioSettings();
}


/* =========================================================
   GET MASTER VOLUME
========================================================= */

function getMasterVolume() {

    return audioState.masterVolume;
}


/* =========================================================
   SET SOUND VOLUME
========================================================= */

function setSoundVolume(value) {

    audioState.soundVolume =
        audioClamp(
            value,
            0,
            1
        );

    updateGainNodes();

    saveAudioSettings();
}


/* =========================================================
   GET SOUND VOLUME
========================================================= */

function getSoundVolume() {

    return audioState.soundVolume;
}


/* =========================================================
   SET MUSIC VOLUME
========================================================= */

function setMusicVolume(value) {

    audioState.musicVolume =
        audioClamp(
            value,
            0,
            1
        );

    updateGainNodes();

    saveAudioSettings();
}


/* =========================================================
   GET MUSIC VOLUME
========================================================= */

function getMusicVolume() {

    return audioState.musicVolume;
}


/* =========================================================
   ENABLE SOUND
========================================================= */

function enableSound() {

    audioState.soundEnabled =
        true;

    updateGainNodes();

    saveAudioSettings();

    playToggle();
}


/* =========================================================
   DISABLE SOUND
========================================================= */

function disableSound() {

    audioState.soundEnabled =
        false;

    updateGainNodes();

    saveAudioSettings();
}


/* =========================================================
   TOGGLE SOUND
========================================================= */

function toggleSound() {

    audioState.soundEnabled =
        !audioState.soundEnabled;

    updateGainNodes();

    saveAudioSettings();

    if (audioState.soundEnabled) {
        playToggle();
    }

    return audioState.soundEnabled;
}


/* =========================================================
   ENABLE MUSIC
========================================================= */

function enableMusic() {

    audioState.musicEnabled =
        true;

    updateGainNodes();

    saveAudioSettings();

    if (audioState.currentMusicId) {
        resumeMusic();
    }
}


/* =========================================================
   DISABLE MUSIC
========================================================= */

function disableMusic() {

    audioState.musicEnabled =
        false;

    updateGainNodes();

    saveAudioSettings();

    pauseMusic();
}


/* =========================================================
   TOGGLE MUSIC
========================================================= */

function toggleMusic() {

    audioState.musicEnabled =
        !audioState.musicEnabled;

    updateGainNodes();

    saveAudioSettings();

    if (audioState.musicEnabled) {

        resumeMusic();

    } else {

        pauseMusic();
    }

    return audioState.musicEnabled;
}


/* =========================================================
   MUTE ALL AUDIO
========================================================= */

function mute() {

    audioState.muted =
        true;

    updateGainNodes();

    saveAudioSettings();
}


/* =========================================================
   UNMUTE ALL AUDIO
========================================================= */

function unmute() {

    audioState.muted =
        false;

    updateGainNodes();

    saveAudioSettings();
}


/* =========================================================
   TOGGLE MUTE
========================================================= */

function toggleMute() {

    audioState.muted =
        !audioState.muted;

    updateGainNodes();

    saveAudioSettings();

    return audioState.muted;
}


/* =========================================================
   GET AUDIO STATE
========================================================= */

function getAudioState() {

    return {

        initialized:
            audioState.initialized,

        soundEnabled:
            audioState.soundEnabled,

        musicEnabled:
            audioState.musicEnabled,

        masterVolume:
            audioState.masterVolume,

        soundVolume:
            audioState.soundVolume,

        musicVolume:
            audioState.musicVolume,

        muted:
            audioState.muted,

        musicPlaying:
            audioState.musicPlaying,

        currentMusicId:
            audioState.currentMusicId
    };
}


/* =========================================================
   MUSIC BUFFER LOADER
========================================================= */

async function loadMusic(url) {

    if (!audioState.context) {

        await initializeAudio();
    }

    if (!audioState.context) {
        return null;
    }

    try {

        const response =
            await fetch(url);

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const arrayBuffer =
            await response.arrayBuffer();

        const audioBuffer =
            await audioState.context.decodeAudioData(
                arrayBuffer
            );

        return audioBuffer;

    } catch (error) {

        console.warn(
            "[HokmAudio] Failed to load music:",
            error
        );

        return null;
    }
}


/* =========================================================
   SET MUSIC BUFFER
========================================================= */

function setMusicBuffer(

    buffer,
    musicId = null

) {

    if (!buffer) {
        return false;
    }

    audioState.musicBuffer =
        buffer;

    audioState.currentMusicId =
        musicId;

    return true;
}


/* =========================================================
   PLAY MUSIC BUFFER
========================================================= */

function playMusicBuffer(

    buffer = audioState.musicBuffer,

    options = {}

) {

    if (!buffer) {
        return false;
    }

    if (
        !audioState.musicEnabled ||
        audioState.muted
    ) {
        return false;
    }

    if (!audioState.context) {
        return false;
    }

    try {

        stopMusic();


        const source =
            audioState.context.createBufferSource();

        source.buffer =
            buffer;

        source.loop =
            options.loop !== undefined
                ? Boolean(options.loop)
                : true;


        source.connect(
            audioState.musicGain
        );


        source.start(0);


        audioState.musicSource =
            source;

        audioState.musicPlaying =
            true;

        audioState.musicLoop =
            source.loop;


        source.onended = () => {

            if (
                audioState.musicSource ===
                source
            ) {

                audioState.musicPlaying =
                    false;

                audioState.musicSource =
                    null;
            }
        };


        return true;

    } catch (error) {

        console.warn(
            "[HokmAudio] Failed to play music:",
            error
        );

        return false;
    }
}


/* =========================================================
   STOP MUSIC
========================================================= */

function stopMusic() {

    if (!audioState.musicSource) {

        audioState.musicPlaying =
            false;

        return;
    }

    try {

        audioState.musicSource.stop();

    } catch (error) {

        // Source may already have stopped.
    }

    try {

        audioState.musicSource.disconnect();

    } catch (error) {

        // Ignore cleanup error.
    }


    audioState.musicSource =
        null;

    audioState.musicPlaying =
        false;
}


/* =========================================================
   PAUSE MUSIC
========================================================= */

function pauseMusic() {

    if (
        !audioState.context ||
        !audioState.musicPlaying
    ) {
        return false;
    }

    try {

        audioState.context.suspend();

        return true;

    } catch (error) {

        console.warn(
            "[HokmAudio] Could not pause music:",
            error
        );

        return false;
    }
}


/* =========================================================
   RESUME MUSIC
========================================================= */

async function resumeMusic() {

    if (!audioState.context) {
        return false;
    }

    if (!audioState.musicEnabled) {
        return false;
    }

    try {

        await audioState.context.resume();

        return true;

    } catch (error) {

        console.warn(
            "[HokmAudio] Could not resume music:",
            error
        );

        return false;
    }
}


/* =========================================================
   LOAD AND PLAY MUSIC
========================================================= */

async function loadAndPlayMusic(

    url,

    musicId = null,

    options = {}

) {

    if (!audioState.musicEnabled) {
        return false;
    }

    await resumeAudioContext();

    const buffer =
        await loadMusic(url);

    if (!buffer) {
        return false;
    }

    setMusicBuffer(
        buffer,
        musicId
    );

    return playMusicBuffer(
        buffer,
        options
    );
}


/* =========================================================
   CHANGE MUSIC
========================================================= */

async function changeMusic(

    url,

    musicId = null,

    options = {}

) {

    stopMusic();

    audioState.currentMusicId =
        musicId;

    return await loadAndPlayMusic(
        url,
        musicId,
        options
    );
}


/* =========================================================
   SIMPLE GAME SOUND API
========================================================= */

const gameSounds = {

    click: playClick,

    hover: playHover,

    button: playButton,

    card: playCardPickup,

    cardPickup: playCardPickup,

    cardPlace: playCardPlace,

    cardSelect: playCardSelect,

    turn: playTurn,

    trump: playTrump,

    success: playSuccess,

    error: playError,

    notification: playNotification,

    coin: playCoin,

    countdown: playCountdown,

    message: playMessage,

    chat: playChatSend,

    menuOpen: playMenuOpen,

    menuClose: playMenuClose,

    toggle: playToggle,

    win: playWin,

    lose: playLose
};


/* =========================================================
   PLAY NAMED SOUND
========================================================= */

function playSound(

    soundName

) {

    if (!soundName) {
        return false;
    }

    const sound =
        gameSounds[soundName];

    if (typeof sound !== "function") {

        console.warn(
            `[HokmAudio] Unknown sound: ${soundName}`
        );

        return false;
    }

    try {

        return sound();

    } catch (error) {

        console.warn(
            `[HokmAudio] Sound error: ${soundName}`,
            error
        );

        return false;
    }
}


/* =========================================================
   AUTOMATIC UI SOUND LISTENER
========================================================= */

function installUIAudioListeners() {

    document.addEventListener(
        "click",
        handleDocumentClick,
        true
    );

    document.addEventListener(
        "pointerover",
        handlePointerOver,
        true
    );
}


/* =========================================================
   HANDLE DOCUMENT CLICK
========================================================= */

function handleDocumentClick(event) {

    const target =
        event.target.closest(
            "button"
        );

    if (!target) {
        return;
    }

    if (
        target.dataset.audioDisabled ===
        "true"
    ) {
        return;
    }

    if (
        target.classList.contains(
            "danger-button"
        )
    ) {

        playError();

        return;
    }

    if (
        target.dataset.sound
    ) {

        playSound(
            target.dataset.sound
        );

        return;
    }

    playClick();
}


/* =========================================================
   HANDLE POINTER OVER
========================================================= */

function handlePointerOver(event) {

    const target =
        event.target.closest(
            "button"
        );

    if (!target) {
        return;
    }

    if (
        target.dataset.audioHover !==
        "true"
    ) {
        return;
    }

    playHover();
}


/* =========================================================
   MOBILE VISIBILITY HANDLING
========================================================= */

function installVisibilityListeners() {

    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

    window.addEventListener(
        "blur",
        handleWindowBlur
    );

    window.addEventListener(
        "focus",
        handleWindowFocus
    );
}


/* =========================================================
   VISIBILITY CHANGE
========================================================= */

function handleVisibilityChange() {

    if (
        document.hidden
    ) {

        pauseMusic();

    } else {

        resumeMusic();
    }
}


/* =========================================================
   WINDOW BLUR
========================================================= */

function handleWindowBlur() {

    if (audioState.musicPlaying) {
        pauseMusic();
    }
}


/* =========================================================
   WINDOW FOCUS
========================================================= */

function handleWindowFocus() {

    if (
        audioState.musicPlaying &&
        audioState.musicEnabled
    ) {

        resumeMusic();
    }
}


/* =========================================================
   TOUCH UNLOCK
========================================================= */

function installTouchUnlock() {

    const unlockEvents = [

        "touchstart",

        "touchend",

        "mousedown",

        "keydown"
    ];


    const unlock = async () => {

        await unlockAudio();

        unlockEvents.forEach(
            eventName => {

                document.removeEventListener(
                    eventName,
                    unlock,
                    true
                );

            }
        );
    };


    unlockEvents.forEach(
        eventName => {

            document.addEventListener(
                eventName,
                unlock,
                true
            );

        }
    );
}


/* =========================================================
   AUDIO INITIALIZATION ON DOM READY
========================================================= */

function setupAudioSystem() {

    const settings =
        loadAudioSettings();

    applyAudioSettings(
        settings
    );

    installUIAudioListeners();

    installVisibilityListeners();

    installTouchUnlock();

    initializeAudio();
}


/* =========================================================
   DESTROY AUDIO SYSTEM
========================================================= */

function destroyAudio() {

    audioState.destroyed =
        true;

    stopMusic();


    if (audioState.context) {

        try {

            audioState.context.close();

        } catch (error) {

            // Ignore close errors.
        }
    }


    audioState.context =
        null;

    audioState.masterGain =
        null;

    audioState.soundGain =
        null;

    audioState.musicGain =
        null;

    audioState.initialized =
        false;
}


/* =========================================================
   RESET AUDIO SETTINGS
========================================================= */

function resetAudioSettings() {

    applyAudioSettings(
        AUDIO_DEFAULTS
    );
}


/* =========================================================
   EXPORT PUBLIC API
========================================================= */

window.HokmAudio = {

    /* Initialization */

    initialize:
        initializeAudio,

    setup:
        setupAudioSystem,

    unlock:
        unlockAudio,

    destroy:
        destroyAudio,


    /* Settings */

    getState:
        getAudioState,

    saveSettings:
        saveAudioSettings,

    loadSettings:
        loadAudioSettings,

    resetSettings:
        resetAudioSettings,


    /* Master */

    setMasterVolume:
        setMasterVolume,

    getMasterVolume:
        getMasterVolume,


    /* Sound */

    setSoundVolume:
        setSoundVolume,

    getSoundVolume:
        getSoundVolume,

    enableSound:
        enableSound,

    disableSound:
        disableSound,

    toggleSound:
        toggleSound,


    /* Music */

    setMusicVolume:
        setMusicVolume,

    getMusicVolume:
        getMusicVolume,

    enableMusic:
        enableMusic,

    disableMusic:
        disableMusic,

    toggleMusic:
        toggleMusic,


    /* Mute */

    mute:
        mute,

    unmute:
        unmute,

    toggleMute:
        toggleMute,


    /* Basic sounds */

    playSound:
        playSound,

    playTone:
        playTone,

    playSequence:
        playSequence,

    playClick:
        playClick,

    playHover:
        playHover,

    playButton:
        playButton,


    /* Card sounds */

    playCard:
        playCardPickup,

    playCardPickup:
        playCardPickup,

    playCardPlace:
        playCardPlace,

    playCardSelect:
        playCardSelect,


    /* Game sounds */

    playTurn:
        playTurn,

    playTrump:
        playTrump,

    playSuccess:
        playSuccess,

    playError:
        playError,

    playNotification:
        playNotification,

    playCoin:
        playCoin,

    playCountdown:
        playCountdown,

    playMessage:
        playMessage,

    playChat:
        playChatSend,

    playMenuOpen:
        playMenuOpen,

    playMenuClose:
        playMenuClose,

    playToggle:
        playToggle,

    playWin:
        playWin,

    playLose:
        playLose,


    /* Music */

    loadMusic:
        loadMusic,

    setMusicBuffer:
        setMusicBuffer,

    playMusic:
        playMusicBuffer,

    loadAndPlayMusic:
        loadAndPlayMusic,

    changeMusic:
        changeMusic,

    pauseMusic:
        pauseMusic,

    resumeMusic:
        resumeMusic,

    stopMusic:
        stopMusic
};


/* =========================================================
   GLOBAL SHORTCUT
========================================================= */

window.playGameSound = function(soundName) {

    return window.HokmAudio.playSound(
        soundName
    );
};


/* =========================================================
   AUTO SETUP
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        setupAudioSystem,
        {
            once: true
        }
    );

} else {

    setupAudioSystem();
}


/* =========================================================
   DEBUG HELPERS
========================================================= */

window.HokmAudioDebug = {

    state: function() {

        return getAudioState();
    },

    testClick: function() {

        return playClick();
    },

    testCard: function() {

        return playCardPlace();
    },

    testTurn: function() {

        return playTurn();
    },

    testTrump: function() {

        return playTrump();
    },

    testWin: function() {

        return playWin();
    },

    testLose: function() {

        return playLose();
    },

    testSuccess: function() {

        return playSuccess();
    },

    testError: function() {

        return playError();
    }
};


/* =========================================================
   END OF audio.js
========================================================= */
