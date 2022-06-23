use std::path::Path;
use chrono::{DateTime, Utc};

use serde::Serialize;
use diesel::{Queryable, Insertable, AsChangeset, result::QueryResult};
use diesel::dsl::exists;
use diesel::prelude::*;
use opencv::prelude::*;
use opencv::videoio;
use rocket::futures::StreamExt;

use crate::schema::*;
use crate::{AnnotatorDbConn, WebError, WebResult};

#[derive(Serialize, Queryable)]
pub struct Project {
    pub id: i32,
    pub name: String,
    pub experiments_dir: String,
    pub owner: i32,
}

#[derive(Serialize, Queryable)]
pub struct User {
    pub id: i32,
    pub email: String,
    pub password: String,
    pub is_admin: Option<bool>,
}

#[derive(Serialize, Queryable)]
pub struct Experiment {
    pub id: i32,
    pub project_id: i32,

    pub folder_name: String,
    pub num_video_frames: i32,

    pub claimed_by: Option<i32>,
    pub claimed_at: Option<DateTime<Utc>>,

    pub label: Option<serde_json::Value>,
}

#[derive(Insertable, AsChangeset)]
#[table_name = "experiments"]
struct NewExperiment {
    pub project_id: i32,
    pub folder_name: String,
    pub num_video_frames: i32,
}

#[derive(Insertable)]
#[table_name = "images"]
struct NewImage {
    experiment_id: i32,
    frame_number: i32,
    data: Vec<u8>,
}

pub fn get_project(conn: &PgConnection, project_id: i32) -> QueryResult<Option<Project>> {
    use crate::schema::projects::dsl as projects_dsl;

    projects_dsl::projects
        .find(project_id)
        .get_result(conn).optional()
}

pub fn experiments_for_project(conn: &PgConnection, project_id: i32) -> QueryResult<Vec<(Experiment, Option<User>)>> {
    use crate::schema::experiments::dsl as experiments_dsl;
    use crate::schema::users::dsl as users_dsl;
    experiments_dsl::experiments
        .filter(experiments_dsl::project_id.eq(project_id))
        .get_results(conn)?
        .into_iter()
        .map(|experiment: Experiment| match users_dsl::users
            .filter(users_dsl::id.eq(experiment.id))
            .get_result(conn)
            .optional() {
            Ok(user) => Ok((experiment, user)),
            Err(e) => Err(e)
        })
        .collect()
}

pub fn get_experiments_for_project(conn: &PgConnection, project_id: i32) -> QueryResult<Option<(Project, Vec<(Experiment, Option<User>)>)>> {
    get_project(conn, project_id)
        .and_then(|maybe_project| {
            maybe_project
                .map(|proj| experiments_for_project(conn, project_id).map(|e| (proj, e)))
                .transpose()
        })
}

pub fn get_members_for_project(conn: &PgConnection, project_id: i32) -> QueryResult<Vec<User>> {
    use crate::schema::users::dsl as users_dsl;
    use crate::schema::project_members::dsl as project_members_dsl;

    users_dsl::users
        .left_join(project_members_dsl::project_members.on(users_dsl::id.eq(project_members_dsl::user_id)))
        .filter(project_members_dsl::project_id.eq(project_id))
        .select(users_dsl::users::all_columns())
        .get_results(conn)
}

pub fn get_potential_members_for_project(conn: &PgConnection, project_id: i32) -> QueryResult<Vec<User>> {
    use crate::schema::users::dsl as users_dsl;
    use crate::schema::project_members::dsl as project_members_dsl;
    use crate::schema::projects::dsl as projects_dsl;

    let user_in_project = exists(
        project_members_dsl::project_members
            .filter(project_members_dsl::user_id.eq(users_dsl::id))
            .filter(project_members_dsl::project_id.eq(project_id))
    );

    // this smells very inefficient but the db is small, it should be fine
    let user_owns_this_project = exists(
        projects_dsl::projects
            .filter(projects_dsl::id.eq(project_id))
            .filter(projects_dsl::owner.eq(users_dsl::id))
    );

    users_dsl::users
        .filter(diesel::dsl::not(user_in_project))
        .filter(diesel::dsl::not(user_owns_this_project))
        .get_results(conn)
}

pub fn add_member_to_project(conn: &PgConnection, project_id: i32, member_id: i32) -> QueryResult<()> {
    use crate::schema::project_members::dsl as project_members_dsl;
    diesel::insert_into(project_members_dsl::project_members)
        .values((project_members_dsl::project_id.eq(project_id), project_members_dsl::user_id.eq(member_id)))
        .execute(conn)
        .map(|_| ())
}

pub fn get_experiment(conn: &PgConnection, experiment_id: i32) -> QueryResult<Experiment> {
    use crate::schema::experiments::dsl::*;

    experiments.find(experiment_id)
        .get_result::<Experiment>(conn)
}

pub async fn run_discovery(db: &AnnotatorDbConn, parent_path: &str, project_folder: &str, project_id_: i32) -> WebResult<()> {
    let data_path = Path::new(parent_path).join(project_folder);

    // This isn't actually running concurrently and I don't know why
    rocket::futures::stream::iter(std::fs::read_dir(data_path)?.into_iter())
        .then(|file| async move {
            let file = file?;
            if !file.file_type()?.is_dir() { return Ok(None); }

            let folder_name_str = file.file_name().into_string()
                .map_err(|_| WebError::NonUnicodePath)?;

            info!("Reading {:?}", file.file_name());
            let new_experiment = NewExperiment {
                project_id: project_id_,
                folder_name: folder_name_str,
                num_video_frames: 0,
            };

            Ok(Some((new_experiment, file)))
        })
        .for_each_concurrent(Some(8), move |new_experiment: WebResult<_>| async move {
            match new_experiment {
                Err(e) => {
                    error!("Error loading experiment: {:?}", e)
                }
                Ok(Some((new_experiment, file))) => {
                    if let Err(e) = insert_experiment(db, new_experiment, file).await {
                        error!("Error saving experiment: {:?}", e)
                    }
                }

                Ok(None) => {}
            }
        })
        .await;

    Ok(())
}

async fn insert_experiment(db: &AnnotatorDbConn, new_experiment: NewExperiment, file: std::fs::DirEntry) -> WebResult<()> {
    use diesel::dsl::*;
    use crate::schema::experiments::dsl as experiments;
    use crate::schema::images::dsl as images;
    let name_dbg = new_experiment.folder_name.clone();
    info!("Getting images for {}", name_dbg);

    let experiment_id: i32 = db.run(move |c| {
        let experiment_id = insert_into(experiments::experiments)
            .values(&new_experiment)
            .on_conflict(experiments::folder_name)
            .do_update()
            .set(&new_experiment)
            .returning(experiments::id)
            .get_result(c)?;

        delete(images::images)
            .filter(images::experiment_id.eq(experiment_id))
            .execute(c)?;

        Ok::<_, diesel::result::Error>(experiment_id)
    }).await?;

    // turns out decoding video is hell!
    let video_path = file.path().join("camera.avi-0000.avi");
    let video_path_str = video_path.to_str()
        .ok_or(WebError::NonUnicodePath)?;
    let mut video = videoio::VideoCapture::from_file(video_path_str, videoio::CAP_ANY)?;

    let mut new_images = Vec::new();
    let mut frame_number = 0;
    let mut image = Mat::default();
    while video.read(&mut image)? {
        let mut output = opencv::core::Vector::new();
        opencv::imgcodecs::imencode(".jpg", &image, &mut output, &opencv::core::Vector::new())?;

        new_images.push(NewImage {
            experiment_id,
            frame_number,
            data: output.to_vec(),
        });

        // In batches of 100
        if new_images.len() > 100 {
            info!("Saving batch at {}-{}", name_dbg, frame_number);
            db.run(move |c| {
                insert_into(images::images)
                    .values(new_images)
                    .execute(c)
            }).await?;
            new_images = Vec::new();
        }

        frame_number += 1;
    }

    db.run(move |c| {
        update(experiments::experiments.filter(experiments::id.eq(experiment_id)))
            .set(experiments::num_video_frames.eq(frame_number))
            .execute(c)
    }).await?;

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

pub fn release(conn: &PgConnection, experiment_id: i32) -> QueryResult<()> {
    use crate::schema::experiments::dsl::*;

    diesel::update(experiments.find(experiment_id))
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