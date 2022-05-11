create table projects
(
    id              serial primary key,
    name            text not null,
    experiments_dir text not null,

    owner           integer references users (id)
);

create table project_members
(
    id         serial primary key,
    user_id    integer references users (id)    not null,
    project_id integer references projects (id) not null
)