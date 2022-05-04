mod experiments;

#[macro_use] extern crate rocket;

use rocket::{Config, State};
use rocket::fairing::AdHoc;
use rocket::fs::FileServer;
use rocket::response::Redirect;
use rocket_dyn_templates::Template;
use serde::Serialize;

#[derive(serde::Deserialize)]
struct AnnotatorConfig {
    data_path: String,
}


#[get("/")]
fn index() -> &'static str {
    "Homepage not yet implemented"
}

#[get("/list")]
fn list() -> Template {
    #[derive(Serialize)]
    struct ExperimentListContext {
        experiments: Vec<experiments::Experiment>
    }

    Template::render("experiment-list", ExperimentListContext {
        experiments: experiments::get_all_experiments()
    })
}

#[post("/list/refresh")]
async fn list_refresh(config: &State<AnnotatorConfig>) -> Redirect {
    experiments::run_discovery(&config.data_path).await;
    Redirect::to(uri!(list))
}

#[rocket::main]
#[allow(unused_must_use)]
async fn main() {
    rocket::build()
        .mount("/", routes![index, list, list_refresh])
        .mount("/public", FileServer::from("public/"))
        .attach(Template::fairing())
        .attach(AdHoc::config::<AnnotatorConfig>())
        .launch().await;
}