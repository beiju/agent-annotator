table! {
    experiments (id) {
        id -> Int4,
        folder_name -> Text,
        num_video_frames -> Int4,
        claimed_by -> Nullable<Int4>,
        claimed_at -> Nullable<Timestamptz>,
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

joinable!(experiments -> users (claimed_by));

allow_tables_to_appear_in_same_query!(
    experiments,
    users,
);
