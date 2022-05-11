use serde::Serialize;
use diesel::{PgConnection, Queryable, QueryResult};
use diesel::prelude::*;

#[derive(Serialize, Queryable)]
pub struct Project {
    pub id: i32,
    pub name: String,
    pub folder_name: String,

    pub owner: Option<i32>,
}

pub fn get_user_projects(conn: &PgConnection, user_id: i32) -> QueryResult<(Vec<Project>, Vec<Project>)> {
    use crate::schema::projects::dsl as projects;
    use crate::schema::project_members::dsl as project_members;

    let own_projects = projects::projects
        .filter(projects::owner.eq(user_id))
        .get_results::<Project>(conn)?;

    let other_projects = project_members::project_members
        .filter(project_members::user_id.eq(user_id))
        .inner_join(projects::projects.on(projects::id.eq(project_members::project_id)))
        .filter(projects::owner.ne(user_id))
        .select(projects::projects::all_columns())
        .get_results::<Project>(conn)?;

    Ok((own_projects, other_projects))
}