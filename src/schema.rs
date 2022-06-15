table! {
    experiments (id) {
        id -> Int4,
        project_id -> Int4,
        folder_name -> Text,
        num_video_frames -> Int4,
        claimed_by -> Nullable<Int4>,
        claimed_at -> Nullable<Timestamptz>,
        label -> Nullable<Jsonb>,
    }
}

table! {
    images (id) {
        id -> Int4,
        experiment_id -> Int4,
        frame_number -> Int4,
        data -> Bytea,
    }
}

table! {
    project_members (id) {
        id -> Int4,
        user_id -> Int4,
        project_id -> Int4,
    }
}

table! {
    projects (id) {
        id -> Int4,
        name -> Text,
        experiments_dir -> Text,
        owner -> Int4,
    }
}

table! {
    users (id) {
        id -> Int4,
        email -> Varchar,
        password -> Varchar,
        is_admin -> Nullable<Bool>,
    }
}

joinable!(experiments -> projects (project_id));
joinable!(experiments -> users (claimed_by));
joinable!(images -> experiments (experiment_id));
joinable!(project_members -> projects (project_id));
joinable!(project_members -> users (user_id));
joinable!(projects -> users (owner));

allow_tables_to_appear_in_same_query!(
    experiments,
    images,
    project_members,
    projects,
    users,
);
