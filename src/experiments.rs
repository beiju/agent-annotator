use std::path::Path;
use chrono::{DateTime, Utc};

use serde::Serialize;
use diesel::{Queryable, Insertable, AsChangeset, result::QueryResult};
use diesel::prelude::*;
use itertools::Itertools;
use opencv::prelude::*;
use opencv::videoio;


use crate::schema::*;
use crate::{WebError, WebResult};

#[derive(Serialize, Queryable)]
pub struct Experiment {
    pub id: i32,
    pub folder_name: String,
    pub num_video_frames: i32,

    pub claimed_by: Option<i32>,
    pub claimed_at: Option<DateTime<Utc>>,

    pub label: Option<serde_json::Value>,
}

#[derive(Insertable, AsChangeset)]
#[table_name = "experiments"]
struct NewExperiment<'a> {
    pub folder_name: &'a str,
    pub num_video_frames: i32,
}

pub fn get_all_experiments(conn: &PgConnection) -> QueryResult<Vec<Experiment>> {
    use crate::schema::experiments::dsl::*;

    experiments.get_results(conn)
}

pub fn get_experiment(conn: &PgConnection, experiment_id: i32) -> QueryResult<Experiment> {
    use crate::schema::experiments::dsl::*;

    experiments.find(experiment_id)
        .get_result::<Experiment>(conn)
}

pub fn run_discovery(conn: &PgConnection, data_path: &str) -> WebResult<()> {
    use diesel::dsl::*;
    use crate::schema::experiments::dsl::*;

    let data_path = Path::new(data_path);

    std::fs::read_dir(data_path)?.into_iter()
        .map_ok(|file| {
            if !file.file_type()?.is_dir() { return Ok(()); }

            let folder_name_str = file.file_name().into_string()
                .map_err(|_| WebError::NonUnicodePath)?;

            // turns out decoding video is hell!
            let video_path = file.path().join("camera.avi-0000.avi");
            let video_path_str = video_path.to_str()
                .ok_or(WebError::NonUnicodePath)?;
            let mut video = videoio::VideoCapture::from_file(video_path_str, videoio::CAP_ANY)?;

            let mut num_frames = 0;
            while video.grab()? {
                num_frames += 1;
            }

            let new_experiment = NewExperiment {
                folder_name: &folder_name_str,
                num_video_frames: num_frames,
            };

            insert_into(experiments)
                .values(&new_experiment)
                .on_conflict(folder_name)
                .do_update()
                .set(&new_experiment)
                .execute(conn)?;

            Ok(())
        })
        .flatten()
        .map(|item: WebResult<_>| {
            item.unwrap_or_else(|err| {
                error!("Error parsing video: {:?}", err);
                ()
            })
        })
        .count(); // Lazy way of getting the iterator to run

    Ok(())
}

#[derive(AsChangeset)]
#[table_name = "experiments"]
#[changeset_options(treat_none_as_null = "true")]
struct UpdateClaim {
    claimed_by: Option<i32>,
    claimed_at: Option<DateTime<Utc>>,
}

pub fn claim(conn: &PgConnection, user_id: i32, experiment_id: i32) -> QueryResult<()> {
    use crate::schema::experiments::dsl::*;

    diesel::update(experiments.find(experiment_id))
        .set((
            claimed_by.eq(user_id),
            claimed_at.eq(diesel::dsl::now),
        ))
        .execute(conn)
        .map(|_| ())
}

pub fn release(conn: &PgConnection, user_id: i32, experiment_id: i32) -> QueryResult<()> {
    use crate::schema::experiments::dsl::*;

    // TODO Some sort of error when the user tries to release something they don't own
    diesel::update(experiments.find(experiment_id))
        .filter(claimed_by.eq(user_id))
        .set(&UpdateClaim {
            claimed_by: None,
            claimed_at: None,
        })
        .execute(conn)
        .map(|_| ())
}

pub fn set_label(conn: &PgConnection, user_id: i32, experiment_id: i32, label: serde_json::Value) -> QueryResult<()> {
    use crate::schema::experiments::dsl;

    // TODO Some sort of error when the user tries to update something they don't own
    diesel::update(dsl::experiments.find(experiment_id))
        .filter(dsl::claimed_by.eq(user_id))
        .set(dsl::label.eq(label))
        .execute(conn)
        .map(|_| ())
}