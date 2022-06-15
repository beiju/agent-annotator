use rocket::http::ContentType;
use rocket::serde::json::{json, Json};
use rocket_auth::User;
use crate::{AnnotatorDbConn, experiments, WebResult};

#[get("/experiment?<id>")]
pub async fn experiment(db: AnnotatorDbConn, id: i32) -> WebResult<serde_json::Value> {
    let experiment = db.run(move |c| {
        experiments::get_experiment(c, id)
    }).await?;

    Ok(json!({
        "id": experiment.id,
        "numFrames": experiment.num_video_frames,
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

pub fn routes() -> Vec<rocket::Route> {
    routes![experiment, set_label, frame]
}