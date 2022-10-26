use std::path::Path;
use rocket::http::ContentType;
use rocket::serde::json::{json, Json};
use rocket::State;
use rocket_auth::User;
use crate::{AnnotatorConfig, AnnotatorDbConn, experiments, WebError, WebResult};
use crate::schema_enums::ExperimentStatus;

#[get("/experiment?<id>")]
pub async fn experiment(db: AnnotatorDbConn, id: i32) -> WebResult<serde_json::Value> {
    let experiment = db.run(move |c| {
        experiments::get_experiment(c, id)
    }).await?;

    Ok(json!({
        "id": experiment.id,
        "numFrames": experiment.num_video_frames,
        "sampleRate": experiment.sample_rate(),
        "label": experiment.label,
    }))
}

#[post("/set_label?<id>", data = "<label>")]
pub async fn set_label(db: AnnotatorDbConn, user: User, id: i32, label: Json<serde_json::Value>) -> WebResult<serde_json::Value> {
    db.run(move |c| {
        experiments::set_label(c,  user.id(), id, label.into_inner())
    }).await?;

    Ok(json!({}))
}

#[get("/frame.jpg?<experiment>&<frame>")]
pub async fn frame(db: AnnotatorDbConn, experiment: i32, frame: usize) -> WebResult<(ContentType, Vec<u8>)> {
    let output = db.run(move |c| {
        use diesel::prelude::*;
        use crate::schema::images::dsl as images;

        images::images
            .filter(images::experiment_id.eq(experiment))
            .filter(images::frame_number.eq(frame as i32))
            .select(images::data)
            .get_result(c)
    }).await?;

    Ok((ContentType::JPEG, output))
}

#[get("/project?<id>")]
pub async fn get_project(db: AnnotatorDbConn, id: i32) -> WebResult<serde_json::Value> {
    let output = db.run(move |c| {
        use diesel::prelude::*;
        use crate::schema::experiments::dsl as experiments_dsl;

        experiments_dsl::experiments
            .filter(experiments_dsl::project_id.eq(id))
            .select((experiments_dsl::id, experiments_dsl::folder_name, experiments_dsl::status))
            .get_results::<(i32, String, ExperimentStatus)>(c)
    }).await?;

    let results = output.iter()
        .map(|(id, name, status)| {
            json!({
                "id": id,
                "name": name,
                "status": status,
            })
        })
        .collect();

    Ok(serde_json::Value::Array(results))
}
#[get("/download?<experiment>&<filename>")]
pub async fn get_download(db: AnnotatorDbConn, experiment: i32, filename: String, config: &State<AnnotatorConfig>) -> WebResult<rocket::fs::NamedFile> {
    let base_path = Path::new(&config.data_path);
    let base_path_owned = base_path.to_owned(); // needs to be owned to be moveable
    let project_folder = db.run(move |c| {
        use diesel::prelude::*;
        use crate::schema::experiments::dsl as experiments_dsl;
        use crate::schema::projects::dsl as projects_dsl;

        let (project_id, folder_name) = experiments_dsl::experiments
            .filter(experiments_dsl::id.eq(experiment))
            .select((experiments_dsl::project_id, experiments_dsl::folder_name))
            .get_result::<(i32, String)>(c)?;

        let project_dir = projects_dsl::projects
            .filter(projects_dsl::id.eq(project_id))
            .select(projects_dsl::experiments_dir)
            .get_result::<String>(c)?;

        Ok::<_, diesel::result::Error>(base_path_owned.join(project_dir).join(folder_name))
    }).await?;

    let requested_path = project_folder.join(&filename);

    // This is an important security check, otherwise people can download any file on the server
    // by using .. segments in the path
    if requested_path.starts_with(base_path) {
        // Ok(...?) seems redundant but you need it for the error into() functionality
        Ok(rocket::fs::NamedFile::open(requested_path).await?)
    } else {
        Err(WebError::DisallowedPath(filename))
    }
}

pub fn routes() -> Vec<rocket::Route> {
    routes![experiment, set_label, frame, get_project, get_download]
}