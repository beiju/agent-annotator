mod experiments;
mod schema;

#[macro_use] extern crate rocket;
#[macro_use] extern crate diesel;

use std::fmt::Debug;
use rocket::State;
use rocket::fairing::AdHoc;
use rocket::fs::FileServer;
use rocket::response;
use rocket_dyn_templates::Template;
use serde::Serialize;
use thiserror::Error;

#[rocket_sync_db_pools::database("annotator")]
struct AnnotatorDbConn(diesel::PgConnection);

#[derive(Error, Debug)]
pub enum WebError {
    #[error("Database error {0:?}")]
    Database(#[from] diesel::result::Error),

    #[error("IO error {0:?}")]
    Io (#[from] std::io::Error),

    #[error("Video read error: {0:?}")]
    VideoRead (#[from] ffmpeg_next::Error),

    #[error("Non-unicode path")]
    NonUnicodePath,
}

impl<'r, 'o: 'r> response::Responder<'r, 'o> for WebError {
    fn respond_to(self, _: &'r rocket::Request<'_>) -> response::Result<'o> {
        error!("Web error: {:?}", self);
        Err(rocket::http::Status::InternalServerError)
    }
}



type WebResult<T> = Result<T, WebError>;


#[derive(serde::Deserialize)]
struct AnnotatorConfig {
    data_path: String,
}

#[get("/")]
fn index() -> &'static str {
    "Homepage not yet implemented"
}

#[get("/list")]
async fn list(db: AnnotatorDbConn) -> WebResult<Template> {
    #[derive(Serialize)]
    struct ExperimentListContext {
        experiments: Vec<experiments::Experiment>
    }

    let experiments = db.run(|c| experiments::get_all_experiments(c)).await?;

    Ok(Template::render("experiment-list", ExperimentListContext {
        experiments
    }))
}

#[post("/list/refresh")]
async fn list_refresh(db: AnnotatorDbConn, config: &State<AnnotatorConfig>) -> WebResult<response::Redirect> {
    let data_path = config.data_path.clone();
    db.run(move |c| experiments::run_discovery(c, &data_path)).await?;
    Ok(response::Redirect::to(uri!(list)))
}

#[rocket::main]
#[allow(unused_must_use)]
async fn main() {
    rocket::build()
        .mount("/", routes![index, list, list_refresh])
        .mount("/public", FileServer::from("public"))
        .attach(AdHoc::config::<AnnotatorConfig>())
        .attach(AnnotatorDbConn::fairing())
        .attach(Template::fairing())
        .launch().await;
}