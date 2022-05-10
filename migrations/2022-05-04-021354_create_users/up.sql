-- Copied straight out of rocket_auth
CREATE TABLE IF NOT EXISTS users
(
    id       SERIAL PRIMARY KEY,
    email    VARCHAR(254) UNIQUE NOT NULL,
    password VARCHAR(255)        NOT NULL,
    is_admin BOOL DEFAULT FALSE
);