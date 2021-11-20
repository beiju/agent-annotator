import Labelbox from '@labelbox/labeling-api'
import { useEffect, useReducer, useState } from "react"
import { Container, Row } from "react-bootstrap"
import { Sidebar } from "./Sidebar"
import { VideoLabeler } from "./VideoLabeler"
import reducer from "../reducer"
import { LabelsDispatch } from "./labels"

const defaultState = {
    loading: true,
    activeFrame: 1,
    activeAgent: null,
    agentPresent: {},
    frames: {}
}

export default function Labeler() {
    const [state, dispatch] = useReducer(reducer, defaultState, i => i)

    const [sample, setSample] = useState(null)
    useEffect(() => {
        const subscription = Labelbox.currentAsset().subscribe(async sample => {
            if (sample) {
                const url = sample.data.replace(".mp4", "/num_frames.txt")

                const response = await fetch(url)
                const text = await response.text()
                sample.numFrames = parseInt(text, 10)

                const parsedState = sample.label ? JSON.parse(sample.label) : defaultState
                parsedState.data = sample.data
                console.log("Restoring ", parsedState)
                dispatch({ type: 'set_state', state: parsedState })
            }

            setSample(sample)
        })

        return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
        function listener(event) {
            switch (event.key) {
                // Changing frames
                case ' ':
                    return dispatch({ type: 'step_advance' })
                case 'b':
                    return dispatch({ type: 'step_retreat' })

                // Setting quality
                case 'r':
                    return dispatch({ type: 'toggle_active_agent_is_blurred' })
                case 'f':
                    return dispatch({ type: 'toggle_active_agent_is_obscured' })

                // Rotating
                case 'q':
                    return dispatch({ type: 'rotate_active_agent', by: 0.01 })
                case 'Q':
                    return dispatch({ type: 'rotate_active_agent', by: 0.1 })
                case 'e':
                    return dispatch({ type: 'rotate_active_agent', by: -0.01 })
                case 'E':
                    return dispatch({ type: 'rotate_active_agent', by: -0.1 })

                // Translating
                case 'w':
                    return dispatch({ type: 'move_active_agent', y: -1 })
                case 'W':
                    return dispatch({ type: 'move_active_agent', y: -10 })
                case 'a':
                    return dispatch({ type: 'move_active_agent', x: -1 })
                case 'A':
                    return dispatch({ type: 'move_active_agent', x: -10 })
                case 's':
                    return dispatch({ type: 'move_active_agent', y: 1 })
                case 'S':
                    return dispatch({ type: 'move_active_agent', y: 10 })
                case 'd':
                    return dispatch({ type: 'move_active_agent', x: 1 })
                case 'D':
                    return dispatch({ type: 'move_active_agent', x: 10 })

                default:
                    break
            }
        }

        document.addEventListener('keypress', listener)
        return () => document.removeEventListener('keypress', listener)
    }, [])

    // Save on every frame change
    const hasSample = !!sample
    useEffect(() => {
        if (!hasSample) return
        Labelbox.setLabelForAsset(JSON.stringify(state)).catch(err => {
            console.error(err)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasSample, state.activeFrame])

    function nextVideo() {
        Labelbox.fetchNextAssetToLabel().catch(err => {
            console.error(err)
        })
    }

    if (!sample) return (<p>Loading&hellip;</p>)

    return (<Container fluid className="h-100">
        <Row className="h-100">
            <LabelsDispatch.Provider value={dispatch}>
                <Sidebar state={state} />
                <VideoLabeler sample={sample} state={state} nextVideo={nextVideo} />
            </LabelsDispatch.Provider>
        </Row>
    </Container>)
}