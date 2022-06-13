use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use chrono::{DateTime, Utc};
use opencv::{prelude::*, videoio};
use opencv::videoio::VideoCapture;
use rocket::tokio::sync::Mutex;
use crate::{AnnotatorDbConn, experiments, WebError, WebResult};

type VideoCacheMap = HashMap<i32, VideoCacheMapEntry>;
struct VideoCacheMapEntry {
    video: Arc<Mutex<VideoCapture>>,
    last_accessed: DateTime<Utc>,
}

pub struct VideoCache {
    cache: Arc<Mutex<VideoCacheMap>>,
}

impl VideoCache {
    pub fn new() -> VideoCache {
        VideoCache {
            cache: Default::default()
        }
    }

    pub async fn get_frame(&self, db: &AnnotatorDbConn, root_path: &str, experiment: i32, frame: usize) -> WebResult<Vec<u8>> {
        let video_mutex = self.get_video(db, root_path, experiment).await?;
        let mut video = video_mutex.lock().await;

        // By experiment, it seems skipping is slower than seeking (but maybe not when going
        // backwards?)
        let seeked_to = video.get(videoio::CAP_PROP_POS_FRAMES)? as usize;
        if seeked_to > frame {
            info!("Seeked too far; trying to jump back");
            video.set(videoio::CAP_PROP_POS_FRAMES, frame as f64)?;
        }

        // It may not get exactly there, but it should at least not overshoot so we can scan there
        let mut seeked_to = video.get(videoio::CAP_PROP_POS_FRAMES)? as usize;
        if seeked_to > frame {
            info!("Seeked too far; resetting to zero");
            // Overshot. I don't want to bother doing a search, so just reset to the beginning
            video.set(videoio::CAP_PROP_POS_FRAMES, 0.)?;
            assert!(video.get(videoio::CAP_PROP_POS_FRAMES)? as usize <= frame);
            seeked_to = 0;
        }

        while (video.get(videoio::CAP_PROP_POS_FRAMES)? as usize) < frame {
            info!("Seeking from {} to {}", (video.get(videoio::CAP_PROP_POS_FRAMES)? as usize), frame);
            video.grab()?;
            seeked_to += 1;
        }

        assert_eq!(video.get(videoio::CAP_PROP_POS_FRAMES)? as usize, frame);
        info!("Seeked to {}", frame);

        let mut image = Mat::default();
        let i = video.read(&mut image)?;
        assert_eq!(i, true);

        let mut output = opencv::core::Vector::new();
        opencv::imgcodecs::imencode(".jpg", &image, &mut output, &opencv::core::Vector::new())?;

        Ok(output.to_vec())
    }

    async fn get_video(&self, db: &AnnotatorDbConn, root_path: &str, experiment: i32) -> WebResult<Arc<Mutex<VideoCapture>>> {
        let mut map = self.cache.lock().await;
        if let Some(entry) = map.get_mut(&experiment) {
            entry.last_accessed = Utc::now();
            Ok(entry.video.clone())
        } else {
            Self::evict_if_necessary(&mut map);

            let video = Arc::new(Mutex::new(Self::load_video(db, root_path, experiment).await?));
            let existing = map.insert(experiment, VideoCacheMapEntry {
                video: video.clone(),
                last_accessed: Utc::now(),
            });
            assert!(existing.is_none());

            Ok(video)
        }
    }

    async fn load_video(db: &AnnotatorDbConn, root_path: &str, experiment: i32) -> WebResult<VideoCapture> {
        let (experiment, project) = db.run(move |c| {
            let experiment = experiments::get_experiment(c, experiment)?;
            let project = experiments::get_project(c, experiment.project_id)?
                .ok_or(WebError::ProjectNotFound(experiment.project_id))?;
            Ok::<_, WebError>((experiment, project))
        }).await?;

        let video_path = Path::new(root_path)
            .join(project.experiments_dir)
            .join(experiment.folder_name)
            .join("camera.avi-0000.avi");
        let video_path_str = video_path.to_str()
            .ok_or(WebError::NonUnicodePath)?;

        let video = VideoCapture::from_file(video_path_str, videoio::CAP_ANY)?;

        Ok(video)
    }

    fn evict_if_necessary(map: &mut VideoCacheMap) {
        while map.len() > 25 {
            let to_evict = map.iter()
                .min_by_key(|(_, v)| v.last_accessed)
                .map(|(k, _)| *k);
            if let Some(to_evict) = to_evict {
                let removed = map.remove(&to_evict);
                assert!(removed.is_some());
            } else {
                return;
            }
        }
    }
}