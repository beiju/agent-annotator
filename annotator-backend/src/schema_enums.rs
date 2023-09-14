use diesel_derive_enum::DbEnum;
use serde::Serialize;
use rocket::FromFormField;

#[derive(Debug, Clone, Copy, PartialEq, Eq, DbEnum, Serialize, Hash, FromFormField)]
#[DieselType = "Experiment_status"]
#[serde(rename_all = "camelCase")]
pub enum ExperimentStatus {
    New,
    Ready,
    InProgress,
    Submitted,
    Approved,
}