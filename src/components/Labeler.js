import Labelbox from '@labelbox/labeling-api'
import { useEffect, useReducer, useState } from "react"
import { Container, Row } from "react-bootstrap"
import { Sidebar } from "./Sidebar"
import { VideoLabeler } from "./VideoLabeler"
import reducer from "../reducer"
import { LabelsDispatch } from "./labels"

import agents from "../agents.json"
const defaultState = {
    loading: true,
    activeFrame: 1,
    activeAgent: null,
    agentPresent: {},
    frames: {}
}

export default function Labeler() {
    const [sample, setSample] = useState(null)
    useEffect(() => {
        Labelbox.currentAsset().subscribe(async sample => {
            if (sample) {
                const url = sample.data.replace(".mp4", "/num_frames.txt")

                const response = await fetch(url)
                const text = await response.text()
                sample.numFrames = parseInt(text, 10)
            }

            setSample(sample)
        })
    }, [])

    const [state, dispatch] = useReducer(reducer, defaultState)

    useEffect(() => {
        function listener(event) {
            if (event.code.startsWith('Digit') && event.key <= agents.length) {
                return dispatch({
                    type: 'set_active_agent',
                    activeAgent: agents[event.key - 1].name
                })
            }

            switch (event.key) {
                case '`':
                    return dispatch({ type: 'active_agent_toggle_present' })
                case ' ':
                    return dispatch({ type: 'step_advance' })
                case 'b':
                    return dispatch({ type: 'step_retreat' })
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