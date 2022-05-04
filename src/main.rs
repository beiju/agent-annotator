mod experiments;

#[macro_use] extern crate rocket;

use rocket::fs::FileServer;
use rocket_dyn_templates::Template;
use serde::Serialize;

use experiments::get_all_experiments;
use crate::experiments::Experiment;

#[get("/")]
fn index() -> &'static str {
    "Homepage not yet implemented"
}

#[get("/list")]
fn list() -> Template {
    #[derive(Serialize)]
    struct ExperimentListContext {
        experiments: Vec<Experiment>
    }

    Template::render("experiment-list", ExperimentListContext {
        experiments: get_all_experiments()
    })
}

#[rocket::main]
#[allow(unused_must_use)]
async fn main() {
    rocket::build()
        .mount("/", routes![index, list])
        .mount("/public", FileServer::from("public/"))
        .attach(Template::fairing())
        .launch().await;
}