create table images
(
    id            serial primary key,
    experiment_id int   not null,
    frame_number  int   not null,

    data          bytea not null,

    constraint experiment_id_fk foreign key (experiment_id) references experiments (id) on delete cascade
)