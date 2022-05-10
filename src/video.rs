use ffmpeg_next::format::context::input;
use ffmpeg_next::util::frame;
use ffmpeg_next::util::error::Error as FfmpegError;

pub struct VideoWithStream {
    video: input::Input,
    stream_index: usize,
}

impl VideoWithStream {
    pub fn new(path: &str) -> Self {
        let mut video = ffmpeg_next::format::input(path)?;
        let video_stream = video
            .streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or(FfmpegError::StreamNotFound)?;
        Self {
            video,
            stream_index: video_stream.index()
        }
    }

    pub fn frames(&self) -> FrameIterator {
        let context_decoder = ffmpeg_next::codec::context::Context::from_parameters(video_stream.parameters())?;
        let mut decoder = context_decoder.decoder().video()?;

        FrameIterator {
            decoder,
            packet_iter: input.packets(),
            stream_index: self.stream_index,
            sent_eof: false
        }
    }

}

pub struct FrameIterator<'a> {
    decoder: ffmpeg_next::decoder::Video,
    packet_iter: input::PacketIter<'a>,
    stream_index: usize,
    sent_eof: bool,
}

impl Iterator for FrameIterator {
    type Item = Result<frame::Video, FfmpegError>;

    fn next(&mut self) -> Option<Self::Item> {
        let mut decoded = frame::Video::empty();

        let mut receive_and_process_decoded_frames =
            |decoder: &mut ffmpeg_next::decoder::Video| -> Result<(), ffmpeg_next::Error> {
                let mut decoded = frame::Video::empty();
                while decoder.receive_frame(&mut decoded).is_ok() {
                    num_frames += 1;
                }
                Ok(())
            };

        for (stream, packet) in input.packets() {
            if stream.index() == video_stream_index {
                decoder.send_packet(&packet)?;
                receive_and_process_decoded_frames(&mut decoder)?;
            }
        }
        decoder.send_eof()?;
        receive_and_process_decoded_frames(&mut decoder)?;

        loop {
            if self.decoder.receive_frame(&mut decoded).is_ok() {
                return Some(Ok(decoded))
            }

            // If we sent EOF and receive_frame didn't return a value, the stream is exhausted
            if self.sent_eof {
                return None
            }

            // Otherwise if we haven't sent EOF yet, try to send another packet
            if let Some((stream, packet)) = self.packet_iter.next() {
                if stream.index() == self.stream_index {
                    if let Err(e) = self.decoder.send_packet(&packet) {
                        return Some(Err(e))
                    }
                }
            } else {
                // If there was no packet to send, this is the end of file. Don't stop iteration yet
                // as the decoder might have more frames to emit once it knows we hit EOF
                if let Err(e) = self.decoder.send_eof() {
                    return Some(Err(e))
                }
                self.sent_eof = true;
            }
        }
    }
}