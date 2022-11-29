create type experiment_status as enum ('new', 'ready', 'in_progress', 'submitted', 'approved');

alter table experiments
    add status experiment_status not null default 'new';