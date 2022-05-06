mod experiments;
mod schema;

#[macro_use]
extern crate rocket;
#[macro_use]
extern crate diesel;

use std::fmt::Debug;
use rocket::State;
use rocket::fairing::AdHoc;
use rocket::form::Form;
use rocket::fs::FileServer;
use rocket::request::FlashMessage;
use rocket::response;
use rocket::response::{Flash, Redirect};
use rocket_auth::{Auth, Login, Users};
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
fn index(flash: Option<FlashMessage<'_>>) -> Template {
    #[derive(Serialize)]
    struct ExperimentListContext<'a> {
        logged_in: bool,
        error: Option<&'a str>
    }

    Template::render("index", ExperimentListContext {
        logged_in: false,
        error: flash.as_ref().map(|f| f.message())
    })
}

#[derive(Responder)]
enum LoginResult {
    Success(Redirect),
    Failure(Flash<Redirect>)
}

#[post("/login", data = "<form>")]
async fn post_login(auth: Auth<'_>, form: Form<Login>) -> Result<LoginResult, rocket_auth::Error> {
    let result = auth.login(&form).await;
    println!("login attempt: {:?}", result);
    match result {
        Ok(()) => {
            Ok(LoginResult::Success(Redirect::to(uri!(index))))
        }
        Err(rocket_auth::Error::EmailDoesNotExist(_)) | Err(rocket_auth::Error::UnauthorizedError) => {
            Ok(LoginResult::Failure(Flash::error(Redirect::to(uri!(index)),
                                                 "Invalid username or password")))
        }
        Err(other) => { Err(other) }
    }
}

#[get("/list")]
async fn list(db: AnnotatorDbConn, _auth: Auth<'_>) -> WebResult<Template> {
    #[derive(Serialize)]
    struct ExperimentListContext {
        experiments: Vec<experiments::Experiment>,
    }

    let experiments = db.run(|c| experiments::get_all_experiments(c)).await?;

    Ok(Template::render("experiment-list", ExperimentListContext {
        experiments
    }))
}

#[post("/list/refresh")]
async fn list_refresh(db: AnnotatorDbConn, config: &State<AnnotatorConfig>, _auth: Auth<'_>) -> WebResult<Redirect> {
    let data_path = config.data_path.clone();
    db.run(move |c| experiments::run_discovery(c, &data_path)).await?;
    Ok(Redirect::to(uri!(list)))
}

#[rocket::main]
#[allow(unused_must_use)]
async fn main() -> Result<(), rocket_auth::Error> {
    let conn = PgPool::connect("[im not committing my secrets]").await?;
    let users: Users = conn.clone().into();
    users.create_table().await?;
    rocket::build()
        .mount("/", routes![index, post_login, list, list_refresh])
        .mount("/public", FileServer::from("public"))
        .manage(users)
        .attach(AdHoc::config::<AnnotatorConfig>())
        .attach(AnnotatorDbConn::fairing())
        .attach(Template::fairing())
        // .attach(AdHoc::on_ignite("rocket_auth init", |rocket| {
        //     Box::pin(async move {
        //         let postgres_connection_path: String = rocket.figment()
        //             .extract_inner("databases.annotator.url")
        //             .expect("Expected database URL in rocket config");
        //
        //         let users = Users::open_postgres(&postgres_connection_path).await;
        //         dbg!("got users");
        //         rocket.manage(users)
        //     })
        // }))
        .launch().await;

    Ok(())
}