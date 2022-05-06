-- Copied straight out of rocket_auth
CREATE TABLE IF NOT EXISTS users
(
    id       SERIAL PRIMARY KEY,
    email    VARCHAR(254) UNIQUE NOT NULL,
    password VARCHAR(255)        NOT NULL,
    is_admin BOOL DEFAULT FALSE
);


create table experiments
(
    id               serial primary key,
    folder_name      text    not null unique,
    num_video_frames integer not null,

    claimed_by       integer references users(id),
    claimed_at       timestamp with time zone,

    constraint claim_null_consistency check ( (claimed_by is null) = (claimed_at is null) )
);