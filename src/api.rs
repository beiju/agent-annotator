use std::path::Path;
use opencv::core::Mat;
use opencv::prelude::*;
use opencv::videoio;
use rocket::http::ContentType;
use rocket::serde::json::{json, Json};
use rocket::State;
use rocket_auth::User;
use crate::{AnnotatorConfig, AnnotatorDbConn, experiments, WebError, WebResult};

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
pub async fn frame(db: AnnotatorDbConn, config: &State<AnnotatorConfig>, experiment: i32, frame: usize) -> WebResult<(ContentType, Vec<u8>)> {
    let experiment = db.run(move |c| {
        experiments::get_experiment(c, experiment)
    }).await?;

    let video_path = Path::new(&config.data_path)
        .join(experiment.folder_name)
        .join("camera.avi-0000.avi");
    let video_path_str = video_path.to_str()
        .ok_or(WebError::NonUnicodePath)?;

    let mut video = videoio::VideoCapture::from_file(video_path_str, videoio::CAP_ANY)?;
    video.set(videoio::CAP_PROP_POS_FRAMES, frame as f64)?;
    // It may not get exactly there, but it should at least not overshoot so we can scan there
    let mut seeked_to = video.get(videoio::CAP_PROP_POS_FRAMES)? as usize;
    if seeked_to > frame {
        // Overshot. I don't want to bother doing a search, so just reset to the beginning
        video.set(videoio::CAP_PROP_POS_FRAMES, 0.)?;
        assert!(video.get(videoio::CAP_PROP_POS_FRAMES)? as usize <= frame);
    }

    while seeked_to < frame {
        video.grab()?;
        seeked_to += 1;
    }

    assert_eq!(video.get(videoio::CAP_PROP_POS_FRAMES)? as usize, frame);

    let mut image = Mat::default();
    let i = video.read(&mut image)?;
    assert_eq!(i, true);

    let mut output = opencv::core::Vector::new();
    opencv::imgcodecs::imencode(".jpg", &image, &mut output, &opencv::core::Vector::new())?;

    Ok((ContentType::JPEG, output.to_vec()))
}

pub fn routes() -> Vec<rocket::Route> {
    routes![experiment, set_label, frame]
}