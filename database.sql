-- ============================================================
-- HOKM ONLINE
-- DATABASE.SQL
-- مرحله ۲۳
-- ============================================================
--
-- این فایل پایگاه داده اصلی بازی حکم را ایجاد می‌کند.
--
-- شامل:
-- 1. پروفایل کاربران
-- 2. آمار بازیکنان
-- 3. کیف پول و سکه
-- 4. تراکنش‌های سکه
-- 5. فروشگاه
-- 6. آیتم‌ها
-- 7. موجودی کاربران
-- 8. اتاق‌های بازی
-- 9. بازیکنان اتاق
-- 10. بازی‌ها
-- 11. دست‌های بازی
-- 12. تریک‌ها
-- 13. حرکت‌های بازی
-- 14. تاریخچه بازی
-- 15. دوستان
-- 16. درخواست دوستی
-- 17. چت
-- 18. اعلان‌ها
-- 19. مأموریت‌ها
-- 20. پیشرفت مأموریت
-- 21. دستاوردها
-- 22. دستاورد کاربران
-- 23. رتبه‌بندی
-- 24. تنظیمات
-- 25. گزارش بازیکن
-- 26. خریدها
-- 27. لاگ‌های بازی
-- 28. توابع امنیتی و اقتصادی
-- 29. Triggerها
-- 30. Indexها
-- 31. Row Level Security
--
-- ============================================================


-- ============================================================
-- SECTION 1
-- EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- SECTION 2
-- ENUM TYPES
-- ============================================================

do $$
begin

    if not exists (
        select 1
        from pg_type
        where typname = 'user_status'
    ) then

        create type public.user_status as enum (
            'online',
            'offline',
            'away',
            'in_game',
            'banned'
        );

    end if;


    if not exists (
        select 1
        from pg_type
        where typname = 'room_status'
    ) then

        create type public.room_status as enum (
            'waiting',
            'ready',
            'playing',
            'finished',
            'cancelled'
        );

    end if;


    if not exists (
        select 1
        from pg_type
        where typname = 'game_status'
    ) then

        create type public.game_status as enum (
            'waiting',
            'dealing',
            'trump_selection',
            'playing',
            'round_finished',
            'finished',
            'cancelled'
        );

    end if;


    if not exists (
        select 1
        from pg_type
        where typname = 'friendship_status'
    ) then

        create type public.friendship_status as enum (
            'pending',
            'accepted',
            'blocked',
            'rejected'
        );

    end if;


    if not exists (
        select 1
        from pg_type
        where typname = 'transaction_type'
    ) then

        create type public.transaction_type as enum (
            'initial',
            'reward',
            'game_win',
            'game_loss',
            'mission_reward',
            'achievement_reward',
            'purchase',
            'refund',
            'admin',
            'bonus',
            'daily_reward',
            'other'
        );

    end if;


    if not exists (
        select 1
        from pg_type
        where typname = 'notification_type'
    ) then

        create type public.notification_type as enum (
            'system',
            'friend_request',
            'friend_accepted',
            'game_invite',
            'game_result',
            'reward',
            'mission',
            'achievement',
            'shop',
            'security'
        );

    end if;


    if not exists (
        select 1
        from pg_type
        where typname = 'mission_period'
    ) then

        create type public.mission_period as enum (
            'daily',
            'weekly',
            'lifetime'
        );

    end if;


    if not exists (
        select 1
        from pg_type
        where typname = 'purchase_status'
    ) then

        create type public.purchase_status as enum (
            'pending',
            'completed',
            'failed',
            'refunded'
        );

    end if;

end
$$;


-- ============================================================
-- SECTION 3
-- USERS / PROFILES
-- ============================================================

create table if not exists public.profiles (

    id uuid primary key
        references auth.users(id)
        on delete cascade,

    username varchar(30) not null unique,

    display_name varchar(50),

    email varchar(120),

    avatar_url text,

    avatar_emoji varchar(20)
        default '👤',

    bio varchar(250),

    user_code varchar(20) unique,

    status public.user_status
        default 'offline',

    is_guest boolean
        default false,

    is_verified boolean
        default false,

    is_banned boolean
        default false,

    level integer not null default 1
        check (level >= 1),

    xp bigint not null default 0
        check (xp >= 0),

    coins bigint not null default 1000
        check (coins >= 0),

    games_played integer not null default 0
        check (games_played >= 0),

    games_won integer not null default 0
        check (games_won >= 0),

    games_lost integer not null default 0
        check (games_lost >= 0),

    draws integer not null default 0
        check (draws >= 0),

    rating integer not null default 1000
        check (rating >= 0),

    current_streak integer not null default 0
        check (current_streak >= 0),

    best_streak integer not null default 0
        check (best_streak >= 0),

    total_tricks_won integer not null default 0
        check (total_tricks_won >= 0),

    total_tricks_lost integer not null default 0
        check (total_tricks_lost >= 0),

    total_hands_won integer not null default 0
        check (total_hands_won >= 0),

    total_hands_lost integer not null default 0
        check (total_hands_lost >= 0),

    last_login_at timestamptz,

    last_seen_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 4
-- PLAYER SETTINGS
-- ============================================================

create table if not exists public.user_settings (

    user_id uuid primary key
        references public.profiles(id)
        on delete cascade,

    sound_enabled boolean not null default true,

    music_enabled boolean not null default true,

    vibration_enabled boolean not null default true,

    dark_mode_enabled boolean not null default true,

    notifications_enabled boolean not null default true,

    friend_requests_enabled boolean not null default true,

    game_invites_enabled boolean not null default true,

    chat_enabled boolean not null default true,

    language varchar(10) not null default 'fa',

    updated_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 5
-- PLAYER WALLET
-- ============================================================

create table if not exists public.wallets (

    user_id uuid primary key
        references public.profiles(id)
        on delete cascade,

    coins bigint not null default 1000
        check (coins >= 0),

    lifetime_earned bigint not null default 1000
        check (lifetime_earned >= 0),

    lifetime_spent bigint not null default 0
        check (lifetime_spent >= 0),

    updated_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 6
-- COIN TRANSACTIONS
-- ============================================================

create table if not exists public.coin_transactions (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    transaction_type public.transaction_type not null,

    amount bigint not null,

    balance_before bigint not null
        check (balance_before >= 0),

    balance_after bigint not null
        check (balance_after >= 0),

    description text,

    reference_id uuid,

    reference_type varchar(50),

    created_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 7
-- SHOP ITEMS
-- ============================================================

create table if not exists public.shop_items (

    id uuid primary key default gen_random_uuid(),

    item_code varchar(100) not null unique,

    name varchar(100) not null,

    description text,

    category varchar(30) not null,

    icon varchar(50),

    image_url text,

    price bigint not null default 0
        check (price >= 0),

    currency varchar(20) not null default 'coins',

    is_active boolean not null default true,

    is_featured boolean not null default false,

    sort_order integer not null default 0,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 8
-- USER INVENTORY
-- ============================================================

create table if not exists public.user_inventory (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    item_id uuid not null
        references public.shop_items(id)
        on delete cascade,

    quantity integer not null default 1
        check (quantity >= 0),

    is_equipped boolean not null default false,

    acquired_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique(user_id, item_id)

);


-- ============================================================
-- SECTION 9
-- ROOMS
-- ============================================================

create table if not exists public.rooms (

    id uuid primary key default gen_random_uuid(),

    room_code varchar(12) not null unique,

    room_name varchar(60) not null,

    host_user_id uuid not null
        references public.profiles(id)
        on delete restrict,

    status public.room_status not null default 'waiting',

    is_private boolean not null default true,

    max_players integer not null default 4
        check (max_players = 4),

    current_players integer not null default 0
        check (current_players >= 0 and current_players <= 4),

    password_hash text,

    match_type varchar(30) not null default 'classic',

    settings jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    expires_at timestamptz

);


-- ============================================================
-- SECTION 10
-- ROOM PLAYERS
-- ============================================================

create table if not exists public.room_players (

    id uuid primary key default gen_random_uuid(),

    room_id uuid not null
        references public.rooms(id)
        on delete cascade,

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    seat integer not null
        check (seat between 0 and 3),

    team integer not null default 0
        check (team between 0 and 1),

    is_ready boolean not null default false,

    joined_at timestamptz not null default now(),

    left_at timestamptz,

    is_connected boolean not null default true,

    unique(room_id, user_id),

    unique(room_id, seat)

);


-- ============================================================
-- SECTION 11
-- GAMES
-- ============================================================

create table if not exists public.games (

    id uuid primary key default gen_random_uuid(),

    room_id uuid
        references public.rooms(id)
        on delete set null,

    match_type varchar(30) not null default 'classic',

    status public.game_status not null default 'waiting',

    host_user_id uuid
        references public.profiles(id)
        on delete set null,

    player_1_id uuid
        references public.profiles(id)
        on delete set null,

    player_2_id uuid
        references public.profiles(id)
        on delete set null,

    player_3_id uuid
        references public.profiles(id)
        on delete set null,

    player_4_id uuid
        references public.profiles(id)
        on delete set null,

    team_1_score integer not null default 0
        check (team_1_score >= 0),

    team_2_score integer not null default 0
        check (team_2_score >= 0),

    current_round integer not null default 1
        check (current_round >= 1),

    current_trick integer not null default 0
        check (current_trick >= 0),

    dealer_seat integer
        check (dealer_seat between 0 and 3),

    hakem_seat integer
        check (hakem_seat between 0 and 3),

    trump_suit varchar(20),

    winner_team integer
        check (winner_team between 0 and 1),

    started_at timestamptz,

    finished_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    metadata jsonb not null default '{}'::jsonb

);


-- ============================================================
-- SECTION 12
-- GAME ROUNDS
-- ============================================================

create table if not exists public.game_rounds (

    id uuid primary key default gen_random_uuid(),

    game_id uuid not null
        references public.games(id)
        on delete cascade,

    round_number integer not null
        check (round_number >= 1),

    dealer_seat integer
        check (dealer_seat between 0 and 3),

    hakem_seat integer
        check (hakem_seat between 0 and 3),

    trump_suit varchar(20),

    team_1_tricks integer not null default 0
        check (team_1_tricks >= 0),

    team_2_tricks integer not null default 0
        check (team_2_tricks >= 0),

    winner_team integer
        check (winner_team between 0 and 1),

    started_at timestamptz,

    finished_at timestamptz,

    created_at timestamptz not null default now(),

    unique(game_id, round_number)

);


-- ============================================================
-- SECTION 13
-- GAME TRICKS
-- ============================================================

create table if not exists public.game_tricks (

    id uuid primary key default gen_random_uuid(),

    game_id uuid not null
        references public.games(id)
        on delete cascade,

    round_id uuid not null
        references public.game_rounds(id)
        on delete cascade,

    trick_number integer not null
        check (trick_number between 1 and 13),

    lead_seat integer
        check (lead_seat between 0 and 3),

    lead_suit varchar(20),

    winning_seat integer
        check (winning_seat between 0 and 3),

    winning_card_rank varchar(10),

    winning_card_suit varchar(20),

    completed boolean not null default false,

    created_at timestamptz not null default now(),

    completed_at timestamptz,

    unique(round_id, trick_number)

);


-- ============================================================
-- SECTION 14
-- GAME MOVES
-- ============================================================

create table if not exists public.game_moves (

    id uuid primary key default gen_random_uuid(),

    game_id uuid not null
        references public.games(id)
        on delete cascade,

    round_id uuid
        references public.game_rounds(id)
        on delete cascade,

    trick_id uuid
        references public.game_tricks(id)
        on delete cascade,

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    seat integer not null
        check (seat between 0 and 3),

    card_suit varchar(20) not null,

    card_rank varchar(10) not null,

    card_value integer,

    move_number integer not null,

    created_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 15
-- GAME HISTORY
-- ============================================================

create table if not exists public.game_history (

    id uuid primary key default gen_random_uuid(),

    game_id uuid
        references public.games(id)
        on delete set null,

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    team integer
        check (team between 0 and 1),

    opponent_team integer
        check (opponent_team between 0 and 1),

    result varchar(20) not null,

    team_score integer not null default 0,

    opponent_score integer not null default 0,

    xp_earned integer not null default 0,

    coins_earned bigint not null default 0,

    rating_before integer,

    rating_after integer,

    duration_seconds integer,

    played_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 16
-- FRIENDSHIPS
-- ============================================================

create table if not exists public.friendships (

    id uuid primary key default gen_random_uuid(),

    requester_id uuid not null
        references public.profiles(id)
        on delete cascade,

    addressee_id uuid not null
        references public.profiles(id)
        on delete cascade,

    status public.friendship_status not null default 'pending',

    created_at timestamptz not null default now(),

    responded_at timestamptz,

    updated_at timestamptz not null default now(),

    check (requester_id <> addressee_id),

    unique(requester_id, addressee_id)

);


-- ============================================================
-- SECTION 17
-- CHAT MESSAGES
-- ============================================================

create table if not exists public.chat_messages (

    id uuid primary key default gen_random_uuid(),

    game_id uuid
        references public.games(id)
        on delete cascade,

    room_id uuid
        references public.rooms(id)
        on delete cascade,

    sender_id uuid not null
        references public.profiles(id)
        on delete cascade,

    message text not null
        check (length(trim(message)) between 1 and 250),

    message_type varchar(20) not null default 'text',

    is_deleted boolean not null default false,

    created_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 18
-- NOTIFICATIONS
-- ============================================================

create table if not exists public.notifications (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    sender_id uuid
        references public.profiles(id)
        on delete set null,

    notification_type public.notification_type not null,

    title varchar(150) not null,

    message text not null,

    action_type varchar(50),

    action_id uuid,

    is_read boolean not null default false,

    created_at timestamptz not null default now(),

    read_at timestamptz

);


-- ============================================================
-- SECTION 19
-- MISSIONS
-- ============================================================

create table if not exists public.missions (

    id uuid primary key default gen_random_uuid(),

    mission_code varchar(100) not null unique,

    title varchar(150) not null,

    description text,

    period public.mission_period not null,

    target_value integer not null
        check (target_value > 0),

    reward_coins bigint not null default 0
        check (reward_coins >= 0),

    reward_xp integer not null default 0
        check (reward_xp >= 0),

    icon varchar(50),

    is_active boolean not null default true,

    sort_order integer not null default 0,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 20
-- USER MISSIONS
-- ============================================================

create table if not exists public.user_missions (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    mission_id uuid not null
        references public.missions(id)
        on delete cascade,

    progress integer not null default 0
        check (progress >= 0),

    target_value integer not null
        check (target_value > 0),

    completed boolean not null default false,

    claimed boolean not null default false,

    period_start timestamptz not null,

    period_end timestamptz not null,

    completed_at timestamptz,

    claimed_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique(user_id, mission_id, period_start)

);


-- ============================================================
-- SECTION 21
-- ACHIEVEMENTS
-- ============================================================

create table if not exists public.achievements (

    id uuid primary key default gen_random_uuid(),

    achievement_code varchar(100) not null unique,

    title varchar(150) not null,

    description text,

    icon varchar(50),

    target_value integer not null default 1
        check (target_value > 0),

    reward_coins bigint not null default 0
        check (reward_coins >= 0),

    reward_xp integer not null default 0
        check (reward_xp >= 0),

    is_hidden boolean not null default false,

    is_active boolean not null default true,

    created_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 22
-- USER ACHIEVEMENTS
-- ============================================================

create table if not exists public.user_achievements (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    achievement_id uuid not null
        references public.achievements(id)
        on delete cascade,

    progress integer not null default 0
        check (progress >= 0),

    unlocked boolean not null default false,

    unlocked_at timestamptz,

    created_at timestamptz not null default now(),

    unique(user_id, achievement_id)

);


-- ============================================================
-- SECTION 23
-- LEADERBOARD
-- ============================================================

create table if not exists public.leaderboard_entries (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    leaderboard_type varchar(30) not null,

    period_key varchar(50) not null,

    rating integer not null default 0,

    wins integer not null default 0,

    losses integer not null default 0,

    games integer not null default 0,

    score bigint not null default 0,

    rank integer,

    updated_at timestamptz not null default now(),

    unique(user_id, leaderboard_type, period_key)

);


-- ============================================================
-- SECTION 24
-- REPORTS
-- ============================================================

create table if not exists public.player_reports (

    id uuid primary key default gen_random_uuid(),

    reporter_id uuid not null
        references public.profiles(id)
        on delete cascade,

    reported_user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    game_id uuid
        references public.games(id)
        on delete set null,

    reason varchar(50) not null,

    description text,

    status varchar(30) not null default 'pending',

    created_at timestamptz not null default now(),

    reviewed_at timestamptz,

    reviewed_by uuid
        references public.profiles(id)
        on delete set null,

    check (reporter_id <> reported_user_id)

);


-- ============================================================
-- SECTION 25
-- PURCHASES
-- ============================================================

create table if not exists public.purchases (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    item_id uuid
        references public.shop_items(id)
        on delete set null,

    quantity integer not null default 1
        check (quantity > 0),

    total_coins bigint not null default 0
        check (total_coins >= 0),

    status public.purchase_status not null default 'completed',

    payment_provider varchar(50),

    external_transaction_id varchar(150),

    created_at timestamptz not null default now(),

    completed_at timestamptz

);


-- ============================================================
-- SECTION 26
-- GAME LOGS
-- ============================================================

create table if not exists public.game_logs (

    id uuid primary key default gen_random_uuid(),

    game_id uuid
        references public.games(id)
        on delete cascade,

    user_id uuid
        references public.profiles(id)
        on delete set null,

    event_type varchar(100) not null,

    event_data jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now()

);


-- ============================================================
-- SECTION 27
-- UPDATED_AT FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin

    new.updated_at = now();

    return new;

end;
$$;


-- ============================================================
-- SECTION 28
-- UPDATED_AT TRIGGERS
-- ============================================================

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


drop trigger if exists settings_updated_at on public.user_settings;

create trigger settings_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();


drop trigger if exists wallets_updated_at on public.wallets;

create trigger wallets_updated_at
before update on public.wallets
for each row
execute function public.set_updated_at();


drop trigger if exists shop_items_updated_at on public.shop_items;

create trigger shop_items_updated_at
before update on public.shop_items
for each row
execute function public.set_updated_at();


drop trigger if exists inventory_updated_at on public.user_inventory;

create trigger inventory_updated_at
before update on public.user_inventory
for each row
execute function public.set_updated_at();


drop trigger if exists rooms_updated_at on public.rooms;

create trigger rooms_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();


drop trigger if exists games_updated_at on public.games;

create trigger games_updated_at
before update on public.games
for each row
execute function public.set_updated_at();


drop trigger if exists friendships_updated_at on public.friendships;

create trigger friendships_updated_at
before update on public.friendships
for each row
execute function public.set_updated_at();


drop trigger if exists missions_updated_at on public.missions;

create trigger missions_updated_at
before update on public.missions
for each row
execute function public.set_updated_at();


drop trigger if exists user_missions_updated_at on public.user_missions;

create trigger user_missions_updated_at
before update on public.user_missions
for each row
execute function public.set_updated_at();


drop trigger if exists leaderboard_updated_at on public.leaderboard_entries;

create trigger leaderboard_updated_at
before update on public.leaderboard_entries
for each row
execute function public.set_updated_at();


-- ============================================================
-- SECTION 29
-- CREATE PROFILE AFTER AUTH SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare

    generated_username text;

begin

    generated_username :=
        coalesce(
            nullif(new.raw_user_meta_data ->> 'username', ''),
            'player_' || substr(new.id::text, 1, 8)
        );


    insert into public.profiles (

        id,
        username,
        display_name,
        email,
        avatar_emoji,
        user_code,
        is_guest,
        last_login_at

    )

    values (

        new.id,
        generated_username,
        coalesce(
            new.raw_user_meta_data ->> 'display_name',
            generated_username
        ),
        new.email,
        '👤',
        upper(substr(replace(new.id::text, '-', ''), 1, 8)),
        coalesce(
            (new.raw_user_meta_data ->> 'is_guest')::boolean,
            false
        ),
        now()

    )

    on conflict (id) do nothing;


    insert into public.wallets (

        user_id,
        coins,
        lifetime_earned

    )

    values (

        new.id,
        1000,
        1000

    )

    on conflict (user_id) do nothing;


    insert into public.user_settings (

        user_id

    )

    values (

        new.id

    )

    on conflict (user_id) do nothing;


    return new;

end;
$$;


drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- ============================================================
-- SECTION 30
-- XP / LEVEL FUNCTION
-- ============================================================

create or replace function public.calculate_level(
    input_xp bigint
)
returns integer
language plpgsql
immutable
as $$
declare

    calculated_level integer;

begin

    if input_xp < 0 then
        return 1;
    end if;


    calculated_level :=
        floor(
            sqrt(
                greatest(input_xp, 0)::numeric / 100
            )
        )::integer + 1;


    return greatest(calculated_level, 1);

end;
$$;


-- ============================================================
-- SECTION 31
-- ADD XP
-- ============================================================

create or replace function public.add_xp(
    target_user_id uuid,
    xp_amount integer
)
returns integer
language plpgsql
security invoker
as $$
declare

    new_xp bigint;

    new_level integer;

begin

    if target_user_id <> auth.uid() then

        raise exception 'Unauthorized';

    end if;


    if xp_amount <= 0 then

        raise exception 'XP amount must be positive';

    end if;


    update public.profiles

    set xp = xp + xp_amount

    where id = target_user_id

    returning xp into new_xp;


    if new_xp is null then

        raise exception 'User profile not found';

    end if;


    new_level :=
        public.calculate_level(new_xp);


    update public.profiles

    set level = new_level

    where id = target_user_id;


    return new_level;

end;
$$;


-- ============================================================
-- SECTION 32
-- ATOMIC COIN CHANGE
-- ============================================================

create or replace function public.change_coins(
    target_user_id uuid,
    coin_amount bigint,
    transaction_kind public.transaction_type,
    transaction_description text default null,
    reference_uuid uuid default null,
    reference_kind varchar default null
)
returns bigint
language plpgsql
security invoker
as $$
declare

    current_balance bigint;

    new_balance bigint;

begin

    if target_user_id <> auth.uid() then

        raise exception 'Unauthorized';

    end if;


    select coins

    into current_balance

    from public.wallets

    where user_id = target_user_id

    for update;


    if current_balance is null then

        raise exception 'Wallet not found';

    end if;


    new_balance :=
        current_balance + coin_amount;


    if new_balance < 0 then

        raise exception 'Insufficient coins';

    end if;


    update public.wallets

    set

        coins = new_balance,

        lifetime_earned =
            case
                when coin_amount > 0
                then lifetime_earned + coin_amount
                else lifetime_earned
            end,

        lifetime_spent =
            case
                when coin_amount < 0
                then lifetime_spent + abs(coin_amount)
                else lifetime_spent
            end

    where user_id = target_user_id;


    update public.profiles

    set coins = new_balance

    where id = target_user_id;


    insert into public.coin_transactions (

        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        reference_id,
        reference_type

    )

    values (

        target_user_id,
        transaction_kind,
        coin_amount,
        current_balance,
        new_balance,
        transaction_description,
        reference_uuid,
        reference_kind

    );


    return new_balance;

end;
$$;


-- ============================================================
-- SECTION 33
-- CLAIM MISSION REWARD
-- ============================================================

create or replace function public.claim_mission_reward(
    user_mission_uuid uuid
)
returns boolean
language plpgsql
security invoker
as $$
declare

    mission_user uuid;

    reward_coin_amount bigint;

    reward_xp_amount integer;

begin

    select
        um.user_id,
        m.reward_coins,
        m.reward_xp

    into
        mission_user,
        reward_coin_amount,
        reward_xp_amount

    from public.user_missions um

    join public.missions m
        on m.id = um.mission_id

    where um.id = user_mission_uuid

    for update;


    if mission_user is null then

        raise exception 'Mission not found';

    end if;


    if mission_user <> auth.uid() then

        raise exception 'Unauthorized';

    end if;


    if not exists (

        select 1

        from public.user_missions

        where id = user_mission_uuid
        and completed = true
        and claimed = false

    ) then

        raise exception 'Mission cannot be claimed';

    end if;


    update public.user_missions

    set

        claimed = true,

        claimed_at = now()

    where id = user_mission_uuid;


    if reward_coin_amount > 0 then

        perform public.change_coins(

            auth.uid(),
            reward_coin_amount,
            'mission_reward',
            'Mission reward',
            user_mission_uuid,
            'user_mission'

        );

    end if;


    if reward_xp_amount > 0 then

        perform public.add_xp(

            auth.uid(),
            reward_xp_amount

        );

    end if;


    return true;

end;
$$;


-- ============================================================
-- SECTION 34
-- PURCHASE SHOP ITEM
-- ============================================================

create or replace function public.purchase_shop_item(
    target_item_id uuid,
    purchase_quantity integer default 1
)
returns uuid
language plpgsql
security invoker
as $$
declare

    current_user_id uuid;

    item_price bigint;

    total_price bigint;

    item_active boolean;

    purchase_uuid uuid;

begin

    current_user_id :=
        auth.uid();


    if current_user_id is null then

        raise exception 'Authentication required';

    end if;


    if purchase_quantity <= 0 then

        raise exception 'Invalid quantity';

    end if;


    select
        price,
        is_active

    into
        item_price,
        item_active

    from public.shop_items

    where id = target_item_id;


    if item_price is null then

        raise exception 'Shop item not found';

    end if;


    if item_active = false then

        raise exception 'Shop item is not active';

    end if;


    total_price :=
        item_price * purchase_quantity;


    perform public.change_coins(

        current_user_id,
        -total_price,
        'purchase',
        'Shop purchase',
        target_item_id,
        'shop_item'

    );


    insert into public.purchases (

        user_id,
        item_id,
        quantity,
        total_coins,
        status,
        completed_at

    )

    values (

        current_user_id,
        target_item_id,
        purchase_quantity,
        total_price,
        'completed',
        now()

    )

    returning id into purchase_uuid;


    insert into public.user_inventory (

        user_id,
        item_id,
        quantity

    )

    values (

        current_user_id,
        target_item_id,
        purchase_quantity

    )

    on conflict (user_id, item_id)

    do update set

        quantity =
            public.user_inventory.quantity
            + excluded.quantity,

        updated_at = now();


    return purchase_uuid;

end;
$$;


-- ============================================================
-- SECTION 35
-- GENERATE ROOM CODE
-- ============================================================

create or replace function public.generate_room_code()
returns varchar
language plpgsql
as $$
declare

    generated_code varchar;

begin

    loop

        generated_code :=
            upper(
                substr(
                    encode(gen_random_bytes(6), 'hex'),
                    1,
                    8
                )
            );


        exit when not exists (

            select 1
            from public.rooms
            where room_code = generated_code

        );

    end loop;


    return generated_code;

end;
$$;


-- ============================================================
-- SECTION 36
-- CREATE ROOM
-- ============================================================

create or replace function public.create_game_room(
    input_room_name varchar,
    input_private boolean default true,
    input_match_type varchar default 'classic'
)
returns uuid
language plpgsql
security invoker
as $$
declare

    new_room_id uuid;

    new_room_code varchar;

    current_user_id uuid;

begin

    current_user_id :=
        auth.uid();


    if current_user_id is null then

        raise exception 'Authentication required';

    end if;


    if length(trim(input_room_name)) < 1 then

        raise exception 'Room name is required';

    end if;


    new_room_code :=
        public.generate_room_code();


    insert into public.rooms (

        room_code,
        room_name,
        host_user_id,
        is_private,
        match_type,
        current_players

    )

    values (

        new_room_code,
        trim(input_room_name),
        current_user_id,
        input_private,
        input_match_type,
        1

    )

    returning id into new_room_id;


    insert into public.room_players (

        room_id,
        user_id,
        seat,
        team,
        is_ready

    )

    values (

        new_room_id,
        current_user_id,
        0,
        0,
        false

    );


    update public.profiles

    set status = 'online'

    where id = current_user_id;


    return new_room_id;

end;
$$;


-- ============================================================
-- SECTION 37
-- JOIN ROOM
-- ============================================================

create or replace function public.join_game_room(
    input_room_code varchar
)
returns uuid
language plpgsql
security invoker
as $$
declare

    target_room_id uuid;

    target_status public.room_status;

    target_player_count integer;

    selected_seat integer;

    current_user_id uuid;

begin

    current_user_id :=
        auth.uid();


    if current_user_id is null then

        raise exception 'Authentication required';

    end if;


    select
        id,
        status,
        current_players

    into
        target_room_id,
        target_status,
        target_player_count

    from public.rooms

    where room_code = upper(trim(input_room_code))

    for update;


    if target_room_id is null then

        raise exception 'Room not found';

    end if;


    if target_status <> 'waiting' then

        raise exception 'Room is not accepting players';

    end if;


    if target_player_count >= 4 then

        raise exception 'Room is full';

    end if;


    if exists (

        select 1

        from public.room_players

        where room_id = target_room_id
        and user_id = current_user_id
        and left_at is null

    ) then

        return target_room_id;

    end if;


    select s

    into selected_seat

    from generate_series(0, 3) s

    where not exists (

        select 1

        from public.room_players rp

        where rp.room_id = target_room_id

        and rp.seat = s

        and rp.left_at is null

    )

    order by s

    limit 1;


    if selected_seat is null then

        raise exception 'No available seat';

    end if;


    insert into public.room_players (

        room_id,
        user_id,
        seat,
        team

    )

    values (

        target_room_id,
        current_user_id,
        selected_seat,
        case
            when selected_seat in (0, 2)
            then 0
            else 1
        end

    );


    update public.rooms

    set current_players =
        (
            select count(*)
            from public.room_players
            where room_id = target_room_id
            and left_at is null
        )

    where id = target_room_id;


    return target_room_id;

end;
$$;


-- ============================================================
-- SECTION 38
-- LEAVE ROOM
-- ============================================================

create or replace function public.leave_game_room(
    target_room_id uuid
)
returns boolean
language plpgsql
security invoker
as $$
begin

    if auth.uid() is null then

        raise exception 'Authentication required';

    end if;


    update public.room_players

    set

        left_at = now(),

        is_connected = false,

        is_ready = false

    where room_id = target_room_id

    and user_id = auth.uid()

    and left_at is null;


    update public.rooms

    set current_players =
        (
            select count(*)
            from public.room_players
            where room_id = target_room_id
            and left_at is null
        )

    where id = target_room_id;


    return true;

end;
$$;


-- ============================================================
-- SECTION 39
-- FRIEND REQUEST
-- ============================================================

create or replace function public.send_friend_request(
    target_user_id uuid
)
returns uuid
language plpgsql
security invoker
as $$
declare

    friendship_uuid uuid;

begin

    if auth.uid() is null then

        raise exception 'Authentication required';

    end if;


    if target_user_id = auth.uid() then

        raise exception 'Cannot add yourself';

    end if;


    if not exists (

        select 1
        from public.profiles
        where id = target_user_id

    ) then

        raise exception 'User not found';

    end if;


    insert into public.friendships (

        requester_id,
        addressee_id,
        status

    )

    values (

        auth.uid(),
        target_user_id,
        'pending'

    )

    on conflict (requester_id, addressee_id)

    do update set

        status = 'pending',

        responded_at = null,

        updated_at = now()

    returning id into friendship_uuid;


    return friendship_uuid;

end;
$$;


-- ============================================================
-- SECTION 40
-- ACCEPT FRIEND REQUEST
-- ============================================================

create or replace function public.accept_friend_request(
    friendship_uuid uuid
)
returns boolean
language plpgsql
security invoker
as $$
begin

    update public.friendships

    set

        status = 'accepted',

        responded_at = now(),

        updated_at = now()

    where id = friendship_uuid

    and addressee_id = auth.uid()

    and status = 'pending';


    if not found then

        raise exception 'Friend request not found';

    end if;


    return true;

end;
$$;


-- ============================================================
-- SECTION 41
-- CREATE INDEXES
-- ============================================================

create index if not exists profiles_username_idx
on public.profiles(username);


create index if not exists profiles_rating_idx
on public.profiles(rating desc);


create index if not exists profiles_status_idx
on public.profiles(status);


create index if not exists profiles_last_seen_idx
on public.profiles(last_seen_at desc);


create index if not exists wallet_user_idx
on public.wallets(user_id);


create index if not exists coin_transactions_user_idx
on public.coin_transactions(user_id);


create index if not exists coin_transactions_created_idx
on public.coin_transactions(created_at desc);


create index if not exists rooms_host_idx
on public.rooms(host_user_id);


create index if not exists rooms_status_idx
on public.rooms(status);


create index if not exists rooms_code_idx
on public.rooms(room_code);


create index if not exists room_players_room_idx
on public.room_players(room_id);


create index if not exists room_players_user_idx
on public.room_players(user_id);


create index if not exists games_room_idx
on public.games(room_id);


create index if not exists games_status_idx
on public.games(status);


create index if not exists games_created_idx
on public.games(created_at desc);


create index if not exists game_rounds_game_idx
on public.game_rounds(game_id);


create index if not exists game_tricks_round_idx
on public.game_tricks(round_id);


create index if not exists game_moves_game_idx
on public.game_moves(game_id);


create index if not exists game_moves_user_idx
on public.game_moves(user_id);


create index if not exists game_history_user_idx
on public.game_history(user_id);


create index if not exists game_history_played_idx
on public.game_history(played_at desc);


create index if not exists friendships_requester_idx
on public.friendships(requester_id);


create index if not exists friendships_addressee_idx
on public.friendships(addressee_id);


create index if not exists friendships_status_idx
on public.friendships(status);


create index if not exists chat_game_idx
on public.chat_messages(game_id);


create index if not exists chat_room_idx
on public.chat_messages(room_id);


create index if not exists chat_sender_idx
on public.chat_messages(sender_id);


create index if not exists chat_created_idx
on public.chat_messages(created_at desc);


create index if not exists notifications_user_idx
on public.notifications(user_id);


create index if not exists notifications_unread_idx
on public.notifications(user_id, is_read);


create index if not exists notifications_created_idx
on public.notifications(created_at desc);


create index if not exists missions_period_idx
on public.missions(period);


create index if not exists user_missions_user_idx
on public.user_missions(user_id);


create index if not exists user_missions_active_idx
on public.user_missions(user_id, completed, claimed);


create index if not exists achievements_code_idx
on public.achievements(achievement_code);


create index if not exists user_achievements_user_idx
on public.user_achievements(user_id);


create index if not exists leaderboard_type_idx
on public.leaderboard_entries(leaderboard_type);


create index if not exists leaderboard_score_idx
on public.leaderboard_entries(score desc);


create index if not exists reports_reporter_idx
on public.player_reports(reporter_id);


create index if not exists reports_reported_idx
on public.player_reports(reported_user_id);


-- ============================================================
-- SECTION 42
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;

alter table public.user_settings enable row level security;

alter table public.wallets enable row level security;

alter table public.coin_transactions enable row level security;

alter table public.shop_items enable row level security;

alter table public.user_inventory enable row level security;

alter table public.rooms enable row level security;

alter table public.room_players enable row level security;

alter table public.games enable row level security;

alter table public.game_rounds enable row level security;

alter table public.game_tricks enable row level security;

alter table public.game_moves enable row level security;

alter table public.game_history enable row level security;

alter table public.friendships enable row level security;

alter table public.chat_messages enable row level security;

alter table public.notifications enable row level security;

alter table public.missions enable row level security;

alter table public.user_missions enable row level security;

alter table public.achievements enable row level security;

alter table public.user_achievements enable row level security;

alter table public.leaderboard_entries enable row level security;

alter table public.player_reports enable row level security;

alter table public.purchases enable row level security;

alter table public.game_logs enable row level security;


-- ============================================================
-- SECTION 43
-- PROFILE POLICIES
-- ============================================================

drop policy if exists profiles_select_authenticated
on public.profiles;

create policy profiles_select_authenticated

on public.profiles

for select

to authenticated

using (true);


drop policy if exists profiles_insert_own
on public.profiles;

create policy profiles_insert_own

on public.profiles

for insert

to authenticated

with check (
    (select auth.uid()) = id
);


drop policy if exists profiles_update_own
on public.profiles;

create policy profiles_update_own

on public.profiles

for update

to authenticated

using (
    (select auth.uid()) = id
)

with check (
    (select auth.uid()) = id
);


-- ============================================================
-- SECTION 44
-- SETTINGS POLICIES
-- ============================================================

drop policy if exists settings_select_own
on public.user_settings;

create policy settings_select_own

on public.user_settings

for select

to authenticated

using (
    (select auth.uid()) = user_id
);


drop policy if exists settings_insert_own
on public.user_settings;

create policy settings_insert_own

on public.user_settings

for insert

to authenticated

with check (
    (select auth.uid()) = user_id
);


drop policy if exists settings_update_own
on public.user_settings;

create policy settings_update_own

on public.user_settings

for update

to authenticated

using (
    (select auth.uid()) = user_id
)

with check (
    (select auth.uid()) = user_id
);


-- ============================================================
-- SECTION 45
-- WALLET POLICIES
-- ============================================================

drop policy if exists wallet_select_own
on public.wallets;

create policy wallet_select_own

on public.wallets

for select

to authenticated

using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- SECTION 46
-- TRANSACTION POLICIES
-- ============================================================

drop policy if exists transactions_select_own
on public.coin_transactions;

create policy transactions_select_own

on public.coin_transactions

for select

to authenticated

using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- SECTION 47
-- SHOP POLICIES
-- ============================================================

drop policy if exists shop_select_active
on public.shop_items;

create policy shop_select_active

on public.shop_items

for select

to authenticated

using (
    is_active = true
);


-- ============================================================
-- SECTION 48
-- INVENTORY POLICIES
-- ============================================================

drop policy if exists inventory_select_own
on public.user_inventory;

create policy inventory_select_own

on public.user_inventory

for select

to authenticated

using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- SECTION 49
-- ROOM POLICIES
-- ============================================================

drop policy if exists rooms_select_authenticated
on public.rooms;

create policy rooms_select_authenticated

on public.rooms

for select

to authenticated

using (true);


drop policy if exists rooms_insert_host
on public.rooms;

create policy rooms_insert_host

on public.rooms

for insert

to authenticated

with check (
    (select auth.uid()) = host_user_id
);


drop policy if exists rooms_update_host
on public.rooms;

create policy rooms_update_host

on public.rooms

for update

to authenticated

using (
    (select auth.uid()) = host_user_id
)

with check (
    (select auth.uid()) = host_user_id
);


-- ============================================================
-- SECTION 50
-- ROOM PLAYERS POLICIES
-- ============================================================

drop policy if exists room_players_select
on public.room_players;

create policy room_players_select

on public.room_players

for select

to authenticated

using (true);


drop policy if exists room_players_insert_own
on public.room_players;

create policy room_players_insert_own

on public.room_players

for insert

to authenticated

with check (
    (select auth.uid()) = user_id
);


drop policy if exists room_players_update_own
on public.room_players;

create policy room_players_update_own

on public.room_players

for update

to authenticated

using (
    (select auth.uid()) = user_id
)

with check (
    (select auth.uid()) = user_id
);


-- ============================================================
-- SECTION 51
-- GAME POLICIES
-- ============================================================

drop policy if exists games_select_players
on public.games;

create policy games_select_players

on public.games

for select

to authenticated

using (
    (select auth.uid()) in (
        player_1_id,
        player_2_id,
        player_3_id,
        player_4_id
    )
);


-- ============================================================
-- SECTION 52
-- GAME ROUND POLICIES
-- ============================================================

drop policy if exists game_rounds_select_players
on public.game_rounds;

create policy game_rounds_select_players

on public.game_rounds

for select

to authenticated

using (
    exists (
        select 1
        from public.games g
        where g.id = game_rounds.game_id
        and (select auth.uid()) in (
            g.player_1_id,
            g.player_2_id,
            g.player_3_id,
            g.player_4_id
        )
    )
);


-- ============================================================
-- SECTION 53
-- GAME TRICK POLICIES
-- ============================================================

drop policy if exists game_tricks_select_players
on public.game_tricks;

create policy game_tricks_select_players

on public.game_tricks

for select

to authenticated

using (
    exists (
        select 1
        from public.games g
        where g.id = game_tricks.game_id
        and (select auth.uid()) in (
            g.player_1_id,
            g.player_2_id,
            g.player_3_id,
            g.player_4_id
        )
    )
);


-- ============================================================
-- SECTION 54
-- GAME MOVE POLICIES
-- ============================================================

drop policy if exists game_moves_select_players
on public.game_moves;

create policy game_moves_select_players

on public.game_moves

for select

to authenticated

using (
    exists (
        select 1
        from public.games g
        where g.id = game_moves.game_id
        and (select auth.uid()) in (
            g.player_1_id,
            g.player_2_id,
            g.player_3_id,
            g.player_4_id
        )
    )
);


-- ============================================================
-- SECTION 55
-- GAME HISTORY POLICIES
-- ============================================================

drop policy if exists history_select_own
on public.game_history;

create policy history_select_own

on public.game_history

for select

to authenticated

using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- SECTION 56
-- FRIENDSHIP POLICIES
-- ============================================================

drop policy if exists friendships_select_own
on public.friendships;

create policy friendships_select_own

on public.friendships

for select

to authenticated

using (
    (select auth.uid()) = requester_id
    or
    (select auth.uid()) = addressee_id
);


drop policy if exists friendships_insert_own
on public.friendships;

create policy friendships_insert_own

on public.friendships

for insert

to authenticated

with check (
    (select auth.uid()) = requester_id
);


drop policy if exists friendships_update_participant
on public.friendships;

create policy friendships_update_participant

on public.friendships

for update

to authenticated

using (
    (select auth.uid()) = requester_id
    or
    (select auth.uid()) = addressee_id
)

with check (
    (select auth.uid()) = requester_id
    or
    (select auth.uid()) = addressee_id
);


-- ============================================================
-- SECTION 57
-- CHAT POLICIES
-- ============================================================

drop policy if exists chat_select_authenticated
on public.chat_messages;

create policy chat_select_authenticated

on public.chat_messages

for select

to authenticated

using (
    sender_id = (select auth.uid())
    or
    exists (
        select 1
        from public.game_players_view
        where false
    )
);


drop policy if exists chat_insert_own
on public.chat_messages;

create policy chat_insert_own

on public.chat_messages

for insert

to authenticated

with check (
    (select auth.uid()) = sender_id
);


-- ============================================================
-- SECTION 58
-- NOTIFICATION POLICIES
-- ============================================================

drop policy if exists notifications_select_own
on public.notifications;

create policy notifications_select_own

on public.notifications

for select

to authenticated

using (
    (select auth.uid()) = user_id
);


drop policy if exists notifications_update_own
on public.notifications;

create policy notifications_update_own

on public.notifications

for update

to authenticated

using (
    (select auth.uid()) = user_id
)

with check (
    (select auth.uid()) = user_id
);


-- ============================================================
-- SECTION 59
-- MISSIONS POLICIES
-- ============================================================

drop policy if exists missions_select_active
on public.missions;

create policy missions_select_active

on public.missions

for select

to authenticated

using (
    is_active = true
);


-- ============================================================
-- SECTION 60
-- USER MISSIONS POLICIES
-- ============================================================

drop policy if exists user_missions_select_own
on public.user_missions;

create policy user_missions_select_own

on public.user_missions

for select

to authenticated

using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- SECTION 61
-- ACHIEVEMENT POLICIES
-- ============================================================

drop policy if exists achievements_select_active
on public.achievements;

create policy achievements_select_active

on public.achievements

for select

to authenticated

using (
    is_active = true
);


drop policy if exists user_achievements_select_own
on public.user_achievements;

create policy user_achievements_select_own

on public.user_achievements

for select

to authenticated

using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- SECTION 62
-- LEADERBOARD POLICIES
-- ============================================================

drop policy if exists leaderboard_select_authenticated
on public.leaderboard_entries;

create policy leaderboard_select_authenticated

on public.leaderboard_entries

for select

to authenticated

using (true);


-- ============================================================
-- SECTION 63
-- REPORT POLICIES
-- ============================================================

drop policy if exists reports_insert_own
on public.player_reports;

create policy reports_insert_own

on public.player_reports

for insert

to authenticated

with check (
    (select auth.uid()) = reporter_id
);


drop policy if exists reports_select_own
on public.player_reports;

create policy reports_select_own

on public.player_reports

for select

to authenticated

using (
    (select auth.uid()) = reporter_id
);


-- ============================================================
-- SECTION 64
-- PURCHASE POLICIES
-- ============================================================

drop policy if exists purchases_select_own
on public.purchases;

create policy purchases_select_own

on public.purchases

for select

to authenticated

using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- SECTION 65
-- GAME LOG POLICIES
-- ============================================================

drop policy if exists game_logs_select_players
on public.game_logs;

create policy game_logs_select_players

on public.game_logs

for select

to authenticated

using (
    user_id = (select auth.uid())
);


-- ============================================================
-- SECTION 66
-- SAMPLE SHOP DATA
-- ============================================================

insert into public.shop_items (

    item_code,
    name,
    description,
    category,
    icon,
    price,
    currency,
    is_active,
    is_featured,
    sort_order

)

values

(
    'coins_1000',
    '۱۰۰۰ سکه',
    'بسته سکه بازی',
    'coins',
    '🪙',
    1000,
    'coins',
    true,
    true,
    1
),

(
    'coins_5000',
    '۵۰۰۰ سکه',
    'بسته بزرگ سکه',
    'coins',
    '🪙',
    5000,
    'coins',
    true,
    true,
    2
),

(
    'avatar_gold',
    'آواتار طلایی',
    'آواتار ویژه بازیکن',
    'avatars',
    '👑',
    2500,
    'coins',
    true,
    true,
    3
),

(
    'card_theme_classic',
    'تم کلاسیک کارت',
    'تم کلاسیک برای کارت‌های بازی',
    'items',
    '🃏',
    1500,
    'coins',
    true,
    false,
    4
)

on conflict (item_code)
do update set

    name = excluded.name,

    description = excluded.description,

    category = excluded.category,

    icon = excluded.icon,

    price = excluded.price,

    is_active = excluded.is_active,

    is_featured = excluded.is_featured,

    sort_order = excluded.sort_order;


-- ============================================================
-- SECTION 67
-- DEFAULT MISSIONS
-- ============================================================

insert into public.missions (

    mission_code,
    title,
    description,
    period,
    target_value,
    reward_coins,
    reward_xp,
    icon,
    is_active,
    sort_order

)

values

(
    'daily_play_one',
    'اولین بازی امروز',
    'یک بازی حکم انجام بده',
    'daily',
    1,
    100,
    50,
    '🃏',
    true,
    1
),

(
    'daily_win_one',
    'یک برد',
    'یک بازی را با پیروزی به پایان برسان',
    'daily',
    1,
    200,
    100,
    '🏆',
    true,
    2
),

(
    'daily_play_three',
    'سه بازی',
    'سه بازی حکم انجام بده',
    'daily',
    3,
    300,
    150,
    '🔥',
    true,
    3
),

(
    'weekly_win_five',
    'قهرمان هفته',
    'پنج بازی را برنده شو',
    'weekly',
    5,
    1000,
    500,
    '👑',
    true,
    4
)

on conflict (mission_code)
do update set

    title = excluded.title,

    description = excluded.description,

    period = excluded.period,

    target_value = excluded.target_value,

    reward_coins = excluded.reward_coins,

    reward_xp = excluded.reward_xp,

    icon = excluded.icon,

    is_active = excluded.is_active;


-- ============================================================
-- SECTION 68
-- DEFAULT ACHIEVEMENTS
-- ============================================================

insert into public.achievements (

    achievement_code,
    title,
    description,
    icon,
    target_value,
    reward_coins,
    reward_xp

)

values

(
    'first_game',
    'اولین بازی',
    'اولین بازی حکم خود را انجام بده',
    '🃏',
    1,
    100,
    50
),

(
    'first_win',
    'اولین برد',
    'اولین پیروزی خود را ثبت کن',
    '🏆',
    1,
    250,
    100
),

(
    'ten_wins',
    'بازیکن باتجربه',
    'ده بازی را برنده شو',
    '⭐',
    10,
    1000,
    500
),

(
    'fifty_games',
    'حکم‌باز',
    'پنجاه بازی انجام بده',
    '👑',
    50,
    2500,
    1000
),

(
    'hundred_games',
    'استاد میز',
    'صد بازی انجام بده',
    '💎',
    100,
    5000,
    2500
)

on conflict (achievement_code)
do update set

    title = excluded.title,

    description = excluded.description,

    icon = excluded.icon,

    target_value = excluded.target_value,

    reward_coins = excluded.reward_coins,

    reward_xp = excluded.reward_xp;


-- ============================================================
-- SECTION 69
-- GRANTS
-- ============================================================

grant usage on schema public
to authenticated;


grant select on public.shop_items
to authenticated;


grant select on public.missions
to authenticated;


grant select on public.achievements
to authenticated;


grant select on public.profiles
to authenticated;


grant select, insert, update
on public.user_settings
to authenticated;


grant select
on public.wallets
to authenticated;


grant select
on public.coin_transactions
to authenticated;


grant select, insert, update
on public.friendships
to authenticated;


grant select
on public.rooms
to authenticated;


grant select, insert, update
on public.room_players
to authenticated;


grant select
on public.games
to authenticated;


grant select
on public.game_rounds
to authenticated;


grant select
on public.game_tricks
to authenticated;


grant select
on public.game_moves
to authenticated;


grant select
on public.game_history
to authenticated;


grant select, insert
on public.chat_messages
to authenticated;


grant select, update
on public.notifications
to authenticated;


grant select
on public.user_missions
to authenticated;


grant select
on public.user_achievements
to authenticated;


grant select
on public.leaderboard_entries
to authenticated;


grant select, insert
on public.player_reports
to authenticated;


grant select
on public.purchases
to authenticated;


grant select
on public.game_logs
to authenticated;


-- ============================================================
-- SECTION 70
-- FUNCTION GRANTS
-- ============================================================

grant execute
on function public.calculate_level(bigint)
to authenticated;


grant execute
on function public.add_xp(uuid, integer)
to authenticated;


grant execute
on function public.change_coins(
    uuid,
    bigint,
    public.transaction_type,
    text,
    uuid,
    varchar
)
to authenticated;


grant execute
on function public.claim_mission_reward(uuid)
to authenticated;


grant execute
on function public.purchase_shop_item(uuid, integer)
to authenticated;


grant execute
on function public.create_game_room(varchar, boolean, varchar)
to authenticated;


grant execute
on function public.join_game_room(varchar)
to authenticated;


grant execute
on function public.leave_game_room(uuid)
to authenticated;


grant execute
on function public.send_friend_request(uuid)
to authenticated;


grant execute
on function public.accept_friend_request(uuid)
to authenticated;


-- ============================================================
-- SECTION 71
-- SECURITY CLEANUP
-- ============================================================

revoke all
on public.coin_transactions
from anon;


revoke all
on public.wallets
from anon;


revoke all
on public.purchases
from anon;


revoke all
on public.player_reports
from anon;


revoke all
on public.game_logs
from anon;


-- ============================================================
-- END OF DATABASE.SQL
-- ============================================================
