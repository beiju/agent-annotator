mod experiments;
mod schema;
mod api;
mod projects;
mod video_cache;

#[macro_use]
extern crate rocket;
#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_migrations;

use std::fmt::Debug;
use std::path::Path;
use itertools::Itertools;
use rocket::{
    request::FlashMessage,
    http::Status,
    fs::{FileServer, NamedFile},
    form::Form,
    fairing::AdHoc,
    Either,
    State,
    response,
    response::{Flash, Redirect},
};
use rocket::http::Method;
use rocket_auth::{AdminUser, Auth, Login, Signup, User, Users};
use rocket_cors::{AllowedHeaders, AllowedOrigins};
use rocket_dyn_templates::Template;
use serde::Serialize;
use sqlx::PgPool;
use thiserror::Error;
use crate::video_cache::VideoCache;

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

    #[error(transparent)]
    Join(#[from] rocket::tokio::task::JoinError),

    #[error("Non-unicode path")]
    NonUnicodePath,

    #[error("Couldn't find project {0}")]
    ProjectNotFound(i32),
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
    use_react_dev_server: bool,
}

#[derive(Serialize)]
struct FlashContext<'a> {
    error: Option<&'a str>,
}

#[get("/")]
async fn index(db: AnnotatorDbConn, flash: Option<FlashMessage<'_>>, auth: Auth<'_>) -> WebResult<Template> {
    if let Some(user) = auth.get_user().await {
        user_projects_list(db, &user).await
    } else {
        Ok(Template::render("login", FlashContext {
            error: flash.as_ref().map(|f| f.message()),
        }))
    }
}

async fn user_projects_list(db: AnnotatorDbConn, user: &User) -> WebResult<Template> {
    let user_id = user.id();
    let (own_projects, other_projects) = db.run(move |c| projects::get_user_projects(c, user_id)).await?;

    #[derive(Serialize)]
    struct ProjectListContext {
        own_projects: Vec<projects::Project>,
        other_projects: Vec<projects::Project>,
        is_admin: bool,
    }

    Ok(Template::render("projects-list", ProjectListContext {
        own_projects,
        other_projects,
        is_admin: user.is_admin,
    }))
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

#[get("/new-project")]
async fn new_project(_user: AdminUser, config: &State<AnnotatorConfig>) -> WebResult<Template> {
    #[derive(Serialize)]
    struct NewProjectContext {
        folders: Vec<String>,
    }
    let data_path = Path::new(&config.data_path);

    let folders = std::fs::read_dir(data_path)?
        .map_ok(|file| file.file_name().into_string())
        .collect::<Result<Result<Vec<_>, _>, _>>()?
        .map_err(|_| WebError::NonUnicodePath)?;

    Ok(Template::render("new-project", NewProjectContext {
        folders
    }))
}

#[derive(FromForm)]
struct NewProjectForm {
    name: String,
    folder_name: String,
}

#[post("/new-project", data = "<data>")]
async fn new_project_post(db: AnnotatorDbConn, user: AdminUser, data: Form<NewProjectForm>) -> WebResult<Redirect> {
    // TODO Validate that name and folder are nonempty and folder exists
    db.run(move |c| projects::new_project(c, user.id(), &data.name, &data.folder_name)).await?;

    Ok(Redirect::to(uri!(index)))
}

#[get("/logout")]
fn logout(auth: Auth<'_>) -> Result<Redirect, rocket_auth::Error> {
    auth.logout()?;
    Ok(Redirect::to(uri!(index)))
}

#[get("/projects/<project_id>")]
async fn project_detail(db: AnnotatorDbConn, project_id: i32, config: &State<AnnotatorConfig>, user: User) -> WebResult<Template> {
    #[derive(Serialize)]
    struct ExperimentContext<'a> {
        id: i32,
        folder_name: String,
        num_video_frames: i32,
        claimed_by: Option<i32>,
        claim_uri: rocket::http::uri::Origin<'a>,
        release_uri: rocket::http::uri::Origin<'a>,
    }

    impl From<experiments::Experiment> for ExperimentContext<'_> {
        fn from(e: experiments::Experiment) -> Self {
            Self {
                id: e.id,
                folder_name: e.folder_name,
                num_video_frames: e.num_video_frames,
                claimed_by: e.claimed_by,
                claim_uri: uri!(claim(e.id)),
                release_uri: uri!(release(e.id)),
            }
        }
    }

    #[derive(Serialize)]
    struct UserContext {
        id: i32,
        name: String,
        // TODO remove_from_project_uri
    }

    impl From<experiments::User> for UserContext {
        fn from(u: experiments::User) -> Self {
            Self {
                id: u.id,
                name: u.email,
            }
        }
    }

    #[derive(Serialize)]
    struct ExperimentListContext<'a> {
        user_id: i32,
        project_name: &'a str,
        experiments: Vec<ExperimentContext<'a>>,
        labeler_base_uri: &'a str,
        refresh_uri: Option<rocket::http::uri::Origin<'a>>,
        members: Vec<UserContext>,
        potential_members: Vec<UserContext>,
        add_member_uri: Option<rocket::http::uri::Origin<'a>>,
    }

    if let Some((project, experiments)) = db.run(move |c| {
        experiments::get_experiments_for_project(c, project_id)
    }).await? {
        let members = if user.is_admin {
            db.run(move |c| {
                experiments::get_members_for_project(c, project_id)
            }).await?
        } else {
            Vec::new()
        };

        let potential_members = if user.is_admin {
            db.run(move |c| {
                experiments::get_potential_members_for_project(c, project_id)
            }).await?
        } else {
            Vec::new()
        };

        Ok(Template::render("project-detail", ExperimentListContext {
            user_id: user.id(),
            project_name: &project.name,
            experiments: experiments.into_iter().map(|e| e.into()).collect(),
            labeler_base_uri: if config.use_react_dev_server {
                "//127.0.0.1:3000/annotator?experiment_id="
            } else {
                "/annotator?experiment_id="
            },
            refresh_uri: if user.is_admin { Some(uri!(list_refresh(project_id))) } else { None },
            members: members.into_iter().map(|e| e.into()).collect(),
            potential_members: potential_members.into_iter().map(|e| e.into()).collect(),
            add_member_uri: if user.is_admin { Some(uri!(add_member(project_id))) } else { None },
        }))
    } else {
        Err(WebError::ProjectNotFound(project_id))
    }
}

#[post("/projects/<project_id>/refresh")]
async fn list_refresh(db: AnnotatorDbConn, project_id: i32, config: &State<AnnotatorConfig>, _user: AdminUser) -> WebResult<Redirect> {
    let data_path = config.data_path.clone();
    if let Some(project) = db.run(move |c| {
        experiments::get_project(c, project_id)
    }).await? {
        experiments::run_discovery(&db, &data_path, &project.experiments_dir, project_id).await?;
        Ok(Redirect::to(uri!(project_detail(project_id))))
    } else {
        Err(WebError::ProjectNotFound(project_id))
    }
}

#[derive(FromForm)]
struct AddMemberForm {
    new_member_id: i32,
}

#[post("/projects/<project_id>/add_member", data = "<data>")]
async fn add_member(db: AnnotatorDbConn, project_id: i32, data: Form<AddMemberForm>, _user: AdminUser) -> WebResult<Redirect> {
    db.run(move |c| {
        experiments::add_member_to_project(c, project_id, data.new_member_id)
    }).await?;

    Ok(Redirect::to(uri!(project_detail(project_id))))
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
async fn release(db: AnnotatorDbConn, experiment_id: i32) -> Result<Redirect, Status> {
    db.run(move |c| {
        experiments::release(c, experiment_id)
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
        .mount("/", routes![index, post_login, signup, post_signup, logout, list_refresh, claim, release, annotate, new_project, new_project_post, project_detail, add_member])
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
        .manage(VideoCache::new())
        .launch().await;

    Ok(())
}