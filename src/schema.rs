table! {
    use diesel::sql_types::*;
    use crate::schema_enums::*;

    /// Representation of the `experiments` table.
    ///
    /// (Automatically generated by Diesel.)
    experiments (id) {
        /// The `id` column of the `experiments` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        id -> Int4,
        /// The `project_id` column of the `experiments` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        project_id -> Int4,
        /// The `folder_name` column of the `experiments` table.
        ///
        /// Its SQL type is `Text`.
        ///
        /// (Automatically generated by Diesel.)
        folder_name -> Text,
        /// The `num_video_frames` column of the `experiments` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        num_video_frames -> Int4,
        /// The `claimed_by` column of the `experiments` table.
        ///
        /// Its SQL type is `Nullable<Int4>`.
        ///
        /// (Automatically generated by Diesel.)
        claimed_by -> Nullable<Int4>,
        /// The `claimed_at` column of the `experiments` table.
        ///
        /// Its SQL type is `Nullable<Timestamptz>`.
        ///
        /// (Automatically generated by Diesel.)
        claimed_at -> Nullable<Timestamptz>,
        /// The `label` column of the `experiments` table.
        ///
        /// Its SQL type is `Nullable<Jsonb>`.
        ///
        /// (Automatically generated by Diesel.)
        label -> Nullable<Jsonb>,
        /// The `video_frame_rate` column of the `experiments` table.
        ///
        /// Its SQL type is `Nullable<Float8>`.
        ///
        /// (Automatically generated by Diesel.)
        video_frame_rate -> Nullable<Float8>,
        /// The `annotation_frame_rate` column of the `experiments` table.
        ///
        /// Its SQL type is `Nullable<Float8>`.
        ///
        /// (Automatically generated by Diesel.)
        annotation_frame_rate -> Nullable<Float8>,
        /// The `status` column of the `experiments` table.
        ///
        /// Its SQL type is `Experiment_status`.
        ///
        /// (Automatically generated by Diesel.)
        status -> Experiment_status,
    }
}

table! {
    use diesel::sql_types::*;
    use crate::schema_enums::*;

    /// Representation of the `images` table.
    ///
    /// (Automatically generated by Diesel.)
    images (id) {
        /// The `id` column of the `images` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        id -> Int4,
        /// The `experiment_id` column of the `images` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        experiment_id -> Int4,
        /// The `frame_number` column of the `images` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        frame_number -> Int4,
        /// The `data` column of the `images` table.
        ///
        /// Its SQL type is `Bytea`.
        ///
        /// (Automatically generated by Diesel.)
        data -> Bytea,
    }
}

table! {
    use diesel::sql_types::*;
    use crate::schema_enums::*;

    /// Representation of the `project_members` table.
    ///
    /// (Automatically generated by Diesel.)
    project_members (id) {
        /// The `id` column of the `project_members` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        id -> Int4,
        /// The `user_id` column of the `project_members` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        user_id -> Int4,
        /// The `project_id` column of the `project_members` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        project_id -> Int4,
    }
}

table! {
    use diesel::sql_types::*;
    use crate::schema_enums::*;

    /// Representation of the `projects` table.
    ///
    /// (Automatically generated by Diesel.)
    projects (id) {
        /// The `id` column of the `projects` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        id -> Int4,
        /// The `name` column of the `projects` table.
        ///
        /// Its SQL type is `Text`.
        ///
        /// (Automatically generated by Diesel.)
        name -> Text,
        /// The `experiments_dir` column of the `projects` table.
        ///
        /// Its SQL type is `Text`.
        ///
        /// (Automatically generated by Diesel.)
        experiments_dir -> Text,
        /// The `owner` column of the `projects` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        owner -> Int4,
    }
}

table! {
    use diesel::sql_types::*;
    use crate::schema_enums::*;

    /// Representation of the `users` table.
    ///
    /// (Automatically generated by Diesel.)
    users (id) {
        /// The `id` column of the `users` table.
        ///
        /// Its SQL type is `Int4`.
        ///
        /// (Automatically generated by Diesel.)
        id -> Int4,
        /// The `email` column of the `users` table.
        ///
        /// Its SQL type is `Varchar`.
        ///
        /// (Automatically generated by Diesel.)
        email -> Varchar,
        /// The `password` column of the `users` table.
        ///
        /// Its SQL type is `Varchar`.
        ///
        /// (Automatically generated by Diesel.)
        password -> Varchar,
        /// The `is_admin` column of the `users` table.
        ///
        /// Its SQL type is `Nullable<Bool>`.
        ///
        /// (Automatically generated by Diesel.)
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
