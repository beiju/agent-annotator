mod experiments;
mod schema;

#[macro_use]
extern crate rocket;
#[macro_use]
extern crate diesel;

use std::fmt::Debug;
use std::path::Path;
use rocket::State;
use rocket::fairing::AdHoc;
use rocket::form::Form;
use rocket::fs::{FileServer, NamedFile};
use rocket::http::Status;
use rocket::request::FlashMessage;
use rocket::response;
use rocket::response::{Flash, Redirect};
use rocket_auth::{Auth, Login, Signup, User, Users};
use rocket_dyn_templates::Template;
use serde::Serialize;
use sqlx::PgPool;
use thiserror::Error;

#[rocket_sync_db_pools::database("annotator")]
struct AnnotatorDbConn(diesel::PgConnection);

#[derive(Error, Debug)]
pub enum WebError {
    #[error("Database error {0:?}")]
    Database(#[from] diesel::result::Error),

    #[error("IO error {0:?}")]
    Io(#[from] std::io::Error),

    #[error("Video read error: {0:?}")]
    VideoRead(#[from] ffmpeg_next::Error),

    #[error("Non-unicode path")]
    NonUnicodePath,
}

trait UserFacingError {
    fn is_user_facing(&self) -> bool;
}

impl UserFacingError for rocket_auth::Error {
    fn is_user_facing(&self) -> bool {
        match self {
            Self::InvalidEmailAddressError
            | Self::EmailAlreadyExists
            | Self::UnauthorizedError
            | Self::UserNotFoundError
            | Self::FormValidationError(_)
            | Self::FormValidationErrors(_) => true,
            _ => false
        }
    }
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

#[derive(Serialize)]
struct FlashContext<'a> {
    error: Option<&'a str>,
}


#[get("/")]
async fn index(db: AnnotatorDbConn, flash: Option<FlashMessage<'_>>, auth: Auth<'_>) -> WebResult<Template> {
    if auth.is_auth() {
        list(db, auth).await
    } else {
        Ok(Template::render("index", FlashContext {
            error: flash.as_ref().map(|f| f.message()),
        }))
    }
}

#[derive(Responder)]
enum MaybeFlashRedirect {
    NoFlash(Redirect),
    Flash(Flash<Redirect>),
}

#[post("/login", data = "<form>")]
async fn post_login(auth: Auth<'_>, form: Form<Login>) -> Result<MaybeFlashRedirect, rocket_auth::Error> {
    match auth.login(&form).await {
        Ok(()) => {
            Ok(MaybeFlashRedirect::NoFlash(Redirect::to(uri!(index))))
        }
        Err(err) if err.is_user_facing() => {
            Ok(MaybeFlashRedirect::Flash(Flash::error(Redirect::to(uri!(index)),
                                                      err.to_string())))
        }
        Err(err) => { Err(err) }
    }
}

#[get("/signup")]
fn signup(flash: Option<FlashMessage<'_>>) -> Template {
    Template::render("signup", FlashContext {
        error: flash.as_ref().map(|f| f.message()),
    })
}

#[post("/signup", data = "<form>")]
async fn post_signup(auth: Auth<'_>, form: Form<Signup>) -> Result<MaybeFlashRedirect, rocket_auth::Error> {
    match auth.signup(&form).await {
        Ok(()) => {
            auth.login(&form.into()).await?;
            Ok(MaybeFlashRedirect::NoFlash(Redirect::to(uri!(index))))
        }
        Err(err) if err.is_user_facing() => {
            Ok(MaybeFlashRedirect::Flash(Flash::error(Redirect::to(uri!(signup)),
                                                      err.to_string())))
        }
        Err(err) => { Err(err) }
    }
}

#[get("/logout")]
fn logout(auth: Auth<'_>) -> Result<Redirect, rocket_auth::Error> {
    auth.logout()?;
    Ok(Redirect::to(uri!(index)))
}

async fn list(db: AnnotatorDbConn, _auth: Auth<'_>) -> WebResult<Template> {
    #[derive(Serialize)]
    struct ExperimentContext<'a> {
        folder_name: String,
        num_video_frames: i32,
        claimed_by: Option<String>,
        claim_uri: rocket::http::uri::Origin<'a>
    }

    impl From<experiments::Experiment> for ExperimentContext<'_> {
        fn from(e: experiments::Experiment) -> Self {
            Self {
                folder_name: e.folder_name,
                num_video_frames: e.num_video_frames,
                claimed_by: e.claimed_by.map(|c| format!("{}", c)), // TODO
                claim_uri: uri!(claim(e.id)),
            }
        }
    }

    #[derive(Serialize)]
    struct ExperimentListContext<'a> {
        experiments: Vec<ExperimentContext<'a>>,
    }

    let experiments = db.run(|c| experiments::get_all_experiments(c)).await?;

    Ok(Template::render("experiment-list", ExperimentListContext {
        experiments: experiments.into_iter().map(|e| e.into()).collect()
    }))
}

#[post("/list/refresh")]
async fn list_refresh(db: AnnotatorDbConn, config: &State<AnnotatorConfig>, _auth: Auth<'_>) -> WebResult<Redirect> {
    let data_path = config.data_path.clone();
    db.run(move |c| experiments::run_discovery(c, &data_path)).await?;
    Ok(Redirect::to(uri!(index)))
}

#[post("/claim?<experiment_id>")]
async fn claim(db: AnnotatorDbConn, user: User, experiment_id: i32) -> Result<Redirect, Status> {
    db.run(move |c| {
        experiments::claim(c, user.id(), experiment_id)
    }).await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Redirect::to(uri!(annotate(experiment_id))))
}

#[get("/annotate?<_experiment_id>")]
async fn annotate(_user: User, _experiment_id: i32) -> std::io::Result<NamedFile> {
    NamedFile::open(Path::new("public/annotator/index.html")).await
}

#[rocket::main]
#[allow(unused_must_use)]
async fn main() -> Result<(), rocket_auth::Error> {
    rocket::build()
        .mount("/", routes![index, post_login, signup, post_signup, logout, list_refresh, claim, annotate])
        .mount("/public", FileServer::from("public"))
        .mount("/annotator", FileServer::from("public/annotator"))
        .attach(AdHoc::config::<AnnotatorConfig>())
        .attach(AnnotatorDbConn::fairing())
        .attach(Template::fairing())
        .attach(AdHoc::on_ignite("rocket_auth init", |rocket| {
            Box::pin(async move {
                let postgres_connection_path: String = rocket.figment()
                    .extract_inner("databases.annotator.url")
                    .expect("Expected database URL in rocket config");

                let conn = PgPool::connect(&postgres_connection_path).await
                    .expect("Failed to connect to postgres");
                let mut users: Users = conn.clone().into();
                users.create_table().await
                    .expect("Failed to create or verify users table");
                users.open_redis("redis://127.0.0.1/")
                    .expect("Failed to connect to redis");
                rocket.manage(users)
            })
        }))
        .launch().await;

    Ok(())
}