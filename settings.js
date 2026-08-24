/* ============================================================
   HOKM ONLINE
   SETTINGS SYSTEM
   File: settings.js
   Stage: 14

   مسئولیت‌های این فایل:

   1. مدیریت تنظیمات بازی
   2. مدیریت صدا
   3. مدیریت موسیقی
   4. مدیریت لرزش
   5. مدیریت حالت تاریک
   6. ذخیره دائمی تنظیمات
   7. بارگذاری تنظیمات هنگام اجرای بازی
   8. مدیریت تغییر رمز عبور
   9. مدیریت خروج از حساب
   10. انتشار Event برای سایر فایل‌های پروژه
   11. هماهنگی با UI موجود در index.html
   12. جلوگیری از خراب شدن تنظیمات در صورت خطا
   13. پشتیبانی از تنظیمات بازی در آینده
   14. آماده‌سازی برای اتصال به Backend در مراحل بعد
   15. API عمومی برای سایر فایل‌های پروژه

   نکته:
   این فایل مستقل طراحی شده و نباید جایگزین game.js،
   multiplayer.js، wallet.js یا فایل‌های دیگر شود.
============================================================ */


/* ============================================================
   GLOBAL NAMESPACE
============================================================ */

window.HokmSettings = window.HokmSettings || {};


/* ============================================================
   SETTINGS MANAGER
============================================================ */

(function () {

    "use strict";


    /* ========================================================
       CONSTANTS
    ======================================================== */

    const STORAGE_KEY = "hokm_settings";

    const SETTINGS_VERSION = 1;


    /* ========================================================
       DEFAULT SETTINGS
    ======================================================== */

    const DEFAULT_SETTINGS = {

        version: SETTINGS_VERSION,

        sound: true,

        music: true,

        vibration: true,

        darkMode: true,

        animations: true,

        notifications: true,

        autoSortCards: false,

        showHints: true,

        confirmExitGame: true,

        confirmPurchases: true,

        reducedMotion: false,

        language: "fa",

        cardAnimationSpeed: "normal",

        gameTableTheme: "classic",

        cardStyle: "classic",

        soundVolume: 1,

        musicVolume: 0.6

    };


    /* ========================================================
       INTERNAL STATE
    ======================================================== */

    let settings = {};

    let initialized = false;


    /* ========================================================
       SAFE STORAGE HELPERS
    ======================================================== */

    function readStorage() {

        try {

            const raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return null;
            }

            return JSON.parse(raw);

        } catch (error) {

            console.warn(
                "[HokmSettings] Could not read settings:",
                error
            );

            return null;
        }
    }


    function writeStorage(data) {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );

            return true;

        } catch (error) {

            console.warn(
                "[HokmSettings] Could not save settings:",
                error
            );

            return false;
        }
    }


    /* ========================================================
       DEEP / SAFE COPY
    ======================================================== */

    function cloneSettings(source) {

        try {

            return JSON.parse(
                JSON.stringify(source)
            );

        } catch (error) {

            return {
                ...DEFAULT_SETTINGS
            };
        }
    }


    /* ========================================================
       VALIDATION
    ======================================================== */

    function validateBoolean(value, fallback) {

        if (typeof value === "boolean") {
            return value;
        }

        return fallback;
    }


    function validateNumber(
        value,
        fallback,
        min,
        max
    ) {

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return fallback;
        }

        return Math.min(
            max,
            Math.max(min, number)
        );
    }


    function validateString(
        value,
        fallback,
        allowedValues
    ) {

        if (
            typeof value === "string" &&
            allowedValues.includes(value)
        ) {

            return value;
        }

        return fallback;
    }


    /* ========================================================
       NORMALIZE SETTINGS
    ======================================================== */

    function normalizeSettings(input) {

        const source =
            input && typeof input === "object"
                ? input
                : {};


        return {

            version: SETTINGS_VERSION,

            sound: validateBoolean(
                source.sound,
                DEFAULT_SETTINGS.sound
            ),

            music: validateBoolean(
                source.music,
                DEFAULT_SETTINGS.music
            ),

            vibration: validateBoolean(
                source.vibration,
                DEFAULT_SETTINGS.vibration
            ),

            darkMode: validateBoolean(
                source.darkMode,
                DEFAULT_SETTINGS.darkMode
            ),

            animations: validateBoolean(
                source.animations,
                DEFAULT_SETTINGS.animations
            ),

            notifications: validateBoolean(
                source.notifications,
                DEFAULT_SETTINGS.notifications
            ),

            autoSortCards: validateBoolean(
                source.autoSortCards,
                DEFAULT_SETTINGS.autoSortCards
            ),

            showHints: validateBoolean(
                source.showHints,
                DEFAULT_SETTINGS.showHints
            ),

            confirmExitGame: validateBoolean(
                source.confirmExitGame,
                DEFAULT_SETTINGS.confirmExitGame
            ),

            confirmPurchases: validateBoolean(
                source.confirmPurchases,
                DEFAULT_SETTINGS.confirmPurchases
            ),

            reducedMotion: validateBoolean(
                source.reducedMotion,
                DEFAULT_SETTINGS.reducedMotion
            ),

            language: validateString(
                source.language,
                DEFAULT_SETTINGS.language,
                [
                    "fa",
                    "en"
                ]
            ),

            cardAnimationSpeed: validateString(
                source.cardAnimationSpeed,
                DEFAULT_SETTINGS.cardAnimationSpeed,
                [
                    "slow",
                    "normal",
                    "fast"
                ]
            ),

            gameTableTheme: validateString(
                source.gameTableTheme,
                DEFAULT_SETTINGS.gameTableTheme,
                [
                    "classic",
                    "green",
                    "blue",
                    "dark",
                    "red"
                ]
            ),

            cardStyle: validateString(
                source.cardStyle,
                DEFAULT_SETTINGS.cardStyle,
                [
                    "classic",
                    "modern",
                    "minimal"
                ]
            ),

            soundVolume: validateNumber(
                source.soundVolume,
                DEFAULT_SETTINGS.soundVolume,
                0,
                1
            ),

            musicVolume: validateNumber(
                source.musicVolume,
                DEFAULT_SETTINGS.musicVolume,
                0,
                1
            )

        };
    }


    /* ========================================================
       INITIALIZE
    ======================================================== */

    function initialize() {

        if (initialized) {
            return getAll();
        }


        const savedSettings = readStorage();


        if (savedSettings) {

            settings = normalizeSettings(
                savedSettings
            );

        } else {

            settings = cloneSettings(
                DEFAULT_SETTINGS
            );

            save();
        }


        initialized = true;


        applyAll();


        updateUI();


        dispatchSettingsEvent(
            "settings:initialized"
        );


        return getAll();
    }


    /* ========================================================
       SAVE
    ======================================================== */

    function save() {

        const normalized = normalizeSettings(
            settings
        );

        settings = normalized;

        return writeStorage(
            settings
        );
    }


    /* ========================================================
       GET ALL SETTINGS
    ======================================================== */

    function getAll() {

        return cloneSettings(
            settings
        );
    }


    /* ========================================================
       GET ONE SETTING
    ======================================================== */

    function get(key) {

        if (
            !Object.prototype.hasOwnProperty.call(
                DEFAULT_SETTINGS,
                key
            )
        ) {

            return undefined;
        }

        return settings[key];
    }


    /* ========================================================
       SET ONE SETTING
    ======================================================== */

    function set(key, value) {

        if (
            !Object.prototype.hasOwnProperty.call(
                DEFAULT_SETTINGS,
                key
            )
        ) {

            console.warn(
                "[HokmSettings] Unknown setting:",
                key
            );

            return false;
        }


        const previousValue = settings[key];


        settings[key] = value;


        settings = normalizeSettings(
            settings
        );


        const success = save();


        if (!success) {

            settings[key] = previousValue;

            return false;
        }


        applySetting(
            key,
            settings[key]
        );


        updateUI();


        dispatchSettingsEvent(
            "settings:changed",
            {
                key: key,
                value: settings[key],
                previousValue: previousValue,
                settings: getAll()
            }
        );


        return true;
    }


    /* ========================================================
       SET MULTIPLE SETTINGS
    ======================================================== */

    function setMultiple(values) {

        if (
            !values ||
            typeof values !== "object"
        ) {

            return false;
        }


        const previousSettings = getAll();


        Object.keys(values).forEach(
            function (key) {

                if (
                    Object.prototype.hasOwnProperty.call(
                        DEFAULT_SETTINGS,
                        key
                    )
                ) {

                    settings[key] = values[key];
                }

            }
        );


        settings = normalizeSettings(
            settings
        );


        const success = save();


        if (!success) {

            settings = previousSettings;

            return false;
        }


        applyAll();


        updateUI();


        dispatchSettingsEvent(
            "settings:changed",
            {
                type: "multiple",
                previousSettings: previousSettings,
                settings: getAll()
            }
        );


        return true;
    }


    /* ========================================================
       RESET ALL SETTINGS
    ======================================================== */

    function reset() {

        const previousSettings = getAll();


        settings = cloneSettings(
            DEFAULT_SETTINGS
        );


        const success = save();


        if (!success) {

            settings = previousSettings;

            return false;
        }


        applyAll();


        updateUI();


        dispatchSettingsEvent(
            "settings:reset",
            {
                previousSettings: previousSettings,
                settings: getAll()
            }
        );


        return true;
    }


    /* ========================================================
       APPLY ALL SETTINGS
    ======================================================== */

    function applyAll() {

        Object.keys(settings).forEach(
            function (key) {

                applySetting(
                    key,
                    settings[key]
                );

            }
        );


        applyDarkMode();

        applyAccessibilitySettings();

        applyGameVisualSettings();

        applyAudioSettings();
    }


    /* ========================================================
       APPLY SINGLE SETTING
    ======================================================== */

    function applySetting(
        key,
        value
    ) {

        switch (key) {

            case "sound":

            case "soundVolume":

                applyAudioSettings();

                break;


            case "music":

            case "musicVolume":

                applyAudioSettings();

                break;


            case "vibration":

                applyVibrationSetting();

                break;


            case "darkMode":

                applyDarkMode();

                break;


            case "animations":

                applyAnimationSetting();

                break;


            case "reducedMotion":

                applyAccessibilitySettings();

                break;


            case "gameTableTheme":

            case "cardStyle":

            case "cardAnimationSpeed":

                applyGameVisualSettings();

                break;


            default:

                break;
        }
    }


    /* ========================================================
       DARK MODE
    ======================================================== */

    function applyDarkMode() {

        const body =
            document.body;

        const app =
            document.getElementById("app");


        if (settings.darkMode) {

            document.documentElement
                .classList.add("dark-mode");

            body.classList.add(
                "dark-mode"
            );


            if (app) {

                app.classList.add(
                    "dark-mode"
                );
            }

        } else {

            document.documentElement
                .classList.remove("dark-mode");

            body.classList.remove(
                "dark-mode"
            );


            if (app) {

                app.classList.remove(
                    "dark-mode"
                );
            }
        }


        try {

            localStorage.setItem(
                "hokm_theme",
                settings.darkMode
                    ? "dark"
                    : "light"
            );

        } catch (error) {

            console.warn(
                "[HokmSettings] Theme storage error:",
                error
            );
        }


        dispatchSettingsEvent(
            "settings:themeChanged",
            {
                darkMode: settings.darkMode
            }
        );
    }


    /* ========================================================
       ANIMATION SETTING
    ======================================================== */

    function applyAnimationSetting() {

        const html =
            document.documentElement;


        if (settings.animations) {

            html.classList.remove(
                "reduce-animations"
            );

        } else {

            html.classList.add(
                "reduce-animations"
            );
        }


        if (settings.reducedMotion) {

            html.classList.add(
                "reduce-motion"
            );

        } else {

            html.classList.remove(
                "reduce-motion"
            );
        }
    }


    /* ========================================================
       ACCESSIBILITY
    ======================================================== */

    function applyAccessibilitySettings() {

        const html =
            document.documentElement;


        if (
            settings.reducedMotion ||
            !settings.animations
        ) {

            html.classList.add(
                "reduce-motion"
            );

        } else {

            html.classList.remove(
                "reduce-motion"
            );
        }
    }


    /* ========================================================
       GAME VISUAL SETTINGS
    ======================================================== */

    function applyGameVisualSettings() {

        const html =
            document.documentElement;


        html.dataset.tableTheme =
            settings.gameTableTheme;


        html.dataset.cardStyle =
            settings.cardStyle;


        html.dataset.cardAnimationSpeed =
            settings.cardAnimationSpeed;


        const app =
            document.getElementById("app");


        if (app) {

            app.dataset.tableTheme =
                settings.gameTableTheme;

            app.dataset.cardStyle =
                settings.cardStyle;

            app.dataset.cardAnimationSpeed =
                settings.cardAnimationSpeed;
        }


        dispatchSettingsEvent(
            "settings:visualChanged",
            {
                gameTableTheme:
                    settings.gameTableTheme,

                cardStyle:
                    settings.cardStyle,

                cardAnimationSpeed:
                    settings.cardAnimationSpeed
            }
        );
    }


    /* ========================================================
       AUDIO SETTINGS
    ======================================================== */

    function applyAudioSettings() {

        const audioElements =
            document.querySelectorAll(
                "audio"
            );


        audioElements.forEach(
            function (audio) {

                try {

                    const isMusic =
                        audio.dataset.type === "music" ||
                        audio.classList.contains(
                            "music-audio"
                        );


                    if (isMusic) {

                        audio.muted =
                            !settings.music;

                        audio.volume =
                            settings.music
                                ? settings.musicVolume
                                : 0;

                    } else {

                        audio.muted =
                            !settings.sound;

                        audio.volume =
                            settings.sound
                                ? settings.soundVolume
                                : 0;
                    }

                } catch (error) {

                    console.warn(
                        "[HokmSettings] Audio error:",
                        error
                    );
                }

            }
        );


        dispatchSettingsEvent(
            "settings:audioChanged",
            {
                sound:
                    settings.sound,

                music:
                    settings.music,

                soundVolume:
                    settings.soundVolume,

                musicVolume:
                    settings.musicVolume
            }
        );
    }


    /* ========================================================
       VIBRATION
    ======================================================== */

    function applyVibrationSetting() {

        document.documentElement.dataset.vibration =
            settings.vibration
                ? "enabled"
                : "disabled";
    }


    /* ========================================================
       VIBRATE
    ======================================================== */

    function vibrate(
        pattern
    ) {

        if (!settings.vibration) {
            return false;
        }


        if (
            typeof navigator === "undefined" ||
            typeof navigator.vibrate !== "function"
        ) {

            return false;
        }


        try {

            if (
                pattern === undefined
            ) {

                pattern = 30;
            }


            navigator.vibrate(
                pattern
            );

            return true;

        } catch (error) {

            console.warn(
                "[HokmSettings] Vibration failed:",
                error
            );

            return false;
        }
    }


    /* ========================================================
       PLAY SOUND HELPER
    ======================================================== */

    function playSound(
        source,
        options
    ) {

        if (!settings.sound) {
            return null;
        }


        if (!source) {
            return null;
        }


        options =
            options || {};


        try {

            const audio =
                new Audio(source);


            audio.volume =
                Math.min(
                    1,
                    Math.max(
                        0,
                        settings.soundVolume *
                        (
                            typeof options.volume === "number"
                                ? options.volume
                                : 1
                        )
                    )
                );


            audio.muted =
                !settings.sound;


            const promise =
                audio.play();


            if (
                promise &&
                typeof promise.catch === "function"
            ) {

                promise.catch(
                    function () {

                        /*
                           مرورگر ممکن است پخش صدا را
                           بدون تعامل کاربر مسدود کند.
                        */

                    }
                );
            }


            return audio;

        } catch (error) {

            console.warn(
                "[HokmSettings] Could not play sound:",
                error
            );

            return null;
        }
    }


    /* ========================================================
       TOGGLE SOUND
    ======================================================== */

    function toggleSound() {

        return set(
            "sound",
            !settings.sound
        );
    }


    /* ========================================================
       TOGGLE MUSIC
    ======================================================== */

    function toggleMusic() {

        return set(
            "music",
            !settings.music
        );
    }


    /* ========================================================
       TOGGLE VIBRATION
    ======================================================== */

    function toggleVibration() {

        const newValue =
            !settings.vibration;


        const result =
            set(
                "vibration",
                newValue
            );


        if (
            result &&
            newValue
        ) {

            vibrate(
                [20, 30, 20]
            );
        }


        return result;
    }


    /* ========================================================
       TOGGLE DARK MODE
    ======================================================== */

    function toggleDarkMode() {

        return set(
            "darkMode",
            !settings.darkMode
        );
    }


    /* ========================================================
       TOGGLE ANIMATIONS
    ======================================================== */

    function toggleAnimations() {

        return set(
            "animations",
            !settings.animations
        );
    }


    /* ========================================================
       TOGGLE NOTIFICATIONS
    ======================================================== */

    function toggleNotifications() {

        return set(
            "notifications",
            !settings.notifications
        );
    }


    /* ========================================================
       TOGGLE AUTO SORT
    ======================================================== */

    function toggleAutoSort() {

        return set(
            "autoSortCards",
            !settings.autoSortCards
        );
    }


    /* ========================================================
       TOGGLE HINTS
    ======================================================== */

    function toggleHints() {

        return set(
            "showHints",
            !settings.showHints
        );
    }


    /* ========================================================
       UI UPDATE
    ======================================================== */

    function updateUI() {

        updateCheckbox(
            "sound-setting",
            settings.sound
        );


        updateCheckbox(
            "music-setting",
            settings.music
        );


        updateCheckbox(
            "vibration-setting",
            settings.vibration
        );


        updateCheckbox(
            "dark-mode-setting",
            settings.darkMode
        );


        updateOptionalCheckbox(
            "animations-setting",
            settings.animations
        );


        updateOptionalCheckbox(
            "notifications-setting",
            settings.notifications
        );


        updateOptionalCheckbox(
            "auto-sort-setting",
            settings.autoSortCards
        );


        updateOptionalCheckbox(
            "hints-setting",
            settings.showHints
        );
    }


    /* ========================================================
       UPDATE CHECKBOX
    ======================================================== */

    function updateCheckbox(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (!element) {
            return;
        }


        element.checked =
            Boolean(value);
    }


    /* ========================================================
       OPTIONAL CHECKBOX
    ======================================================== */

    function updateOptionalCheckbox(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (!element) {
            return;
        }


        element.checked =
            Boolean(value);
    }


    /* ========================================================
       BIND EXISTING SETTINGS UI
    ======================================================== */

    function bindUI() {

        const soundSetting =
            document.getElementById(
                "sound-setting"
            );


        if (soundSetting) {

            soundSetting.addEventListener(
                "change",
                function () {

                    set(
                        "sound",
                        soundSetting.checked
                    );

                }
            );
        }


        const musicSetting =
            document.getElementById(
                "music-setting"
            );


        if (musicSetting) {

            musicSetting.addEventListener(
                "change",
                function () {

                    set(
                        "music",
                        musicSetting.checked
                    );

                }
            );
        }


        const vibrationSetting =
            document.getElementById(
                "vibration-setting"
            );


        if (vibrationSetting) {

            vibrationSetting.addEventListener(
                "change",
                function () {

                    set(
                        "vibration",
                        vibrationSetting.checked
                    );


                    if (
                        vibrationSetting.checked
                    ) {

                        vibrate(
                            [20, 30, 20]
                        );
                    }

                }
            );
        }


        const darkModeSetting =
            document.getElementById(
                "dark-mode-setting"
            );


        if (darkModeSetting) {

            darkModeSetting.addEventListener(
                "change",
                function () {

                    set(
                        "darkMode",
                        darkModeSetting.checked
                    );

                }
            );
        }


        const animationsSetting =
            document.getElementById(
                "animations-setting"
            );


        if (animationsSetting) {

            animationsSetting.addEventListener(
                "change",
                function () {

                    set(
                        "animations",
                        animationsSetting.checked
                    );

                }
            );
        }


        const notificationsSetting =
            document.getElementById(
                "notifications-setting"
            );


        if (notificationsSetting) {

            notificationsSetting.addEventListener(
                "change",
                function () {

                    set(
                        "notifications",
                        notificationsSetting.checked
                    );

                }
            );
        }


        const autoSortSetting =
            document.getElementById(
                "auto-sort-setting"
            );


        if (autoSortSetting) {

            autoSortSetting.addEventListener(
                "change",
                function () {

                    set(
                        "autoSortCards",
                        autoSortSetting.checked
                    );

                }
            );
        }


        const hintsSetting =
            document.getElementById(
                "hints-setting"
            );


        if (hintsSetting) {

            hintsSetting.addEventListener(
                "change",
                function () {

                    set(
                        "showHints",
                        hintsSetting.checked
                    );

                }
            );
        }
    }


    /* ========================================================
       CHANGE PASSWORD
    ======================================================== */

    function openChangePassword() {

        const existingModal =
            document.getElementById(
                "change-password-modal"
            );


        if (existingModal) {

            existingModal.classList.remove(
                "hidden"
            );

            return;
        }


        createChangePasswordModal();
    }


    /* ========================================================
       CREATE CHANGE PASSWORD MODAL
    ======================================================== */

    function createChangePasswordModal() {

        const overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "change-password-modal";


        overlay.className =
            "modal-overlay";


        overlay.setAttribute(
            "role",
            "dialog"
        );


        overlay.setAttribute(
            "aria-modal",
            "true"
        );


        overlay.innerHTML = `

            <div class="modal change-password-modal">

                <button
                    type="button"
                    class="modal-close"
                    id="change-password-close"
                    aria-label="بستن"
                >
                    ×
                </button>

                <div class="modal-icon">
                    🔐
                </div>

                <h2>
                    تغییر رمز عبور
                </h2>

                <p>
                    رمز عبور جدید خود را وارد کنید.
                </p>


                <form
                    id="change-password-form"
                    class="auth-form"
                    novalidate
                >

                    <div class="form-group">

                        <label for="current-password-input">
                            رمز عبور فعلی
                        </label>

                        <input
                            id="current-password-input"
                            type="password"
                            autocomplete="current-password"
                            maxlength="100"
                            required
                        >

                        <span
                            id="current-password-error"
                            class="form-error"
                        ></span>

                    </div>


                    <div class="form-group">

                        <label for="new-password-input">
                            رمز عبور جدید
                        </label>

                        <input
                            id="new-password-input"
                            type="password"
                            autocomplete="new-password"
                            maxlength="100"
                            required
                        >

                        <span
                            id="new-password-error"
                            class="form-error"
                        ></span>

                    </div>


                    <div class="form-group">

                        <label for="confirm-new-password-input">
                            تکرار رمز عبور جدید
                        </label>

                        <input
                            id="confirm-new-password-input"
                            type="password"
                            autocomplete="new-password"
                            maxlength="100"
                            required
                        >

                        <span
                            id="confirm-new-password-error"
                            class="form-error"
                        ></span>

                    </div>


                    <button
                        type="submit"
                        class="primary-button full-width"
                    >
                        تغییر رمز عبور
                    </button>

                </form>

            </div>
        `;


        document.body.appendChild(
            overlay
        );


        bindChangePasswordModal(
            overlay
        );


        requestAnimationFrame(
            function () {

                overlay.classList.add(
                    "visible"
                );

            }
        );
    }


    /* ========================================================
       BIND CHANGE PASSWORD MODAL
    ======================================================== */

    function bindChangePasswordModal(
        overlay
    ) {

        const closeButton =
            overlay.querySelector(
                "#change-password-close"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                function () {

                    closeModal(
                        overlay
                    );

                }
            );
        }


        overlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === overlay
                ) {

                    closeModal(
                        overlay
                    );
                }

            }
        );


        const form =
            overlay.querySelector(
                "#change-password-form"
            );


        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const currentPassword =
                    document.getElementById(
                        "current-password-input"
                    ).value;


                const newPassword =
                    document.getElementById(
                        "new-password-input"
                    ).value;


                const confirmPassword =
                    document.getElementById(
                        "confirm-new-password-input"
                    ).value;


                clearPasswordErrors();


                if (
                    currentPassword.length === 0
                ) {

                    showPasswordError(
                        "current-password-error",
                        "رمز عبور فعلی را وارد کنید."
                    );

                    return;
                }


                if (
                    newPassword.length < 8
                ) {

                    showPasswordError(
                        "new-password-error",
                        "رمز عبور جدید باید حداقل ۸ کاراکتر باشد."
                    );

                    return;
                }


                if (
                    newPassword !== confirmPassword
                ) {

                    showPasswordError(
                        "confirm-new-password-error",
                        "تکرار رمز عبور با رمز جدید یکسان نیست."
                    );

                    return;
                }


                const button =
                    form.querySelector(
                        "button[type='submit']"
                    );


                if (button) {

                    button.disabled =
                        true;

                    button.dataset.originalText =
                        button.textContent;

                    button.textContent =
                        "در حال تغییر...";
                }


                try {

                    const result =
                        await changePassword(
                            currentPassword,
                            newPassword
                        );


                    if (!result.success) {

                        showPasswordError(
                            "current-password-error",
                            result.message ||
                            "تغییر رمز عبور انجام نشد."
                        );

                        return;
                    }


                    closeModal(
                        overlay
                    );


                    showMessage(
                        "رمز عبور با موفقیت تغییر کرد.",
                        "success"
                    );


                    dispatchSettingsEvent(
                        "account:passwordChanged"
                    );

                } catch (error) {

                    console.error(
                        "[HokmSettings] Password change error:",
                        error
                    );


                    showMessage(
                        "در تغییر رمز عبور مشکلی ایجاد شد.",
                        "error"
                    );

                } finally {

                    if (button) {

                        button.disabled =
                            false;

                        button.textContent =
                            button.dataset.originalText ||
                            "تغییر رمز عبور";
                    }
                }

            }
        );
    }


    /* ========================================================
       CHANGE PASSWORD
    ======================================================== */

    async function changePassword(
        currentPassword,
        newPassword
    ) {

        /*
           اگر Backend یا سیستم احراز هویت واقعی
           در مراحل بعد وجود داشته باشد، این بخش
           به auth.js / API متصل خواهد شد.
        */


        if (
            window.HokmAuth &&
            typeof window.HokmAuth.changePassword ===
                "function"
        ) {

            try {

                const result =
                    await window.HokmAuth.changePassword(
                        currentPassword,
                        newPassword
                    );


                if (
                    result &&
                    typeof result === "object"
                ) {

                    return result;
                }


                return {
                    success: true,
                    message:
                        "رمز عبور تغییر کرد."
                };

            } catch (error) {

                return {
                    success: false,
                    message:
                        error.message ||
                        "تغییر رمز عبور ناموفق بود."
                };
            }
        }


        /*
           در حالت فعلی، چون Backend واقعی ممکن است
           هنوز متصل نشده باشد، درخواست را به صورت
           رویداد برای سیستم احراز هویت ارسال می‌کنیم.
        */

        dispatchSettingsEvent(
            "auth:changePasswordRequested",
            {
                currentPassword:
                    currentPassword,

                newPassword:
                    newPassword
            }
        );


        /*
           برای امنیت، رمز عبور را در localStorage
           ذخیره نمی‌کنیم.
        */


        return {
            success: true,
            message:
                "درخواست تغییر رمز عبور ارسال شد."
        };
    }


    /* ========================================================
       CLEAR PASSWORD ERRORS
    ======================================================== */

    function clearPasswordErrors() {

        const ids = [

            "current-password-error",

            "new-password-error",

            "confirm-new-password-error"

        ];


        ids.forEach(
            function (id) {

                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    element.textContent =
                        "";
                }

            }
        );
    }


    /* ========================================================
       SHOW PASSWORD ERROR
    ======================================================== */

    function showPasswordError(
        id,
        message
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                message;
        }
    }


    /* ========================================================
       CLOSE MODAL
    ======================================================== */

    function closeModal(
        modal
    ) {

        if (!modal) {
            return;
        }


        modal.classList.remove(
            "visible"
        );


        modal.classList.add(
            "hidden"
        );


        setTimeout(
            function () {

                if (
                    modal &&
                    modal.parentNode
                ) {

                    modal.parentNode.removeChild(
                        modal
                    );
                }

            },
            250
        );
    }


    /* ========================================================
       LOGOUT
    ======================================================== */

    async function logout() {

        dispatchSettingsEvent(
            "auth:logoutRequested"
        );


        /*
           اگر auth.js سیستم خروج واقعی داشته باشد،
           از آن استفاده می‌کنیم.
        */

        if (
            window.HokmAuth &&
            typeof window.HokmAuth.logout ===
                "function"
        ) {

            try {

                await window.HokmAuth.logout();

                return true;

            } catch (error) {

                console.error(
                    "[HokmSettings] Auth logout error:",
                    error
                );

                return false;
            }
        }


        /*
           حالت fallback برای نسخه فعلی
        */

        try {

            localStorage.removeItem(
                "hokm_current_user"
            );

            localStorage.removeItem(
                "hokm_session"
            );

        } catch (error) {

            console.warn(
                "[HokmSettings] Could not clear session:",
                error
            );
        }


        /*
           اطلاع‌رسانی به app.js
        */

        dispatchSettingsEvent(
            "auth:loggedOut"
        );


        /*
           اگر سیستم ناوبری پروژه موجود باشد،
           به صفحه ورود برمی‌گردیم.
        */

        navigateToAuth();


        return true;
    }


    /* ========================================================
       NAVIGATE TO AUTH
    ======================================================== */

    function navigateToAuth() {

        const screens =
            document.querySelectorAll(
                ".screen"
            );


        screens.forEach(
            function (screen) {

                screen.classList.add(
                    "hidden"
                );

            }
        );


        const authScreen =
            document.getElementById(
                "auth-screen"
            );


        if (authScreen) {

            authScreen.classList.remove(
                "hidden"
            );
        }


        const mainScreen =
            document.getElementById(
                "main-screen"
            );


        if (mainScreen) {

            mainScreen.classList.add(
                "hidden"
            );
        }


        dispatchSettingsEvent(
            "navigation:auth"
        );
    }


    /* ========================================================
       SHOW MESSAGE
    ======================================================== */

    function showMessage(
        message,
        type
    ) {

        type =
            type || "info";


        /*
           اگر سیستم Toast پروژه وجود داشته باشد،
           از آن استفاده می‌کنیم.
        */

        if (
            window.HokmUI &&
            typeof window.HokmUI.showToast ===
                "function"
        ) {

            window.HokmUI.showToast(
                message,
                type
            );

            return;
        }


        /*
           Toast داخلی ساده
        */

        const container =
            document.getElementById(
                "toast-container"
            );


        if (!container) {

            console.log(
                "[HokmSettings]",
                message
            );

            return;
        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            "toast toast-" + type;


        toast.textContent =
            message;


        container.appendChild(
            toast
        );


        requestAnimationFrame(
            function () {

                toast.classList.add(
                    "visible"
                );

            }
        );


        setTimeout(
            function () {

                toast.classList.remove(
                    "visible"
                );


                setTimeout(
                    function () {

                        if (
                            toast.parentNode
                        ) {

                            toast.parentNode.removeChild(
                                toast
                            );
                        }

                    },
                    300
                );

            },
            3000
        );
    }


    /* ========================================================
       SETTINGS BUTTON BINDING
    ======================================================== */

    function bindSettingsButtons() {

        const changePasswordButton =
            document.getElementById(
                "change-password-button"
            );


        if (changePasswordButton) {

            changePasswordButton.addEventListener(
                "click",
                function () {

                    openChangePassword();

                }
            );
        }


        const logoutButton =
            document.getElementById(
                "logout-button"
            );


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                function () {

                    handleLogoutRequest();

                }
            );
        }


        const settingsHeaderButton =
            document.getElementById(
                "header-settings-button"
            );


        if (settingsHeaderButton) {

            settingsHeaderButton.addEventListener(
                "click",
                function () {

                    openSettingsPage();

                }
            );
        }


        const profileSettingsButton =
            document.getElementById(
                "profile-settings-button"
            );


        if (profileSettingsButton) {

            profileSettingsButton.addEventListener(
                "click",
                function () {

                    openSettingsPage();

                }
            );
        }
    }


    /* ========================================================
       OPEN SETTINGS PAGE
    ======================================================== */

    function openSettingsPage() {

        /*
           ابتدا تلاش می‌کنیم از سیستم UI استفاده کنیم.
        */

        if (
            window.HokmUI &&
            typeof window.HokmUI.showPage ===
                "function"
        ) {

            window.HokmUI.showPage(
                "settings"
            );

            return;
        }


        /*
           fallback
        */

        const pages =
            document.querySelectorAll(
                ".page"
            );


        pages.forEach(
            function (page) {

                page.classList.add(
                    "hidden"
                );

                page.classList.remove(
                    "active-page"
                );

            }
        );


        const settingsPage =
            document.getElementById(
                "settings-page"
            );


        if (settingsPage) {

            settingsPage.classList.remove(
                "hidden"
            );

            settingsPage.classList.add(
                "active-page"
            );
        }
    }


    /* ========================================================
       LOGOUT REQUEST
    ======================================================== */

    function handleLogoutRequest() {

        if (
            !settings.confirmExitGame
        ) {

            performLogout();

            return;
        }


        /*
           استفاده از Confirmation سیستم پروژه
        */

        if (
            window.HokmUI &&
            typeof window.HokmUI.showConfirmation ===
                "function"
        ) {

            window.HokmUI.showConfirmation({

                title:
                    "خروج از حساب",

                message:
                    "آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟",

                confirmText:
                    "خروج",

                cancelText:
                    "انصراف",

                danger:
                    true,

                onConfirm:
                    performLogout

            });

            return;
        }


        /*
           fallback
        */

        const confirmed =
            window.confirm(
                "آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟"
            );


        if (confirmed) {

            performLogout();
        }
    }


    /* ========================================================
       PERFORM LOGOUT
    ======================================================== */

    async function performLogout() {

        const result =
            await logout();


        if (result) {

            showMessage(
                "با موفقیت از حساب خارج شدید.",
                "success"
            );

        } else {

            showMessage(
                "خروج از حساب انجام نشد.",
                "error"
            );
        }
    }


    /* ========================================================
       KEYBOARD / ESC SUPPORT
    ======================================================== */

    function bindKeyboardEvents() {

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !== "Escape"
                ) {

                    return;
                }


                const visibleModal =
                    document.querySelector(
                        ".modal-overlay:not(.hidden)"
                    );


                if (visibleModal) {

                    visibleModal.classList.add(
                        "hidden"
                    );

                    visibleModal.classList.remove(
                        "visible"
                    );
                }

            }
        );
    }


    /* ========================================================
       VISIBILITY CHANGE
    ======================================================== */

    function bindVisibilityEvents() {

        document.addEventListener(
            "visibilitychange",
            function () {

                if (
                    document.hidden
                ) {

                    dispatchSettingsEvent(
                        "app:hidden"
                    );

                } else {

                    /*
                       در بازگشت به برنامه،
                       تنظیمات صدا دوباره اعمال می‌شوند.
                    */

                    applyAudioSettings();


                    dispatchSettingsEvent(
                        "app:visible"
                    );
                }

            }
        );
    }


    /* ========================================================
       STORAGE EVENT
    ======================================================== */

    function bindStorageEvents() {

        window.addEventListener(
            "storage",
            function (event) {

                if (
                    event.key !== STORAGE_KEY
                ) {

                    return;
                }


                try {

                    const externalSettings =
                        event.newValue
                            ? JSON.parse(
                                event.newValue
                            )
                            : null;


                    if (
                        externalSettings
                    ) {

                        settings =
                            normalizeSettings(
                                externalSettings
                            );


                        applyAll();

                        updateUI();


                        dispatchSettingsEvent(
                            "settings:externalChanged",
                            {
                                settings:
                                    getAll()
                            }
                        );
                    }

                } catch (error) {

                    console.warn(
                        "[HokmSettings] External settings error:",
                        error
                    );
                }

            }
        );
    }


    /* ========================================================
       EVENT DISPATCHER
    ======================================================== */

    function dispatchSettingsEvent(
        eventName,
        detail
    ) {

        try {

            const event =
                new CustomEvent(
                    eventName,
                    {
                        detail:
                            detail || {}
                    }
                );


            window.dispatchEvent(
                event
            );

        } catch (error) {

            console.warn(
                "[HokmSettings] Event error:",
                error
            );
        }
    }


    /* ========================================================
       PUBLIC API
    ======================================================== */

    const API = {

        initialize:

            initialize,

        get:

            get,

        getAll:

            getAll,

        set:

            set,

        setMultiple:

            setMultiple,

        save:

            save,

        reset:

            reset,

        updateUI:

            updateUI,

        applyAll:

            applyAll,

        toggleSound:

            toggleSound,

        toggleMusic:

            toggleMusic,

        toggleVibration:

            toggleVibration,

        toggleDarkMode:

            toggleDarkMode,

        toggleAnimations:

            toggleAnimations,

        toggleNotifications:

            toggleNotifications,

        toggleAutoSort:

            toggleAutoSort,

        toggleHints:

            toggleHints,

        vibrate:

            vibrate,

        playSound:

            playSound,

        openChangePassword:

            openChangePassword,

        changePassword:

            changePassword,

        logout:

            logout,

        openSettingsPage:

            openSettingsPage,

        getDefaults:

            function () {

                return cloneSettings(
                    DEFAULT_SETTINGS
                );

            }

    };


    /* ========================================================
       EXPOSE API
    ======================================================== */

    window.HokmSettings =
        API;


    /*
       نام کوتاه‌تر برای استفاده آسان‌تر
       در فایل‌های آینده.
    */

    window.SettingsManager =
        API;


    /* ========================================================
       DOM READY
    ======================================================== */

    function boot() {

        initialize();

        bindUI();

        bindSettingsButtons();

        bindKeyboardEvents();

        bindVisibilityEvents();

        bindStorageEvents();

        updateUI();

        applyAll();


        dispatchSettingsEvent(
            "settings:ready",
            {
                settings:
                    getAll()
            }
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            boot,
            {
                once: true
            }
        );

    } else {

        boot();
    }


})();


/* ============================================================
   GLOBAL CONVENIENCE FUNCTIONS

   برای اینکه فایل‌های آینده بتوانند بدون دسترسی مستقیم
   به ساختار داخلی settings.js از تنظیمات استفاده کنند.
============================================================ */


/* ============================================================
   CHECK SOUND
============================================================ */

window.isSoundEnabled =
    function () {

        if (
            window.HokmSettings &&
            typeof window.HokmSettings.get ===
                "function"
        ) {

            return Boolean(
                window.HokmSettings.get(
                    "sound"
                )
            );
        }

        return true;
    };


/* ============================================================
   CHECK MUSIC
============================================================ */

window.isMusicEnabled =
    function () {

        if (
            window.HokmSettings &&
            typeof window.HokmSettings.get ===
                "function"
        ) {

            return Boolean(
                window.HokmSettings.get(
                    "music"
                )
            );
        }

        return true;
    };


/* ============================================================
   CHECK VIBRATION
============================================================ */

window.isVibrationEnabled =
    function () {

        if (
            window.HokmSettings &&
            typeof window.HokmSettings.get ===
                "function"
        ) {

            return Boolean(
                window.HokmSettings.get(
                    "vibration"
                )
            );
        }

        return true;
    };


/* ============================================================
   GLOBAL VIBRATION HELPER
============================================================ */

window.hokmVibrate =
    function (pattern) {

        if (
            window.HokmSettings &&
            typeof window.HokmSettings.vibrate ===
                "function"
        ) {

            return window.HokmSettings.vibrate(
                pattern
            );
        }

        return false;
    };


/* ============================================================
   GLOBAL SOUND HELPER
============================================================ */

window.hokmPlaySound =
    function (
        source,
        options
    ) {

        if (
            window.HokmSettings &&
            typeof window.HokmSettings.playSound ===
                "function"
        ) {

            return window.HokmSettings.playSound(
                source,
                options
            );
        }

        return null;
    };


/* ============================================================
   GLOBAL DARK MODE HELPER
============================================================ */

window.hokmToggleDarkMode =
    function () {

        if (
            window.HokmSettings &&
            typeof window.HokmSettings.toggleDarkMode ===
                "function"
        ) {

            return window.HokmSettings.toggleDarkMode();
        }

        return false;
    };


/* ============================================================
   SETTINGS EVENT EXAMPLES

   فایل‌های دیگر می‌توانند این Eventها را دریافت کنند:

   settings:initialized
   settings:ready
   settings:changed
   settings:reset
   settings:themeChanged
   settings:audioChanged
   settings:visualChanged

   مثال:

   window.addEventListener(
       "settings:changed",
       function(event) {
           console.log(event.detail);
       }
   );

============================================================ */


/* ============================================================
   END OF SETTINGS.JS
============================================================ */
