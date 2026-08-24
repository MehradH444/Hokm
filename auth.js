/* ============================================================
   HOKM ONLINE
   AUTHENTICATION SYSTEM
   File: auth.js
   Stage: 6

   امکانات این فایل:

   1. ثبت‌نام کاربر
   2. ورود کاربر
   3. ورود به عنوان مهمان
   4. خروج از حساب
   5. نگهداری Session
   6. Remember Me
   7. اعتبارسنجی فرم‌ها
   8. نمایش / مخفی کردن رمز عبور
   9. فراموشی رمز عبور
   10. تغییر رمز عبور
   11. ساخت User ID
   12. ساخت Guest ID
   13. ذخیره امن‌تر رمز با Web Crypto API
   14. جلوگیری از ثبت‌نام نام کاربری تکراری
   15. جلوگیری از ثبت‌نام ایمیل تکراری
   16. مدیریت خطاهای ورود
   17. اتصال به storage.js
   18. هماهنگی با app.js
   19. مدیریت logout
   20. رویدادهای قابل استفاده توسط سایر فایل‌ها

   توجه:
   این نسخه برای محیط Front-End و توسعه اولیه است.
   برای نسخه نهایی آنلاین، احراز هویت باید روی سرور انجام شود.
============================================================ */


/* ============================================================
   GLOBAL NAMESPACE
============================================================ */

window.HokmAuth = window.HokmAuth || {};


/* ============================================================
   CONFIGURATION
============================================================ */

const AUTH_CONFIG = {

    /* کلیدهای ذخیره‌سازی */

    USERS_KEY:
        "hokm_auth_users",

    SESSION_KEY:
        "hokm_auth_session",

    REMEMBER_KEY:
        "hokm_auth_remember",

    GUEST_KEY:
        "hokm_auth_guest",

    RESET_KEY:
        "hokm_auth_password_reset",

    VERSION:
        "1.0.0",


    /* تنظیمات کاربر */

    MIN_USERNAME_LENGTH:
        3,

    MAX_USERNAME_LENGTH:
        30,

    MIN_PASSWORD_LENGTH:
        8,

    MAX_PASSWORD_LENGTH:
        100,

    MAX_EMAIL_LENGTH:
        120,


    /* مدت Session */

    SESSION_DURATION:
        1000 * 60 * 60 * 24 * 30,


    /* مدت Session مهمان */

    GUEST_SESSION_DURATION:
        1000 * 60 * 60 * 24,


    /* تعداد تلاش ناموفق */

    MAX_LOGIN_ATTEMPTS:
        5,


    /* مدت قفل موقت */

    LOCK_DURATION:
        1000 * 60 * 5

};


/* ============================================================
   INTERNAL STATE
============================================================ */

const AuthState = {

    initialized:
        false,

    currentUser:
        null,

    isAuthenticated:
        false,

    isGuest:
        false,

    loginAttempts:
        0,

    lockedUntil:
        0,

    rememberMe:
        false

};


/* ============================================================
   SAFE STORAGE HELPERS
============================================================ */

function authSafeGet(key, fallback = null) {

    try {

        const value =
            localStorage.getItem(key);

        if (value === null) {
            return fallback;
        }

        return value;

    } catch (error) {

        console.error(
            "[HokmAuth] localStorage get error:",
            error
        );

        return fallback;
    }
}


function authSafeSet(key, value) {

    try {

        localStorage.setItem(
            key,
            value
        );

        return true;

    } catch (error) {

        console.error(
            "[HokmAuth] localStorage set error:",
            error
        );

        return false;
    }
}


function authSafeRemove(key) {

    try {

        localStorage.removeItem(
            key
        );

        return true;

    } catch (error) {

        console.error(
            "[HokmAuth] localStorage remove error:",
            error
        );

        return false;
    }
}


/* ============================================================
   JSON STORAGE
============================================================ */

function authReadJSON(
    key,
    fallback = null
) {

    try {

        const raw =
            authSafeGet(
                key,
                null
            );

        if (!raw) {
            return fallback;
        }

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            "[HokmAuth] JSON parse error:",
            error
        );

        return fallback;
    }
}


function authWriteJSON(
    key,
    value
) {

    try {

        return authSafeSet(
            key,
            JSON.stringify(value)
        );

    } catch (error) {

        console.error(
            "[HokmAuth] JSON stringify error:",
            error
        );

        return false;
    }
}


/* ============================================================
   USER DATABASE
============================================================ */

function getUsers() {

    const users =
        authReadJSON(
            AUTH_CONFIG.USERS_KEY,
            []
        );

    if (!Array.isArray(users)) {
        return [];
    }

    return users;
}


function saveUsers(users) {

    if (!Array.isArray(users)) {
        return false;
    }

    return authWriteJSON(
        AUTH_CONFIG.USERS_KEY,
        users
    );
}


/* ============================================================
   NORMALIZE USERNAME
============================================================ */

function normalizeUsername(username) {

    return String(
        username || ""
    )
        .trim()
        .toLowerCase();

}


/* ============================================================
   NORMALIZE EMAIL
============================================================ */

function normalizeEmail(email) {

    return String(
        email || ""
    )
        .trim()
        .toLowerCase();

}


/* ============================================================
   USERNAME VALIDATION
============================================================ */

function validateUsername(username) {

    const value =
        String(username || "")
            .trim();


    if (!value) {

        return {
            valid: false,
            message: "نام کاربری را وارد کنید."
        };

    }


    if (
        value.length <
        AUTH_CONFIG.MIN_USERNAME_LENGTH
    ) {

        return {
            valid: false,
            message:
                "نام کاربری باید حداقل ۳ کاراکتر باشد."
        };

    }


    if (
        value.length >
        AUTH_CONFIG.MAX_USERNAME_LENGTH
    ) {

        return {
            valid: false,
            message:
                "نام کاربری نمی‌تواند بیشتر از ۳۰ کاراکتر باشد."
        };

    }


    const usernamePattern =
        /^[a-zA-Z0-9_\u0600-\u06FF\u200C]+$/;


    if (
        !usernamePattern.test(value)
    ) {

        return {
            valid: false,
            message:
                "نام کاربری فقط می‌تواند شامل حروف، اعداد و _ باشد."
        };

    }


    return {
        valid: true,
        message: ""
    };

}


/* ============================================================
   EMAIL VALIDATION
============================================================ */

function validateEmail(email) {

    const value =
        normalizeEmail(email);


    if (!value) {

        return {
            valid: false,
            message: "ایمیل را وارد کنید."
        };

    }


    if (
        value.length >
        AUTH_CONFIG.MAX_EMAIL_LENGTH
    ) {

        return {
            valid: false,
            message:
                "ایمیل وارد شده بیش از حد طولانی است."
        };

    }


    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
        !emailPattern.test(value)
    ) {

        return {
            valid: false,
            message:
                "فرمت ایمیل صحیح نیست."
        };

    }


    return {
        valid: true,
        message: ""
    };

}


/* ============================================================
   PASSWORD VALIDATION
============================================================ */

function validatePassword(password) {

    const value =
        String(password || "");


    if (!value) {

        return {
            valid: false,
            message: "رمز عبور را وارد کنید."
        };

    }


    if (
        value.length <
        AUTH_CONFIG.MIN_PASSWORD_LENGTH
    ) {

        return {
            valid: false,
            message:
                "رمز عبور باید حداقل ۸ کاراکتر باشد."
        };

    }


    if (
        value.length >
        AUTH_CONFIG.MAX_PASSWORD_LENGTH
    ) {

        return {
            valid: false,
            message:
                "رمز عبور بیش از حد طولانی است."
        };

    }


    return {
        valid: true,
        message: ""
    };

}


/* ============================================================
   PASSWORD CONFIRMATION
============================================================ */

function validatePasswordConfirmation(
    password,
    confirmation
) {

    if (
        String(password || "") !==
        String(confirmation || "")
    ) {

        return {
            valid: false,
            message:
                "رمز عبور و تکرار آن یکسان نیستند."
        };

    }


    return {
        valid: true,
        message: ""
    };

}


/* ============================================================
   RANDOM ID
============================================================ */

function generateRandomString(length = 12) {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";


    let result = "";


    for (
        let i = 0;
        i < length;
        i++
    ) {

        const index =
            Math.floor(
                Math.random() *
                characters.length
            );

        result +=
            characters[index];

    }


    return result;

}


/* ============================================================
   USER ID
============================================================ */

function generateUserId() {

    const timestamp =
        Date.now()
            .toString(36)
            .toUpperCase();


    const random =
        generateRandomString(8)
            .toUpperCase();


    return (
        "HKM-" +
        timestamp +
        "-" +
        random
    );

}


/* ============================================================
   GUEST ID
============================================================ */

function generateGuestId() {

    const random =
        generateRandomString(10)
            .toUpperCase();


    return (
        "GUEST-" +
        random
    );

}


/* ============================================================
   CRYPTO HELPERS
============================================================ */

function supportsWebCrypto() {

    return (
        typeof window !== "undefined" &&
        window.crypto &&
        window.crypto.subtle
    );

}


/* ============================================================
   RANDOM SALT
============================================================ */

function generateSalt() {

    if (
        window.crypto &&
        window.crypto.getRandomValues
    ) {

        const array =
            new Uint8Array(16);


        window.crypto.getRandomValues(
            array
        );


        return Array.from(
            array
        )
            .map(
                byte =>
                    byte
                        .toString(16)
                        .padStart(2, "0")
            )
            .join("");

    }


    return generateRandomString(32);

}


/* ============================================================
   STRING TO HEX
============================================================ */

function bufferToHex(buffer) {

    const bytes =
        new Uint8Array(buffer);


    return Array.from(bytes)
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");

}


/* ============================================================
   PASSWORD HASH
============================================================ */

async function hashPassword(
    password,
    salt
) {

    const normalizedPassword =
        String(password || "");


    if (
        supportsWebCrypto()
    ) {

        const encoder =
            new TextEncoder();


        const passwordBuffer =
            encoder.encode(
                normalizedPassword
            );


        const baseKey =
            await window.crypto.subtle.importKey(
                "raw",
                passwordBuffer,
                {
                    name: "PBKDF2"
                },
                false,
                [
                    "deriveBits"
                ]
            );


        const saltBytes =
            new TextEncoder()
                .encode(
                    salt
                );


        const derivedBits =
            await window.crypto.subtle.deriveBits(
                {
                    name: "PBKDF2",
                    salt: saltBytes,
                    iterations: 100000,
                    hash: "SHA-256"
                },
                baseKey,
                256
            );


        return bufferToHex(
            derivedBits
        );

    }


    /*
        Fallback بسیار ساده برای محیط‌هایی
        که Web Crypto در دسترس نیست.
    */

    let hash =
        2166136261;


    const value =
        normalizedPassword +
        ":" +
        salt;


    for (
        let i = 0;
        i < value.length;
        i++
    ) {

        hash ^=
            value.charCodeAt(i);

        hash +=
            (
                hash << 1
            ) +
            (
                hash << 4
            ) +
            (
                hash << 7
            ) +
            (
                hash << 8
            ) +
            (
                hash << 24
            );

    }


    return (
        hash >>> 0
    )
        .toString(16)
        .padStart(
            8,
            "0"
        );

}


/* ============================================================
   CREATE PASSWORD RECORD
============================================================ */

async function createPasswordRecord(
    password
) {

    const salt =
        generateSalt();


    const passwordHash =
        await hashPassword(
            password,
            salt
        );


    return {

        algorithm:
            supportsWebCrypto()
                ? "PBKDF2-SHA256"
                : "FNV-FALLBACK",

        salt:
            salt,

        hash:
            passwordHash

    };

}


/* ============================================================
   PASSWORD CHECK
============================================================ */

async function verifyPassword(
    password,
    passwordRecord
) {

    if (
        !passwordRecord ||
        !passwordRecord.hash ||
        !passwordRecord.salt
    ) {

        return false;

    }


    const hash =
        await hashPassword(
            password,
            passwordRecord.salt
        );


    return (
        hash ===
        passwordRecord.hash
    );

}


/* ============================================================
   FIND USER
============================================================ */

function findUserByUsername(
    username
) {

    const normalized =
        normalizeUsername(
            username
        );


    const users =
        getUsers();


    return (
        users.find(
            user =>
                normalizeUsername(
                    user.username
                ) === normalized
        ) ||
        null
    );

}


/* ============================================================
   FIND USER BY EMAIL
============================================================ */

function findUserByEmail(
    email
) {

    const normalized =
        normalizeEmail(
            email
        );


    const users =
        getUsers();


    return (
        users.find(
            user =>
                normalizeEmail(
                    user.email
                ) === normalized
        ) ||
        null
    );

}


/* ============================================================
   FIND USER BY ID
============================================================ */

function findUserById(
    userId
) {

    const users =
        getUsers();


    return (
        users.find(
            user =>
                user.id === userId
        ) ||
        null
    );

}


/* ============================================================
   CREATE USER
============================================================ */

async function createUser({
    username,
    email,
    password
}) {

    const usernameValidation =
        validateUsername(
            username
        );


    if (!usernameValidation.valid) {

        throw new Error(
            usernameValidation.message
        );

    }


    const emailValidation =
        validateEmail(
            email
        );


    if (!emailValidation.valid) {

        throw new Error(
            emailValidation.message
        );

    }


    const passwordValidation =
        validatePassword(
            password
        );


    if (!passwordValidation.valid) {

        throw new Error(
            passwordValidation.message
        );

    }


    const existingUsername =
        findUserByUsername(
            username
        );


    if (existingUsername) {

        throw new Error(
            "این نام کاربری قبلاً استفاده شده است."
        );

    }


    const existingEmail =
        findUserByEmail(
            email
        );


    if (existingEmail) {

        throw new Error(
            "این ایمیل قبلاً ثبت شده است."
        );

    }


    const passwordRecord =
        await createPasswordRecord(
            password
        );


    const now =
        Date.now();


    const user = {

        id:
            generateUserId(),

        username:
            String(username).trim(),

        email:
            normalizeEmail(email),

        password:
            passwordRecord,

        createdAt:
            now,

        updatedAt:
            now,

        lastLoginAt:
            null,

        avatar:
            "👤",

        level:
            1,

        xp:
            0,

        coins:
            1000,

        games:
            0,

        wins:
            0,

        losses:
            0,

        draws:
            0,

        rating:
            1000,

        streak:
            0,

        maxStreak:
            0,

        isGuest:
            false,

        verified:
            false,

        banned:
            false,

        settings: {

            sound:
                true,

            music:
                true,

            vibration:
                true,

            darkMode:
                true

        }

    };


    const users =
        getUsers();


    users.push(
        user
    );


    const saved =
        saveUsers(
            users
        );


    if (!saved) {

        throw new Error(
            "ذخیره حساب کاربری انجام نشد."
        );

    }


    return sanitizeUser(
        user
    );

}


/* ============================================================
   SANITIZE USER
============================================================ */

function sanitizeUser(
    user
) {

    if (!user) {
        return null;
    }


    return {

        id:
            user.id,

        username:
            user.username,

        email:
            user.email,

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt,

        lastLoginAt:
            user.lastLoginAt,

        avatar:
            user.avatar,

        level:
            user.level,

        xp:
            user.xp,

        coins:
            user.coins,

        games:
            user.games,

        wins:
            user.wins,

        losses:
            user.losses,

        draws:
            user.draws,

        rating:
            user.rating,

        streak:
            user.streak,

        maxStreak:
            user.maxStreak,

        isGuest:
            Boolean(user.isGuest),

        verified:
            Boolean(user.verified),

        banned:
            Boolean(user.banned),

        settings:
            user.settings || {}

    };

}


/* ============================================================
   SESSION CREATION
============================================================ */

function createSession(
    user,
    options = {}
) {

    const isGuest =
        Boolean(
            options.isGuest
        );


    const remember =
        options.remember !== false;


    const now =
        Date.now();


    const session = {

        sessionId:
            generateRandomString(32),

        userId:
            user.id,

        createdAt:
            now,

        lastActivityAt:
            now,

        expiresAt:
            now +
            (
                isGuest
                    ? AUTH_CONFIG.GUEST_SESSION_DURATION
                    : (
                        remember
                            ? AUTH_CONFIG.SESSION_DURATION
                            : AUTH_CONFIG.SESSION_DURATION
                    )
            ),

        remember:
            remember,

        isGuest:
            isGuest

    };


    authWriteJSON(
        AUTH_CONFIG.SESSION_KEY,
        session
    );


    authWriteJSON(
        AUTH_CONFIG.REMEMBER_KEY,
        {
            remember:
                remember
        }
    );


    return session;

}


/* ============================================================
   GET SESSION
============================================================ */

function getSession() {

    return authReadJSON(
        AUTH_CONFIG.SESSION_KEY,
        null
    );

}


/* ============================================================
   DELETE SESSION
============================================================ */

function clearSession() {

    authSafeRemove(
        AUTH_CONFIG.SESSION_KEY
    );

    AuthState.currentUser =
        null;

    AuthState.isAuthenticated =
        false;

    AuthState.isGuest =
        false;

}


/* ============================================================
   SESSION VALIDATION
============================================================ */

function isSessionValid(
    session
) {

    if (!session) {
        return false;
    }


    if (!session.userId) {
        return false;
    }


    if (!session.sessionId) {
        return false;
    }


    if (
        session.expiresAt &&
        Date.now() >
        session.expiresAt
    ) {

        return false;

    }


    return true;

}


/* ============================================================
   RESTORE SESSION
============================================================ */

function restoreSession() {

    const session =
        getSession();


    if (
        !isSessionValid(
            session
        )
    ) {

        clearSession();

        return null;

    }


    const user =
        findUserById(
            session.userId
        );


    if (!user) {

        clearSession();

        return null;

    }


    if (user.banned) {

        clearSession();

        showToast(
            "این حساب کاربری مسدود شده است.",
            "error"
        );

        return null;

    }


    AuthState.currentUser =
        sanitizeUser(
            user
        );


    AuthState.isAuthenticated =
        true;


    AuthState.isGuest =
        Boolean(
            user.isGuest
        );


    return AuthState.currentUser;

}


/* ============================================================
   LOGIN
============================================================ */

async function login(
    username,
    password,
    rememberMe = false
) {

    if (
        isLoginLocked()
    ) {

        throw new Error(
            "تعداد تلاش‌های ناموفق زیاد بوده است. چند دقیقه بعد دوباره تلاش کنید."
        );

    }


    const usernameValidation =
        validateUsername(
            username
        );


    if (!usernameValidation.valid) {

        throw new Error(
            usernameValidation.message
        );

    }


    if (!password) {

        throw new Error(
            "رمز عبور را وارد کنید."
        );

    }


    const user =
        findUserByUsername(
            username
        );


    if (!user) {

        registerFailedLoginAttempt();

        throw new Error(
            "نام کاربری یا رمز عبور اشتباه است."
        );

    }


    if (user.banned) {

        throw new Error(
            "این حساب کاربری مسدود شده است."
        );

    }


    const passwordCorrect =
        await verifyPassword(
            password,
            user.password
        );


    if (!passwordCorrect) {

        registerFailedLoginAttempt();

        throw new Error(
            "نام کاربری یا رمز عبور اشتباه است."
        );

    }


    resetLoginAttempts();


    user.lastLoginAt =
        Date.now();


    user.updatedAt =
        Date.now();


    const users =
        getUsers();


    const userIndex =
        users.findIndex(
            item =>
                item.id === user.id
        );


    if (
        userIndex !== -1
    ) {

        users[userIndex] =
            user;

        saveUsers(
            users
        );

    }


    const session =
        createSession(
            user,
            {
                remember:
                    Boolean(
                        rememberMe
                    ),

                isGuest:
                    false
            }
        );


    AuthState.currentUser =
        sanitizeUser(
            user
        );


    AuthState.isAuthenticated =
        true;


    AuthState.isGuest =
        false;


    AuthState.rememberMe =
        Boolean(
            rememberMe
        );


    dispatchAuthEvent(
        "login",
        AuthState.currentUser
    );


    return {

        success:
            true,

        user:
            AuthState.currentUser,

        session:
            session

    };

}


/* ============================================================
   GUEST LOGIN
============================================================ */

function loginAsGuest() {

    const guestId =
        generateGuestId();


    const now =
        Date.now();


    const guestUser = {

        id:
            guestId,

        username:
            "مهمان " +
            guestId.slice(-4),

        email:
            null,

        createdAt:
            now,

        updatedAt:
            now,

        lastLoginAt:
            now,

        avatar:
            "👤",

        level:
            1,

        xp:
            0,

        coins:
            1000,

        games:
            0,

        wins:
            0,

        losses:
            0,

        draws:
            0,

        rating:
            1000,

        streak:
            0,

        maxStreak:
            0,

        isGuest:
            true,

        verified:
            false,

        banned:
            false,

        settings: {

            sound:
                true,

            music:
                true,

            vibration:
                true,

            darkMode:
                true

        }

    };


    authWriteJSON(
        AUTH_CONFIG.GUEST_KEY,
        guestUser
    );


    const session =
        createSession(
            guestUser,
            {
                remember:
                    false,

                isGuest:
                    true
            }
        );


    AuthState.currentUser =
        sanitizeUser(
            guestUser
        );


    AuthState.isAuthenticated =
        true;


    AuthState.isGuest =
        true;


    dispatchAuthEvent(
        "guest-login",
        AuthState.currentUser
    );


    return {

        success:
            true,

        user:
            AuthState.currentUser,

        session:
            session

    };

}


/* ============================================================
   LOGOUT
============================================================ */

function logout() {

    const oldUser =
        AuthState.currentUser;


    clearSession();


    authSafeRemove(
        AUTH_CONFIG.GUEST_KEY
    );


    AuthState.rememberMe =
        false;


    dispatchAuthEvent(
        "logout",
        oldUser
    );


    showAuthScreen();


    return true;

}


/* ============================================================
   LOGIN ATTEMPTS
============================================================ */

function getLoginAttemptData() {

    return authReadJSON(
        "hokm_login_attempts",
        {
            count:
                0,

            lockedUntil:
                0
        }
    );

}


function saveLoginAttemptData(
    data
) {

    authWriteJSON(
        "hokm_login_attempts",
        data
    );

}


function isLoginLocked() {

    const data =
        getLoginAttemptData();


    if (
        data.lockedUntil &&
        Date.now() <
        data.lockedUntil
    ) {

        return true;

    }


    if (
        data.lockedUntil &&
        Date.now() >=
        data.lockedUntil
    ) {

        saveLoginAttemptData({
            count:
                0,

            lockedUntil:
                0
        });

    }


    return false;

}


function registerFailedLoginAttempt() {

    const data =
        getLoginAttemptData();


    data.count =
        Number(
            data.count || 0
        ) + 1;


    if (
        data.count >=
        AUTH_CONFIG.MAX_LOGIN_ATTEMPTS
    ) {

        data.lockedUntil =
            Date.now() +
            AUTH_CONFIG.LOCK_DURATION;

    }


    saveLoginAttemptData(
        data
    );


    AuthState.loginAttempts =
        data.count;


    AuthState.lockedUntil =
        data.lockedUntil || 0;

}


function resetLoginAttempts() {

    saveLoginAttemptData({

        count:
            0,

        lockedUntil:
            0

    });


    AuthState.loginAttempts =
        0;


    AuthState.lockedUntil =
        0;

}


/* ============================================================
   UPDATE USER
============================================================ */

function updateUser(
    userId,
    updates
) {

    if (!userId) {
        return false;
    }


    if (
        !updates ||
        typeof updates !== "object"
    ) {

        return false;

    }


    const users =
        getUsers();


    const index =
        users.findIndex(
            user =>
                user.id === userId
        );


    if (
        index === -1
    ) {

        return false;

    }


    const allowedFields = [

        "username",
        "avatar",
        "level",
        "xp",
        "coins",
        "games",
        "wins",
        "losses",
        "draws",
        "rating",
        "streak",
        "maxStreak",
        "settings"

    ];


    allowedFields.forEach(
        field => {

            if (
                Object.prototype.hasOwnProperty.call(
                    updates,
                    field
                )
            ) {

                users[index][field] =
                    updates[field];

            }

        }
    );


    users[index].updatedAt =
        Date.now();


    const saved =
        saveUsers(
            users
        );


    if (!saved) {
        return false;
    }


    if (
        AuthState.currentUser &&
        AuthState.currentUser.id === userId
    ) {

        AuthState.currentUser =
            sanitizeUser(
                users[index]
            );

    }


    dispatchAuthEvent(
        "user-updated",
        AuthState.currentUser
    );


    return true;

}


/* ============================================================
   CHANGE PASSWORD
============================================================ */

async function changePassword(
    currentPassword,
    newPassword,
    confirmation
) {

    if (
        !AuthState.currentUser
    ) {

        throw new Error(
            "ابتدا وارد حساب شوید."
        );

    }


    if (
        AuthState.isGuest
    ) {

        throw new Error(
            "کاربر مهمان امکان تغییر رمز عبور ندارد."
        );

    }


    const newPasswordValidation =
        validatePassword(
            newPassword
        );


    if (
        !newPasswordValidation.valid
    ) {

        throw new Error(
            newPasswordValidation.message
        );

    }


    const confirmationValidation =
        validatePasswordConfirmation(
            newPassword,
            confirmation
        );


    if (
        !confirmationValidation.valid
    ) {

        throw new Error(
            confirmationValidation.message
        );

    }


    const user =
        findUserById(
            AuthState.currentUser.id
        );


    if (!user) {

        throw new Error(
            "حساب کاربری پیدا نشد."
        );

    }


    const currentPasswordCorrect =
        await verifyPassword(
            currentPassword,
            user.password
        );


    if (
        !currentPasswordCorrect
    ) {

        throw new Error(
            "رمز عبور فعلی اشتباه است."
        );

    }


    user.password =
        await createPasswordRecord(
            newPassword
        );


    user.updatedAt =
        Date.now();


    const users =
        getUsers();


    const index =
        users.findIndex(
            item =>
                item.id === user.id
        );


    if (
        index === -1
    ) {

        throw new Error(
            "حساب کاربری پیدا نشد."
        );

    }


    users[index] =
        user;


    saveUsers(
        users
    );


    dispatchAuthEvent(
        "password-changed",
        AuthState.currentUser
    );


    return true;

}


/* ============================================================
   PASSWORD RESET
============================================================ */

function createPasswordResetRequest(
    email
) {

    const validation =
        validateEmail(
            email
        );


    if (!validation.valid) {

        throw new Error(
            validation.message
        );

    }


    const user =
        findUserByEmail(
            email
        );


    /*
        در نسخه واقعی باید درخواست Reset
        به سرور ارسال شود.

        این نسخه فقط یک Token محلی
        برای توسعه ایجاد می‌کند.
    */

    if (!user) {

        return {

            success:
                true,

            message:
                "اگر این ایمیل در سیستم ثبت شده باشد، مراحل بازیابی ارسال خواهد شد."

        };

    }


    const token =
        generateRandomString(48);


    const resetData = {

        token:
            token,

        userId:
            user.id,

        createdAt:
            Date.now(),

        expiresAt:
            Date.now() +
            (
                1000 *
                60 *
                15
            )

    };


    authWriteJSON(
        AUTH_CONFIG.RESET_KEY,
        resetData
    );


    return {

        success:
            true,

        message:
            "درخواست بازیابی رمز ایجاد شد.",

        token:
            token

    };

}


/* ============================================================
   RESET PASSWORD USING TOKEN
============================================================ */

async function resetPassword(
    token,
    newPassword,
    confirmation
) {

    const resetData =
        authReadJSON(
            AUTH_CONFIG.RESET_KEY,
            null
        );


    if (!resetData) {

        throw new Error(
            "درخواست بازیابی معتبر نیست."
        );

    }


    if (
        resetData.token !== token
    ) {

        throw new Error(
            "کد بازیابی صحیح نیست."
        );

    }


    if (
        Date.now() >
        resetData.expiresAt
    ) {

        authSafeRemove(
            AUTH_CONFIG.RESET_KEY
        );


        throw new Error(
            "کد بازیابی منقضی شده است."
        );

    }


    const passwordValidation =
        validatePassword(
            newPassword
        );


    if (
        !passwordValidation.valid
    ) {

        throw new Error(
            passwordValidation.message
        );

    }


    const confirmationValidation =
        validatePasswordConfirmation(
            newPassword,
            confirmation
        );


    if (
        !confirmationValidation.valid
    ) {

        throw new Error(
            confirmationValidation.message
        );

    }


    const user =
        findUserById(
            resetData.userId
        );


    if (!user) {

        throw new Error(
            "کاربر پیدا نشد."
        );

    }


    user.password =
        await createPasswordRecord(
            newPassword
        );


    user.updatedAt =
        Date.now();


    const users =
        getUsers();


    const index =
        users.findIndex(
            item =>
                item.id === user.id
        );


    if (
        index === -1
    ) {

        throw new Error(
            "کاربر پیدا نشد."
        );

    }


    users[index] =
        user;


    saveUsers(
        users
    );


    authSafeRemove(
        AUTH_CONFIG.RESET_KEY
    );


    return true;

}


/* ============================================================
   GET CURRENT USER
============================================================ */

function getCurrentUser() {

    return AuthState.currentUser;

}


/* ============================================================
   IS LOGGED IN
============================================================ */

function isLoggedIn() {

    return (
        AuthState.isAuthenticated === true &&
        AuthState.currentUser !== null
    );

}


/* ============================================================
   IS GUEST
============================================================ */

function isGuest() {

    return (
        AuthState.isGuest === true
    );

}


/* ============================================================
   AUTH EVENT
============================================================ */

function dispatchAuthEvent(
    eventName,
    data = null
) {

    try {

        const event =
            new CustomEvent(
                "hokm:auth",
                {
                    detail: {

                        type:
                            eventName,

                        user:
                            data

                    }
                }
            );


        window.dispatchEvent(
            event
        );

    } catch (error) {

        console.error(
            "[HokmAuth] Event error:",
            error
        );

    }

}


/* ============================================================
   TOAST
============================================================ */

function showToast(
    message,
    type = "info"
) {

    if (
        window.HokmUI &&
        typeof window.HokmUI.showToast === "function"
    ) {

        window.HokmUI.showToast(
            message,
            type
        );

        return;

    }


    const container =
        document.getElementById(
            "toast-container"
        );


    if (!container) {

        console.log(
            "[HokmAuth]",
            message
        );

        return;

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "toast toast-" +
        type;


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.classList.add(
                "toast-hide"
            );


            setTimeout(
                () => {

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


/* ============================================================
   FORM ERROR
============================================================ */

function setFormError(
    elementId,
    message
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    element.textContent =
        message || "";


    if (message) {

        element.classList.add(
            "active"
        );

    } else {

        element.classList.remove(
            "active"
        );

    }

}


/* ============================================================
   CLEAR FORM ERRORS
============================================================ */

function clearFormErrors() {

    const errorElements =
        document.querySelectorAll(
            ".form-error"
        );


    errorElements.forEach(
        element => {

            element.textContent =
                "";

            element.classList.remove(
                "active"
            );

        }
    );

}


/* ============================================================
   AUTH SCREEN
============================================================ */

function showAuthScreen() {

    const loadingScreen =
        document.getElementById(
            "loading-screen"
        );


    const authScreen =
        document.getElementById(
            "auth-screen"
        );


    const mainScreen =
        document.getElementById(
            "main-screen"
        );


    if (loadingScreen) {

        loadingScreen.classList.add(
            "hidden"
        );

    }


    if (authScreen) {

        authScreen.classList.remove(
            "hidden"
        );

    }


    if (mainScreen) {

        mainScreen.classList.add(
            "hidden"
        );

    }


    showLoginPanel();

}


/* ============================================================
   MAIN SCREEN
============================================================ */

function showMainScreen() {

    const loadingScreen =
        document.getElementById(
            "loading-screen"
        );


    const authScreen =
        document.getElementById(
            "auth-screen"
        );


    const mainScreen =
        document.getElementById(
            "main-screen"
        );


    if (loadingScreen) {

        loadingScreen.classList.add(
            "hidden"
        );

    }


    if (authScreen) {

        authScreen.classList.add(
            "hidden"
        );

    }


    if (mainScreen) {

        mainScreen.classList.remove(
            "hidden"
        );

    }


    updateUserUI();

}


/* ============================================================
   LOGIN PANEL
============================================================ */

function showLoginPanel() {

    const loginPanel =
        document.getElementById(
            "login-panel"
        );


    const registerPanel =
        document.getElementById(
            "register-panel"
        );


    if (loginPanel) {

        loginPanel.classList.remove(
            "hidden"
        );

    }


    if (registerPanel) {

        registerPanel.classList.add(
            "hidden"
        );

    }


    clearFormErrors();

}


/* ============================================================
   REGISTER PANEL
============================================================ */

function showRegisterPanel() {

    const loginPanel =
        document.getElementById(
            "login-panel"
        );


    const registerPanel =
        document.getElementById(
            "register-panel"
        );


    if (loginPanel) {

        loginPanel.classList.add(
            "hidden"
        );

    }


    if (registerPanel) {

        registerPanel.classList.remove(
            "hidden"
        );

    }


    clearFormErrors();

}


/* ============================================================
   UPDATE USER UI
============================================================ */

function updateUserUI() {

    const user =
        AuthState.currentUser;


    if (!user) {
        return;
    }


    const elements = {

        headerUsername:
            document.getElementById(
                "header-username"
            ),

        headerLevel:
            document.getElementById(
                "header-level"
            ),

        homeUsername:
            document.getElementById(
                "home-username"
            ),

        homeLevel:
            document.getElementById(
                "home-level"
            ),

        homeCoins:
            document.getElementById(
                "home-coins"
            ),

        shopCoins:
            document.getElementById(
                "shop-coins"
            ),

        profileUsername:
            document.getElementById(
                "profile-username"
            ),

        profileUserId:
            document.getElementById(
                "profile-user-id"
            ),

        profileLevel:
            document.getElementById(
                "profile-level"
            ),

        gamePlayerName:
            document.getElementById(
                "game-player-name"
            ),

        headerAvatar:
            document.getElementById(
                "header-avatar"
            ),

        profileAvatar:
            document.getElementById(
                "profile-avatar"
            )

    };


    if (
        elements.headerUsername
    ) {

        elements.headerUsername.textContent =
            user.username;

    }


    if (
        elements.headerLevel
    ) {

        elements.headerLevel.textContent =
            "سطح " +
            user.level;

    }


    if (
        elements.homeUsername
    ) {

        elements.homeUsername.textContent =
            user.username;

    }


    if (
        elements.homeLevel
    ) {

        elements.homeLevel.textContent =
            user.level;

    }


    if (
        elements.homeCoins
    ) {

        elements.homeCoins.textContent =
            Number(
                user.coins || 0
            ).toLocaleString(
                "fa-IR"
            );

    }


    if (
        elements.shopCoins
    ) {

        elements.shopCoins.textContent =
            Number(
                user.coins || 0
            ).toLocaleString(
                "fa-IR"
            );

    }


    if (
        elements.profileUsername
    ) {

        elements.profileUsername.textContent =
            user.username;

    }


    if (
        elements.profileUserId
    ) {

        elements.profileUserId.textContent =
            "ID: " +
            user.id;

    }


    if (
        elements.profileLevel
    ) {

        elements.profileLevel.textContent =
            user.level;

    }


    if (
        elements.gamePlayerName
    ) {

        elements.gamePlayerName.textContent =
            user.username;

    }


    if (
        elements.headerAvatar
    ) {

        elements.headerAvatar.textContent =
            user.avatar || "👤";

    }


    if (
        elements.profileAvatar
    ) {

        elements.profileAvatar.textContent =
            user.avatar || "👤";

    }


    updateXPUI(
        user
    );


    updateStatsUI(
        user
    );

}


/* ============================================================
   UPDATE XP UI
============================================================ */

function updateXPUI(
    user
) {

    const currentXP =
        document.getElementById(
            "current-xp"
        );


    const nextLevelXP =
        document.getElementById(
            "next-level-xp"
        );


    const progress =
        document.getElementById(
            "xp-progress"
        );


    const level =
        Number(
            user.level || 1
        );


    const xp =
        Number(
            user.xp || 0
        );


    const requiredXP =
        level *
        100;


    if (currentXP) {

        currentXP.textContent =
            xp;

    }


    if (nextLevelXP) {

        nextLevelXP.textContent =
            requiredXP;

    }


    if (progress) {

        const percentage =
            Math.min(
                100,
                Math.max(
                    0,
                    (
                        xp /
                        requiredXP
                    ) *
                    100
                )
            );


        progress.style.width =
            percentage +
            "%";

    }

}


/* ============================================================
   UPDATE PROFILE STATS
============================================================ */

function updateStatsUI(
    user
) {

    const games =
        document.getElementById(
            "stat-games"
        );


    const wins =
        document.getElementById(
            "stat-wins"
        );


    const losses =
        document.getElementById(
            "stat-losses"
        );


    const winRate =
        document.getElementById(
            "stat-win-rate"
        );


    const totalGames =
        Number(
            user.games || 0
        );


    const totalWins =
        Number(
            user.wins || 0
        );


    const totalLosses =
        Number(
            user.losses || 0
        );


    const percentage =
        totalGames > 0
            ? (
                totalWins /
                totalGames
            ) *
            100
            : 0;


    if (games) {

        games.textContent =
            totalGames;

    }


    if (wins) {

        wins.textContent =
            totalWins;

    }


    if (losses) {

        losses.textContent =
            totalLosses;

    }


    if (winRate) {

        winRate.textContent =
            percentage.toFixed(1) +
            "%";

    }

}


/* ============================================================
   TOGGLE PASSWORD
============================================================ */

function togglePasswordVisibility(
    inputId,
    buttonId
) {

    const input =
        document.getElementById(
            inputId
        );


    const button =
        document.getElementById(
            buttonId
        );


    if (!input) {
        return;
    }


    const isPassword =
        input.type === "password";


    input.type =
        isPassword
            ? "text"
            : "password";


    if (button) {

        button.textContent =
            isPassword
                ? "🙈"
                : "👁";

        button.setAttribute(
            "aria-label",
            isPassword
                ? "مخفی کردن رمز عبور"
                : "نمایش رمز عبور"
        );

    }

}


/* ============================================================
   HANDLE LOGIN FORM
============================================================ */

async function handleLoginSubmit(
    event
) {

    event.preventDefault();


    clearFormErrors();


    const usernameInput =
        document.getElementById(
            "login-username"
        );


    const passwordInput =
        document.getElementById(
            "login-password"
        );


    const rememberInput =
        document.getElementById(
            "remember-me"
        );


    const username =
        usernameInput
            ? usernameInput.value
            : "";


    const password =
        passwordInput
            ? passwordInput.value
            : "";


    const rememberMe =
        rememberInput
            ? rememberInput.checked
            : false;


    const usernameValidation =
        validateUsername(
            username
        );


    if (
        !usernameValidation.valid
    ) {

        setFormError(
            "login-username-error",
            usernameValidation.message
        );

        if (usernameInput) {
            usernameInput.focus();
        }

        return;

    }


    if (!password) {

        setFormError(
            "login-password-error",
            "رمز عبور را وارد کنید."
        );

        if (passwordInput) {
            passwordInput.focus();
        }

        return;

    }


    try {

        const result =
            await login(
                username,
                password,
                rememberMe
            );


        if (
            result.success
        ) {

            showToast(
                "با موفقیت وارد شدید.",
                "success"
            );


            showMainScreen();

        }

    } catch (error) {

        setFormError(
            "login-password-error",
            error.message
        );


        showToast(
            error.message,
            "error"
        );

    }

}


/* ============================================================
   HANDLE REGISTER FORM
============================================================ */

async function handleRegisterSubmit(
    event
) {

    event.preventDefault();


    clearFormErrors();


    const usernameInput =
        document.getElementById(
            "register-username"
        );


    const emailInput =
        document.getElementById(
            "register-email"
        );


    const passwordInput =
        document.getElementById(
            "register-password"
        );


    const confirmInput =
        document.getElementById(
            "register-password-confirm"
        );


    const termsInput =
        document.getElementById(
            "accept-terms"
        );


    const username =
        usernameInput
            ? usernameInput.value
            : "";


    const email =
        emailInput
            ? emailInput.value
            : "";


    const password =
        passwordInput
            ? passwordInput.value
            : "";


    const confirmation =
        confirmInput
            ? confirmInput.value
            : "";


    const usernameValidation =
        validateUsername(
            username
        );


    if (
        !usernameValidation.valid
    ) {

        setFormError(
            "register-username-error",
            usernameValidation.message
        );

        return;

    }


    const emailValidation =
        validateEmail(
            email
        );


    if (
        !emailValidation.valid
    ) {

        setFormError(
            "register-email-error",
            emailValidation.message
        );

        return;

    }


    const passwordValidation =
        validatePassword(
            password
        );


    if (
        !passwordValidation.valid
    ) {

        setFormError(
            "register-password-error",
            passwordValidation.message
        );

        return;

    }


    const confirmationValidation =
        validatePasswordConfirmation(
            password,
            confirmation
        );


    if (
        !confirmationValidation.valid
    ) {

        setFormError(
            "register-password-confirm-error",
            confirmationValidation.message
        );

        return;

    }


    if (
        !termsInput ||
        !termsInput.checked
    ) {

        showToast(
            "برای ساخت حساب باید قوانین را بپذیرید.",
            "error"
        );

        return;

    }


    try {

        const user =
            await createUser({
                username:
                    username,

                email:
                    email,

                password:
                    password
            });


        createSession(
            user,
            {
                remember:
                    true,

                isGuest:
                    false
            }
        );


        const fullUser =
            findUserById(
                user.id
            );


        AuthState.currentUser =
            sanitizeUser(
                fullUser
            );


        AuthState.isAuthenticated =
            true;


        AuthState.isGuest =
            false;


        showToast(
            "حساب شما با موفقیت ساخته شد.",
            "success"
        );


        showMainScreen();


        dispatchAuthEvent(
            "register",
            AuthState.currentUser
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ============================================================
   HANDLE GUEST LOGIN
============================================================ */

function handleGuestLogin() {

    try {

        const result =
            loginAsGuest();


        if (
            result.success
        ) {

            showToast(
                "به عنوان مهمان وارد شدید.",
                "success"
            );


            showMainScreen();

        }

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ============================================================
   HANDLE FORGOT PASSWORD
============================================================ */

function handleForgotPassword() {

    const email =
        window.prompt(
            "ایمیل حساب خود را وارد کنید:"
        );


    if (!email) {
        return;
    }


    try {

        const result =
            createPasswordResetRequest(
                email
            );


        showToast(
            result.message,
            "info"
        );


        /*
            برای نسخه توسعه:
            اگر Token تولید شده باشد، آن را در Console
            قرار می‌دهیم.

            در نسخه نهایی این Token نباید در Console
            نمایش داده شود.
        */

        if (
            result.token
        ) {

            console.log(
                "[HokmAuth] Development reset token:",
                result.token
            );

        }

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ============================================================
   HANDLE LOGOUT
============================================================ */

function handleLogout() {

    const confirmed =
        window.confirm(
            "آیا می‌خواهید از حساب خود خارج شوید؟"
        );


    if (!confirmed) {
        return;
    }


    logout();

}


/* ============================================================
   CHANGE PASSWORD UI
============================================================ */

async function handleChangePassword() {

    if (
        !isLoggedIn()
    ) {

        showToast(
            "ابتدا وارد حساب شوید.",
            "error"
        );

        return;

    }


    const currentPassword =
        window.prompt(
            "رمز عبور فعلی:"
        );


    if (
        currentPassword === null
    ) {

        return;

    }


    const newPassword =
        window.prompt(
            "رمز عبور جدید:"
        );


    if (
        newPassword === null
    ) {

        return;

    }


    const confirmation =
        window.prompt(
            "رمز عبور جدید را دوباره وارد کنید:"
        );


    if (
        confirmation === null
    ) {

        return;

    }


    try {

        await changePassword(
            currentPassword,
            newPassword,
            confirmation
        );


        showToast(
            "رمز عبور با موفقیت تغییر کرد.",
            "success"
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ============================================================
   EVENT BINDINGS
============================================================ */

function bindAuthEvents() {

    const loginForm =
        document.getElementById(
            "login-form"
        );


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLoginSubmit
        );

    }


    const registerForm =
        document.getElementById(
            "register-form"
        );


    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            handleRegisterSubmit
        );

    }


    const guestButton =
        document.getElementById(
            "guest-login-button"
        );


    if (guestButton) {

        guestButton.addEventListener(
            "click",
            handleGuestLogin
        );

    }


    const showRegisterButton =
        document.getElementById(
            "show-register-button"
        );


    if (showRegisterButton) {

        showRegisterButton.addEventListener(
            "click",
            showRegisterPanel
        );

    }


    const showLoginButton =
        document.getElementById(
            "show-login-button"
        );


    if (showLoginButton) {

        showLoginButton.addEventListener(
            "click",
            showLoginPanel
        );

    }


    const forgotPasswordButton =
        document.getElementById(
            "forgot-password-button"
        );


    if (forgotPasswordButton) {

        forgotPasswordButton.addEventListener(
            "click",
            handleForgotPassword
        );

    }


    const toggleLoginPassword =
        document.getElementById(
            "toggle-login-password"
        );


    if (toggleLoginPassword) {

        toggleLoginPassword.addEventListener(
            "click",
            () =>
                togglePasswordVisibility(
                    "login-password",
                    "toggle-login-password"
                )
        );

    }


    const logoutButton =
        document.getElementById(
            "logout-button"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            handleLogout
        );

    }


    const changePasswordButton =
        document.getElementById(
            "change-password-button"
        );


    if (changePasswordButton) {

        changePasswordButton.addEventListener(
            "click",
            handleChangePassword
        );

    }

}


/* ============================================================
   INITIALIZE AUTH
============================================================ */

function initializeAuth() {

    if (
        AuthState.initialized
    ) {

        return;

    }


    AuthState.initialized =
        true;


    bindAuthEvents();


    const restoredUser =
        restoreSession();


    if (restoredUser) {

        showMainScreen();

        dispatchAuthEvent(
            "session-restored",
            restoredUser
        );

    } else {

        showAuthScreen();

    }


    console.log(
        "[HokmAuth] Authentication system initialized."
    );

}


/* ============================================================
   AUTO INITIALIZE
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAuth
    );

} else {

    initializeAuth();

}


/* ============================================================
   PUBLIC API
============================================================ */

window.HokmAuth = {

    /* Initialization */

    initialize:
        initializeAuth,


    /* Authentication */

    login:
        login,

    loginAsGuest:
        loginAsGuest,

    logout:
        logout,

    register:
        createUser,


    /* Session */

    getSession:
        getSession,

    getCurrentUser:
        getCurrentUser,

    isLoggedIn:
        isLoggedIn,

    isGuest:
        isGuest,

    restoreSession:
        restoreSession,


    /* User */

    findUserByUsername:
        findUserByUsername,

    findUserByEmail:
        findUserByEmail,

    findUserById:
        findUserById,

    updateUser:
        updateUser,


    /* Password */

    changePassword:
        changePassword,

    createPasswordResetRequest:
        createPasswordResetRequest,

    resetPassword:
        resetPassword,


    /* Validation */

    validateUsername:
        validateUsername,

    validateEmail:
        validateEmail,

    validatePassword:
        validatePassword,

    validatePasswordConfirmation:
        validatePasswordConfirmation,


    /* UI */

    showAuthScreen:
        showAuthScreen,

    showMainScreen:
        showMainScreen,

    showLoginPanel:
        showLoginPanel,

    showRegisterPanel:
        showRegisterPanel,

    updateUserUI:
        updateUserUI,


    /* State */

    getState:
        () => ({
            initialized:
                AuthState.initialized,

            currentUser:
                AuthState.currentUser,

            isAuthenticated:
                AuthState.isAuthenticated,

            isGuest:
                AuthState.isGuest,

            loginAttempts:
                AuthState.loginAttempts,

            lockedUntil:
                AuthState.lockedUntil,

            rememberMe:
                AuthState.rememberMe
        })

};


/* ============================================================
   GLOBAL AUTH EVENT EXAMPLE

   سایر فایل‌ها می‌توانند با این Event
   تغییرات احراز هویت را دریافت کنند.

   مثال:

   window.addEventListener(
       "hokm:auth",
       event => {
           console.log(event.detail);
       }
   );
============================================================ */

window.addEventListener(
    "hokm:auth",
    function(event) {

        if (
            !event ||
            !event.detail
        ) {

            return;

        }


        console.log(
            "[HokmAuth Event]",
            event.detail.type
        );

    }
);


/* ============================================================
   END OF auth.js
============================================================ */
