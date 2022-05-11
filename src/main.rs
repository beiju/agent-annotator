mod experiments;
mod schema;
mod api;

#[macro_use]
extern crate rocket;
#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_migrations;

use std::fmt::Debug;
use std::path::Path;
use rocket::{
    request::FlashMessage,
    http::Status,
    fs::{FileServer, NamedFile},
    form::Form,
    fairing::AdHoc,
    Either,
    State,
    response,
    response::{Flash, Redirect}
};
use rocket::http::Method;
use rocket_auth::{Auth, Login, Signup, User, Users};
use rocket_cors::{AllowedHeaders, AllowedOrigins};
use rocket_dyn_templates::Template;
use serde::Serialize;
use sqlx::PgPool;
use thiserror::Error;

#[rocket_sync_db_pools::database("annotator")]
pub struct AnnotatorDbConn(diesel::PgConnection);

#[derive(Error, Debug)]
pub enum WebError {
    #[error("Database error {0:?}")]
    Database(#[from] diesel::result::Error),

    #[error("IO error {0:?}")]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    OpenCV(#[from] opencv::Error),

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
        Err(Status::InternalServerError)
    }
}


pub type WebResult<T> = Result<T, WebError>;


#[derive(serde::Deserialize)]
pub struct AnnotatorConfig {
    data_path: String,
    use_react_dev_server: bool
}

#[derive(Serialize)]
struct FlashContext<'a> {
    error: Option<&'a str>,
}

#[get("/")]
async fn index(db: AnnotatorDbConn, config: &State<AnnotatorConfig>, flash: Option<FlashMessage<'_>>, auth: Auth<'_>) -> WebResult<Template> {
    if auth.is_auth() {
        list(db, config, auth).await
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

async fn list(db: AnnotatorDbConn, config: &AnnotatorConfig, _auth: Auth<'_>) -> WebResult<Template> {
    #[derive(Serialize)]
    struct ExperimentContext<'a> {
        id: i32,
        folder_name: String,
        num_video_frames: i32,
        claimed_by: Option<String>,
        claim_uri: rocket::http::uri::Origin<'a>,
        release_uri: rocket::http::uri::Origin<'a>,
    }

    impl From<experiments::Experiment> for ExperimentContext<'_> {
        fn from(e: experiments::Experiment) -> Self {
            Self {
                id: e.id,
                folder_name: e.folder_name,
                num_video_frames: e.num_video_frames,
                claimed_by: e.claimed_by.map(|c| format!("{}", c)), // TODO
                claim_uri: uri!(claim(e.id)),
                release_uri: uri!(release(e.id)),
            }
        }
    }

    #[derive(Serialize)]
    struct ExperimentListContext<'a> {
        experiments: Vec<ExperimentContext<'a>>,
        labeler_base_uri: &'a str,
    }

    let experiments = db.run(|c| experiments::get_all_experiments(c)).await?;

    Ok(Template::render("experiment-list", ExperimentListContext {
        experiments: experiments.into_iter().map(|e| e.into()).collect(),
        labeler_base_uri: if config.use_react_dev_server {
            "//127.0.0.1:3000/annotator?experiment_id="
        } else {
            "/annotator?experiment_id="
        }
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

#[post("/release?<experiment_id>")]
async fn release(db: AnnotatorDbConn, user: User, experiment_id: i32) -> Result<Redirect, Status> {
    db.run(move |c| {
        experiments::release(c, user.id(), experiment_id)
    }).await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Redirect::to(uri!(index)))
}

#[get("/annotate?<experiment_id>")]
async fn annotate(_user: User, config: &State<AnnotatorConfig>, experiment_id: i32) -> std::io::Result<Either<Redirect, NamedFile>> {
    if config.use_react_dev_server {
        let r = Redirect::to(labeler_url(experiment_id));
        Ok(Either::Left(r))
    } else {
        let f = NamedFile::open(Path::new("public/annotator/index.html")).await?;
        Ok(Either::Right(f))
    }
}

fn labeler_url(experiment_id: i32) -> String {
    format!("//127.0.0.1:3000/annotator?experiment_id={}", experiment_id)
}


embed_migrations!();

#[rocket::main]
#[allow(unused_must_use)]
async fn main() -> Result<(), Box<dyn std::error::Error>> {


    rocket::build()
        .mount("/", routes![index, post_login, signup, post_signup, logout, list_refresh, claim, release, annotate])
        .mount("/public", FileServer::from("public"))
        .mount("/annotator", FileServer::from("public/annotator"))
        .mount("/api", api::routes())
        .attach(AdHoc::config::<AnnotatorConfig>())
        .attach(AnnotatorDbConn::fairing())
        .attach(Template::fairing())
        .attach(AdHoc::on_ignite("CORS", |rocket| {
            Box::pin(async move {
                if rocket.state::<AnnotatorConfig>().unwrap().use_react_dev_server {
                    let cors = rocket_cors::CorsOptions {
                        allowed_origins: AllowedOrigins::some_exact(&["http://127.0.0.1:3000", "http://127.0.0.1:8011"]),
                        allowed_methods: vec![Method::Get, Method::Post].into_iter().map(From::from).collect(),
                        allowed_headers: AllowedHeaders::some(&["Authorization", "Accept", "Content-Type"]),
                        allow_credentials: true,
                        ..Default::default()
                    }
                        .to_cors()
                        .expect("Error building CORS object");

                    rocket.attach(cors)
                } else {
                    rocket
                }
            })
        }))
        .attach(AdHoc::on_ignite("Diesel migrations", |rocket| {
            Box::pin(async move {
                let db = AnnotatorDbConn::get_one(&rocket).await.unwrap();
                db.run(|c| {
                    embedded_migrations::run(&*c)
                }).await
                    .expect("Error running Diesel migrations");
                rocket
            })
        }))
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