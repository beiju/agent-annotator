import { useEffect, useMemo, useRef, useState } from "react"
import { Button, Col} from "react-bootstrap"

import './VideoLabeler.css'

export function VideoLabeler({ sample }) {
    /**
     * @type {React.MutableRefObject<HTMLCanvasElement>}
     */
    const canvasRef = useRef()
    const [video, setVideo] = useState(null)
    useEffect(() => {
        const element = document.createElement('video')

        function videoLoaded() {
            canvasRef.current.height = element.videoHeight
            canvasRef.current.width = element.videoWidth
            setVideo(element)
        }

        element.addEventListener('loadeddata', videoLoaded)
        element.src = sample.data

        return () => element.removeEventListener('loadeddata', videoLoaded)
    }, [sample.data])

    useMemo(() => {
        if (!canvasRef.current) return
        if (!video) return

        const ctx = canvasRef.current.getContext('2d')
        ctx.drawImage(video, 0, 0)
    }, [video])

    return (<Col className="h-100 d-flex flex-column">
        <div>
            <Button>Prev</Button>
            <Button>Next</Button>
        </div>
        <div className="flex-grow-1">
            <canvas className="labeler-canvas" ref={canvasRef}/>
        </div>
    </Col>)
}