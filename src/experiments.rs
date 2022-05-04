use std::{fs, env};
use std::path::Path;
use anyhow::Result;

use serde::Serialize;

#[derive(Serialize)]
pub struct Experiment {
    pub id: i32
}

pub fn get_all_experiments() -> Vec<Experiment> {
    // TODO
    Vec::new()
}

pub async fn run_discovery(data_path: &str) -> Result<()> {
    for file in fs::read_dir(Path::new(data_path))? {
        println!("File: {:?}", file?);
    }

    Ok(())
}