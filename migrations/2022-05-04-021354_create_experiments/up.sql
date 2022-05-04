create table experiments
(
    id               serial primary key,
    folder_name      text    not null unique,
    num_video_frames integer not null
);