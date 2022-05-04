use std::path::Path;

use serde::Serialize;
use diesel::{Queryable, result::QueryResult};
use diesel::prelude::*;

#[derive(Serialize, Queryable)]
pub struct Experiment {
    pub id: i32,
    pub folder_name: String,
    pub num_video_frames: i32,
}

pub fn get_all_experiments(conn: &PgConnection) -> QueryResult<Vec<Experiment>> {
    use crate::schema::experiments::dsl::*;

    experiments.get_results(conn)
}

pub async fn run_discovery(data_path: &str) -> std::io::Result<()> {
    for file in std::fs::read_dir(Path::new(data_path))? {
        println!("File: {:?}", file?);
    }

    Ok(())
}