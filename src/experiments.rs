use std::path::Path;
use chrono::{DateTime, Utc};

use serde::Serialize;
use diesel::{Queryable, Insertable, AsChangeset, result::QueryResult};
use diesel::prelude::*;

use crate::schema::*;
use crate::{WebError, WebResult};

#[derive(Serialize, Queryable)]
pub struct Experiment {
    pub id: i32,
    pub folder_name: String,
    pub num_video_frames: i32,

    pub claimed_by: Option<i32>,
    pub claimed_at: Option<DateTime<Utc>>,
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

pub fn run_discovery(conn: &PgConnection, data_path: &str) -> WebResult<()> {
    use diesel::dsl::*;
    use crate::schema::experiments::dsl::*;

    let data_path = Path::new(data_path);

    for file in std::fs::read_dir(data_path)? {
        let file = file?;

        if !file.file_type()?.is_dir() { continue; }

        let folder_name_str = file.file_name().into_string()
            .map_err(|_| WebError::NonUnicodePath)?;

        // turns out decoding video is hell!
        let video_path = file.path().join("camera.avi-0000.avi");
        let video_path_str = video_path.to_str()
            .ok_or(WebError::NonUnicodePath)?;
        let mut input = ffmpeg_next::format::input(&video_path_str)?;
        let video_stream = input
            .streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or(ffmpeg_next::Error::StreamNotFound)?;
        let video_stream_index = video_stream.index();

        let context_decoder = ffmpeg_next::codec::context::Context::from_parameters(video_stream.parameters())?;
        let mut decoder = context_decoder.decoder().video()?;
        let mut num_frames = 0;

        let mut receive_and_process_decoded_frames =
            |decoder: &mut ffmpeg_next::decoder::Video| -> Result<(), ffmpeg_next::Error> {
                let mut decoded = ffmpeg_next::util::frame::Video::empty();
                while decoder.receive_frame(&mut decoded).is_ok() {
                    num_frames += 1;
                }
                Ok(())
            };

        for (stream, packet) in input.packets() {
            if stream.index() == video_stream_index {
                decoder.send_packet(&packet)?;
                receive_and_process_decoded_frames(&mut decoder)?;
            }
        }
        decoder.send_eof()?;
        receive_and_process_decoded_frames(&mut decoder)?;

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
    }

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