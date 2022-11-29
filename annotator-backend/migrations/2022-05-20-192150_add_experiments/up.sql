create table experiments
(
    id               serial primary key,
    project_id       integer references projects(id) not null,

    folder_name      text    not null unique,
    num_video_frames integer not null,

    claimed_by       integer references users(id),
    claimed_at       timestamp with time zone,

    label            JSONB,

    constraint claim_null_consistency check ( (claimed_by is null) = (claimed_at is null) )
);