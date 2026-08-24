/* ============================================================
   HOKM ONLINE
   SHOP SYSTEM
   FILE: shop.js
   STAGE: 9

   توضیح:
   این فایل سیستم کامل فروشگاه بازی حکم است.

   امکانات:
   - فروش سکه
   - آیتم‌های بازی
   - آواتارها
   - خرید آیتم
   - جلوگیری از خرید تکراری
   - موجودی کاربر
   - قیمت‌گذاری
   - تخفیف
   - آیتم ویژه
   - مالکیت آیتم‌ها
   - انتخاب آواتار
   - ذخیره اطلاعات
   - اتصال به wallet.js
   - اتصال به profile.js
   - اتصال به storage.js
   - نمایش فروشگاه داخل shop-page
   - مدیریت تب‌های فروشگاه
   - پیام‌های موفقیت و خطا
   - سیستم خرید امن در سمت کلاینت
   - آماده برای اتصال به سرور در مراحل بعد
============================================================ */


/* ============================================================
   1. SHOP CONFIGURATION
============================================================ */

const SHOP_CONFIG = {

    version: "1.0.0",

    currency: {
        coins: "coins"
    },

    defaultTab: "coins",

    tabs: [
        "coins",
        "items",
        "avatars"
    ],

    storageKey: "hokm_shop_data",

    ownedItemsStorageKey: "hokm_owned_shop_items",

    selectedAvatarStorageKey: "hokm_selected_avatar",

    featuredItemDuration: 24 * 60 * 60 * 1000,

    enableDemoPurchases: true,

    enableAnimations: true
};


/* ============================================================
   2. COIN PACKAGES
============================================================ */

const SHOP_COIN_PACKAGES = [

    {
        id: "coins_1000",
        type: "coins",
        name: "بسته کوچک",
        description: "۱۰۰۰ سکه برای شروع",
        amount: 1000,
        price: 0,
        currency: "free",
        icon: "🪙",
        badge: "رایگان",
        featured: false
    },

    {
        id: "coins_5000",
        type: "coins",
        name: "بسته استاندارد",
        description: "۵۰۰۰ سکه",
        amount: 5000,
        price: 100,
        currency: "premium",
        icon: "🪙",
        badge: "محبوب",
        featured: true
    },

    {
        id: "coins_12000",
        type: "coins",
        name: "بسته بزرگ",
        description: "۱۲۰۰۰ سکه",
        amount: 12000,
        price: 200,
        currency: "premium",
        icon: "💰",
        badge: "ارزشمند",
        featured: false
    },

    {
        id: "coins_30000",
        type: "coins",
        name: "بسته حرفه‌ای",
        description: "۳۰۰۰۰ سکه",
        amount: 30000,
        price: 450,
        currency: "premium",
        icon: "💎",
        badge: "ویژه",
        featured: false
    },

    {
        id: "coins_75000",
        type: "coins",
        name: "بسته افسانه‌ای",
        description: "۷۵۰۰۰ سکه",
        amount: 75000,
        price: 900,
        currency: "premium",
        icon: "👑",
        badge: "بهترین ارزش",
        featured: false
    }

];


/* ============================================================
   3. GAME ITEMS
============================================================ */

const SHOP_ITEMS = [

    {
        id: "lucky_card",
        type: "item",
        name: "کارت شانس",
        description: "یک آیتم تزئینی ویژه برای پروفایل",
        price: 500,
        currency: "coins",
        icon: "🍀",
        rarity: "common",
        stackable: false
    },

    {
        id: "gold_card_back",
        type: "item",
        name: "پشت کارت طلایی",
        description: "ظاهر ویژه برای پشت کارت‌ها",
        price: 2500,
        currency: "coins",
        icon: "🃏",
        rarity: "rare",
        stackable: false
    },

    {
        id: "royal_card_back",
        type: "item",
        name: "پشت کارت سلطنتی",
        description: "پوسته سلطنتی برای کارت‌های بازی",
        price: 5000,
        currency: "coins",
        icon: "👑",
        rarity: "epic",
        stackable: false
    },

    {
        id: "fire_effect",
        type: "item",
        name: "افکت آتش",
        description: "افکت ویژه هنگام پیروزی",
        price: 3500,
        currency: "coins",
        icon: "🔥",
        rarity: "epic",
        stackable: false
    },

    {
        id: "victory_crown",
        type: "item",
        name: "تاج پیروزی",
        description: "نمایش تاج ویژه پس از برد",
        price: 7500,
        currency: "coins",
        icon: "👑",
        rarity: "legendary",
        stackable: false
    },

    {
        id: "golden_table",
        type: "item",
        name: "میز طلایی",
        description: "پوسته اختصاصی میز بازی",
        price: 10000,
        currency: "coins",
        icon: "🏆",
        rarity: "legendary",
        stackable: false
    }

];


/* ============================================================
   4. AVATARS
============================================================ */

const SHOP_AVATARS = [

    {
        id: "avatar_default",
        type: "avatar",
        name: "بازیکن کلاسیک",
        description: "آواتار پیش‌فرض",
        price: 0,
        currency: "coins",
        icon: "👤",
        rarity: "common",
        default: true
    },

    {
        id: "avatar_king",
        type: "avatar",
        name: "شاه حکم",
        description: "آواتار ویژه شاه",
        price: 2500,
        currency: "coins",
        icon: "🤴",
        rarity: "rare"
    },

    {
        id: "avatar_queen",
        type: "avatar",
        name: "ملکه حکم",
        description: "آواتار ویژه ملکه",
        price: 2500,
        currency: "coins",
        icon: "👸",
        rarity: "rare"
    },

    {
        id: "avatar_ace",
        type: "avatar",
        name: "آس",
        description: "آواتار ویژه آس",
        price: 5000,
        currency: "coins",
        icon: "🂡",
        rarity: "epic"
    },

    {
        id: "avatar_royal",
        type: "avatar",
        name: "سلطنتی",
        description: "آواتار سلطنتی",
        price: 7500,
        currency: "coins",
        icon: "👑",
        rarity: "legendary"
    },

    {
        id: "avatar_champion",
        type: "avatar",
        name: "قهرمان",
        description: "آواتار مخصوص بازیکنان حرفه‌ای",
        price: 12000,
        currency: "coins",
        icon: "🏆",
        rarity: "legendary"
    }

];


/* ============================================================
   5. SHOP STATE
============================================================ */

const shopState = {

    initialized: false,

    currentTab: SHOP_CONFIG.defaultTab,

    ownedItems: [],

    selectedAvatar: "avatar_default",

    purchasedCoinPackages: [],

    processingPurchase: false,

    lastPurchase: null,

    shopData: {},

    initializedAt: null
};


/* ============================================================
   6. STORAGE HELPERS
============================================================ */

function shopStorageRead(key, fallback = null) {

    try {

        const raw = localStorage.getItem(key);

        if (!raw) {
            return fallback;
        }

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            "Shop storage read error:",
            error
        );

        return fallback;
    }
}


function shopStorageWrite(key, value) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

        return true;

    } catch (error) {

        console.error(
            "Shop storage write error:",
            error
        );

        return false;
    }
}


function shopStorageRemove(key) {

    try {

        localStorage.removeItem(key);

        return true;

    } catch (error) {

        console.error(
            "Shop storage remove error:",
            error
        );

        return false;
    }
}


/* ============================================================
   7. SHOP DATA LOADING
============================================================ */

function loadShopData() {

    const savedData = shopStorageRead(
        SHOP_CONFIG.storageKey,
        {}
    );

    shopState.shopData = savedData || {};

    const ownedItems = shopStorageRead(
        SHOP_CONFIG.ownedItemsStorageKey,
        []
    );

    if (Array.isArray(ownedItems)) {

        shopState.ownedItems = ownedItems;

    } else {

        shopState.ownedItems = [];
    }


    const selectedAvatar = shopStorageRead(
        SHOP_CONFIG.selectedAvatarStorageKey,
        "avatar_default"
    );

    if (selectedAvatar) {

        shopState.selectedAvatar = selectedAvatar;

    }


    const defaultAvatarExists =
        shopState.ownedItems.includes(
            "avatar_default"
        );

    if (!defaultAvatarExists) {

        shopState.ownedItems.push(
            "avatar_default"
        );

        saveOwnedShopItems();
    }


    shopState.initializedAt =
        Date.now();
}


/* ============================================================
   8. SAVE SHOP DATA
============================================================ */

function saveShopData() {

    return shopStorageWrite(
        SHOP_CONFIG.storageKey,
        shopState.shopData
    );
}


function saveOwnedShopItems() {

    return shopStorageWrite(
        SHOP_CONFIG.ownedItemsStorageKey,
        shopState.ownedItems
    );
}


function saveSelectedAvatar() {

    return shopStorageWrite(
        SHOP_CONFIG.selectedAvatarStorageKey,
        shopState.selectedAvatar
    );
}


/* ============================================================
   9. GET ALL SHOP PRODUCTS
============================================================ */

function getAllShopProducts() {

    return [
        ...SHOP_COIN_PACKAGES,
        ...SHOP_ITEMS,
        ...SHOP_AVATARS
    ];
}


function getShopProductById(productId) {

    return getAllShopProducts().find(
        product => product.id === productId
    ) || null;
}


/* ============================================================
   10. PRODUCT OWNERSHIP
============================================================ */

function ownsShopItem(itemId) {

    return shopState.ownedItems.includes(
        itemId
    );
}


function addOwnedShopItem(itemId) {

    if (!ownsShopItem(itemId)) {

        shopState.ownedItems.push(
            itemId
        );

        saveOwnedShopItems();
    }
}


function removeOwnedShopItem(itemId) {

    shopState.ownedItems =
        shopState.ownedItems.filter(
            id => id !== itemId
        );

    saveOwnedShopItems();
}


/* ============================================================
   11. SHOP TAB MANAGEMENT
============================================================ */

function setShopTab(tabName) {

    if (!SHOP_CONFIG.tabs.includes(tabName)) {

        tabName = SHOP_CONFIG.defaultTab;
    }

    shopState.currentTab = tabName;

    updateShopTabButtons();

    renderShopContent();
}


function updateShopTabButtons() {

    const tabs =
        document.querySelectorAll(
            ".shop-tab"
        );

    tabs.forEach(tab => {

        const tabName =
            tab.dataset.shopTab;

        if (
            tabName ===
            shopState.currentTab
        ) {

            tab.classList.add("active");

        } else {

            tab.classList.remove("active");
        }

    });
}


/* ============================================================
   12. SHOP CONTENT RENDERER
============================================================ */

function renderShopContent() {

    const container =
        document.getElementById(
            "shop-content"
        );

    if (!container) {
        return;
    }


    let html = "";


    if (
        shopState.currentTab ===
        "coins"
    ) {

        html =
            renderCoinPackages();

    } else if (
        shopState.currentTab ===
        "items"
    ) {

        html =
            renderGameItems();

    } else if (
        shopState.currentTab ===
        "avatars"
    ) {

        html =
            renderAvatars();
    }


    container.innerHTML = html;


    attachShopProductEvents();
}


/* ============================================================
   13. RENDER COIN PACKAGES
============================================================ */

function renderCoinPackages() {

    return `

        <div class="shop-section">

            <div class="shop-section-header">

                <h2>
                    خرید سکه
                </h2>

                <p>
                    سکه مورد نیازت برای بازی و آیتم‌ها را تهیه کن.
                </p>

            </div>


            <div class="shop-grid">

                ${SHOP_COIN_PACKAGES.map(
                    product =>
                        renderCoinPackageCard(
                            product
                        )
                ).join("")}

            </div>

        </div>

    `;
}


/* ============================================================
   14. RENDER COIN PACKAGE CARD
============================================================ */

function renderCoinPackageCard(
    product
) {

    const isFree =
        product.price === 0;


    const featured =
        product.featured
            ? "featured"
            : "";


    return `

        <article
            class="shop-product-card coin-package-card ${featured}"
            data-product-id="${product.id}"
        >

            ${
                product.badge
                    ? `
                        <span class="shop-product-badge">
                            ${escapeShopHTML(product.badge)}
                        </span>
                    `
                    : ""
            }


            <div class="shop-product-icon">
                ${product.icon}
            </div>


            <h3>
                ${escapeShopHTML(product.name)}
            </h3>


            <p>
                ${escapeShopHTML(product.description)}
            </p>


            <div class="coin-package-amount">

                <span>
                    🪙
                </span>

                <strong>
                    ${formatShopNumber(product.amount)}
                </strong>

            </div>


            <div class="shop-product-price">

                ${
                    isFree
                        ? `
                            <span class="free-price">
                                رایگان
                            </span>
                        `
                        : `
                            <span>
                                ${formatShopNumber(product.price)}
                                💎
                            </span>
                        `
                }

            </div>


            <button
                type="button"
                class="shop-buy-button"
                data-buy-product="${product.id}"
            >

                ${
                    isFree
                        ? "دریافت"
                        : "خرید"
                }

            </button>

        </article>

    `;
}


/* ============================================================
   15. RENDER GAME ITEMS
============================================================ */

function renderGameItems() {

    return `

        <div class="shop-section">

            <div class="shop-section-header">

                <h2>
                    آیتم‌های بازی
                </h2>

                <p>
                    آیتم‌های ویژه برای شخصی‌سازی تجربه بازی.
                </p>

            </div>


            <div class="shop-grid">

                ${SHOP_ITEMS.map(
                    product =>
                        renderGenericProductCard(
                            product
                        )
                ).join("")}

            </div>

        </div>

    `;
}


/* ============================================================
   16. RENDER AVATARS
============================================================ */

function renderAvatars() {

    return `

        <div class="shop-section">

            <div class="shop-section-header">

                <h2>
                    آواتارها
                </h2>

                <p>
                    آواتار خودت را انتخاب کن.
                </p>

            </div>


            <div class="shop-grid avatar-shop-grid">

                ${SHOP_AVATARS.map(
                    product =>
                        renderAvatarCard(
                            product
                        )
                ).join("")}

            </div>

        </div>

    `;
}


/* ============================================================
   17. GENERIC PRODUCT CARD
============================================================ */

function renderGenericProductCard(
    product
) {

    const owned =
        ownsShopItem(product.id);


    const rarityClass =
        `rarity-${product.rarity || "common"}`;


    return `

        <article
            class="shop-product-card ${rarityClass}"
            data-product-id="${product.id}"
        >

            <div class="shop-product-icon">
                ${product.icon}
            </div>


            <span class="item-rarity">
                ${getRarityLabel(product.rarity)}
            </span>


            <h3>
                ${escapeShopHTML(product.name)}
            </h3>


            <p>
                ${escapeShopHTML(product.description)}
            </p>


            <div class="shop-product-price">

                ${
                    owned
                        ? `
                            <span class="owned-label">
                                ✓ در اختیار شما
                            </span>
                        `
                        : `
                            <span>
                                🪙
                                ${formatShopNumber(product.price)}
                            </span>
                        `
                }

            </div>


            <button
                type="button"
                class="shop-buy-button ${
                    owned ? "owned-button" : ""
                }"
                data-buy-product="${product.id}"
                ${owned ? "disabled" : ""}
            >

                ${
                    owned
                        ? "خریداری شده"
                        : "خرید"
                }

            </button>

        </article>

    `;
}


/* ============================================================
   18. RENDER AVATAR CARD
============================================================ */

function renderAvatarCard(
    product
) {

    const owned =
        ownsShopItem(product.id);


    const selected =
        shopState.selectedAvatar ===
        product.id;


    return `

        <article
            class="shop-product-card avatar-card ${
                selected ? "selected-avatar" : ""
            }"
            data-product-id="${product.id}"
        >

            ${
                selected
                    ? `
                        <span class="selected-avatar-badge">
                            ✓ انتخاب شده
                        </span>
                    `
                    : ""
            }


            <div class="shop-avatar-preview">
                ${product.icon}
            </div>


            <span class="item-rarity">
                ${getRarityLabel(product.rarity)}
            </span>


            <h3>
                ${escapeShopHTML(product.name)}
            </h3>


            <p>
                ${escapeShopHTML(product.description)}
            </p>


            <div class="shop-product-price">

                ${
                    product.price === 0
                        ? `
                            <span>
                                رایگان
                            </span>
                        `
                        : `
                            <span>
                                🪙
                                ${formatShopNumber(product.price)}
                            </span>
                        `
                }

            </div>


            <button
                type="button"
                class="shop-buy-button ${
                    selected
                        ? "owned-button"
                        : ""
                }"
                data-avatar-action="${product.id}"
            >

                ${
                    selected
                        ? "انتخاب شده"
                        : owned
                            ? "انتخاب"
                            : "خرید"
                }

            </button>

        </article>

    `;
}


/* ============================================================
   19. RARITY LABEL
============================================================ */

function getRarityLabel(
    rarity
) {

    switch (rarity) {

        case "common":
            return "معمولی";

        case "rare":
            return "کمیاب";

        case "epic":
            return "حماسی";

        case "legendary":
            return "افسانه‌ای";

        default:
            return "معمولی";
    }
}


/* ============================================================
   20. ATTACH SHOP EVENTS
============================================================ */

function attachShopProductEvents() {

    const buyButtons =
        document.querySelectorAll(
            "[data-buy-product]"
        );


    buyButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const productId =
                        this.dataset.buyProduct;

                    handleShopPurchase(
                        productId
                    );
                }
            );

        }
    );


    const avatarButtons =
        document.querySelectorAll(
            "[data-avatar-action]"
        );


    avatarButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const avatarId =
                        this.dataset.avatarAction;

                    handleAvatarAction(
                        avatarId
                    );
                }
            );

        }
    );
}


/* ============================================================
   21. PURCHASE HANDLER
============================================================ */

async function handleShopPurchase(
    productId
) {

    if (shopState.processingPurchase) {

        showShopToast(
            "در حال پردازش خرید قبلی هستید.",
            "warning"
        );

        return;
    }


    const product =
        getShopProductById(productId);


    if (!product) {

        showShopToast(
            "محصول موردنظر پیدا نشد.",
            "error"
        );

        return;
    }


    if (
        product.type !== "coins" &&
        ownsShopItem(product.id)
    ) {

        showShopToast(
            "این آیتم قبلاً خریداری شده است.",
            "info"
        );

        return;
    }


    shopState.processingPurchase = true;


    try {

        if (
            product.type === "coins"
        ) {

            await purchaseCoinPackage(
                product
            );

        } else {

            await purchaseRegularItem(
                product
            );
        }


        shopState.lastPurchase = {

            productId:
                product.id,

            timestamp:
                Date.now()

        };


        saveShopData();


    } catch (error) {

        console.error(
            "Purchase error:",
            error
        );


        showShopToast(
            "خرید انجام نشد.",
            "error"
        );

    } finally {

        shopState.processingPurchase = false;

    }
}


/* ============================================================
   22. PURCHASE COINS
============================================================ */

async function purchaseCoinPackage(
    product
) {

    if (
        product.price === 0
    ) {

        addCoinsToWallet(
            product.amount
        );

        shopState.purchasedCoinPackages.push(
            product.id
        );

        saveShopData();


        showShopToast(
            `${formatShopNumber(product.amount)} سکه دریافت شد.`,
            "success"
        );


        updateShopCoinBalance();

        return;
    }


    /*
        در این مرحله سیستم پرداخت واقعی
        هنوز به درگاه سرور متصل نشده است.

        فعلاً منطق داخلی آماده است و در مرحله
        پرداخت آنلاین به backend متصل خواهد شد.
    */


    if (
        !SHOP_CONFIG.enableDemoPurchases
    ) {

        showShopToast(
            "پرداخت آنلاین هنوز فعال نشده است.",
            "info"
        );

        return;
    }


    const confirmed =
        await showShopPurchaseConfirmation(
            product
        );


    if (!confirmed) {
        return;
    }


    addCoinsToWallet(
        product.amount
    );


    shopState.purchasedCoinPackages.push(
        product.id
    );


    saveShopData();


    showShopToast(
        `${formatShopNumber(product.amount)} سکه به حساب شما اضافه شد.`,
        "success"
    );


    updateShopCoinBalance();
}


/* ============================================================
   23. PURCHASE REGULAR ITEM
============================================================ */

async function purchaseRegularItem(
    product
) {

    const currentCoins =
        getCurrentShopCoins();


    if (
        currentCoins <
        product.price
    ) {

        showShopToast(
            "سکه کافی ندارید.",
            "error"
        );

        return;
    }


    const confirmed =
        await showShopPurchaseConfirmation(
            product
        );


    if (!confirmed) {
        return;
    }


    const paymentResult =
        removeCoinsFromWallet(
            product.price
        );


    if (!paymentResult) {

        showShopToast(
            "پرداخت انجام نشد.",
            "error"
        );

        return;
    }


    addOwnedShopItem(
        product.id
    );


    saveOwnedShopItems();


    showShopToast(
        `${product.name} با موفقیت خریداری شد.`,
        "success"
    );


    renderShopContent();


    updateShopCoinBalance();
}


/* ============================================================
   24. AVATAR ACTION
============================================================ */

async function handleAvatarAction(
    avatarId
) {

    const avatar =
        getShopProductById(
            avatarId
        );


    if (!avatar) {

        showShopToast(
            "آواتار پیدا نشد.",
            "error"
        );

        return;
    }


    if (
        shopState.selectedAvatar ===
        avatarId
    ) {

        return;
    }


    if (
        !ownsShopItem(avatarId)
    ) {

        await handleShopPurchase(
            avatarId
        );


        if (
            !ownsShopItem(avatarId)
        ) {

            return;
        }
    }


    selectAvatar(
        avatarId
    );
}


/* ============================================================
   25. SELECT AVATAR
============================================================ */

function selectAvatar(
    avatarId
) {

    const avatar =
        getShopProductById(
            avatarId
        );


    if (!avatar) {
        return false;
    }


    if (
        !ownsShopItem(avatarId)
    ) {

        showShopToast(
            "ابتدا این آواتار را خریداری کنید.",
            "warning"
        );

        return false;
    }


    shopState.selectedAvatar =
        avatarId;


    saveSelectedAvatar();


    applySelectedAvatar(
        avatar
    );


    renderShopContent();


    showShopToast(
        `آواتار ${avatar.name} انتخاب شد.`,
        "success"
    );


    return true;
}


/* ============================================================
   26. APPLY SELECTED AVATAR
============================================================ */

function applySelectedAvatar(
    avatar
) {

    if (!avatar) {
        return;
    }


    const selectors = [

        "#profile-avatar",

        "#header-avatar",

        ".summary-avatar",

        ".game-player-avatar"

    ];


    selectors.forEach(
        selector => {

            const elements =
                document.querySelectorAll(
                    selector
                );


            elements.forEach(
                element => {

                    element.textContent =
                        avatar.icon;

                }
            );

        }
    );


    /*
        اتصال اختیاری به profile.js
    */


    if (
        typeof window.updateProfileAvatar ===
        "function"
    ) {

        try {

            window.updateProfileAvatar(
                avatar.icon
            );

        } catch (error) {

            console.warn(
                "Profile avatar update failed:",
                error
            );
        }
    }
}


/* ============================================================
   27. GET CURRENT AVATAR
============================================================ */

function getCurrentAvatar() {

    return getShopProductById(
        shopState.selectedAvatar
    );
}


/* ============================================================
   28. WALLET INTEGRATION
============================================================ */

function getCurrentShopCoins() {

    /*
        ابتدا تلاش می‌کنیم از wallet.js
        استفاده کنیم.
    */

    if (
        typeof window.getWalletBalance ===
        "function"
    ) {

        try {

            const balance =
                window.getWalletBalance();

            if (
                typeof balance ===
                "number"
            ) {

                return balance;
            }

        } catch (error) {

            console.warn(
                "Wallet balance function failed:",
                error
            );
        }
    }


    /*
        پشتیبانی از نام‌های احتمالی دیگر
    */

    if (
        typeof window.getCoinBalance ===
        "function"
    ) {

        try {

            const balance =
                window.getCoinBalance();

            if (
                typeof balance ===
                "number"
            ) {

                return balance;
            }

        } catch (error) {

            console.warn(
                "Coin balance function failed:",
                error
            );
        }
    }


    /*
        fallback
    */

    const storedWallet =
        shopStorageRead(
            "hokm_wallet",
            null
        );


    if (
        storedWallet &&
        typeof storedWallet.coins ===
        "number"
    ) {

        return storedWallet.coins;
    }


    const storedProfile =
        shopStorageRead(
            "hokm_profile",
            null
        );


    if (
        storedProfile &&
        typeof storedProfile.coins ===
        "number"
    ) {

        return storedProfile.coins;
    }


    return 0;
}


/* ============================================================
   29. ADD COINS
============================================================ */

function addCoinsToWallet(
    amount
) {

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        return false;
    }


    /*
        اتصال مستقیم به wallet.js
    */

    if (
        typeof window.addCoins ===
        "function"
    ) {

        try {

            const result =
                window.addCoins(
                    amount,
                    "shop_purchase"
                );


            if (
                result !== false
            ) {

                return true;
            }

        } catch (error) {

            console.warn(
                "wallet.addCoins failed:",
                error
            );
        }
    }


    if (
        typeof window.walletAddCoins ===
        "function"
    ) {

        try {

            const result =
                window.walletAddCoins(
                    amount
                );


            if (
                result !== false
            ) {

                return true;
            }

        } catch (error) {

            console.warn(
                "walletAddCoins failed:",
                error
            );
        }
    }


    /*
        fallback local wallet
    */

    const wallet =
        shopStorageRead(
            "hokm_wallet",
            {
                coins: 0
            }
        );


    wallet.coins =
        Number(wallet.coins || 0) +
        amount;


    shopStorageWrite(
        "hokm_wallet",
        wallet
    );


    updateWalletUIFallback();


    return true;
}


/* ============================================================
   30. REMOVE COINS
============================================================ */

function removeCoinsFromWallet(
    amount
) {

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        return false;
    }


    const currentCoins =
        getCurrentShopCoins();


    if (
        currentCoins <
        amount
    ) {

        return false;
    }


    if (
        typeof window.removeCoins ===
        "function"
    ) {

        try {

            const result =
                window.removeCoins(
                    amount,
                    "shop_purchase"
                );


            if (
                result !== false
            ) {

                return true;
            }

        } catch (error) {

            console.warn(
                "wallet.removeCoins failed:",
                error
            );
        }
    }


    if (
        typeof window.walletRemoveCoins ===
        "function"
    ) {

        try {

            const result =
                window.walletRemoveCoins(
                    amount
                );


            if (
                result !== false
            ) {

                return true;
            }

        } catch (error) {

            console.warn(
                "walletRemoveCoins failed:",
                error
            );
        }
    }


    /*
        fallback
    */

    const wallet =
        shopStorageRead(
            "hokm_wallet",
            {
                coins: currentCoins
            }
        );


    wallet.coins =
        Math.max(
            0,
            Number(wallet.coins || 0) -
            amount
        );


    shopStorageWrite(
        "hokm_wallet",
        wallet
    );


    updateWalletUIFallback();


    return true;
}


/* ============================================================
   31. UPDATE WALLET UI
============================================================ */

function updateWalletUIFallback() {

    const balance =
        getCurrentShopCoins();


    const selectors = [

        "#shop-coins",

        "#home-coins",

        "#header-coins",

        "#wallet-coins"

    ];


    selectors.forEach(
        selector => {

            const elements =
                document.querySelectorAll(
                    selector
                );


            elements.forEach(
                element => {

                    element.textContent =
                        formatShopNumber(
                            balance
                        );

                }
            );

        }
    );
}


/* ============================================================
   32. UPDATE SHOP COIN BALANCE
============================================================ */

function updateShopCoinBalance() {

    updateWalletUIFallback();


    if (
        typeof window.updateWalletUI ===
        "function"
    ) {

        try {

            window.updateWalletUI();

        } catch (error) {

            console.warn(
                "Wallet UI update failed:",
                error
            );
        }
    }


    if (
        typeof window.updateProfileCoins ===
        "function"
    ) {

        try {

            window.updateProfileCoins(
                getCurrentShopCoins()
            );

        } catch (error) {

            console.warn(
                "Profile coin update failed:",
                error
            );
        }
    }
}


/* ============================================================
   33. PURCHASE CONFIRMATION
============================================================ */

function showShopPurchaseConfirmation(
    product
) {

    return new Promise(
        resolve => {

            /*
                اگر confirmation modal پروژه وجود داشته باشد،
                از همان استفاده می‌کنیم.
            */

            const modal =
                document.getElementById(
                    "confirmation-modal"
                );


            const title =
                document.getElementById(
                    "confirmation-title"
                );


            const message =
                document.getElementById(
                    "confirmation-message"
                );


            const confirmButton =
                document.getElementById(
                    "confirmation-confirm"
                );


            const cancelButton =
                document.getElementById(
                    "confirmation-cancel"
                );


            if (
                !modal ||
                !title ||
                !message ||
                !confirmButton ||
                !cancelButton
            ) {

                /*
                    fallback ساده
                */

                const result =
                    window.confirm(
                        `آیا می‌خواهید ${product.name} را خریداری کنید؟`
                    );


                resolve(result);

                return;
            }


            title.textContent =
                "تأیید خرید";


            let priceText = "";


            if (
                product.type ===
                "coins"
            ) {

                if (
                    product.price === 0
                ) {

                    priceText =
                        "این بسته رایگان است.";

                } else {

                    priceText =
                        `هزینه: ${formatShopNumber(product.price)} 💎`;
                }

            } else {

                priceText =
                    `هزینه: ${formatShopNumber(product.price)} 🪙`;
            }


            message.textContent =
                `آیا مطمئن هستید که «${product.name}» را می‌خواهید؟ ${priceText}`;


            modal.classList.remove(
                "hidden"
            );


            let finished = false;


            const cleanup =
                () => {

                    if (finished) {
                        return;
                    }


                    finished = true;


                    modal.classList.add(
                        "hidden"
                    );


                    confirmButton.onclick =
                        null;

                    cancelButton.onclick =
                        null;
                };


            confirmButton.onclick =
                () => {

                    cleanup();

                    resolve(true);
                };


            cancelButton.onclick =
                () => {

                    cleanup();

                    resolve(false);
                };

        }
    );
}


/* ============================================================
   34. TOAST SYSTEM
============================================================ */

function showShopToast(
    message,
    type = "info"
) {

    /*
        استفاده از toast سیستم اصلی در صورت وجود
    */

    if (
        typeof window.showToast ===
        "function"
    ) {

        try {

            window.showToast(
                message,
                type
            );

            return;

        } catch (error) {

            console.warn(
                "Global toast failed:",
                error
            );
        }
    }


    const container =
        document.getElementById(
            "toast-container"
        );


    if (!container) {

        console.log(
            `[SHOP ${type}]`,
            message
        );

        return;
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast toast-${type}`;


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );

        }
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
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
   35. FORMAT NUMBERS
============================================================ */

function formatShopNumber(
    value
) {

    const number =
        Number(value || 0);


    try {

        return number.toLocaleString(
            "fa-IR"
        );

    } catch (error) {

        return String(number);
    }
}


/* ============================================================
   36. ESCAPE HTML
============================================================ */

function escapeShopHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)
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


/* ============================================================
   37. SHOP NAVIGATION
============================================================ */

function openShopPage() {

    /*
        تلاش برای استفاده از سیستم navigation اصلی
    */

    if (
        typeof window.navigateToPage ===
        "function"
    ) {

        try {

            window.navigateToPage(
                "shop"
            );

            updateShopCoinBalance();

            return true;

        } catch (error) {

            console.warn(
                "navigateToPage failed:",
                error
            );
        }
    }


    const pages =
        document.querySelectorAll(
            ".page"
        );


    pages.forEach(
        page => {

            page.classList.add(
                "hidden"
            );

            page.classList.remove(
                "active-page"
            );

        }
    );


    const shopPage =
        document.getElementById(
            "shop-page"
        );


    if (shopPage) {

        shopPage.classList.remove(
            "hidden"
        );

        shopPage.classList.add(
            "active-page"
        );
    }


    updateShopCoinBalance();


    return true;
}


/* ============================================================
   38. SHOP HEADER BALANCE
============================================================ */

function renderShopHeaderBalance() {

    const balance =
        getCurrentShopCoins();


    const element =
        document.getElementById(
            "shop-coins"
        );


    if (element) {

        element.textContent =
            formatShopNumber(
                balance
            );
    }
}


/* ============================================================
   39. INITIALIZE SHOP TABS
============================================================ */

function initializeShopTabs() {

    const tabs =
        document.querySelectorAll(
            ".shop-tab"
        );


    tabs.forEach(
        tab => {

            tab.addEventListener(
                "click",
                () => {

                    const tabName =
                        tab.dataset.shopTab;

                    setShopTab(
                        tabName
                    );

                }
            );

        }
    );
}


/* ============================================================
   40. SHOP NAVIGATION BUTTONS
============================================================ */

function initializeShopNavigation() {

    const shopButtons =
        document.querySelectorAll(
            '[data-page-target="shop"]'
        );


    shopButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    openShopPage();

                }
            );

        }
    );


    const shopPageButtons = [

        "shop-button",

        "open-shop-button",

        "wallet-shop-button"

    ];


    shopPageButtons.forEach(
        id => {

            const button =
                document.getElementById(
                    id
                );


            if (!button) {
                return;
            }


            button.addEventListener(
                "click",
                openShopPage
            );

        }
    );
}


/* ============================================================
   41. UPDATE HOME COINS
============================================================ */

function updateHomeCoins() {

    const balance =
        getCurrentShopCoins();


    const homeCoins =
        document.getElementById(
            "home-coins"
        );


    if (homeCoins) {

        homeCoins.textContent =
            formatShopNumber(
                balance
            );
    }


    const shopCoins =
        document.getElementById(
            "shop-coins"
        );


    if (shopCoins) {

        shopCoins.textContent =
            formatShopNumber(
                balance
            );
    }
}


/* ============================================================
   42. SHOP INITIALIZATION
============================================================ */

function initializeShop() {

    if (
        shopState.initialized
    ) {

        return;
    }


    loadShopData();


    initializeShopTabs();


    initializeShopNavigation();


    renderShopContent();


    renderShopHeaderBalance();


    updateShopCoinBalance();


    const avatar =
        getCurrentAvatar();


    if (avatar) {

        applySelectedAvatar(
            avatar
        );
    }


    shopState.initialized =
        true;


    console.log(
        "Hokm Shop initialized successfully."
    );
}


/* ============================================================
   43. DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeShop();

    }
);


/* ============================================================
   44. STORAGE EVENT
============================================================ */

window.addEventListener(
    "storage",
    event => {

        if (
            event.key ===
            SHOP_CONFIG.ownedItemsStorageKey
        ) {

            const items =
                shopStorageRead(
                    SHOP_CONFIG.ownedItemsStorageKey,
                    []
                );


            if (
                Array.isArray(items)
            ) {

                shopState.ownedItems =
                    items;

                renderShopContent();
            }
        }


        if (
            event.key ===
            SHOP_CONFIG.selectedAvatarStorageKey
        ) {

            const avatarId =
                shopStorageRead(
                    SHOP_CONFIG.selectedAvatarStorageKey,
                    "avatar_default"
                );


            shopState.selectedAvatar =
                avatarId;


            const avatar =
                getCurrentAvatar();


            if (avatar) {

                applySelectedAvatar(
                    avatar
                );
            }


            renderShopContent();
        }


        if (
            event.key ===
            "hokm_wallet"
        ) {

            updateShopCoinBalance();

        }

    }
);


/* ============================================================
   45. PUBLIC SHOP API
============================================================ */

window.HokmShop = {

    config:
        SHOP_CONFIG,

    state:
        shopState,

    coinPackages:
        SHOP_COIN_PACKAGES,

    items:
        SHOP_ITEMS,

    avatars:
        SHOP_AVATARS,

    initialize:
        initializeShop,

    open:
        openShopPage,

    setTab:
        setShopTab,

    render:
        renderShopContent,

    purchase:
        handleShopPurchase,

    selectAvatar:
        selectAvatar,

    getProduct:
        getShopProductById,

    getProducts:
        getAllShopProducts,

    owns:
        ownsShopItem,

    getCoins:
        getCurrentShopCoins,

    getAvatar:
        getCurrentAvatar,

    addCoins:
        addCoinsToWallet,

    removeCoins:
        removeCoinsFromWallet

};


/* ============================================================
   46. GLOBAL COMPATIBILITY FUNCTIONS
============================================================ */

window.openShop =
    openShopPage;


window.openShopPage =
    openShopPage;


window.renderShop =
    renderShopContent;


window.buyShopItem =
    handleShopPurchase;


window.selectShopAvatar =
    selectAvatar;


window.getShopCoins =
    getCurrentShopCoins;


window.getCurrentAvatar =
    getCurrentAvatar;


/* ============================================================
   47. SHOP DEBUG FUNCTIONS
   فقط برای توسعه
============================================================ */

window.ShopDebug = {

    getState() {

        return {
            ...shopState
        };

    },


    getProducts() {

        return getAllShopProducts();

    },


    getOwnedItems() {

        return [
            ...shopState.ownedItems
        ];

    },


    getCoins() {

        return getCurrentShopCoins();

    },


    resetShop() {

        shopStorageRemove(
            SHOP_CONFIG.storageKey
        );

        shopStorageRemove(
            SHOP_CONFIG.ownedItemsStorageKey
        );

        shopStorageRemove(
            SHOP_CONFIG.selectedAvatarStorageKey
        );


        shopState.ownedItems = [
            "avatar_default"
        ];

        shopState.selectedAvatar =
            "avatar_default";

        shopState.purchasedCoinPackages =
            [];

        shopState.lastPurchase =
            null;


        saveOwnedShopItems();

        saveSelectedAvatar();

        saveShopData();


        renderShopContent();

        updateShopCoinBalance();


        showShopToast(
            "اطلاعات فروشگاه بازنشانی شد.",
            "success"
        );

    },


    addTestCoins(
        amount = 10000
    ) {

        addCoinsToWallet(
            amount
        );

        updateShopCoinBalance();


        showShopToast(
            `${formatShopNumber(amount)} سکه آزمایشی اضافه شد.`,
            "success"
        );

    }

};


/* ============================================================
   48. FINAL INITIALIZATION CHECK
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    /*
        DOM هنوز در حال بارگذاری است.
        initializeShop از DOMContentLoaded اجرا خواهد شد.
    */

} else {

    /*
        اگر فایل بعد از آماده شدن DOM لود شده باشد.
    */

    initializeShop();

}


/* ============================================================
   END OF shop.js
   STAGE 9 COMPLETE
============================================================ */
