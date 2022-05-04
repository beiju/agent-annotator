use serde::Serialize;

#[derive(Serialize)]
pub struct Experiment {
    pub id: i32
}

pub fn get_all_experiments() -> Vec<Experiment> {
    // TODO
    Vec::new()
}